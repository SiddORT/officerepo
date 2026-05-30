from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.auth.schemas import (
    RefreshRequest, LogoutRequest, SuperAdminLoginRequest
)
from backend.app.core.security import (
    create_access_token, create_refresh_token, decode_refresh_token
)
from backend.app.database.platform import get_platform_db
from backend.app.platform.superadmin.models import SuperAdmin
from jose import JWTError

router = APIRouter()


@router.post("/superadmin/login")
def superadmin_login(payload: SuperAdminLoginRequest, db: Session = Depends(get_platform_db)):
    admin = db.query(SuperAdmin).filter(SuperAdmin.email == payload.email, SuperAdmin.is_active == True).first()
    if not admin or not admin.verify_password(payload.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token_data = {
        "user_id": admin.id,
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
        "role": "superadmin",
        "device_type": "web",
    }


@router.post("/refresh")
def refresh_token(payload: RefreshRequest):
    try:
        data = decode_refresh_token(payload.refresh_token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    if data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Not a refresh token")

    claims = {
        "user_id": data["user_id"],
        "role": data["role"],
        "device_type": data.get("device_type", "web"),
        "email": data.get("email"),
    }
    new_access = create_access_token(claims)
    new_refresh = create_refresh_token(claims)

    return {"access_token": new_access, "refresh_token": new_refresh, "token_type": "bearer"}


@router.post("/logout")
def logout(payload: LogoutRequest):
    return {"message": "Logged out successfully"}
