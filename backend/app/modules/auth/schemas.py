from pydantic import BaseModel, EmailStr, constr, validator
from typing import Optional


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    all_devices: bool = False


class SuperAdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdateRequest(BaseModel):
    name: Optional[constr(strip_whitespace=True, min_length=1, max_length=255)] = None
    phone: Optional[constr(strip_whitespace=True, max_length=20)] = None

    @validator("phone")
    def _blank_phone_to_none(cls, v):
        return v or None


class ChangePasswordRequest(BaseModel):
    current_password: constr(min_length=1)
    new_password: constr(min_length=8, max_length=128)
