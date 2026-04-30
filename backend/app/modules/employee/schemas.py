from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from datetime import datetime


class EmployeeCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Literal["employee", "manager", "admin"] = "employee"
    department: Optional[str] = None
    position: Optional[str] = None
    phone: Optional[str] = None


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class EmployeeResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    department: Optional[str]
    position: Optional[str]
    phone: Optional[str]
    is_active: bool
    date_joined: datetime

    class Config:
        from_attributes = True


class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    manager_id: Optional[int] = None


class DepartmentResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    manager_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    pages: int
