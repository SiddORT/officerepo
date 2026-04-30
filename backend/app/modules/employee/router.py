from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import math

from backend.app.modules.employee.models import Employee, Department
from backend.app.modules.employee.schemas import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse,
    DepartmentCreate, DepartmentResponse, PaginatedResponse
)
from backend.app.core.db_router import get_tenant_db

router = APIRouter()


@router.get("/", response_model=PaginatedResponse)
def list_employees(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    db: Session = Depends(get_tenant_db),
):
    q = db.query(Employee)
    if search:
        q = q.filter(
            (Employee.name.ilike(f"%{search}%")) |
            (Employee.email.ilike(f"%{search}%"))
        )
    if department:
        q = q.filter(Employee.department == department)

    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(
        items=[EmployeeResponse.model_validate(e) for e in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total else 1,
    )


@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(employee_id: int, db: Session = Depends(get_tenant_db)):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp


@router.post("/", response_model=EmployeeResponse, status_code=201)
def create_employee(payload: EmployeeCreate, db: Session = Depends(get_tenant_db)):
    existing = db.query(Employee).filter(Employee.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    emp = Employee(
        name=payload.name,
        email=payload.email,
        hashed_password=Employee.hash_password(payload.password),
        role=payload.role,
        department=payload.department,
        position=payload.position,
        phone=payload.phone,
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


@router.patch("/{employee_id}", response_model=EmployeeResponse)
def update_employee(employee_id: int, payload: EmployeeUpdate, db: Session = Depends(get_tenant_db)):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(emp, field, val)
    db.commit()
    db.refresh(emp)
    return emp


@router.delete("/{employee_id}", status_code=204)
def delete_employee(employee_id: int, db: Session = Depends(get_tenant_db)):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    db.delete(emp)
    db.commit()


@router.get("/departments/", response_model=List[DepartmentResponse])
def list_departments(db: Session = Depends(get_tenant_db)):
    return db.query(Department).all()


@router.post("/departments/", response_model=DepartmentResponse, status_code=201)
def create_department(payload: DepartmentCreate, db: Session = Depends(get_tenant_db)):
    dept = Department(**payload.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept
