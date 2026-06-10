"""Portal User Management Router.

All routes require a valid portal_access JWT unless marked (public).
Prefix: /api/v1/portal

Routes
  GET    /{subdomain}/permissions               — catalog grouped by module
  GET    /{subdomain}/roles/{role_id}/permissions
  PUT    /{subdomain}/roles/{role_id}/permissions

  GET    /{subdomain}/users
  POST   /{subdomain}/users                     — invite flow (returns invite_link)
  GET    /{subdomain}/users/{user_id}
  PATCH  /{subdomain}/users/{user_id}
  DELETE /{subdomain}/users/{user_id}           — remove pending user only
  POST   /{subdomain}/users/{user_id}/activate
  POST   /{subdomain}/users/{user_id}/deactivate
  POST   /{subdomain}/users/{user_id}/reset-password
  POST   /{subdomain}/users/{user_id}/force-logout
  POST   /{subdomain}/users/{user_id}/resend-invite

  GET    /{subdomain}/roles
  POST   /{subdomain}/roles
  GET    /{subdomain}/roles/{role_id}
  PATCH  /{subdomain}/roles/{role_id}
  POST   /{subdomain}/roles/{role_id}/clone
  POST   /{subdomain}/roles/{role_id}/status

  GET    /{subdomain}/logs/login
  GET    /{subdomain}/logs/activity

  GET    /{subdomain}/sessions
  DELETE /{subdomain}/sessions/{session_id}
  DELETE /{subdomain}/sessions
"""
from __future__ import annotations

from typing import Generator, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.platform import get_platform_db
from backend.app.database.client_db import build_client_db_url, make_client_session
from backend.app.modules.portal_user_management import service as svc
from backend.app.modules.portal_user_management.schemas import (
    ResetPasswordRequest, RoleCreate, RoleUpdate, UserCreate, UserUpdate,
)
from backend.shared.response import ApiResponse

router = APIRouter()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_ip(request: Request) -> str:
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


# ── Auth guard ─────────────────────────────────────────────────────────────────

def _portal_jwt(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Portal authentication required.")
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired portal token.")
    if payload.get("token_type") != "portal_access":
        raise HTTPException(status_code=401, detail="Portal token required.")
    return payload


def _verify_subdomain(payload: dict, subdomain: str) -> None:
    if payload.get("subdomain") != subdomain:
        raise HTTPException(status_code=403, detail="Token does not match this workspace.")


# ── Client DB dependency ───────────────────────────────────────────────────────

def _client_db_dep(
    portal_user: dict = Depends(_portal_jwt),
    platform_db: Session = Depends(get_platform_db),
) -> Generator[Session, None, None]:
    from backend.app.modules.client_management import repository as client_repo
    from backend.app.modules.client_management.constants import DB_STATUS_ACTIVE

    conn = client_repo.get_db_connection(platform_db, portal_user["client_id"])
    if not conn or conn.database_status != DB_STATUS_ACTIVE:
        raise HTTPException(
            status_code=503,
            detail="This workspace's database has not been provisioned yet.",
        )
    url = build_client_db_url(conn)
    # Ensure new tables (permissions, etc.) exist on existing client DBs
    from backend.app.database.client_db import provision_portal_schema
    provision_portal_schema(url)
    session = make_client_session(url)
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


# ── Permissions ────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/permissions")
def get_permissions_catalog(
    subdomain: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    result = svc.get_permissions_catalog(client_db, portal_user["client_id"])
    return ApiResponse.ok(result).model_dump()


@router.get("/{subdomain}/roles/{role_id}/permissions")
def get_role_permissions(
    subdomain: str, role_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    result = svc.get_role_permissions(client_db, portal_user["client_id"], role_id)
    return ApiResponse.ok(result).model_dump()


class SetPermissionsBody(BaseModel):
    permission_ids: List[str]


@router.put("/{subdomain}/roles/{role_id}/permissions")
def set_role_permissions(
    subdomain: str, role_id: str, payload: SetPermissionsBody, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    result = svc.set_role_permissions(
        client_db, portal_user["client_id"], role_id, payload.permission_ids,
        actor_id=portal_user["admin_user_id"], ip=_get_ip(request),
    )
    return ApiResponse.ok(result, "Permissions updated.").model_dump()


# ── Users ──────────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/users")
def list_users(
    subdomain: str, request: Request,
    page: int = 1, page_size: int = 20, status: Optional[str] = None,
    portal_user: dict = Depends(_portal_jwt),
    platform_db: Session = Depends(get_platform_db),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    result = svc.list_users(platform_db, client_db, portal_user["client_id"],
                            page=page, page_size=page_size, status=status)
    return ApiResponse.ok(result).model_dump()


@router.post("/{subdomain}/users")
def invite_user(
    subdomain: str, payload: UserCreate, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    platform_db: Session = Depends(get_platform_db),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    result = svc.invite_user(
        platform_db, client_db, portal_user["client_id"], subdomain, payload,
        actor_id=portal_user["admin_user_id"], ip=_get_ip(request),
    )
    return ApiResponse.ok(result, "Invitation sent.").model_dump()


@router.get("/{subdomain}/users/{user_id}")
def get_user(
    subdomain: str, user_id: str,
    portal_user: dict = Depends(_portal_jwt),
    platform_db: Session = Depends(get_platform_db),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    result = svc.get_user(platform_db, client_db, portal_user["client_id"], user_id)
    return ApiResponse.ok(result).model_dump()


@router.patch("/{subdomain}/users/{user_id}")
def update_user(
    subdomain: str, user_id: str, payload: UserUpdate, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    platform_db: Session = Depends(get_platform_db),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    result = svc.update_user(platform_db, client_db, portal_user["client_id"], user_id, payload,
                             actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result, "User updated.").model_dump()


@router.delete("/{subdomain}/users/{user_id}")
def remove_user(
    subdomain: str, user_id: str, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    platform_db: Session = Depends(get_platform_db),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    svc.remove_user(platform_db, client_db, portal_user["client_id"], user_id,
                    actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(None, "User removed.").model_dump()


@router.post("/{subdomain}/users/{user_id}/resend-invite")
def resend_invite(
    subdomain: str, user_id: str, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    platform_db: Session = Depends(get_platform_db),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    result = svc.resend_invite(platform_db, client_db, portal_user["client_id"],
                               subdomain, user_id,
                               actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result, "Invite resent.").model_dump()


@router.post("/{subdomain}/users/{user_id}/activate")
def activate_user(
    subdomain: str, user_id: str, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    platform_db: Session = Depends(get_platform_db),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    svc.activate_user(platform_db, client_db, portal_user["client_id"], user_id,
                      actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(None, "User activated.").model_dump()


@router.post("/{subdomain}/users/{user_id}/deactivate")
def deactivate_user(
    subdomain: str, user_id: str, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    platform_db: Session = Depends(get_platform_db),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    svc.deactivate_user(platform_db, client_db, portal_user["client_id"], user_id,
                        actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(None, "User deactivated.").model_dump()


@router.post("/{subdomain}/users/{user_id}/reset-password")
def reset_password(
    subdomain: str, user_id: str, payload: ResetPasswordRequest, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    platform_db: Session = Depends(get_platform_db),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    svc.reset_password(platform_db, client_db, portal_user["client_id"], user_id,
                       payload.new_password, actor_id=portal_user["admin_user_id"],
                       ip=_get_ip(request))
    return ApiResponse.ok(None, "Password reset.").model_dump()


@router.post("/{subdomain}/users/{user_id}/force-logout")
def force_logout(
    subdomain: str, user_id: str, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    platform_db: Session = Depends(get_platform_db),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    result = svc.force_logout(platform_db, client_db, portal_user["client_id"], user_id,
                              actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result, "User sessions terminated.").model_dump()


# ── Roles ──────────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/roles")
def list_roles(
    subdomain: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    return ApiResponse.ok(svc.list_roles(client_db, portal_user["client_id"])).model_dump()


@router.post("/{subdomain}/roles")
def create_role(
    subdomain: str, payload: RoleCreate, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    result = svc.create_role(client_db, portal_user["client_id"], payload,
                             actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result, "Role created.").model_dump()


@router.get("/{subdomain}/roles/{role_id}")
def get_role(
    subdomain: str, role_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    return ApiResponse.ok(svc.get_role(client_db, portal_user["client_id"], role_id)).model_dump()


@router.patch("/{subdomain}/roles/{role_id}")
def update_role(
    subdomain: str, role_id: str, payload: RoleUpdate, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    result = svc.update_role(client_db, portal_user["client_id"], role_id, payload,
                             actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result, "Role updated.").model_dump()


@router.post("/{subdomain}/roles/{role_id}/clone")
def clone_role(
    subdomain: str, role_id: str, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    result = svc.clone_role(client_db, portal_user["client_id"], role_id,
                            actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result, "Role cloned.").model_dump()


class StatusBody(BaseModel):
    is_active: bool


@router.post("/{subdomain}/roles/{role_id}/status")
def set_role_status(
    subdomain: str, role_id: str, payload: StatusBody, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    svc.set_role_status(client_db, portal_user["client_id"], role_id, payload.is_active,
                        actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    msg = "Role activated." if payload.is_active else "Role deactivated."
    return ApiResponse.ok(None, msg).model_dump()


# ── Login Logs ─────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/logs/login")
def get_login_logs(
    subdomain: str,
    page: int = 1, page_size: int = 50,
    user_id: Optional[str] = None, event_type: Optional[str] = None,
    portal_user: dict = Depends(_portal_jwt),
    platform_db: Session = Depends(get_platform_db),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    result = svc.list_login_logs(client_db, platform_db, portal_user["client_id"],
                                 page=page, page_size=page_size,
                                 user_id=user_id, event_type=event_type)
    return ApiResponse.ok(result).model_dump()


# ── Activity Logs ──────────────────────────────────────────────────────────────

@router.get("/{subdomain}/logs/activity")
def get_activity_logs(
    subdomain: str,
    page: int = 1, page_size: int = 50, user_id: Optional[str] = None,
    portal_user: dict = Depends(_portal_jwt),
    platform_db: Session = Depends(get_platform_db),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    result = svc.list_activity_logs(client_db, platform_db, portal_user["client_id"],
                                    page=page, page_size=page_size, user_id=user_id)
    return ApiResponse.ok(result).model_dump()


# ── Sessions ───────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/sessions")
def list_sessions(
    subdomain: str,
    page: int = 1, page_size: int = 50,
    user_id: Optional[str] = None, active_only: bool = False,
    portal_user: dict = Depends(_portal_jwt),
    platform_db: Session = Depends(get_platform_db),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    result = svc.list_sessions(client_db, platform_db, portal_user["client_id"],
                               page=page, page_size=page_size,
                               user_id=user_id, active_only=active_only)
    return ApiResponse.ok(result).model_dump()


@router.delete("/{subdomain}/sessions/{session_id}")
def logout_session(
    subdomain: str, session_id: str, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    svc.logout_session(client_db, portal_user["client_id"], session_id,
                       actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(None, "Session terminated.").model_dump()


@router.delete("/{subdomain}/sessions")
def logout_all_my_sessions(
    subdomain: str, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _verify_subdomain(portal_user, subdomain)
    result = svc.logout_all_user_sessions(
        client_db, portal_user["client_id"], portal_user["admin_user_id"],
        actor_id=portal_user["admin_user_id"], ip=_get_ip(request),
    )
    return ApiResponse.ok(result, "All sessions terminated.").model_dump()
