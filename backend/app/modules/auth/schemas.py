from pydantic import BaseModel, EmailStr
from typing import Optional


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    all_devices: bool = False


class SuperAdminLoginRequest(BaseModel):
    email: EmailStr
    password: str
