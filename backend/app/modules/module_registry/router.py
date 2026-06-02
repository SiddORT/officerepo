from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.deps import require_superadmin
from backend.app.database.platform import get_platform_db
from backend.app.modules.module_registry import service
from backend.app.modules.module_registry.schemas import ModuleCreate, ModuleUpdate
from backend.shared.response import ApiResponse

router = APIRouter(prefix="/modules", tags=["Module Registry"])


@router.get("", summary="List all platform modules")
def list_modules(
    active_only: bool = False,
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(service.list_modules(db, active_only=active_only)).model_dump()


@router.get("/{code}", summary="Get module by code")
def get_module(
    code: str,
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(service.get_module(db, code)).model_dump()


@router.post("", summary="Create a new module", status_code=201)
def create_module(
    payload: ModuleCreate,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    data = service.create_module(db, payload, actor=admin.get("email", "system"))
    return ApiResponse.ok(data, message="Module created").model_dump()


@router.patch("/{code}", summary="Update a module")
def update_module(
    code: str,
    payload: ModuleUpdate,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    data = service.update_module(db, code, payload, actor=admin.get("email", "system"))
    return ApiResponse.ok(data, message="Module updated").model_dump()


@router.delete("/{code}", summary="Deactivate a module (non-system only)")
def deactivate_module(
    code: str,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    data = service.deactivate_module(db, code, actor=admin.get("email", "system"))
    return ApiResponse.ok(data, message="Module deactivated").model_dump()
