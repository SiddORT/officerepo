"""
Portal Auth Router — public + authenticated endpoints for the client portal.

Routes:
  GET  /api/v1/portal/{subdomain}/invite/{token}         validate invite token (public)
  POST /api/v1/portal/{subdomain}/invite/{token}/accept  set password (public)
  POST /api/v1/portal/{subdomain}/auth/login             login → portal JWT (public)
  GET  /api/v1/portal/{subdomain}/navigation             enabled modules (portal JWT required)
"""
from __future__ import annotations

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.platform import get_platform_db
from backend.app.modules.client_management import service as cm_service
from backend.shared.response import ApiResponse

router = APIRouter()


class AcceptInviteRequest(BaseModel):
    password: str = Field(..., min_length=8)


class PortalLoginRequest(BaseModel):
    email: str
    password: str


def _require_portal_jwt(request: Request) -> dict:
    """Dependency: validates a portal_access JWT and returns its payload."""
    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Portal authentication required")
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired portal token")
    if payload.get("token_type") != "portal_access":
        raise HTTPException(status_code=401, detail="Invalid token type — portal_access required")
    return payload


@router.get("/{subdomain}/invite/{token}")
def validate_invite(subdomain: str, token: str, db: Session = Depends(get_platform_db)):
    data = cm_service.validate_portal_invite(db, subdomain, token)
    return ApiResponse.ok(data, "Invite valid.").model_dump()


@router.post("/{subdomain}/invite/{token}/accept")
def accept_invite(subdomain: str, token: str, payload: AcceptInviteRequest,
                  db: Session = Depends(get_platform_db)):
    cm_service.accept_portal_invite(db, subdomain, token, payload.password)
    return ApiResponse.ok(None, "Password set. You can now sign in.").model_dump()


@router.post("/{subdomain}/auth/login")
def portal_login(subdomain: str, payload: PortalLoginRequest, request: Request,
                 db: Session = Depends(get_platform_db)):
    data = cm_service.portal_login(db, subdomain, payload.email, payload.password)

    # Record session + login log in the CLIENT DB (best-effort — never blocks login)
    try:
        from backend.app.core.security import decode_access_token as _decode
        from backend.app.modules.portal_user_management import service as uum_svc
        from backend.app.database.client_db import build_client_db_url, make_client_session
        from backend.app.modules.client_management import repository as client_repo
        from backend.app.modules.client_management.constants import DB_STATUS_ACTIVE
        from datetime import datetime

        token_payload = _decode(data["access_token"])
        jti = token_payload.get("jti")
        exp = token_payload.get("exp")
        expires_at = datetime.utcfromtimestamp(exp) if exp else None
        xff = request.headers.get("X-Forwarded-For")
        ip = xff.split(",")[-1].strip() if xff else (request.client.host if request.client else None)
        ua = request.headers.get("User-Agent")

        # Only record if the client DB is provisioned
        conn = client_repo.get_db_connection(db, data["client_id"])
        if conn and conn.database_status == DB_STATUS_ACTIVE:
            client_session = make_client_session(build_client_db_url(conn))
            try:
                uum_svc.record_login_session(
                    client_db=client_session,
                    platform_db=db,
                    client_id=data["client_id"],
                    user_id=data["admin_user_id"],
                    jti=jti,
                    email=data["email"],
                    ip=ip,
                    user_agent=ua,
                    expires_at=expires_at,
                )
            finally:
                client_session.close()
    except Exception:
        pass  # never block login

    return ApiResponse.ok(data, "Login successful.").model_dump()


@router.get("/{subdomain}/navigation")
def get_navigation(
    subdomain: str,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_require_portal_jwt),
):
    """Return enabled modules for the logged-in client workspace (portal JWT required)."""
    client_id = portal_user.get("client_id")
    workspace_name = portal_user.get("name", subdomain.capitalize())

    from backend.app.modules.module_registry import repository as mod_repo
    from backend.app.modules.client_management import repository as client_repo
    from backend.app.modules.client_management.service import _get_client_by_workspace_id

    # Older tokens may not carry client_id — fall back to subdomain lookup so
    # users with stale sessions still get a correct nav without needing to log out.
    if not client_id:
        client = _get_client_by_workspace_id(db, subdomain)
        client_id = client.id if client else None

    enriched_map = mod_repo.get_enriched_map(db)
    enabled_modules = client_repo.list_modules(db, client_id)

    nav_modules = []
    for m in enabled_modules:
        if not m.is_enabled:
            continue
        meta = enriched_map.get(m.module_name)
        if not meta or not meta.get("is_active"):
            continue
        nav_modules.append({
            "code": meta["code"],
            "name": meta["name"],
            "description": meta.get("description"),
            "route": meta.get("route"),
            "icon": meta.get("icon"),
            "display_order": meta.get("display_order", 0),
        })

    nav_modules.sort(key=lambda x: x["display_order"])

    return ApiResponse.ok({
        "workspace_name": workspace_name,
        "modules": nav_modules,
    }).model_dump()
