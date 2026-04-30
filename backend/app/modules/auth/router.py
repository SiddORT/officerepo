from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from backend.app.modules.auth.schemas import (
    LoginRequest, TokenResponse, RefreshRequest,
    LogoutRequest, SuperAdminLoginRequest
)
from backend.app.core.security import (
    verify_password, create_access_token, create_refresh_token, decode_refresh_token
)
from backend.app.database.platform import get_platform_db
from backend.app.platform.mobile.models import MobileDeviceSession
from backend.app.platform.superadmin.models import SuperAdmin
from backend.app.config.settings import settings
from jose import JWTError

router = APIRouter()


@router.post("/superadmin/login")
def superadmin_login(payload: SuperAdminLoginRequest, db: Session = Depends(get_platform_db)):
    admin = db.query(SuperAdmin).filter(SuperAdmin.email == payload.email, SuperAdmin.is_active == True).first()
    if not admin or not admin.verify_password(payload.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token_data = {
        "user_id": admin.id,
        "tenant_id": "platform",
        "role": "superadmin",
        "device_type": "web",
        "email": admin.email,
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user_id": admin.id,
        "tenant_id": "platform",
        "role": "superadmin",
        "device_type": "web",
    }


@router.post("/tenant/login", response_model=TokenResponse)
def tenant_login(
    payload: LoginRequest,
    request: Request,
    platform_db: Session = Depends(get_platform_db)
):
    from backend.app.core.tenant_resolver import resolve_tenant_slug, get_tenant_db_url
    from backend.app.database.tenant import get_tenant_session

    tenant_slug = resolve_tenant_slug(request)
    if not tenant_slug:
        raise HTTPException(status_code=400, detail="Tenant not identified. Provide X-Tenant-ID header.")

    db_url = get_tenant_db_url(tenant_slug, platform_db)
    if not db_url:
        raise HTTPException(status_code=404, detail="Tenant not found or inactive.")

    tenant_db = get_tenant_session(db_url)
    try:
        from backend.app.modules.employee.models import Employee
        user = tenant_db.query(Employee).filter(Employee.email == payload.email).first()
        if not user or not verify_password(payload.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token_data = {
            "user_id": user.id,
            "tenant_id": tenant_slug,
            "role": user.role,
            "device_type": payload.device_type,
            "email": user.email,
        }
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        if payload.device_id:
            existing = platform_db.query(MobileDeviceSession).filter(
                MobileDeviceSession.user_id == user.id,
                MobileDeviceSession.tenant_id == tenant_slug,
                MobileDeviceSession.device_id == payload.device_id,
            ).first()
            if existing:
                existing.refresh_token = refresh_token
                existing.is_active = True
                existing.last_used_at = datetime.utcnow()
            else:
                session = MobileDeviceSession(
                    user_id=user.id,
                    tenant_id=tenant_slug,
                    device_id=payload.device_id,
                    device_name=payload.device_name or payload.device_id,
                    device_type=payload.device_type,
                    refresh_token=refresh_token,
                    expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
                )
                platform_db.add(session)
            platform_db.commit()

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user_id=user.id,
            tenant_id=tenant_slug,
            role=user.role,
            device_type=payload.device_type,
        )
    finally:
        tenant_db.close()


@router.post("/refresh")
def refresh_token(payload: RefreshRequest, platform_db: Session = Depends(get_platform_db)):
    try:
        data = decode_refresh_token(payload.refresh_token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    if data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Not a refresh token")

    new_access = create_access_token({
        "user_id": data["user_id"],
        "tenant_id": data["tenant_id"],
        "role": data["role"],
        "device_type": data.get("device_type", "web"),
        "email": data.get("email"),
    })
    new_refresh = create_refresh_token({
        "user_id": data["user_id"],
        "tenant_id": data["tenant_id"],
        "role": data["role"],
        "device_type": data.get("device_type", "web"),
        "email": data.get("email"),
    })

    if payload.device_id:
        session = platform_db.query(MobileDeviceSession).filter(
            MobileDeviceSession.device_id == payload.device_id,
            MobileDeviceSession.refresh_token == payload.refresh_token,
            MobileDeviceSession.is_active == True,
        ).first()
        if session:
            session.refresh_token = new_refresh
            session.last_used_at = datetime.utcnow()
            platform_db.commit()

    return {"access_token": new_access, "refresh_token": new_refresh, "token_type": "bearer"}


@router.post("/logout")
def logout(payload: LogoutRequest, platform_db: Session = Depends(get_platform_db)):
    if payload.device_id:
        q = platform_db.query(MobileDeviceSession).filter(
            MobileDeviceSession.device_id == payload.device_id
        )
        if not payload.all_devices:
            q = q.filter(MobileDeviceSession.is_active == True)
        q.update({"is_active": False})
        platform_db.commit()
    return {"message": "Logged out successfully"}
