"""Exit Management — portal router."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.modules.exit_management import service as svc
from backend.app.modules.exit_management.schemas import (
    ExitPolicyCreate, ExitPolicyUpdate, ExitPolicyOut,
    ResignationCreate, ResignationUpdate, ResignationApprove,
    ResignationReject, ResignationOut,
    NoticePeriodUpdate, NoticePeriodOut,
    ClearanceOut, ClearanceTaskOut, ClearanceTaskUpdate,
    ExitInterviewOut, ExitInterviewUpdate, ExitInterviewQuestionOut,
    SubmitInterviewResponses,
    AssetRecoveryCreate, AssetRecoveryUpdate, AssetRecoveryOut,
    SettlementCalculate, SettlementApprove, SettlementMarkPaid, FinalSettlementOut,
    ExitDocumentOut, ExitDocumentGenerate,
    ExitDashboardOut,
)
from backend.app.modules.exit_management.constants import (
    ALL_SEPARATION_TYPES, ALL_RESIGNATION_STATUSES, ALL_NP_STATUSES,
    ALL_CLEARANCE_STATUSES, ALL_INTERVIEW_MODES, ALL_SETTLEMENT_STATUSES,
    ALL_DOC_TYPES, ALL_REASON_CATEGORIES, ALL_QUESTION_TYPES,
    RESIGNATION_STATUS_COLORS, SETTLEMENT_STATUS_COLORS,
)

# ── Re-use the portal JWT + client DB pattern ─────────────────────────────────
from backend.app.modules.recruitment.router import _portal_jwt, _client_db_dep  # noqa: E402


router = APIRouter(prefix="/{subdomain}/hrms/exit")


def _db_and_user(
    subdomain: str,
    token_data=Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return db, token_data


def _raise(e: Exception):
    raise HTTPException(status_code=400, detail=str(e))


# ── Meta ──────────────────────────────────────────────────────────────────────
@router.get("/meta/options")
def meta_options():
    return {
        "separation_types": ALL_SEPARATION_TYPES,
        "resignation_statuses": ALL_RESIGNATION_STATUSES,
        "resignation_status_colors": RESIGNATION_STATUS_COLORS,
        "notice_period_statuses": ALL_NP_STATUSES,
        "clearance_statuses": ALL_CLEARANCE_STATUSES,
        "interview_modes": ALL_INTERVIEW_MODES,
        "settlement_statuses": ALL_SETTLEMENT_STATUSES,
        "settlement_status_colors": SETTLEMENT_STATUS_COLORS,
        "document_types": ALL_DOC_TYPES,
        "reason_categories": ALL_REASON_CATEGORIES,
        "question_types": ALL_QUESTION_TYPES,
    }


# ── Dashboard ─────────────────────────────────────────────────────────────────
@router.get("/dashboard", response_model=ExitDashboardOut)
def dashboard(subdomain: str, deps=Depends(_db_and_user)):
    db, _ = deps
    return svc.get_dashboard(db)


# ── Exit Policies ─────────────────────────────────────────────────────────────
@router.get("/policies", response_model=list[ExitPolicyOut])
def list_policies(subdomain: str, include_inactive: bool = False, deps=Depends(_db_and_user)):
    db, _ = deps
    return svc.list_policies(db, include_inactive=include_inactive)


@router.post("/policies", response_model=ExitPolicyOut, status_code=201)
def create_policy(subdomain: str, payload: ExitPolicyCreate, deps=Depends(_db_and_user)):
    db, user = deps
    try:
        return svc.create_policy(db, payload, user)
    except ValueError as e:
        _raise(e)


@router.patch("/policies/{policy_id}", response_model=ExitPolicyOut)
def update_policy(subdomain: str, policy_id: str, payload: ExitPolicyUpdate, deps=Depends(_db_and_user)):
    db, user = deps
    try:
        return svc.update_policy(db, policy_id, payload, user)
    except ValueError as e:
        _raise(e)


@router.delete("/policies/{policy_id}", status_code=204)
def delete_policy(subdomain: str, policy_id: str, deps=Depends(_db_and_user)):
    db, user = deps
    try:
        svc.delete_policy(db, policy_id, user)
    except ValueError as e:
        _raise(e)


# ── Resignations ──────────────────────────────────────────────────────────────
@router.get("/resignations", response_model=dict)
def list_resignations(
    subdomain: str,
    status: Optional[str] = None,
    employee_id: Optional[str] = None,
    separation_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    deps=Depends(_db_and_user),
):
    db, _ = deps
    items, total = svc.list_resignations(
        db, status=status, employee_id=employee_id,
        separation_type=separation_type, page=page, page_size=page_size,
    )
    return {
        "items": [ResignationOut.model_validate(r).model_dump() for r in items],
        "total": total, "page": page, "page_size": page_size,
    }


@router.post("/resignations", response_model=ResignationOut, status_code=201)
def create_resignation(subdomain: str, payload: ResignationCreate, deps=Depends(_db_and_user)):
    db, user = deps
    try:
        return svc.create_resignation(db, payload, user)
    except ValueError as e:
        _raise(e)


@router.get("/resignations/{resignation_id}", response_model=ResignationOut)
def get_resignation(subdomain: str, resignation_id: str, deps=Depends(_db_and_user)):
    db, _ = deps
    try:
        return svc.get_resignation_or_404(db, resignation_id)
    except ValueError as e:
        raise HTTPException(404, detail=str(e))


@router.patch("/resignations/{resignation_id}", response_model=ResignationOut)
def update_resignation(subdomain: str, resignation_id: str, payload: ResignationUpdate, deps=Depends(_db_and_user)):
    db, user = deps
    try:
        return svc.update_resignation(db, resignation_id, payload, user)
    except ValueError as e:
        _raise(e)


@router.post("/resignations/{resignation_id}/submit", response_model=ResignationOut)
def submit_resignation(subdomain: str, resignation_id: str, deps=Depends(_db_and_user)):
    db, user = deps
    try:
        return svc.submit_resignation(db, resignation_id, user)
    except ValueError as e:
        _raise(e)


@router.post("/resignations/{resignation_id}/approve", response_model=ResignationOut)
def approve_resignation(subdomain: str, resignation_id: str, payload: ResignationApprove, deps=Depends(_db_and_user)):
    db, user = deps
    try:
        return svc.approve_resignation(db, resignation_id, payload, user)
    except ValueError as e:
        _raise(e)


@router.post("/resignations/{resignation_id}/reject", response_model=ResignationOut)
def reject_resignation(subdomain: str, resignation_id: str, payload: ResignationReject, deps=Depends(_db_and_user)):
    db, user = deps
    try:
        return svc.reject_resignation(db, resignation_id, payload, user)
    except ValueError as e:
        _raise(e)


@router.post("/resignations/{resignation_id}/withdraw", response_model=ResignationOut)
def withdraw_resignation(subdomain: str, resignation_id: str, deps=Depends(_db_and_user)):
    db, user = deps
    try:
        return svc.withdraw_resignation(db, resignation_id, user)
    except ValueError as e:
        _raise(e)


# ── Notice Period ─────────────────────────────────────────────────────────────
@router.get("/resignations/{resignation_id}/notice", response_model=Optional[NoticePeriodOut])
def get_notice_period(subdomain: str, resignation_id: str, deps=Depends(_db_and_user)):
    db, _ = deps
    try:
        return svc.get_notice_period(db, resignation_id)
    except ValueError as e:
        raise HTTPException(404, detail=str(e))


@router.patch("/resignations/{resignation_id}/notice", response_model=NoticePeriodOut)
def update_notice_period(subdomain: str, resignation_id: str, payload: NoticePeriodUpdate, deps=Depends(_db_and_user)):
    db, user = deps
    try:
        return svc.update_notice_period(db, resignation_id, payload, user)
    except ValueError as e:
        _raise(e)


# ── Clearances ────────────────────────────────────────────────────────────────
@router.get("/resignations/{resignation_id}/clearances", response_model=list[ClearanceOut])
def get_clearances(subdomain: str, resignation_id: str, deps=Depends(_db_and_user)):
    db, _ = deps
    try:
        return svc.get_clearances(db, resignation_id)
    except ValueError as e:
        raise HTTPException(404, detail=str(e))


@router.patch("/resignations/{resignation_id}/clearances/tasks/{task_id}", response_model=ClearanceTaskOut)
def update_clearance_task(subdomain: str, resignation_id: str, task_id: str,
                           payload: ClearanceTaskUpdate, deps=Depends(_db_and_user)):
    db, user = deps
    try:
        return svc.update_clearance_task(db, resignation_id, task_id, payload, user)
    except ValueError as e:
        _raise(e)


# ── Exit Interview ────────────────────────────────────────────────────────────
@router.get("/interview-questions", response_model=list[ExitInterviewQuestionOut])
def get_interview_questions(subdomain: str, deps=Depends(_db_and_user)):
    db, _ = deps
    questions = svc.get_interview_questions(db)
    result = []
    for q in questions:
        result.append({
            "id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "topic": q.topic,
            "options": q.options,
            "is_required": q.is_required,
            "display_order": q.display_order,
        })
    return result


@router.get("/resignations/{resignation_id}/interview", response_model=Optional[ExitInterviewOut])
def get_interview(subdomain: str, resignation_id: str, deps=Depends(_db_and_user)):
    db, _ = deps
    try:
        return svc.get_interview(db, resignation_id)
    except ValueError as e:
        raise HTTPException(404, detail=str(e))


@router.patch("/resignations/{resignation_id}/interview", response_model=ExitInterviewOut)
def update_interview(subdomain: str, resignation_id: str, payload: ExitInterviewUpdate, deps=Depends(_db_and_user)):
    db, user = deps
    try:
        return svc.update_interview(db, resignation_id, payload, user)
    except ValueError as e:
        _raise(e)


@router.post("/resignations/{resignation_id}/interview/responses")
def submit_interview(subdomain: str, resignation_id: str,
                     payload: SubmitInterviewResponses, deps=Depends(_db_and_user)):
    db, user = deps
    try:
        return svc.submit_interview_responses(db, resignation_id, payload, user)
    except ValueError as e:
        _raise(e)


# ── Asset Recovery ────────────────────────────────────────────────────────────
@router.get("/resignations/{resignation_id}/assets", response_model=list[AssetRecoveryOut])
def list_assets(subdomain: str, resignation_id: str, deps=Depends(_db_and_user)):
    db, _ = deps
    try:
        return svc.list_asset_recoveries(db, resignation_id)
    except ValueError as e:
        raise HTTPException(404, detail=str(e))


@router.post("/resignations/{resignation_id}/assets", response_model=AssetRecoveryOut, status_code=201)
def add_asset(subdomain: str, resignation_id: str, payload: AssetRecoveryCreate, deps=Depends(_db_and_user)):
    db, user = deps
    try:
        return svc.create_asset_recovery(db, resignation_id, payload, user)
    except ValueError as e:
        _raise(e)


@router.patch("/resignations/{resignation_id}/assets/{recovery_id}", response_model=AssetRecoveryOut)
def update_asset(subdomain: str, resignation_id: str, recovery_id: str,
                 payload: AssetRecoveryUpdate, deps=Depends(_db_and_user)):
    db, user = deps
    try:
        return svc.update_asset_recovery(db, resignation_id, recovery_id, payload, user)
    except ValueError as e:
        _raise(e)


# ── Final Settlement ──────────────────────────────────────────────────────────
@router.get("/resignations/{resignation_id}/settlement", response_model=Optional[FinalSettlementOut])
def get_settlement(subdomain: str, resignation_id: str, deps=Depends(_db_and_user)):
    db, _ = deps
    try:
        return svc.get_settlement(db, resignation_id)
    except ValueError as e:
        raise HTTPException(404, detail=str(e))


@router.post("/resignations/{resignation_id}/settlement/calculate", response_model=FinalSettlementOut)
def calculate_settlement(subdomain: str, resignation_id: str,
                          payload: SettlementCalculate, deps=Depends(_db_and_user)):
    db, user = deps
    try:
        return svc.calculate_settlement(db, resignation_id, payload, user)
    except ValueError as e:
        _raise(e)


@router.post("/resignations/{resignation_id}/settlement/approve", response_model=FinalSettlementOut)
def approve_settlement(subdomain: str, resignation_id: str,
                        payload: SettlementApprove, deps=Depends(_db_and_user)):
    db, user = deps
    try:
        return svc.approve_settlement(db, resignation_id, payload, user)
    except ValueError as e:
        _raise(e)


@router.post("/resignations/{resignation_id}/settlement/pay", response_model=FinalSettlementOut)
def mark_settlement_paid(subdomain: str, resignation_id: str,
                          payload: SettlementMarkPaid, deps=Depends(_db_and_user)):
    db, user = deps
    try:
        return svc.mark_settlement_paid(db, resignation_id, payload, user)
    except ValueError as e:
        _raise(e)


# ── Exit Documents ────────────────────────────────────────────────────────────
@router.get("/resignations/{resignation_id}/documents", response_model=list[ExitDocumentOut])
def list_documents(subdomain: str, resignation_id: str, deps=Depends(_db_and_user)):
    db, _ = deps
    try:
        return svc.list_exit_documents(db, resignation_id)
    except ValueError as e:
        raise HTTPException(404, detail=str(e))


@router.post("/resignations/{resignation_id}/documents/generate", response_model=ExitDocumentOut, status_code=201)
def generate_document(subdomain: str, resignation_id: str,
                       payload: ExitDocumentGenerate, deps=Depends(_db_and_user)):
    db, user = deps
    try:
        return svc.generate_exit_document(db, resignation_id, payload, user)
    except ValueError as e:
        _raise(e)


# ── Activities ────────────────────────────────────────────────────────────────
@router.get("/resignations/{resignation_id}/activities")
def list_activities(subdomain: str, resignation_id: str, deps=Depends(_db_and_user)):
    db, _ = deps
    try:
        acts = svc.list_activities(db, resignation_id)
        return [
            {
                "id": a.id,
                "activity_type": a.activity_type,
                "title": a.title,
                "description": a.description,
                "old_value": a.old_value,
                "new_value": a.new_value,
                "performed_by": a.performed_by,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in acts
        ]
    except ValueError as e:
        raise HTTPException(404, detail=str(e))
