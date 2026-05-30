"""
GET /api/v1/superadmin/cors-rejections

Surfaces recently blocked cross-origin requests (origin, hit count, last-seen,
sample method/path) so a superadmin can diagnose a misconfigured
``ALLOWED_ORIGINS`` entry or a typo'd subdomain without reading raw server logs.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.core.deps import require_superadmin
from backend.app.database.platform import get_platform_db
from backend.app.modules.cors_report import service
from backend.app.modules.cors_report.schemas import CorsRejectionsResponse

router = APIRouter()


@router.get(
    "/cors-rejections",
    response_model=CorsRejectionsResponse,
    summary="Recently blocked cross-origin requests",
    tags=["superadmin - security"],
)
def get_cors_rejections(
    limit: int = Query(100, ge=1, le=500),
    _payload=Depends(require_superadmin),
    db: Session = Depends(get_platform_db),
) -> CorsRejectionsResponse:
    return service.get_rejections(db, limit=limit)
