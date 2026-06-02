"""Portal User Management Router.

All routes require a valid portal_access JWT (portal users only).
Prefix: /api/v1/portal/{subdomain}

Routes:
  GET    /{subdomain}/users                    list workspace users
  POST   /{subdomain}/users                    create user
  GET    /{subdomain}/users/{user_id}          user detail
  PATCH  /{subdomain}/users/{user_id}          update user
  POST   /{subdomain}/users/{user_id}/activate
  POST   /{subdomain}/users/{user_id}/deactivate
  POST   /{subdomain}/users/{user_id}/reset-password
  POST   /{subdomain}/users/{user_id}/force-logout

  GET    /{subdomain}/roles                    list roles (seeds defaults lazily)
  POST   /{subdomain}/roles                    create role
  GET    /{subdomain}/roles/{role_id}
  PATCH  /{subdomain}/roles/{role_id}
  POST   /{subdomain}/roles/{role_id}/clone
  POST   /{subdomain}/roles/{role_id}/status   ({is_active})

  GET    /{subdomain}/logs/login               login event log
  GET    /{subdomain}/logs/activity            activity audit log

  GET    /{subdomain}/sessions                 all sessions (active + history)
  DELETE /{subdomain}/sessions/{session_id}    logout one session
  DELETE /{subdomain}/sessions                 logout all my sessions
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.platform import get_platform_db
from backend.app.modules.portal_user_management import service as svc
from backend.app.modules.portal_user_management.schemas import (
    ResetPasswordRequest,
    RoleCreate,
    RoleUpdate,
    UserCreate,
    UserUpdate,
)
from backend.shared.response import ApiResponse

router = APIRouter()


# ── Auth guard ────────────────────────────────────────────────────────────────

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


def _get_ip(request: Request) -> str:
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


def _verify_client(payload: dict, subdomain: str) -> None:
    if payload.get("subdomain") != subdomain:
        raise HTTPException(status_code=403, detail="Token does not match this workspace.")


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/users")
def list_users(
    subdomain: str, request: Request,
    page: int = 1, page_size: int = 20,
    status: str = None,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_portal_jwt),
):
    _verify_client(portal_user, subdomain)
    client_id = portal_user["client_id"]
    result = svc.list_users(db, client_id, page=page, page_size=page_size, status=status)
    return ApiResponse.ok(result).model_dump()


@router.post("/{subdomain}/users")
def create_user(
    subdomain: str, payload: UserCreate, request: Request,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_portal_jwt),
):
    _verify_client(portal_user, subdomain)
    result = svc.create_user(db, portal_user["client_id"], payload,
                             actor_id=portal_user["admin_user_id"],
                             ip=_get_ip(request))
    return ApiResponse.ok(result, "User created.").model_dump()


@router.get("/{subdomain}/users/{user_id}")
def get_user(
    subdomain: str, user_id: str,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_portal_jwt),
):
    _verify_client(portal_user, subdomain)
    result = svc.get_user(db, portal_user["client_id"], user_id)
    return ApiResponse.ok(result).model_dump()


@router.patch("/{subdomain}/users/{user_id}")
def update_user(
    subdomain: str, user_id: str, payload: UserUpdate, request: Request,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_portal_jwt),
):
    _verify_client(portal_user, subdomain)
    result = svc.update_user(db, portal_user["client_id"], user_id, payload,
                             actor_id=portal_user["admin_user_id"],
                             ip=_get_ip(request))
    return ApiResponse.ok(result, "User updated.").model_dump()


@router.post("/{subdomain}/users/{user_id}/activate")
def activate_user(
    subdomain: str, user_id: str, request: Request,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_portal_jwt),
):
    _verify_client(portal_user, subdomain)
    svc.activate_user(db, portal_user["client_id"], user_id,
                      actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(None, "User activated.").model_dump()


@router.post("/{subdomain}/users/{user_id}/deactivate")
def deactivate_user(
    subdomain: str, user_id: str, request: Request,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_portal_jwt),
):
    _verify_client(portal_user, subdomain)
    svc.deactivate_user(db, portal_user["client_id"], user_id,
                        actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(None, "User deactivated.").model_dump()


@router.post("/{subdomain}/users/{user_id}/reset-password")
def reset_password(
    subdomain: str, user_id: str, payload: ResetPasswordRequest, request: Request,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_portal_jwt),
):
    _verify_client(portal_user, subdomain)
    svc.reset_password(db, portal_user["client_id"], user_id, payload.new_password,
                       actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(None, "Password reset.").model_dump()


@router.post("/{subdomain}/users/{user_id}/force-logout")
def force_logout(
    subdomain: str, user_id: str, request: Request,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_portal_jwt),
):
    _verify_client(portal_user, subdomain)
    result = svc.force_logout(db, portal_user["client_id"], user_id,
                              actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result, "User sessions terminated.").model_dump()


# ── Roles ─────────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/roles")
def list_roles(
    subdomain: str,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_portal_jwt),
):
    _verify_client(portal_user, subdomain)
    result = svc.list_roles(db, portal_user["client_id"])
    return ApiResponse.ok(result).model_dump()


@router.post("/{subdomain}/roles")
def create_role(
    subdomain: str, payload: RoleCreate, request: Request,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_portal_jwt),
):
    _verify_client(portal_user, subdomain)
    result = svc.create_role(db, portal_user["client_id"], payload,
                             actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result, "Role created.").model_dump()


@router.get("/{subdomain}/roles/{role_id}")
def get_role(
    subdomain: str, role_id: str,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_portal_jwt),
):
    _verify_client(portal_user, subdomain)
    result = svc.get_role(db, portal_user["client_id"], role_id)
    return ApiResponse.ok(result).model_dump()


@router.patch("/{subdomain}/roles/{role_id}")
def update_role(
    subdomain: str, role_id: str, payload: RoleUpdate, request: Request,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_portal_jwt),
):
    _verify_client(portal_user, subdomain)
    result = svc.update_role(db, portal_user["client_id"], role_id, payload,
                             actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result, "Role updated.").model_dump()


@router.post("/{subdomain}/roles/{role_id}/clone")
def clone_role(
    subdomain: str, role_id: str, request: Request,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_portal_jwt),
):
    _verify_client(portal_user, subdomain)
    result = svc.clone_role(db, portal_user["client_id"], role_id,
                            actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result, "Role cloned.").model_dump()


class StatusBody(BaseModel):
    is_active: bool


@router.post("/{subdomain}/roles/{role_id}/status")
def set_role_status(
    subdomain: str, role_id: str, payload: StatusBody, request: Request,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_portal_jwt),
):
    _verify_client(portal_user, subdomain)
    svc.set_role_status(db, portal_user["client_id"], role_id, payload.is_active,
                        actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    msg = "Role activated." if payload.is_active else "Role deactivated."
    return ApiResponse.ok(None, msg).model_dump()


# ── Login Logs ────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/logs/login")
def get_login_logs(
    subdomain: str,
    page: int = 1, page_size: int = 50,
    user_id: str = None,
    event_type: str = None,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_portal_jwt),
):
    _verify_client(portal_user, subdomain)
    result = svc.list_login_logs(db, portal_user["client_id"],
                                 page=page, page_size=page_size,
                                 user_id=user_id, event_type=event_type)
    return ApiResponse.ok(result).model_dump()


# ── Activity Logs ─────────────────────────────────────────────────────────────

@router.get("/{subdomain}/logs/activity")
def get_activity_logs(
    subdomain: str,
    page: int = 1, page_size: int = 50,
    user_id: str = None,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_portal_jwt),
):
    _verify_client(portal_user, subdomain)
    result = svc.list_activity_logs(db, portal_user["client_id"],
                                    page=page, page_size=page_size, user_id=user_id)
    return ApiResponse.ok(result).model_dump()


# ── Sessions ──────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/sessions")
def list_sessions(
    subdomain: str,
    page: int = 1, page_size: int = 50,
    user_id: str = None,
    active_only: bool = False,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_portal_jwt),
):
    _verify_client(portal_user, subdomain)
    result = svc.list_sessions(db, portal_user["client_id"],
                               page=page, page_size=page_size,
                               user_id=user_id, active_only=active_only)
    return ApiResponse.ok(result).model_dump()


@router.delete("/{subdomain}/sessions/{session_id}")
def logout_session(
    subdomain: str, session_id: str, request: Request,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_portal_jwt),
):
    _verify_client(portal_user, subdomain)
    svc.logout_session(db, portal_user["client_id"], session_id,
                       actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(None, "Session terminated.").model_dump()


@router.delete("/{subdomain}/sessions")
def logout_all_my_sessions(
    subdomain: str, request: Request,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_portal_jwt),
):
    _verify_client(portal_user, subdomain)
    result = svc.logout_all_user_sessions(
        db, portal_user["client_id"], portal_user["admin_user_id"],
        actor_id=portal_user["admin_user_id"], ip=_get_ip(request),
    )
    return ApiResponse.ok(result, "All sessions terminated.").model_dump()
