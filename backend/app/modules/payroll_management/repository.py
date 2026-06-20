"""Payroll Management — repository layer (raw DB queries)."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from .models import (
    EmployeeCompensation, PayrollActivity, PayrollCycle,
    PayrollRun, PayrollRunEmployee, Payslip,
    SalaryComponent, SalaryStructure, SalaryStructureComponent,
    StatutoryComponent,
)


# ── Salary Components ───────────────────────────────────────────────────────────

def get_components(db: Session, client_id: str, active_only: bool = False,
                   comp_type: Optional[str] = None, search: Optional[str] = None,
                   page: int = 1, page_size: int = 50):
    q = db.query(SalaryComponent).filter(
        SalaryComponent.client_id == client_id,
        SalaryComponent.is_deleted == False,
    )
    if active_only:
        q = q.filter(SalaryComponent.is_active == True)
    if comp_type:
        q = q.filter(SalaryComponent.component_type == comp_type)
    if search:
        like = f"%{search}%"
        q = q.filter(
            SalaryComponent.component_name.ilike(like) |
            SalaryComponent.component_code.ilike(like)
        )
    total = q.count()
    items = q.order_by(SalaryComponent.component_type, SalaryComponent.component_name) \
             .offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_component(db: Session, client_id: str, comp_id: str) -> Optional[SalaryComponent]:
    return db.query(SalaryComponent).filter(
        SalaryComponent.id == comp_id,
        SalaryComponent.client_id == client_id,
        SalaryComponent.is_deleted == False,
    ).first()


def get_component_by_code(db: Session, client_id: str, code: str) -> Optional[SalaryComponent]:
    return db.query(SalaryComponent).filter(
        SalaryComponent.client_id == client_id,
        SalaryComponent.component_code == code.upper(),
        SalaryComponent.is_deleted == False,
    ).first()


# ── Salary Structures ───────────────────────────────────────────────────────────

def get_structures(db: Session, client_id: str, active_only: bool = False,
                   search: Optional[str] = None, page: int = 1, page_size: int = 50):
    q = db.query(SalaryStructure).filter(
        SalaryStructure.client_id == client_id,
        SalaryStructure.is_deleted == False,
    )
    if active_only:
        q = q.filter(SalaryStructure.is_active == True)
    if search:
        q = q.filter(SalaryStructure.structure_name.ilike(f"%{search}%"))
    total = q.count()
    items = q.order_by(SalaryStructure.structure_name) \
             .offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_structure(db: Session, client_id: str, struct_id: str) -> Optional[SalaryStructure]:
    return db.query(SalaryStructure).filter(
        SalaryStructure.id == struct_id,
        SalaryStructure.client_id == client_id,
        SalaryStructure.is_deleted == False,
    ).first()


def get_structure_components(db: Session, structure_id: str) -> List[SalaryStructureComponent]:
    return db.query(SalaryStructureComponent).filter(
        SalaryStructureComponent.structure_id == structure_id,
        SalaryStructureComponent.is_active == True,
    ).order_by(SalaryStructureComponent.display_order).all()


# ── Employee Compensation ───────────────────────────────────────────────────────

def get_compensations(db: Session, client_id: str, employee_id: Optional[str] = None,
                      status: Optional[str] = None, page: int = 1, page_size: int = 50):
    q = db.query(EmployeeCompensation).filter(
        EmployeeCompensation.client_id == client_id,
        EmployeeCompensation.is_deleted == False,
    )
    if employee_id:
        q = q.filter(EmployeeCompensation.employee_id == employee_id)
    if status:
        q = q.filter(EmployeeCompensation.status == status)
    total = q.count()
    items = q.order_by(EmployeeCompensation.created_at.desc()) \
             .offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_active_compensation(db: Session, client_id: str, employee_id: str) -> Optional[EmployeeCompensation]:
    return db.query(EmployeeCompensation).filter(
        EmployeeCompensation.client_id == client_id,
        EmployeeCompensation.employee_id == employee_id,
        EmployeeCompensation.status == "Active",
        EmployeeCompensation.is_deleted == False,
    ).first()


def get_compensation(db: Session, client_id: str, comp_id: str) -> Optional[EmployeeCompensation]:
    return db.query(EmployeeCompensation).filter(
        EmployeeCompensation.id == comp_id,
        EmployeeCompensation.client_id == client_id,
        EmployeeCompensation.is_deleted == False,
    ).first()


# ── Payroll Cycles ──────────────────────────────────────────────────────────────

def get_cycles(db: Session, client_id: str, active_only: bool = False,
               page: int = 1, page_size: int = 50):
    q = db.query(PayrollCycle).filter(
        PayrollCycle.client_id == client_id,
        PayrollCycle.is_deleted == False,
    )
    if active_only:
        q = q.filter(PayrollCycle.is_active == True)
    total = q.count()
    items = q.order_by(PayrollCycle.cycle_name).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_cycle(db: Session, client_id: str, cycle_id: str) -> Optional[PayrollCycle]:
    return db.query(PayrollCycle).filter(
        PayrollCycle.id == cycle_id,
        PayrollCycle.client_id == client_id,
        PayrollCycle.is_deleted == False,
    ).first()


# ── Payroll Runs ────────────────────────────────────────────────────────────────

def get_runs(db: Session, client_id: str, status: Optional[str] = None,
             year: Optional[int] = None, page: int = 1, page_size: int = 50):
    q = db.query(PayrollRun).filter(
        PayrollRun.client_id == client_id,
        PayrollRun.is_deleted == False,
    )
    if status:
        q = q.filter(PayrollRun.status == status)
    if year:
        q = q.filter(PayrollRun.period_year == year)
    total = q.count()
    items = q.order_by(PayrollRun.period_year.desc(), PayrollRun.period_month.desc()) \
             .offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_run(db: Session, client_id: str, run_id: str) -> Optional[PayrollRun]:
    return db.query(PayrollRun).filter(
        PayrollRun.id == run_id,
        PayrollRun.client_id == client_id,
        PayrollRun.is_deleted == False,
    ).first()


def run_exists(db: Session, client_id: str, cycle_id: Optional[str],
               month: int, year: int) -> bool:
    q = db.query(PayrollRun).filter(
        PayrollRun.client_id == client_id,
        PayrollRun.period_month == month,
        PayrollRun.period_year == year,
        PayrollRun.is_deleted == False,
    )
    if cycle_id:
        q = q.filter(PayrollRun.cycle_id == cycle_id)
    return q.first() is not None


def get_run_employees(db: Session, run_id: str, status: Optional[str] = None,
                      page: int = 1, page_size: int = 100):
    q = db.query(PayrollRunEmployee).filter(PayrollRunEmployee.run_id == run_id)
    if status:
        q = q.filter(PayrollRunEmployee.status == status)
    total = q.count()
    items = q.order_by(PayrollRunEmployee.employee_name).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_run_employee(db: Session, run_id: str, emp_id: str) -> Optional[PayrollRunEmployee]:
    return db.query(PayrollRunEmployee).filter(
        PayrollRunEmployee.run_id == run_id,
        PayrollRunEmployee.employee_id == emp_id,
    ).first()


# ── Payslips ────────────────────────────────────────────────────────────────────

def get_payslips(db: Session, client_id: str, employee_id: Optional[str] = None,
                 run_id: Optional[str] = None, year: Optional[int] = None,
                 page: int = 1, page_size: int = 50):
    q = db.query(Payslip).filter(
        Payslip.client_id == client_id,
        Payslip.is_deleted == False,
    )
    if employee_id:
        q = q.filter(Payslip.employee_id == employee_id)
    if run_id:
        q = q.filter(Payslip.run_id == run_id)
    if year:
        q = q.filter(Payslip.period_year == year)
    total = q.count()
    items = q.order_by(Payslip.period_year.desc(), Payslip.period_month.desc()) \
             .offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_payslip(db: Session, client_id: str, slip_id: str) -> Optional[Payslip]:
    return db.query(Payslip).filter(
        Payslip.id == slip_id,
        Payslip.client_id == client_id,
        Payslip.is_deleted == False,
    ).first()


# ── Statutory Components ────────────────────────────────────────────────────────

def get_statutory(db: Session, client_id: str, active_only: bool = False,
                  page: int = 1, page_size: int = 50):
    q = db.query(StatutoryComponent).filter(
        StatutoryComponent.client_id == client_id,
        StatutoryComponent.is_deleted == False,
    )
    if active_only:
        q = q.filter(StatutoryComponent.is_active == True)
    total = q.count()
    items = q.order_by(StatutoryComponent.statutory_type, StatutoryComponent.component_name) \
             .offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_statutory_item(db: Session, client_id: str, item_id: str) -> Optional[StatutoryComponent]:
    return db.query(StatutoryComponent).filter(
        StatutoryComponent.id == item_id,
        StatutoryComponent.client_id == client_id,
        StatutoryComponent.is_deleted == False,
    ).first()


# ── Activities ──────────────────────────────────────────────────────────────────

def log_activity(db: Session, client_id: str, entity_type: str, entity_id: str,
                 action: str, actor: str, old_value: Any = None,
                 new_value: Any = None, notes: str = None) -> None:
    import json
    entry = PayrollActivity(
        client_id=client_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor=actor,
        old_value=json.dumps(old_value) if old_value is not None else None,
        new_value=json.dumps(new_value) if new_value is not None else None,
        notes=notes,
    )
    db.add(entry)
    db.flush()
