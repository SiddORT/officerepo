from fastapi import APIRouter, HTTPException, Depends
from typing import List

from app.schemas import UserCreate, UserUpdate, UserResponse
from app.database import get_db

router = APIRouter()


@router.get("/", response_model=List[UserResponse])
async def list_users(db: dict = Depends(get_db)):
    return list(db["users"].values())


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: dict = Depends(get_db)):
    user = db["users"].get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(payload: UserCreate, db: dict = Depends(get_db)):
    user_id = db["next_user_id"]
    db["next_user_id"] += 1
    user = {"id": user_id, **payload.model_dump()}
    db["users"][user_id] = user
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, payload: UserUpdate, db: dict = Depends(get_db)):
    user = db["users"].get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    updates = payload.model_dump(exclude_unset=True)
    user.update(updates)
    return user


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: int, db: dict = Depends(get_db)):
    if user_id not in db["users"]:
        raise HTTPException(status_code=404, detail="User not found")
    del db["users"][user_id]
