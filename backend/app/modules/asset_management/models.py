"""SQLAlchemy models for Superadmin → Asset Management Setup.

Tables live in the PLATFORM database and are managed by Alembic.
These define the global asset structure shared across all clients.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Integer, Numeric,
    String, Text, ForeignKey, UniqueConstraint, Index,
)

from backend.app.database.platform import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class AssetCategory(Base):
    """Top-level asset grouping: IT Assets, Furniture, Vehicles, etc."""
    __tablename__ = "asset_categories"

    id              = Column(String(36), primary_key=True, default=_uuid)
    category_code   = Column(String(20), nullable=False, unique=True, index=True)
    category_name   = Column(String(100), nullable=False, unique=True, index=True)
    description     = Column(Text, nullable=True)
    icon            = Column(String(10), nullable=True)
    display_order   = Column(Integer, nullable=False, default=0)
    is_active       = Column(Boolean, nullable=False, default=True, index=True)
    created_by      = Column(Integer, nullable=True)
    created_at      = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at      = Column(DateTime, nullable=False, default=datetime.utcnow,
                             onupdate=datetime.utcnow)


class AssetSubCategory(Base):
    """Asset classification within a category: Laptop within IT Assets, etc."""
    __tablename__ = "asset_sub_categories"

    id                  = Column(String(36), primary_key=True, default=_uuid)
    sub_category_code   = Column(String(20), nullable=False)
    sub_category_name   = Column(String(100), nullable=False)
    category_id         = Column(String(36), ForeignKey("asset_categories.id",
                                                        ondelete="RESTRICT"),
                                 nullable=False, index=True)
    description         = Column(Text, nullable=True)
    is_active           = Column(Boolean, nullable=False, default=True, index=True)
    created_by          = Column(Integer, nullable=True)
    created_at          = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at          = Column(DateTime, nullable=False, default=datetime.utcnow,
                                 onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("sub_category_code", "category_id",
                         name="uq_asset_subcat_code_cat"),
        UniqueConstraint("sub_category_name", "category_id",
                         name="uq_asset_subcat_name_cat"),
        Index("ix_asset_sub_categories_cat_active", "category_id", "is_active"),
    )


class AssetMaster(Base):
    """Standard asset template/definition: Dell Latitude 5440, etc."""
    __tablename__ = "asset_masters"

    id              = Column(String(36), primary_key=True, default=_uuid)
    asset_code      = Column(String(30), nullable=False, unique=True, index=True)
    asset_name      = Column(String(150), nullable=False)
    category_id     = Column(String(36), ForeignKey("asset_categories.id",
                                                    ondelete="RESTRICT"),
                             nullable=False, index=True)
    sub_category_id = Column(String(36), ForeignKey("asset_sub_categories.id",
                                                    ondelete="SET NULL"),
                             nullable=True, index=True)

    brand           = Column(String(100), nullable=True)
    model_number    = Column(String(100), nullable=True)
    part_number     = Column(String(100), nullable=True)
    manufacturer    = Column(String(150), nullable=True)

    specifications              = Column(Text, nullable=True)
    warranty_period_months      = Column(Integer, nullable=True)
    asset_image_url             = Column(String(500), nullable=True)

    purchase_cost               = Column(Numeric(14, 2), nullable=True)
    expected_life_months        = Column(Integer, nullable=True)
    depreciation_applicable     = Column(Boolean, nullable=False, default=False)
    depreciation_method         = Column(String(50), nullable=True)

    serial_number_required      = Column(Boolean, nullable=False, default=False)
    warranty_tracking_enabled   = Column(Boolean, nullable=False, default=False)
    maintenance_tracking_enabled= Column(Boolean, nullable=False, default=False)

    is_active   = Column(Boolean, nullable=False, default=True, index=True)
    created_by  = Column(Integer, nullable=True)
    created_at  = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at  = Column(DateTime, nullable=False, default=datetime.utcnow,
                         onupdate=datetime.utcnow)

    __table_args__ = (
        Index("ix_asset_masters_cat_subcat", "category_id", "sub_category_id"),
    )
