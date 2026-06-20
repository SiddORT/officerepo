"""Payroll Management — service layer (business logic)."""
from __future__ import annotations

import json
import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from . import constants as C
from . import repository as repo
from .models import (
    EmployeeCompensation, PayrollCycle, PayrollRun,
    PayrollRunEmployee, Payslip, SalaryComponent,
    SalaryStructure, SalaryStructureComponent, StatutoryComponent,
)


def _uuid() -> str:
    return str(uuid.uuid4())


MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


# ── Serializers ─────────────────────────────────────────────────────────────────

def _comp_dict(c: SalaryComponent) -> Dict:
    return {
        "id": c.id, "component_code": c.component_code,
        "component_name": c.component_name, "component_type": c.component_type,
        "calc_method": c.calc_method, "default_value": c.default_value,
        "formula": c.formula, "description": c.description,
        "is_taxable": c.is_taxable, "is_pro_rata": c.is_pro_rata,
        "is_system": c.is_system, "is_active": c.is_active,
        "created_at": c.created_at, "updated_at": c.updated_at,
    }


def _struct_dict(s: SalaryStructure, components: Optional[List] = None) -> Dict:
    d = {
        "id": s.id, "structure_name": s.structure_name,
        "description": s.description, "currency": s.currency,
        "company_id": s.company_id, "company_name": s.company_name,
        "effective_from": str(s.effective_from) if s.effective_from else None,
        "effective_to": str(s.effective_to) if s.effective_to else None,
        "is_active": s.is_active, "created_at": s.created_at, "updated_at": s.updated_at,
    }
    if components is not None:
        d["components"] = [_struct_comp_dict(sc) for sc in components]
    return d


def _struct_comp_dict(sc: SalaryStructureComponent) -> Dict:
    return {
        "id": sc.id, "component_id": sc.component_id,
        "amount": sc.amount, "percentage": sc.percentage,
        "formula": sc.formula, "display_order": sc.display_order, "is_active": sc.is_active,
    }


def _emp_comp_dict(ec: EmployeeCompensation) -> Dict:
    return {
        "id": ec.id, "employee_id": ec.employee_id,
        "employee_name": ec.employee_name, "employee_code": ec.employee_code,
        "department_name": ec.department_name, "designation_name": ec.designation_name,
        "structure_id": ec.structure_id, "structure_name": ec.structure_name,
        "ctc_annual": ec.ctc_annual, "gross_monthly": ec.gross_monthly,
        "currency": ec.currency,
        "effective_from": str(ec.effective_from) if ec.effective_from else None,
        "effective_to": str(ec.effective_to) if ec.effective_to else None,
        "status": ec.status, "revision_reason": ec.revision_reason,
        "previous_comp_id": ec.previous_comp_id,
        "created_at": ec.created_at, "updated_at": ec.updated_at,
    }


def _cycle_dict(cy: PayrollCycle) -> Dict:
    return {
        "id": cy.id, "cycle_name": cy.cycle_name, "frequency": cy.frequency,
        "processing_day": cy.processing_day, "salary_day": cy.salary_day,
        "cutoff_day": cy.cutoff_day, "company_id": cy.company_id,
        "company_name": cy.company_name, "branch_id": cy.branch_id,
        "branch_name": cy.branch_name, "description": cy.description,
        "is_default": cy.is_default, "is_active": cy.is_active,
        "created_at": cy.created_at, "updated_at": cy.updated_at,
    }


def _run_dict(r: PayrollRun) -> Dict:
    return {
        "id": r.id, "run_number": r.run_number, "cycle_id": r.cycle_id,
        "cycle_name": r.cycle_name, "frequency": r.frequency,
        "period_month": r.period_month, "period_year": r.period_year,
        "period_label": r.period_label, "status": r.status,
        "total_employees": r.total_employees, "total_gross": r.total_gross,
        "total_deductions": r.total_deductions, "total_net": r.total_net,
        "total_employer_contribution": r.total_employer_contribution,
        "processed_at": r.processed_at, "approved_at": r.approved_at,
        "locked_at": r.locked_at, "paid_at": r.paid_at,
        "processed_by": r.processed_by, "approved_by": r.approved_by,
        "notes": r.notes, "created_at": r.created_at, "updated_at": r.updated_at,
    }


def _run_emp_dict(re: PayrollRunEmployee) -> Dict:
    return {
        "id": re.id, "run_id": re.run_id, "employee_id": re.employee_id,
        "employee_name": re.employee_name, "employee_code": re.employee_code,
        "department_name": re.department_name, "designation_name": re.designation_name,
        "branch_name": re.branch_name, "structure_name": re.structure_name,
        "currency": re.currency, "total_days": re.total_days,
        "present_days": re.present_days, "paid_leave_days": re.paid_leave_days,
        "unpaid_leave_days": re.unpaid_leave_days, "overtime_hours": re.overtime_hours,
        "lop_days": re.lop_days,
        "earnings_breakdown": json.loads(re.earnings_breakdown) if re.earnings_breakdown else [],
        "deductions_breakdown": json.loads(re.deductions_breakdown) if re.deductions_breakdown else [],
        "employer_breakdown": json.loads(re.employer_breakdown) if re.employer_breakdown else [],
        "gross_salary": re.gross_salary, "total_deductions": re.total_deductions,
        "reimbursements": re.reimbursements, "loan_deductions": re.loan_deductions,
        "net_salary": re.net_salary, "employer_contribution": re.employer_contribution,
        "status": re.status, "hold_reason": re.hold_reason,
        "created_at": re.created_at, "updated_at": re.updated_at,
    }


def _slip_dict(s: Payslip) -> Dict:
    return {
        "id": s.id, "run_id": s.run_id, "employee_id": s.employee_id,
        "employee_name": s.employee_name, "employee_code": s.employee_code,
        "period_month": s.period_month, "period_year": s.period_year,
        "period_label": s.period_label, "gross_salary": s.gross_salary,
        "total_deductions": s.total_deductions, "net_salary": s.net_salary,
        "currency": s.currency, "status": s.status,
        "generated_at": s.generated_at, "sent_at": s.sent_at,
        "created_at": s.created_at, "updated_at": s.updated_at,
    }


def _statutory_dict(s: StatutoryComponent) -> Dict:
    return {
        "id": s.id, "statutory_type": s.statutory_type,
        "component_name": s.component_name, "description": s.description,
        "employee_rate": s.employee_rate, "employer_rate": s.employer_rate,
        "fixed_amount": s.fixed_amount, "ceiling_amount": s.ceiling_amount,
        "is_percentage": s.is_percentage,
        "effective_from": str(s.effective_from) if s.effective_from else None,
        "effective_to": str(s.effective_to) if s.effective_to else None,
        "applies_to": s.applies_to, "is_active": s.is_active,
        "created_at": s.created_at, "updated_at": s.updated_at,
    }


# ── Dashboard ───────────────────────────────────────────────────────────────────

def get_dashboard(db: Session, client_id: str) -> Dict:
    from sqlalchemy import func
    now = datetime.utcnow()

    # Run counts by status
    runs = db.query(PayrollRun).filter(
        PayrollRun.client_id == client_id,
        PayrollRun.is_deleted == False,
    ).all()
    status_counts: Dict[str, int] = {}
    for r in runs:
        status_counts[r.status] = status_counts.get(r.status, 0) + 1

    # Latest run
    latest = db.query(PayrollRun).filter(
        PayrollRun.client_id == client_id,
        PayrollRun.is_deleted == False,
    ).order_by(PayrollRun.period_year.desc(), PayrollRun.period_month.desc()).first()

    # Active compensations
    active_comp_count = db.query(EmployeeCompensation).filter(
        EmployeeCompensation.client_id == client_id,
        EmployeeCompensation.status == "Active",
        EmployeeCompensation.is_deleted == False,
    ).count()

    # Pending payslips (generated but not sent)
    pending_slips = db.query(Payslip).filter(
        Payslip.client_id == client_id,
        Payslip.status == "Generated",
        Payslip.is_deleted == False,
    ).count()

    return {
        "run_status_counts": status_counts,
        "pending_approval": status_counts.get("Processed", 0),
        "pending_payment": status_counts.get("Approved", 0),
        "active_compensations": active_comp_count,
        "pending_payslips": pending_slips,
        "latest_run": _run_dict(latest) if latest else None,
    }


# ── Salary Components ───────────────────────────────────────────────────────────

def list_salary_components(db: Session, client_id: str, active_only: bool = False,
                           comp_type: Optional[str] = None, search: Optional[str] = None,
                           page: int = 1, page_size: int = 50) -> Dict:
    items, total = repo.get_components(db, client_id, active_only, comp_type, search, page, page_size)
    return {"data": [_comp_dict(c) for c in items], "total": total, "page": page, "page_size": page_size}


def create_salary_component(db: Session, client_id: str, data: Dict, actor: str) -> Dict:
    existing = repo.get_component_by_code(db, client_id, data["component_code"])
    if existing:
        raise ValueError(f"Component code '{data['component_code']}' already exists.")
    c = SalaryComponent(client_id=client_id, created_by=actor, **data)
    db.add(c)
    db.commit()
    db.refresh(c)
    repo.log_activity(db, client_id, "salary_component", c.id,
                      C.ACT_COMPONENT_CREATED, actor, new_value={"code": c.component_code})
    db.commit()
    return _comp_dict(c)


def update_salary_component(db: Session, client_id: str, comp_id: str,
                             data: Dict, actor: str) -> Dict:
    c = repo.get_component(db, client_id, comp_id)
    if not c:
        raise LookupError("Salary component not found.")
    if c.is_system:
        raise ValueError("System components cannot be modified.")
    for k, v in data.items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    repo.log_activity(db, client_id, "salary_component", c.id, C.ACT_COMPONENT_UPDATED, actor)
    db.commit()
    return _comp_dict(c)


def delete_salary_component(db: Session, client_id: str, comp_id: str, actor: str) -> None:
    c = repo.get_component(db, client_id, comp_id)
    if not c:
        raise LookupError("Salary component not found.")
    if c.is_system:
        raise ValueError("System components cannot be deleted.")
    c.is_deleted = True
    db.commit()


# ── Salary Structures ───────────────────────────────────────────────────────────

def list_salary_structures(db: Session, client_id: str, active_only: bool = False,
                           search: Optional[str] = None,
                           page: int = 1, page_size: int = 50) -> Dict:
    items, total = repo.get_structures(db, client_id, active_only, search, page, page_size)
    result = []
    for s in items:
        comps = repo.get_structure_components(db, s.id)
        result.append(_struct_dict(s, comps))
    return {"data": result, "total": total, "page": page, "page_size": page_size}


def get_salary_structure(db: Session, client_id: str, struct_id: str) -> Dict:
    s = repo.get_structure(db, client_id, struct_id)
    if not s:
        raise LookupError("Salary structure not found.")
    comps = repo.get_structure_components(db, struct_id)
    return _struct_dict(s, comps)


def create_salary_structure(db: Session, client_id: str, data: Dict, actor: str) -> Dict:
    components_data = data.pop("components", None) or []
    s = SalaryStructure(client_id=client_id, created_by=actor, **data)
    db.add(s)
    db.flush()
    _sync_structure_components(db, client_id, s.id, components_data)
    db.commit()
    db.refresh(s)
    repo.log_activity(db, client_id, "salary_structure", s.id, C.ACT_STRUCTURE_CREATED, actor)
    db.commit()
    return _struct_dict(s, repo.get_structure_components(db, s.id))


def update_salary_structure(db: Session, client_id: str, struct_id: str,
                             data: Dict, actor: str) -> Dict:
    s = repo.get_structure(db, client_id, struct_id)
    if not s:
        raise LookupError("Salary structure not found.")
    components_data = data.pop("components", None)
    for k, v in data.items():
        setattr(s, k, v)
    if components_data is not None:
        _sync_structure_components(db, client_id, struct_id, components_data)
    db.commit()
    db.refresh(s)
    repo.log_activity(db, client_id, "salary_structure", s.id, C.ACT_STRUCTURE_UPDATED, actor)
    db.commit()
    return _struct_dict(s, repo.get_structure_components(db, s.id))


def delete_salary_structure(db: Session, client_id: str, struct_id: str, actor: str) -> None:
    s = repo.get_structure(db, client_id, struct_id)
    if not s:
        raise LookupError("Salary structure not found.")
    s.is_deleted = True
    db.commit()


def _sync_structure_components(db: Session, client_id: str, struct_id: str,
                                 components_data: List[Dict]) -> None:
    from sqlalchemy import delete as sa_delete
    db.query(SalaryStructureComponent).filter(
        SalaryStructureComponent.structure_id == struct_id
    ).delete()
    for item in components_data:
        sc = SalaryStructureComponent(
            client_id=client_id,
            structure_id=struct_id,
            component_id=item["component_id"],
            amount=item.get("amount"),
            percentage=item.get("percentage"),
            formula=item.get("formula"),
            display_order=item.get("display_order", 0),
        )
        db.add(sc)
    db.flush()


# ── Employee Compensation ───────────────────────────────────────────────────────

def list_compensations(db: Session, client_id: str, employee_id: Optional[str] = None,
                       status: Optional[str] = None,
                       page: int = 1, page_size: int = 50) -> Dict:
    items, total = repo.get_compensations(db, client_id, employee_id, status, page, page_size)
    return {"data": [_emp_comp_dict(ec) for ec in items], "total": total, "page": page, "page_size": page_size}


def create_compensation(db: Session, client_id: str, data: Dict, actor: str) -> Dict:
    emp_id = data["employee_id"]
    existing = repo.get_active_compensation(db, client_id, emp_id)
    if existing:
        existing.status = "Revised"
        existing.effective_to = data.get("effective_from") or date.today()
        db.flush()
        data["previous_comp_id"] = existing.id

    ec = EmployeeCompensation(client_id=client_id, created_by=actor, **data)
    db.add(ec)
    db.commit()
    db.refresh(ec)
    repo.log_activity(db, client_id, "employee_compensation", ec.id,
                      C.ACT_COMPENSATION_ASSIGNED if not data.get("previous_comp_id")
                      else C.ACT_COMPENSATION_REVISED, actor,
                      new_value={"employee_id": emp_id, "ctc": ec.ctc_annual})
    db.commit()
    return _emp_comp_dict(ec)


def update_compensation(db: Session, client_id: str, comp_id: str,
                        data: Dict, actor: str) -> Dict:
    ec = repo.get_compensation(db, client_id, comp_id)
    if not ec:
        raise LookupError("Compensation record not found.")
    for k, v in data.items():
        setattr(ec, k, v)
    db.commit()
    db.refresh(ec)
    return _emp_comp_dict(ec)


def delete_compensation(db: Session, client_id: str, comp_id: str, actor: str) -> None:
    ec = repo.get_compensation(db, client_id, comp_id)
    if not ec:
        raise LookupError("Compensation record not found.")
    ec.is_deleted = True
    db.commit()


# ── Payroll Cycles ──────────────────────────────────────────────────────────────

def list_payroll_cycles(db: Session, client_id: str, active_only: bool = False,
                        page: int = 1, page_size: int = 50) -> Dict:
    items, total = repo.get_cycles(db, client_id, active_only, page, page_size)
    return {"data": [_cycle_dict(c) for c in items], "total": total, "page": page, "page_size": page_size}


def create_payroll_cycle(db: Session, client_id: str, data: Dict, actor: str) -> Dict:
    cy = PayrollCycle(client_id=client_id, created_by=actor, **data)
    db.add(cy)
    db.commit()
    db.refresh(cy)
    repo.log_activity(db, client_id, "payroll_cycle", cy.id, C.ACT_CYCLE_CREATED, actor)
    db.commit()
    return _cycle_dict(cy)


def update_payroll_cycle(db: Session, client_id: str, cycle_id: str,
                         data: Dict, actor: str) -> Dict:
    cy = repo.get_cycle(db, client_id, cycle_id)
    if not cy:
        raise LookupError("Payroll cycle not found.")
    for k, v in data.items():
        setattr(cy, k, v)
    db.commit()
    db.refresh(cy)
    return _cycle_dict(cy)


def delete_payroll_cycle(db: Session, client_id: str, cycle_id: str, actor: str) -> None:
    cy = repo.get_cycle(db, client_id, cycle_id)
    if not cy:
        raise LookupError("Payroll cycle not found.")
    cy.is_deleted = True
    db.commit()


# ── Payroll Runs ────────────────────────────────────────────────────────────────

def list_payroll_runs(db: Session, client_id: str, status: Optional[str] = None,
                      year: Optional[int] = None, page: int = 1, page_size: int = 50) -> Dict:
    items, total = repo.get_runs(db, client_id, status, year, page, page_size)
    return {"data": [_run_dict(r) for r in items], "total": total, "page": page, "page_size": page_size}


def create_payroll_run(db: Session, client_id: str, data: Dict, actor: str) -> Dict:
    month = data["period_month"]
    year  = data["period_year"]
    cycle_id = data.get("cycle_id")

    if repo.run_exists(db, client_id, cycle_id, month, year):
        raise ValueError(f"A payroll run for {MONTH_NAMES[month]} {year} already exists.")

    cycle = repo.get_cycle(db, client_id, cycle_id) if cycle_id else None
    run_num = f"PAY-{year}{month:02d}-{_uuid()[:4].upper()}"
    period_label = f"{MONTH_NAMES[month]} {year}"

    run = PayrollRun(
        client_id=client_id,
        run_number=run_num,
        cycle_id=cycle_id,
        cycle_name=cycle.cycle_name if cycle else None,
        frequency=cycle.frequency if cycle else "Monthly",
        period_month=month,
        period_year=year,
        period_label=period_label,
        notes=data.get("notes"),
        created_by=actor,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    repo.log_activity(db, client_id, "payroll_run", run.id, C.ACT_RUN_INITIATED, actor,
                      new_value={"period": period_label})
    db.commit()
    return _run_dict(run)


def process_payroll_run(db: Session, client_id: str, run_id: str,
                        actor: str, employee_ids: Optional[List[str]] = None) -> Dict:
    run = repo.get_run(db, client_id, run_id)
    if not run:
        raise LookupError("Payroll run not found.")
    if run.status not in (C.RUN_DRAFT, C.RUN_PROCESSING):
        raise ValueError(f"Cannot process a run in '{run.status}' status.")

    run.status = C.RUN_PROCESSING

    # Fetch active compensations
    from .models import EmployeeCompensation as EC
    q = db.query(EC).filter(
        EC.client_id == client_id,
        EC.status == "Active",
        EC.is_deleted == False,
    )
    if employee_ids:
        q = q.filter(EC.employee_id.in_(employee_ids))
    compensations = q.all()

    # Build component map from structures
    structure_ids = [ec.structure_id for ec in compensations if ec.structure_id]
    struct_comp_map: Dict[str, List[SalaryStructureComponent]] = {}
    for sid in set(structure_ids):
        struct_comp_map[sid] = repo.get_structure_components(db, sid)

    # Component details
    all_comp_ids = set()
    for comps in struct_comp_map.values():
        for sc in comps:
            all_comp_ids.add(sc.component_id)
    comp_details: Dict[str, SalaryComponent] = {}
    for cid in all_comp_ids:
        c = db.query(SalaryComponent).filter(SalaryComponent.id == cid).first()
        if c:
            comp_details[cid] = c

    total_gross = 0.0
    total_deductions = 0.0
    total_net = 0.0
    total_employer = 0.0
    processed_count = 0

    for ec in compensations:
        existing = repo.get_run_employee(db, run_id, ec.employee_id)
        if existing:
            continue  # already computed

        gross_monthly = ec.gross_monthly or 0.0
        earnings_bkd: List[Dict] = []
        deductions_bkd: List[Dict] = []
        employer_bkd: List[Dict] = []
        gross = 0.0
        deductions = 0.0
        employer = 0.0

        if ec.structure_id and ec.structure_id in struct_comp_map:
            for sc in struct_comp_map[ec.structure_id]:
                cd = comp_details.get(sc.component_id)
                if not cd or not cd.is_active:
                    continue
                # Determine amount
                if cd.calc_method == C.CALC_FIXED:
                    amt = sc.amount if sc.amount is not None else (cd.default_value or 0.0)
                elif cd.calc_method == C.CALC_PERCENTAGE:
                    pct = sc.percentage if sc.percentage is not None else (cd.default_value or 0.0)
                    amt = round(gross_monthly * pct / 100.0, 2)
                else:
                    amt = sc.amount if sc.amount is not None else (cd.default_value or 0.0)

                entry = {"code": cd.component_code, "name": cd.component_name, "amount": round(amt, 2)}
                if cd.component_type == C.COMP_TYPE_EARNING:
                    earnings_bkd.append(entry)
                    gross += amt
                elif cd.component_type == C.COMP_TYPE_DEDUCTION:
                    deductions_bkd.append(entry)
                    deductions += amt
                elif cd.component_type == C.COMP_TYPE_EMPLOYER:
                    employer_bkd.append(entry)
                    employer += amt

        net = round(gross - deductions, 2)

        run_emp = PayrollRunEmployee(
            client_id=client_id,
            run_id=run_id,
            employee_id=ec.employee_id,
            employee_name=ec.employee_name,
            employee_code=ec.employee_code,
            department_name=ec.department_name,
            designation_name=ec.designation_name,
            compensation_id=ec.id,
            structure_name=ec.structure_name,
            currency=ec.currency,
            total_days=30,
            present_days=30,
            earnings_breakdown=json.dumps(earnings_bkd),
            deductions_breakdown=json.dumps(deductions_bkd),
            employer_breakdown=json.dumps(employer_bkd),
            gross_salary=round(gross, 2),
            total_deductions=round(deductions, 2),
            net_salary=net,
            employer_contribution=round(employer, 2),
            status=C.EMP_RUN_COMPUTED,
        )
        db.add(run_emp)
        total_gross += gross
        total_deductions += deductions
        total_net += net
        total_employer += employer
        processed_count += 1

    db.flush()

    run.status = C.RUN_PROCESSED
    run.total_employees = processed_count
    run.total_gross = round(total_gross, 2)
    run.total_deductions = round(total_deductions, 2)
    run.total_net = round(total_net, 2)
    run.total_employer_contribution = round(total_employer, 2)
    run.processed_at = datetime.utcnow()
    run.processed_by = actor

    db.commit()
    db.refresh(run)
    repo.log_activity(db, client_id, "payroll_run", run.id, C.ACT_RUN_PROCESSED, actor,
                      new_value={"employees": processed_count, "net": run.total_net})
    db.commit()
    return _run_dict(run)


def approve_payroll_run(db: Session, client_id: str, run_id: str,
                        actor: str, notes: Optional[str] = None) -> Dict:
    run = repo.get_run(db, client_id, run_id)
    if not run:
        raise LookupError("Payroll run not found.")
    if run.status != C.RUN_PROCESSED:
        raise ValueError(f"Can only approve a Processed run, not '{run.status}'.")
    run.status = C.RUN_APPROVED
    run.approved_at = datetime.utcnow()
    run.approved_by = actor
    if notes:
        run.notes = notes
    db.commit()
    db.refresh(run)
    repo.log_activity(db, client_id, "payroll_run", run.id, C.ACT_RUN_APPROVED, actor)
    db.commit()
    return _run_dict(run)


def lock_payroll_run(db: Session, client_id: str, run_id: str, actor: str) -> Dict:
    run = repo.get_run(db, client_id, run_id)
    if not run:
        raise LookupError("Payroll run not found.")
    if run.status != C.RUN_APPROVED:
        raise ValueError(f"Can only lock an Approved run, not '{run.status}'.")
    run.status = C.RUN_LOCKED
    run.locked_at = datetime.utcnow()
    run.locked_by = actor
    db.commit()
    db.refresh(run)
    repo.log_activity(db, client_id, "payroll_run", run.id, C.ACT_RUN_LOCKED, actor)
    db.commit()
    return _run_dict(run)


def mark_run_paid(db: Session, client_id: str, run_id: str, actor: str) -> Dict:
    run = repo.get_run(db, client_id, run_id)
    if not run:
        raise LookupError("Payroll run not found.")
    if run.status != C.RUN_LOCKED:
        raise ValueError(f"Can only mark a Locked run as Paid, not '{run.status}'.")
    run.status = C.RUN_PAID
    run.paid_at = datetime.utcnow()
    run.paid_by = actor
    db.commit()
    db.refresh(run)
    repo.log_activity(db, client_id, "payroll_run", run.id, C.ACT_RUN_PAID, actor)
    db.commit()
    return _run_dict(run)


def get_run_detail(db: Session, client_id: str, run_id: str) -> Dict:
    run = repo.get_run(db, client_id, run_id)
    if not run:
        raise LookupError("Payroll run not found.")
    employees, total_emp = repo.get_run_employees(db, run_id, page_size=500)
    return {
        **_run_dict(run),
        "employees": [_run_emp_dict(e) for e in employees],
        "total_emp": total_emp,
    }


# ── Payslips ────────────────────────────────────────────────────────────────────

def generate_payslips(db: Session, client_id: str, run_id: str, actor: str) -> Dict:
    run = repo.get_run(db, client_id, run_id)
    if not run:
        raise LookupError("Payroll run not found.")
    if run.status not in (C.RUN_PROCESSED, C.RUN_APPROVED, C.RUN_LOCKED, C.RUN_PAID):
        raise ValueError("Payslips can only be generated for processed runs.")

    employees, _ = repo.get_run_employees(db, run_id, page_size=1000)
    generated = 0
    for emp in employees:
        existing = db.query(Payslip).filter(
            Payslip.run_id == run_id, Payslip.employee_id == emp.employee_id
        ).first()
        if existing:
            continue
        slip_data = {
            "employee": {
                "id": emp.employee_id, "name": emp.employee_name,
                "code": emp.employee_code, "department": emp.department_name,
                "designation": emp.designation_name, "branch": emp.branch_name,
            },
            "period": {"month": run.period_month, "year": run.period_year, "label": run.period_label},
            "attendance": {"total_days": emp.total_days, "present_days": emp.present_days, "lop_days": emp.lop_days},
            "earnings": json.loads(emp.earnings_breakdown) if emp.earnings_breakdown else [],
            "deductions": json.loads(emp.deductions_breakdown) if emp.deductions_breakdown else [],
            "employer": json.loads(emp.employer_breakdown) if emp.employer_breakdown else [],
            "gross_salary": emp.gross_salary,
            "total_deductions": emp.total_deductions,
            "reimbursements": emp.reimbursements,
            "loan_deductions": emp.loan_deductions,
            "net_salary": emp.net_salary,
        }
        slip = Payslip(
            client_id=client_id,
            run_id=run_id,
            run_employee_id=emp.id,
            employee_id=emp.employee_id,
            employee_name=emp.employee_name,
            employee_code=emp.employee_code,
            period_month=run.period_month,
            period_year=run.period_year,
            period_label=run.period_label,
            gross_salary=emp.gross_salary,
            total_deductions=emp.total_deductions,
            net_salary=emp.net_salary,
            currency=emp.currency,
            slip_data=json.dumps(slip_data),
            status=C.SLIP_GENERATED,
            generated_at=datetime.utcnow(),
            generated_by=actor,
        )
        db.add(slip)
        generated += 1

    db.commit()
    repo.log_activity(db, client_id, "payroll_run", run_id, C.ACT_PAYSLIP_GENERATED, actor,
                      new_value={"generated": generated})
    db.commit()
    return {"generated": generated, "run_id": run_id}


def list_payslips(db: Session, client_id: str, employee_id: Optional[str] = None,
                  run_id: Optional[str] = None, year: Optional[int] = None,
                  page: int = 1, page_size: int = 50) -> Dict:
    items, total = repo.get_payslips(db, client_id, employee_id, run_id, year, page, page_size)
    return {"data": [_slip_dict(s) for s in items], "total": total, "page": page, "page_size": page_size}


def get_payslip_detail(db: Session, client_id: str, slip_id: str) -> Dict:
    s = repo.get_payslip(db, client_id, slip_id)
    if not s:
        raise LookupError("Payslip not found.")
    d = _slip_dict(s)
    d["slip_data"] = json.loads(s.slip_data) if s.slip_data else None
    return d


# ── Statutory Components ────────────────────────────────────────────────────────

def list_statutory(db: Session, client_id: str, active_only: bool = False,
                   page: int = 1, page_size: int = 50) -> Dict:
    items, total = repo.get_statutory(db, client_id, active_only, page, page_size)
    return {"data": [_statutory_dict(s) for s in items], "total": total, "page": page, "page_size": page_size}


def create_statutory(db: Session, client_id: str, data: Dict, actor: str) -> Dict:
    s = StatutoryComponent(client_id=client_id, created_by=actor, **data)
    db.add(s)
    db.commit()
    db.refresh(s)
    repo.log_activity(db, client_id, "statutory_component", s.id, C.ACT_STATUTORY_CREATED, actor)
    db.commit()
    return _statutory_dict(s)


def update_statutory(db: Session, client_id: str, item_id: str,
                     data: Dict, actor: str) -> Dict:
    s = repo.get_statutory_item(db, client_id, item_id)
    if not s:
        raise LookupError("Statutory component not found.")
    for k, v in data.items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return _statutory_dict(s)


def delete_statutory(db: Session, client_id: str, item_id: str, actor: str) -> None:
    s = repo.get_statutory_item(db, client_id, item_id)
    if not s:
        raise LookupError("Statutory component not found.")
    s.is_deleted = True
    db.commit()


# ── Seeding ─────────────────────────────────────────────────────────────────────

def seed_defaults(db: Session, client_id: str) -> None:
    """Seed default salary components if none exist for this client."""
    existing = db.query(SalaryComponent).filter(
        SalaryComponent.client_id == client_id,
        SalaryComponent.is_deleted == False,
    ).first()
    if existing:
        return

    for d in C.DEFAULT_SALARY_COMPONENTS:
        c = SalaryComponent(
            client_id=client_id,
            component_code=d["code"],
            component_name=d["name"],
            component_type=d["type"],
            calc_method=d["calc"],
            default_value=d["value"],
            is_taxable=d["taxable"],
            is_pro_rata=d["pro_rata"],
            is_system=True,
        )
        db.add(c)
    db.commit()
