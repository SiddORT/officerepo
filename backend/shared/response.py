from typing import Any, List, Optional
from pydantic import BaseModel


class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Any = None
    errors: List[str] = []

    @classmethod
    def ok(cls, data: Any = None, message: str = "Success") -> "ApiResponse":
        return cls(success=True, message=message, data=data)

    @classmethod
    def fail(cls, message: str, errors: Optional[List[str]] = None) -> "ApiResponse":
        return cls(success=False, message=message, data=None, errors=errors or [])

    @classmethod
    def paginated(
        cls,
        items: List[Any],
        total: int,
        page: int,
        page_size: int,
        message: str = "Success",
    ) -> "ApiResponse":
        return cls(
            success=True,
            message=message,
            data={
                "items": items,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": max(1, -(-total // page_size)),
            },
        )
