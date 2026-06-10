"""Pydantic schemas for Asset Management Setup."""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field, field_validator


class AssetCategoryCreate(BaseModel):
    category_code: str = Field(..., min_length=1, max_length=20)
    category_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=10)
    display_order: int = 0

    @field_validator("category_code", "category_name", mode="before")
    @classmethod
    def strip_str(cls, v):
        return v.strip() if isinstance(v, str) else v


class AssetCategoryUpdate(BaseModel):
    category_code: Optional[str] = Field(None, min_length=1, max_length=20)
    category_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=10)
    display_order: Optional[int] = None

    @field_validator("category_code", "category_name", mode="before")
    @classmethod
    def strip_str(cls, v):
        return v.strip() if isinstance(v, str) and v else v


class AssetSubCategoryCreate(BaseModel):
    sub_category_code: str = Field(..., min_length=1, max_length=20)
    sub_category_name: str = Field(..., min_length=1, max_length=100)
    category_id: str
    description: Optional[str] = None

    @field_validator("sub_category_code", "sub_category_name", mode="before")
    @classmethod
    def strip_str(cls, v):
        return v.strip() if isinstance(v, str) else v


class AssetSubCategoryUpdate(BaseModel):
    sub_category_code: Optional[str] = Field(None, min_length=1, max_length=20)
    sub_category_name: Optional[str] = Field(None, min_length=1, max_length=100)
    category_id: Optional[str] = None
    description: Optional[str] = None

    @field_validator("sub_category_code", "sub_category_name", mode="before")
    @classmethod
    def strip_str(cls, v):
        return v.strip() if isinstance(v, str) and v else v


class AssetMasterCreate(BaseModel):
    asset_code: str = Field(..., min_length=1, max_length=30)
    asset_name: str = Field(..., min_length=1, max_length=150)
    category_id: str
    sub_category_id: Optional[str] = None
    brand: Optional[str] = Field(None, max_length=100)
    model_number: Optional[str] = Field(None, max_length=100)
    manufacturer: Optional[str] = Field(None, max_length=150)
    specifications: Optional[str] = None
    warranty_period_months: Optional[int] = Field(None, ge=0)
    asset_image_url: Optional[str] = Field(None, max_length=500)
    purchase_cost: Optional[float] = Field(None, ge=0)
    expected_life_years: Optional[int] = Field(None, ge=0)
    depreciation_applicable: bool = False
    serial_number_required: bool = False
    warranty_tracking_enabled: bool = False
    maintenance_tracking_enabled: bool = False

    @field_validator("asset_code", "asset_name", mode="before")
    @classmethod
    def strip_str(cls, v):
        return v.strip() if isinstance(v, str) else v


class AssetMasterUpdate(BaseModel):
    asset_code: Optional[str] = Field(None, min_length=1, max_length=30)
    asset_name: Optional[str] = Field(None, min_length=1, max_length=150)
    category_id: Optional[str] = None
    sub_category_id: Optional[str] = None
    brand: Optional[str] = Field(None, max_length=100)
    model_number: Optional[str] = Field(None, max_length=100)
    manufacturer: Optional[str] = Field(None, max_length=150)
    specifications: Optional[str] = None
    warranty_period_months: Optional[int] = Field(None, ge=0)
    asset_image_url: Optional[str] = Field(None, max_length=500)
    purchase_cost: Optional[float] = Field(None, ge=0)
    expected_life_years: Optional[int] = Field(None, ge=0)
    depreciation_applicable: Optional[bool] = None
    serial_number_required: Optional[bool] = None
    warranty_tracking_enabled: Optional[bool] = None
    maintenance_tracking_enabled: Optional[bool] = None

    @field_validator("asset_code", "asset_name", mode="before")
    @classmethod
    def strip_str(cls, v):
        return v.strip() if isinstance(v, str) and v else v
