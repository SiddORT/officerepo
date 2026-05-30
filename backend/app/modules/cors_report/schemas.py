"""Pydantic request/response models for the CORS rejection panel."""
from typing import List, Optional

from pydantic import BaseModel


class CorsRejectionItem(BaseModel):
    origin: str
    hit_count: int
    last_method: Optional[str] = None
    last_path: Optional[str] = None
    first_seen_at: Optional[str] = None
    last_seen_at: Optional[str] = None


class CorsRejectionsResponse(BaseModel):
    distinct_origins: int
    total_hits: int
    items: List[CorsRejectionItem]
