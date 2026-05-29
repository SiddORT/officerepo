import logging

from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/csp-report",
    status_code=status.HTTP_204_NO_CONTENT,
    include_in_schema=False,
)
async def receive_csp_report(request: Request):
    """
    Receive Content-Security-Policy violation reports sent by browsers.
    Reports are logged at WARN level for operator visibility; no persistence required.
    """
    try:
        body = await request.json()
    except Exception:
        body = await request.body()
        body = body.decode("utf-8", errors="replace")

    logger.warning("CSP violation report received: %s", body)
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)
