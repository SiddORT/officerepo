"""Exit Management — service layer."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.modules.exit_management import repository as repo
from backend.app.modules.exit_management.constants import (
    RES_DRAFT, RES_SUBMITTED, RES_UNDER_REVIEW, RES_APPROVED,
    RES_REJECTED, RES_WITHDRAWN, TERMINAL_RESIGNATION_STATUSES,
    NP_SERVING, NP_COMPLETED, NP_BUYOUT, NP_WAIVED,
    SETTLE_DRAFT, SETTLE_CALCULATED, SETTLE_APPROVED, SETTLE_PAID,
    ACT_RESIGNATION_SUBMITTED, ACT_RESIGNATION_APPROVED, ACT_RESIGNATION_REJECTED,
    ACT_RESIGNATION_WITHDRAWN, ACT_NOTICE_STARTED, ACT_NOTICE_COMPLETED,
    ACT_NOTICE_BUYOUT, ACT_CLEARANCE_STARTED, ACT_CLEARANCE_DONE,
    ACT_SETTLEMENT_CALCULATED, ACT_SETTLEMENT_APPROVED, ACT_SETTLEMENT_PAID,
    ACT_DOC_GENERATED, ACT_EMPLOYEE_EXITED, ACT_ASSET_RETURNED,
    INT_COMPLETED, ACT_INTERVIEW_COMPLETED,
    DOC_EXPERIENCE, DOC_RELIEVING, DOC_FNF,
)
from backend.app.modules.exit_management.models import ResignationRequest
from backend.app.modules.exit_management.schemas import (
    ResignationCreate, ResignationUpdate, ResignationApprove, ResignationReject,
    ExitPolicyCreate, ExitPolicyUpdate, NoticePeriodUpdate, ClearanceTaskUpdate,
    ExitInterviewUpdate, SubmitInterviewResponses, AssetRecoveryCreate,
    AssetRecoveryUpdate, SettlementCalculate, SettlementApprove, SettlementMarkPaid,
    ExitDocumentGenerate,
)


# ── Helpers ───────────────────────────────────────────────────────────────────
def _actor_id(actor) -> str:
    return str(getattr(actor, "id", actor or "system"))


# ── Exit Policies ─────────────────────────────────────────────────────────────
def list_policies(db: Session, *, include_inactive: bool = False):
    return repo.list_policies(db, include_inactive=include_inactive)


def get_policy_or_404(db: Session, policy_id: str):
    p = repo.get_policy(db, policy_id)
    if not p:
        raise ValueError(f"Exit policy not found: {policy_id}")
    return p


def create_policy(db: Session, payload: ExitPolicyCreate, actor):
    return repo.create_policy(db, payload.model_dump(), _actor_id(actor))


def update_policy(db: Session, policy_id: str, payload: ExitPolicyUpdate, actor):
    p = get_policy_or_404(db, policy_id)
    return repo.update_policy(db, p, payload.model_dump(exclude_none=True))


def delete_policy(db: Session, policy_id: str, actor):
    p = get_policy_or_404(db, policy_id)
    repo.delete_policy(db, p)


def _find_applicable_policy(db: Session, employee_id: str, separation_type: str):
    """Return best-match active policy for the given employee + separation type."""
    policies = repo.list_policies(db, include_inactive=False)
    typed = [p for p in policies if p.separation_type == separation_type]
    if typed:
        return typed[0]
    # Fallback: first active policy (any type)
    if policies:
        return policies[0]
    return None


# ── Resignation Requests ──────────────────────────────────────────────────────
def list_resignations(db: Session, *, status=None, employee_id=None,
                       separation_type=None, page=1, page_size=20):
    items, total = repo.list_resignations(
        db, status=status, employee_id=employee_id,
        separation_type=separation_type, page=page, page_size=page_size,
    )
    return items, total


def get_resignation_or_404(db: Session, resignation_id: str):
    r = repo.get_resignation(db, resignation_id)
    if not r:
        raise ValueError(f"Resignation not found: {resignation_id}")
    return r


def create_resignation(db: Session, payload: ResignationCreate, actor):
    actor_id = _actor_id(actor)
    # Ensure no active resignation for this employee
    existing = repo.get_resignation_by_employee(db, payload.employee_id)
    if existing:
        raise ValueError("Employee already has an active resignation request.")
    data = payload.model_dump()
    r = repo.create_resignation(db, data, actor_id)
    repo.log_activity(db,
        resignation_id=r.id, employee_id=r.employee_id,
        activity_type=ACT_RESIGNATION_SUBMITTED,
        title=f"Resignation request created ({r.separation_type})",
        new_value=r.status, performed_by=actor_id,
    )
    return r


def update_resignation(db: Session, resignation_id: str, payload: ResignationUpdate, actor):
    r = get_resignation_or_404(db, resignation_id)
    if r.status not in (RES_DRAFT,):
        raise ValueError("Only Draft resignations can be updated.")
    return repo.update_resignation(db, r, payload.model_dump(exclude_none=True))


def submit_resignation(db: Session, resignation_id: str, actor):
    actor_id = _actor_id(actor)
    r = get_resignation_or_404(db, resignation_id)
    if r.status != RES_DRAFT:
        raise ValueError("Only Draft resignations can be submitted.")
    repo.update_resignation(db, r, {
        "status": RES_SUBMITTED,
        "submitted_at": datetime.utcnow(),
    })
    repo.log_activity(db,
        resignation_id=r.id, employee_id=r.employee_id,
        activity_type=ACT_RESIGNATION_SUBMITTED,
        title="Resignation submitted for review",
        old_value=RES_DRAFT, new_value=RES_SUBMITTED, performed_by=actor_id,
    )
    return r


def approve_resignation(db: Session, resignation_id: str, payload: ResignationApprove, actor):
    actor_id = _actor_id(actor)
    r = get_resignation_or_404(db, resignation_id)
    if r.status not in (RES_SUBMITTED, RES_UNDER_REVIEW):
        raise ValueError("Resignation must be Submitted or Under Review to approve.")

    lwd = payload.approved_last_working_day or r.requested_last_working_day

    # Find applicable policy
    policy = _find_applicable_policy(db, r.employee_id, r.separation_type)
    notice_days = policy.notice_period_days if policy else 30

    repo.update_resignation(db, r, {
        "status": RES_APPROVED,
        "approved_at": datetime.utcnow(),
        "approved_by": actor_id,
        "approved_last_working_day": lwd,
        "approval_comments": payload.comments,
        "policy_id": policy.id if policy else None,
    })

    # Create notice period
    np = repo.get_notice_period(db, resignation_id)
    if not np:
        np = repo.create_notice_period(
            db, resignation_id=r.id, employee_id=r.employee_id,
            start_date=r.resignation_date, notice_days=notice_days,
        )
        repo.log_activity(db,
            resignation_id=r.id, employee_id=r.employee_id,
            activity_type=ACT_NOTICE_STARTED,
            title=f"Notice period started ({notice_days} days)",
            performed_by=actor_id,
        )

    # Create clearance checklists
    clearances = repo.get_clearances(db, resignation_id)
    if not clearances:
        repo.create_clearances_for_resignation(db, r.id, r.employee_id)
        repo.log_activity(db,
            resignation_id=r.id, employee_id=r.employee_id,
            activity_type=ACT_CLEARANCE_STARTED,
            title="Clearance workflow initiated",
            performed_by=actor_id,
        )

    # Create exit interview
    if not policy or policy.require_exit_interview:
        interview = repo.get_interview(db, resignation_id)
        if not interview:
            repo.create_interview(db, r.id, r.employee_id)

    # Create settlement placeholder
    settlement = repo.get_settlement(db, resignation_id)
    if not settlement:
        repo.create_settlement(db, r.id, r.employee_id)

    repo.log_activity(db,
        resignation_id=r.id, employee_id=r.employee_id,
        activity_type=ACT_RESIGNATION_APPROVED,
        title="Resignation approved",
        old_value=r.status, new_value=RES_APPROVED, performed_by=actor_id,
    )
    return r


def reject_resignation(db: Session, resignation_id: str, payload: ResignationReject, actor):
    actor_id = _actor_id(actor)
    r = get_resignation_or_404(db, resignation_id)
    if r.status not in (RES_SUBMITTED, RES_UNDER_REVIEW):
        raise ValueError("Resignation must be Submitted or Under Review to reject.")
    repo.update_resignation(db, r, {
        "status": RES_REJECTED,
        "rejected_at": datetime.utcnow(),
        "rejected_by": actor_id,
        "rejection_reason": payload.rejection_reason,
    })
    repo.log_activity(db,
        resignation_id=r.id, employee_id=r.employee_id,
        activity_type=ACT_RESIGNATION_REJECTED,
        title="Resignation rejected",
        new_value=RES_REJECTED, performed_by=actor_id,
    )
    return r


def withdraw_resignation(db: Session, resignation_id: str, actor):
    actor_id = _actor_id(actor)
    r = get_resignation_or_404(db, resignation_id)
    if r.status in TERMINAL_RESIGNATION_STATUSES:
        raise ValueError("Cannot withdraw a terminal resignation.")
    repo.update_resignation(db, r, {
        "status": RES_WITHDRAWN,
        "withdrawn_at": datetime.utcnow(),
    })
    repo.log_activity(db,
        resignation_id=r.id, employee_id=r.employee_id,
        activity_type=ACT_RESIGNATION_WITHDRAWN,
        title="Resignation withdrawn",
        performed_by=actor_id,
    )
    return r


# ── Notice Periods ────────────────────────────────────────────────────────────
def get_notice_period(db: Session, resignation_id: str):
    get_resignation_or_404(db, resignation_id)
    return repo.get_notice_period(db, resignation_id)


def update_notice_period(db: Session, resignation_id: str, payload: NoticePeriodUpdate, actor):
    actor_id = _actor_id(actor)
    np = repo.get_notice_period(db, resignation_id)
    if not np:
        raise ValueError("Notice period not found for this resignation.")
    data = payload.model_dump(exclude_none=True)

    # Handle buyout
    if data.get("status") == NP_BUYOUT:
        data["actual_end_date"] = date.today()
        repo.log_activity(db,
            resignation_id=resignation_id,
            employee_id=np.employee_id,
            activity_type=ACT_NOTICE_BUYOUT,
            title="Notice period bought out",
            performed_by=actor_id,
        )
    elif data.get("status") == NP_COMPLETED:
        if not data.get("actual_end_date"):
            data["actual_end_date"] = date.today()
        # Calculate served days
        served = (data["actual_end_date"] - np.notice_start_date).days
        data["served_notice_days"] = max(0, served)
        repo.log_activity(db,
            resignation_id=resignation_id,
            employee_id=np.employee_id,
            activity_type=ACT_NOTICE_COMPLETED,
            title="Notice period completed",
            performed_by=actor_id,
        )

    return repo.update_notice_period(db, np, data)


# ── Clearances ────────────────────────────────────────────────────────────────
def get_clearances(db: Session, resignation_id: str):
    get_resignation_or_404(db, resignation_id)
    return repo.get_clearances(db, resignation_id)


def update_clearance_task(db: Session, resignation_id: str, task_id: str,
                           payload: ClearanceTaskUpdate, actor):
    actor_id = _actor_id(actor)
    get_resignation_or_404(db, resignation_id)
    task = repo.get_clearance_task(db, task_id)
    if not task:
        raise ValueError(f"Clearance task not found: {task_id}")
    result = repo.update_clearance_task(db, task, payload.model_dump(exclude_none=True), actor_id)
    # Check if all clearances done
    if repo.all_clearances_done(db, resignation_id):
        repo.log_activity(db,
            resignation_id=resignation_id,
            activity_type=ACT_CLEARANCE_DONE,
            title="All clearances completed",
            performed_by=actor_id,
        )
    return result


# ── Exit Interview ────────────────────────────────────────────────────────────
def get_interview(db: Session, resignation_id: str):
    get_resignation_or_404(db, resignation_id)
    return repo.get_interview(db, resignation_id)


def get_interview_questions(db: Session):
    return repo.list_interview_questions(db)


def update_interview(db: Session, resignation_id: str, payload: ExitInterviewUpdate, actor):
    actor_id = _actor_id(actor)
    interview = repo.get_interview(db, resignation_id)
    if not interview:
        raise ValueError("Exit interview not found.")
    return repo.update_interview(db, interview, payload.model_dump(exclude_none=True), actor_id)


def submit_interview_responses(db: Session, resignation_id: str,
                                payload: SubmitInterviewResponses, actor):
    actor_id = _actor_id(actor)
    interview = repo.get_interview(db, resignation_id)
    if not interview:
        raise ValueError("Exit interview not found.")
    responses = [r.model_dump() for r in payload.responses]
    repo.save_interview_responses(db, interview.id, responses)
    repo.update_interview(db, interview, {
        "status": INT_COMPLETED,
        "completed_at": datetime.utcnow(),
    }, actor_id)
    repo.log_activity(db,
        resignation_id=resignation_id,
        employee_id=interview.employee_id,
        activity_type=ACT_INTERVIEW_COMPLETED,
        title="Exit interview completed",
        performed_by=actor_id,
    )
    return interview


# ── Asset Recovery ────────────────────────────────────────────────────────────
def list_asset_recoveries(db: Session, resignation_id: str):
    get_resignation_or_404(db, resignation_id)
    return repo.list_asset_recoveries(db, resignation_id)


def create_asset_recovery(db: Session, resignation_id: str, payload: AssetRecoveryCreate, actor):
    actor_id = _actor_id(actor)
    r = get_resignation_or_404(db, resignation_id)
    data = payload.model_dump()
    result = repo.create_asset_recovery(db, resignation_id, r.employee_id, data)
    repo.log_activity(db,
        resignation_id=resignation_id,
        employee_id=r.employee_id,
        activity_type=ACT_ASSET_RETURNED,
        title=f"Asset recovery recorded: {payload.asset_name}",
        performed_by=actor_id,
    )
    return result


def update_asset_recovery(db: Session, resignation_id: str, recovery_id: str,
                           payload: AssetRecoveryUpdate, actor):
    actor_id = _actor_id(actor)
    recovery = repo.get_asset_recovery(db, recovery_id)
    if not recovery or recovery.resignation_id != resignation_id:
        raise ValueError("Asset recovery record not found.")
    return repo.update_asset_recovery(db, recovery, payload.model_dump(exclude_none=True), actor_id)


# ── Final Settlement ──────────────────────────────────────────────────────────
def get_settlement(db: Session, resignation_id: str):
    get_resignation_or_404(db, resignation_id)
    return repo.get_settlement(db, resignation_id)


def calculate_settlement(db: Session, resignation_id: str, payload: SettlementCalculate, actor):
    actor_id = _actor_id(actor)
    r = get_resignation_or_404(db, resignation_id)

    settlement = repo.get_settlement(db, resignation_id)
    if not settlement:
        settlement = repo.create_settlement(db, resignation_id, r.employee_id)

    if settlement.status == SETTLE_PAID:
        raise ValueError("Settlement is already paid.")

    total_earnings = (
        payload.pending_salary + payload.leave_encashment +
        payload.approved_reimbursements + payload.other_earnings
    )
    total_deductions = (
        payload.loan_outstanding + payload.notice_buyout +
        payload.asset_recovery + payload.advance_recovery +
        payload.other_deductions
    )
    net = total_earnings - total_deductions

    data = payload.model_dump()
    data.update({
        "total_earnings": total_earnings,
        "total_deductions": total_deductions,
        "net_amount": net,
        "status": SETTLE_CALCULATED,
        "calculated_at": datetime.utcnow(),
        "calculated_by": actor_id,
    })
    result = repo.update_settlement(db, settlement, data)
    repo.log_activity(db,
        resignation_id=resignation_id,
        employee_id=r.employee_id,
        activity_type=ACT_SETTLEMENT_CALCULATED,
        title=f"Settlement calculated: net ₹{net:,.2f}",
        performed_by=actor_id,
    )
    return result


def approve_settlement(db: Session, resignation_id: str, payload: SettlementApprove, actor):
    actor_id = _actor_id(actor)
    settlement = repo.get_settlement(db, resignation_id)
    if not settlement or settlement.status != SETTLE_CALCULATED:
        raise ValueError("Settlement must be in Calculated state to approve.")
    repo.update_settlement(db, settlement, {
        "status": SETTLE_APPROVED,
        "approved_at": datetime.utcnow(),
        "approved_by": actor_id,
        "approval_comments": payload.comments,
    })
    r = get_resignation_or_404(db, resignation_id)
    repo.log_activity(db,
        resignation_id=resignation_id,
        employee_id=r.employee_id,
        activity_type=ACT_SETTLEMENT_APPROVED,
        title="Settlement approved",
        performed_by=actor_id,
    )
    return settlement


def mark_settlement_paid(db: Session, resignation_id: str, payload: SettlementMarkPaid, actor):
    actor_id = _actor_id(actor)
    settlement = repo.get_settlement(db, resignation_id)
    if not settlement or settlement.status != SETTLE_APPROVED:
        raise ValueError("Settlement must be Approved before marking as paid.")
    repo.update_settlement(db, settlement, {
        "status": SETTLE_PAID,
        "paid_at": datetime.utcnow(),
        "paid_by": actor_id,
        "payment_reference": payload.payment_reference,
    })
    r = get_resignation_or_404(db, resignation_id)
    repo.log_activity(db,
        resignation_id=resignation_id,
        employee_id=r.employee_id,
        activity_type=ACT_SETTLEMENT_PAID,
        title="Settlement paid",
        performed_by=actor_id,
    )
    return settlement


# ── Exit Documents ────────────────────────────────────────────────────────────
def list_exit_documents(db: Session, resignation_id: str):
    get_resignation_or_404(db, resignation_id)
    return repo.list_exit_documents(db, resignation_id)


def generate_exit_document(db: Session, resignation_id: str,
                            payload: ExitDocumentGenerate, actor):
    actor_id = _actor_id(actor)
    r = get_resignation_or_404(db, resignation_id)
    # Determine a placeholder filename
    doc_slug = payload.document_type.lower().replace(" & ", "_").replace(" ", "_")
    file_name = f"{doc_slug}_{r.employee_id}_{date.today().strftime('%Y%m%d')}.pdf"
    doc = repo.create_exit_document(
        db, r.id, r.employee_id, payload.document_type, file_name, actor_id, payload.notes
    )
    repo.log_activity(db,
        resignation_id=r.id,
        employee_id=r.employee_id,
        activity_type=ACT_DOC_GENERATED,
        title=f"Document generated: {payload.document_type}",
        performed_by=actor_id,
    )
    return doc


# ── Activities ────────────────────────────────────────────────────────────────
def list_activities(db: Session, resignation_id: str):
    get_resignation_or_404(db, resignation_id)
    return repo.list_activities(db, resignation_id)


# ── Dashboard ─────────────────────────────────────────────────────────────────
def get_dashboard(db: Session):
    return repo.get_dashboard_counts(db)


# ── Seed ──────────────────────────────────────────────────────────────────────
def seed_defaults(db: Session) -> None:
    repo.seed_interview_questions(db)
