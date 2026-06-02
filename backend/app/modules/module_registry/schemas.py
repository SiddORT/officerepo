from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ModuleCreate(BaseModel):
    code: str = Field(..., min_length=2, max_length=80, pattern=r"^[a-z0-9_]+$")
    name: str = Field(..., min_length=2, max_length=120)
    description: Optional[str] = None
    route: Optional[str] = Field(None, max_length=120)
    icon: Optional[str] = Field(None, max_length=80)
    display_order: int = 0
    is_system_module: bool = False


class ModuleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=120)
    description: Optional[str] = None
    route: Optional[str] = Field(None, max_length=120)
    icon: Optional[str] = Field(None, max_length=80)
    display_order: Optional[int] = None
    is_active: Optional[bool] = None
    is_system_module: Optional[bool] = None


class ModuleResponse(BaseModel):
    code: str
    name: str
    description: Optional[str]
    route: Optional[str]
    icon: Optional[str]
    display_order: int
    is_active: bool
    is_system_module: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PortalNavModule(BaseModel):
    code: str
    name: str
    description: Optional[str]
    route: Optional[str]
    icon: Optional[str]
    display_order: int


class PortalNavigationResponse(BaseModel):
    workspace_name: str
    modules: list[PortalNavModule]
