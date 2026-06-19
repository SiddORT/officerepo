"""Pydantic schemas — Asset Inventory."""
from __future__ import annotations

from datetime import date
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class AssetCreate(BaseModel):
    asset_name: str = Field(..., min_length=1, max_length=200)
    category_id: str
    category_name: Optional[str] = None
    sub_category_id: Optional[str] = None
    sub_category_name: Optional[str] = None
    asset_master_id: Optional[str] = None
    status: str = "Available"

    brand: Optional[str] = Field(None, max_length=100)
    manufacturer: Optional[str] = Field(None, max_length=150)
    model_number: Optional[str] = Field(None, max_length=100)
    part_number: Optional[str] = Field(None, max_length=100)
    serial_number: Optional[str] = Field(None, max_length=150)
    barcode_number: Optional[str] = Field(None, max_length=100)

    company_id: Optional[str] = None
    company_name: Optional[str] = None
    branch_id: Optional[str] = None
    branch_name: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None

    assigned_employee_id: Optional[str] = None
    assigned_employee_name: Optional[str] = None
    assigned_date: Optional[date] = None
    expected_return_date: Optional[date] = None
    assignment_notes: Optional[str] = None
    work_location_type: Optional[str] = None

    purchase_date: Optional[date] = None
    purchase_cost: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field("INR", max_length=10)
    vendor_name: Optional[str] = Field(None, max_length=200)
    vendor_contact: Optional[str] = Field(None, max_length=100)
    invoice_number: Optional[str] = Field(None, max_length=100)
    purchase_order_number: Optional[str] = Field(None, max_length=100)

    warranty_available: bool = False
    warranty_start_date: Optional[date] = None
    warranty_end_date: Optional[date] = None
    warranty_provider: Optional[str] = Field(None, max_length=200)
    warranty_reference_number: Optional[str] = Field(None, max_length=100)

    amc_applicable: bool = False
    amc_start_date: Optional[date] = None
    amc_end_date: Optional[date] = None
    amc_vendor: Optional[str] = Field(None, max_length=200)
    amc_cost: Optional[float] = Field(None, ge=0)

    insurance_available: bool = False
    insurance_provider: Optional[str] = Field(None, max_length=200)
    policy_number: Optional[str] = Field(None, max_length=100)
    coverage_amount: Optional[float] = Field(None, ge=0)
    insurance_start_date: Optional[date] = None
    insurance_end_date: Optional[date] = None

    maintenance_required: bool = False
    last_maintenance_date: Optional[date] = None
    next_maintenance_date: Optional[date] = None
    maintenance_frequency: Optional[str] = None

    @field_validator("asset_name", mode="before")
    @classmethod
    def strip_str(cls, v):
        return v.strip() if isinstance(v, str) else v


class AssetUpdate(BaseModel):
    asset_name: Optional[str] = Field(None, min_length=1, max_length=200)
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    sub_category_id: Optional[str] = None
    sub_category_name: Optional[str] = None
    asset_master_id: Optional[str] = None
    status: Optional[str] = None

    brand: Optional[str] = Field(None, max_length=100)
    manufacturer: Optional[str] = Field(None, max_length=150)
    model_number: Optional[str] = Field(None, max_length=100)
    part_number: Optional[str] = Field(None, max_length=100)
    serial_number: Optional[str] = Field(None, max_length=150)
    barcode_number: Optional[str] = Field(None, max_length=100)

    company_id: Optional[str] = None
    company_name: Optional[str] = None
    branch_id: Optional[str] = None
    branch_name: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None

    assigned_employee_id: Optional[str] = None
    assigned_employee_name: Optional[str] = None
    assigned_date: Optional[date] = None
    expected_return_date: Optional[date] = None
    assignment_notes: Optional[str] = None
    work_location_type: Optional[str] = None

    purchase_date: Optional[date] = None
    purchase_cost: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=10)
    vendor_name: Optional[str] = Field(None, max_length=200)
    vendor_contact: Optional[str] = Field(None, max_length=100)
    invoice_number: Optional[str] = Field(None, max_length=100)
    purchase_order_number: Optional[str] = Field(None, max_length=100)

    warranty_available: Optional[bool] = None
    warranty_start_date: Optional[date] = None
    warranty_end_date: Optional[date] = None
    warranty_provider: Optional[str] = Field(None, max_length=200)
    warranty_reference_number: Optional[str] = Field(None, max_length=100)

    amc_applicable: Optional[bool] = None
    amc_start_date: Optional[date] = None
    amc_end_date: Optional[date] = None
    amc_vendor: Optional[str] = Field(None, max_length=200)
    amc_cost: Optional[float] = Field(None, ge=0)

    insurance_available: Optional[bool] = None
    insurance_provider: Optional[str] = Field(None, max_length=200)
    policy_number: Optional[str] = Field(None, max_length=100)
    coverage_amount: Optional[float] = Field(None, ge=0)
    insurance_start_date: Optional[date] = None
    insurance_end_date: Optional[date] = None

    maintenance_required: Optional[bool] = None
    last_maintenance_date: Optional[date] = None
    next_maintenance_date: Optional[date] = None
    maintenance_frequency: Optional[str] = None


class AssetAssignSchema(BaseModel):
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    assigned_date: Optional[date] = None
    expected_return_date: Optional[date] = None
    assignment_notes: Optional[str] = None


class AssetReturnSchema(BaseModel):
    return_date: Optional[date] = None
    condition_on_return: Optional[str] = None  # Good/Damaged/Lost
    return_notes: Optional[str] = None
