from pydantic import BaseModel, EmailStr
from typing import Optional, Literal


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    device_id: Optional[str] = None
    device_name: Optional[str] = None
    device_type: Literal["web", "mobile"] = "web"


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    tenant_id: str
    role: str
    device_type: str


class RefreshRequest(BaseModel):
    refresh_token: str
    device_id: Optional[str] = None


class LogoutRequest(BaseModel):
    device_id: Optional[str] = None
    all_devices: bool = False


class SuperAdminLoginRequest(BaseModel):
    email: EmailStr
    password: str
