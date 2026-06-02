"""
Portal Auth Router — public endpoints for client portal authentication.

Routes (no superadmin guard — these are accessed by client admin users):
  GET  /api/v1/portal/{subdomain}/invite/{token}         validate invite token
  POST /api/v1/portal/{subdomain}/invite/{token}/accept  set password
  POST /api/v1/portal/{subdomain}/auth/login             login → portal JWT
"""
from __future__ import annotations

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.platform import get_platform_db
from backend.app.modules.client_management import service as cm_service
from backend.shared.response import ApiResponse

router = APIRouter()


class AcceptInviteRequest(BaseModel):
    password: str = Field(..., min_length=8)


class PortalLoginRequest(BaseModel):
    email: str
    password: str


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
def portal_login(subdomain: str, payload: PortalLoginRequest,
                 db: Session = Depends(get_platform_db)):
    data = cm_service.portal_login(db, subdomain, payload.email, payload.password)
    return ApiResponse.ok(data, "Login successful.").model_dump()
