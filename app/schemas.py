from pydantic import BaseModel, EmailStr
from typing import Optional


# --- User schemas ---

class UserBase(BaseModel):
    name: str
    email: EmailStr


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True


# --- Item schemas ---

class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float


class ItemCreate(ItemBase):
    owner_id: int


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None


class ItemResponse(ItemBase):
    id: int
    owner_id: int

    class Config:
        from_attributes = True
