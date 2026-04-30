from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float
from sqlalchemy.orm import declarative_base
from datetime import datetime
import bcrypt

TenantBase = declarative_base()


class Employee(TenantBase):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(500), nullable=False)
    role = Column(String(50), default="employee")  # employee | manager | admin
    department = Column(String(100))
    position = Column(String(100))
    phone = Column(String(30))
    is_active = Column(Boolean, default=True)
    date_joined = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def verify_password(self, plain_password: str) -> bool:
        return bcrypt.checkpw(plain_password.encode("utf-8"), self.hashed_password.encode("utf-8"))

    @staticmethod
    def hash_password(plain: str) -> str:
        return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


class Department(TenantBase):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    manager_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class LeaveRequest(TenantBase):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, nullable=False, index=True)
    leave_type = Column(String(50))  # annual | sick | unpaid
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    reason = Column(Text)
    status = Column(String(30), default="pending")  # pending | approved | rejected
    created_at = Column(DateTime, default=datetime.utcnow)
