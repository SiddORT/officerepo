"""Recruitment Portal Router.

Prefix  : /api/v1/portal/{subdomain}/recruitment
Requires: valid portal_access JWT + Recruitment module enabled.
Data    : CLIENT database.
"""
from __future__ import annotations

from typing import Generator, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.platform import get_platform_db
from backend.app.database.client_db import build_client_db_url, make_client_session, provision_portal_schema
from backend.app.modules.recruitment import service as svc
from backend.app.modules.recruitment.constants import (
    MODULE_NAME, REQUISITION_STATUSES, OPENING_STATUSES, CANDIDATE_STATUSES,
    OFFER_STATUSES, EMPLOYMENT_TYPES, EMPLOYEE_CATEGORIES, HIRING_REASONS,
    CANDIDATE_SOURCES, CAND_DOC_TYPES, GENDERS,
)
from backend.app.modules.recruitment.schemas import (
    RequisitionCreate, RequisitionUpdate, RequisitionApproveReject,
    OpeningCreate, OpeningUpdate,
    CandidateCreate, CandidateUpdate, CandidateStatusChange,
    OfferCreate, OfferUpdate, OfferAction,
)
from backend.shared.response import ApiResponse

router = APIRouter()


# ── Auth / DB dependencies ────────────────────────────────────────────────────

def _portal_jwt(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(401, "Portal authentication required.")
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(401, "Invalid or expired portal token.")
    if payload.get("token_type") != "portal_access":
        raise HTTPException(401, "Portal token required.")
    return payload


def _client_db_dep(
    portal_user: dict = Depends(_portal_jwt),
    platform_db: Session = Depends(get_platform_db),
) -> Generator[Session, None, None]:
    from backend.app.modules.client_management import repository as client_repo
    from backend.app.modules.client_management.constants import DB_STATUS_ACTIVE

    client_id = portal_user["client_id"]
    mod = client_repo.get_module(platform_db, client_id, MODULE_NAME)
    if not mod or not mod.is_enabled:
        raise HTTPException(403, f"{MODULE_NAME} module is not enabled for this workspace.")

    conn = client_repo.get_db_connection(platform_db, client_id)
    if not conn or conn.database_status != DB_STATUS_ACTIVE:
        raise HTTPException(503, "Client workspace database is not provisioned.")

    url = build_client_db_url(conn)
    provision_portal_schema(url, force=False)
    session = make_client_session(url)
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def _sub(portal_user: dict, subdomain: str) -> None:
    if portal_user.get("subdomain") != subdomain:
        raise HTTPException(403, "Token does not match this workspace.")


def _actor(portal_user: dict) -> str:
    return portal_user.get("email") or portal_user.get("name") or "Portal User"


def _cid(portal_user: dict) -> str:
    return portal_user["client_id"]


# ── Meta ──────────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/recruitment/meta/options")
def meta_options(subdomain: str, portal_user: dict = Depends(_portal_jwt)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(data={
        "requisition_statuses": REQUISITION_STATUSES,
        "opening_statuses": OPENING_STATUSES,
        "candidate_statuses": CANDIDATE_STATUSES,
        "offer_statuses": OFFER_STATUSES,
        "employment_types": EMPLOYMENT_TYPES,
        "employee_categories": EMPLOYEE_CATEGORIES,
        "hiring_reasons": HIRING_REASONS,
        "candidate_sources": CANDIDATE_SOURCES,
        "document_types": CAND_DOC_TYPES,
        "genders": GENDERS,
    })


@router.get("/{subdomain}/recruitment/dashboard")
def dashboard(
    subdomain: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(data=svc.dashboard(db, _cid(portal_user)))


# ── Job Requisitions ──────────────────────────────────────────────────────────

@router.get("/{subdomain}/recruitment/requisitions")
def list_requisitions(
    subdomain: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query(""),
    status: str = Query(""),
    department_id: str = Query(""),
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.list_requisitions(db, _cid(portal_user), page=page, page_size=page_size,
                                   search=search, status=status, department_id=department_id)
    return ApiResponse.ok(data=result)


@router.post("/{subdomain}/recruitment/requisitions")
def create_requisition(
    subdomain: str,
    body: RequisitionCreate,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.create_requisition(db, _cid(portal_user), body.model_dump(exclude_none=True), _actor(portal_user))
    return ApiResponse.ok(data=result, message="Requisition created.")


@router.get("/{subdomain}/recruitment/requisitions/{req_id}")
def get_requisition(
    subdomain: str, req_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(data=svc.get_requisition(db, _cid(portal_user), req_id))


@router.patch("/{subdomain}/recruitment/requisitions/{req_id}")
def update_requisition(
    subdomain: str, req_id: str, body: RequisitionUpdate,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.update_requisition(db, _cid(portal_user), req_id, body.model_dump(exclude_none=True))
    return ApiResponse.ok(data=result, message="Requisition updated.")


@router.post("/{subdomain}/recruitment/requisitions/{req_id}/submit")
def submit_requisition(
    subdomain: str, req_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(data=svc.submit_requisition(db, _cid(portal_user), req_id), message="Submitted.")


@router.post("/{subdomain}/recruitment/requisitions/{req_id}/approve")
def approve_requisition(
    subdomain: str, req_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(data=svc.approve_requisition(db, _cid(portal_user), req_id), message="Approved.")


@router.post("/{subdomain}/recruitment/requisitions/{req_id}/reject")
def reject_requisition(
    subdomain: str, req_id: str, body: RequisitionApproveReject,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.reject_requisition(db, _cid(portal_user), req_id, body.rejection_reason)
    return ApiResponse.ok(data=result, message="Rejected.")


@router.delete("/{subdomain}/recruitment/requisitions/{req_id}")
def delete_requisition(
    subdomain: str, req_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    svc.delete_requisition(db, _cid(portal_user), req_id)
    return ApiResponse.ok(message="Deleted.")


# ── Job Openings ──────────────────────────────────────────────────────────────

@router.get("/{subdomain}/recruitment/openings")
def list_openings(
    subdomain: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query(""),
    status: str = Query(""),
    department_id: str = Query(""),
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.list_openings(db, _cid(portal_user), page=page, page_size=page_size,
                               search=search, status=status, department_id=department_id)
    return ApiResponse.ok(data=result)


@router.post("/{subdomain}/recruitment/openings")
def create_opening(
    subdomain: str, body: OpeningCreate,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.create_opening(db, _cid(portal_user), body.model_dump(exclude_none=True), _actor(portal_user))
    return ApiResponse.ok(data=result, message="Opening created.")


@router.get("/{subdomain}/recruitment/openings/{opening_id}")
def get_opening(
    subdomain: str, opening_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(data=svc.get_opening(db, _cid(portal_user), opening_id))


@router.patch("/{subdomain}/recruitment/openings/{opening_id}")
def update_opening(
    subdomain: str, opening_id: str, body: OpeningUpdate,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.update_opening(db, _cid(portal_user), opening_id, body.model_dump(exclude_none=True))
    return ApiResponse.ok(data=result, message="Opening updated.")


@router.delete("/{subdomain}/recruitment/openings/{opening_id}")
def delete_opening(
    subdomain: str, opening_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    svc.delete_opening(db, _cid(portal_user), opening_id)
    return ApiResponse.ok(message="Deleted.")


# ── Candidates ────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/recruitment/candidates")
def list_candidates(
    subdomain: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query(""),
    status: str = Query(""),
    source: str = Query(""),
    opening_id: str = Query(""),
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.list_candidates(db, _cid(portal_user), page=page, page_size=page_size,
                                 search=search, status=status, source=source, opening_id=opening_id)
    return ApiResponse.ok(data=result)


@router.post("/{subdomain}/recruitment/candidates")
def create_candidate(
    subdomain: str, body: CandidateCreate,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.create_candidate(db, _cid(portal_user), body.model_dump(exclude_none=True), _actor(portal_user))
    return ApiResponse.ok(data=result, message="Candidate added.")


@router.get("/{subdomain}/recruitment/candidates/{cand_id}")
def get_candidate(
    subdomain: str, cand_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(data=svc.get_candidate(db, _cid(portal_user), cand_id))


@router.patch("/{subdomain}/recruitment/candidates/{cand_id}")
def update_candidate(
    subdomain: str, cand_id: str, body: CandidateUpdate,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.update_candidate(db, _cid(portal_user), cand_id, body.model_dump(exclude_none=True), _actor(portal_user))
    return ApiResponse.ok(data=result, message="Candidate updated.")


@router.post("/{subdomain}/recruitment/candidates/{cand_id}/status")
def change_status(
    subdomain: str, cand_id: str, body: CandidateStatusChange,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.change_status(db, _cid(portal_user), cand_id, body.status, body.notes, _actor(portal_user))
    return ApiResponse.ok(data=result, message="Status updated.")


@router.delete("/{subdomain}/recruitment/candidates/{cand_id}")
def delete_candidate(
    subdomain: str, cand_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    svc.delete_candidate(db, _cid(portal_user), cand_id)
    return ApiResponse.ok(message="Deleted.")


@router.post("/{subdomain}/recruitment/candidates/{cand_id}/resume")
async def upload_resume(
    subdomain: str, cand_id: str,
    file: UploadFile = File(...),
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.upload_resume(db, _cid(portal_user), cand_id, file, _actor(portal_user))
    return ApiResponse.ok(data=result, message="Resume uploaded.")


@router.get("/{subdomain}/recruitment/candidates/{cand_id}/resume/download")
def download_resume(
    subdomain: str, cand_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    path, filename = svc.get_resume_path(db, _cid(portal_user), cand_id)
    return FileResponse(path, filename=filename, media_type="application/octet-stream")


@router.get("/{subdomain}/recruitment/candidates/{cand_id}/documents")
def list_candidate_docs(
    subdomain: str, cand_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(data=svc.list_docs(db, _cid(portal_user), cand_id))


@router.post("/{subdomain}/recruitment/candidates/{cand_id}/documents")
async def upload_candidate_doc(
    subdomain: str, cand_id: str,
    file: UploadFile = File(...),
    document_type: str = Form(...),
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.upload_doc(db, _cid(portal_user), cand_id, file, document_type, _actor(portal_user))
    return ApiResponse.ok(data=result, message="Document uploaded.")


@router.delete("/{subdomain}/recruitment/candidates/{cand_id}/documents/{doc_id}")
def delete_candidate_doc(
    subdomain: str, cand_id: str, doc_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    svc.delete_doc(db, _cid(portal_user), cand_id, doc_id)
    return ApiResponse.ok(message="Deleted.")


@router.get("/{subdomain}/recruitment/candidates/{cand_id}/documents/{doc_id}/download")
def download_candidate_doc(
    subdomain: str, cand_id: str, doc_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    path, filename = svc.get_doc_path(db, _cid(portal_user), cand_id, doc_id)
    return FileResponse(path, filename=filename, media_type="application/octet-stream")


@router.get("/{subdomain}/recruitment/timeline")
def recruitment_timeline(
    subdomain: str,
    limit: int = Query(15, ge=1, le=50),
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    """Global recruitment activity timeline — latest N events across all candidates."""
    _sub(portal_user, subdomain)
    from backend.app.modules.recruitment import repository as repo
    return ApiResponse.ok(data=repo.get_global_timeline(db, _cid(portal_user), limit=limit))


@router.get("/{subdomain}/recruitment/candidates/{cand_id}/activities")
def candidate_activities(
    subdomain: str, cand_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(data=svc.list_activities(db, _cid(portal_user), cand_id))


# ── Offers ────────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/recruitment/offers")
def list_offers(
    subdomain: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    candidate_id: str = Query(""),
    status: str = Query(""),
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.list_offers(db, _cid(portal_user), page=page, page_size=page_size,
                             candidate_id=candidate_id, status=status)
    return ApiResponse.ok(data=result)


@router.post("/{subdomain}/recruitment/offers")
def create_offer(
    subdomain: str, body: OfferCreate,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.create_offer(db, _cid(portal_user), body.model_dump(exclude_none=True), _actor(portal_user))
    return ApiResponse.ok(data=result, message="Offer created.")


@router.get("/{subdomain}/recruitment/offers/{offer_id}")
def get_offer(
    subdomain: str, offer_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(data=svc.get_offer(db, _cid(portal_user), offer_id))


@router.patch("/{subdomain}/recruitment/offers/{offer_id}")
def update_offer(
    subdomain: str, offer_id: str, body: OfferUpdate,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.update_offer(db, _cid(portal_user), offer_id, body.model_dump(exclude_none=True))
    return ApiResponse.ok(data=result, message="Offer updated.")


@router.post("/{subdomain}/recruitment/offers/{offer_id}/send")
def send_offer(
    subdomain: str, offer_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(data=svc.send_offer(db, _cid(portal_user), offer_id, _actor(portal_user)), message="Offer sent.")


@router.post("/{subdomain}/recruitment/offers/{offer_id}/accept")
def accept_offer(
    subdomain: str, offer_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(data=svc.accept_offer(db, _cid(portal_user), offer_id, _actor(portal_user)), message="Offer accepted.")


@router.post("/{subdomain}/recruitment/offers/{offer_id}/reject")
def reject_offer(
    subdomain: str, offer_id: str, body: OfferAction,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.reject_offer(db, _cid(portal_user), offer_id, body.rejection_reason, _actor(portal_user))
    return ApiResponse.ok(data=result, message="Offer rejected.")
