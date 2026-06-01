"""
Auth router — thin HTTP adapter.

All business logic (credential verification, token issuance, profile
management, password change) lives in the service layer. This module
only handles HTTP plumbing: extracting credentials from headers,
delegating to the service, and returning the response.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.platform import get_platform_db
from backend.app.modules.auth import service as auth_service
from backend.app.modules.auth.schemas import (
    RefreshRequest, LogoutRequest, SuperAdminLoginRequest,
    ProfileUpdateRequest, ChangePasswordRequest,
)
from backend.app.modules.rbac import service as rbac_service
from backend.app.modules.rbac.schemas import AcceptInvitationRequest

router = APIRouter()
_bearer = HTTPBearer()


def _authenticate(credentials: HTTPAuthorizationCredentials) -> dict:
    """Decode the bearer token; raise 401/403 if invalid or not superadmin."""
    try:
        payload = decode_access_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if payload.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return payload


@router.post("/superadmin/login")
def superadmin_login(
    payload: SuperAdminLoginRequest,
    db: Session = Depends(get_platform_db),
):
    return auth_service.login(db, payload.email, payload.password)


@router.get("/me")
def me(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_platform_db),
):
    """Return the current admin's identity + freshly-resolved permissions."""
    token_payload = _authenticate(credentials)
    return auth_service.get_identity(db, token_payload)


@router.get("/profile")
def get_profile(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_platform_db),
):
    token_payload = _authenticate(credentials)
    return auth_service.get_profile(db, token_payload["user_id"])


@router.patch("/profile")
def update_profile(
    payload: ProfileUpdateRequest,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_platform_db),
):
    token_payload = _authenticate(credentials)
    return auth_service.update_profile(db, token_payload["user_id"], payload)


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_platform_db),
):
    token_payload = _authenticate(credentials)
    return auth_service.change_password(
        db, token_payload["user_id"],
        payload.current_password, payload.new_password,
    )


@router.post("/refresh")
def refresh_token(payload: RefreshRequest):
    return auth_service.refresh_tokens(payload.refresh_token)


@router.post("/logout")
def logout(payload: LogoutRequest):
    return {"message": "Logged out successfully"}


# ── Public invitation acceptance (no auth) ───────────────────────────────────
@router.get("/invitations/{token}")
def get_invitation(token: str, db: Session = Depends(get_platform_db)):
    """Resolve an invitation token → the invited email/name (for the accept form)."""
    return rbac_service.get_invitation(db, token)


@router.post("/invitations/{token}/accept")
def accept_invitation(
    token: str,
    payload: AcceptInvitationRequest,
    db: Session = Depends(get_platform_db),
):
    """Set the account password and activate it, consuming the invitation token."""
    return rbac_service.accept_invitation(db, token, payload.password)
