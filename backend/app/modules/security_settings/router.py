from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.deps import require_superadmin
from backend.app.database.platform import get_platform_db
from backend.app.modules.security_settings import service
from backend.app.modules.security_settings.schemas import (
    LoginPolicyUpdate,
    NotificationPolicyUpdate,
    PasswordPolicyUpdate,
    SessionPolicyUpdate,
    TwoFAPolicyUpdate,
)
from backend.shared.response import ApiResponse

router = APIRouter(prefix="/security-settings", tags=["Security Settings"])


# ── Password Policy ────────────────────────────────────────────────────────────

@router.get("/password-policy", summary="Get password policy")
def get_password_policy(
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(service.get_password_policy(db)).model_dump()


@router.put("/password-policy", summary="Update password policy")
def update_password_policy(
    payload: PasswordPolicyUpdate,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    data = service.update_password_policy(db, payload, actor=admin.get("email", "system"))
    return ApiResponse.ok(data, message="Password policy updated").model_dump()


# ── Login Policy ───────────────────────────────────────────────────────────────

@router.get("/login-policy", summary="Get login policy")
def get_login_policy(
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(service.get_login_policy(db)).model_dump()


@router.put("/login-policy", summary="Update login policy")
def update_login_policy(
    payload: LoginPolicyUpdate,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    data = service.update_login_policy(db, payload, actor=admin.get("email", "system"))
    return ApiResponse.ok(data, message="Login policy updated").model_dump()


# ── Session Policy ─────────────────────────────────────────────────────────────

@router.get("/session-policy", summary="Get session policy")
def get_session_policy(
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(service.get_session_policy(db)).model_dump()


@router.put("/session-policy", summary="Update session policy")
def update_session_policy(
    payload: SessionPolicyUpdate,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    data = service.update_session_policy(db, payload, actor=admin.get("email", "system"))
    return ApiResponse.ok(data, message="Session policy updated").model_dump()


# ── 2FA Policy ─────────────────────────────────────────────────────────────────

@router.get("/2fa-policy", summary="Get 2FA policy")
def get_2fa_policy(
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(service.get_2fa_policy(db)).model_dump()


@router.put("/2fa-policy", summary="Update 2FA policy")
def update_2fa_policy(
    payload: TwoFAPolicyUpdate,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    data = service.update_2fa_policy(db, payload, actor=admin.get("email", "system"))
    return ApiResponse.ok(data, message="2FA policy updated").model_dump()


# ── Notification Policy ────────────────────────────────────────────────────────

@router.get("/notification-policy", summary="Get security notification policy")
def get_notification_policy(
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(service.get_notification_policy(db)).model_dump()


@router.put("/notification-policy", summary="Update security notification policy")
def update_notification_policy(
    payload: NotificationPolicyUpdate,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    data = service.update_notification_policy(db, payload, actor=admin.get("email", "system"))
    return ApiResponse.ok(data, message="Security notification policy updated").model_dump()
