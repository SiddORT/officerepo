from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from app.schemas import ItemCreate, ItemUpdate, ItemResponse
from app.database import get_db

router = APIRouter()


@router.get("/", response_model=List[ItemResponse])
async def list_items(
    owner_id: Optional[int] = Query(None, description="Filter by owner"),
    db: dict = Depends(get_db),
):
    items = list(db["items"].values())
    if owner_id is not None:
        items = [i for i in items if i["owner_id"] == owner_id]
    return items


@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(item_id: int, db: dict = Depends(get_db)):
    item = db["items"].get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.post("/", response_model=ItemResponse, status_code=201)
async def create_item(payload: ItemCreate, db: dict = Depends(get_db)):
    if payload.owner_id not in db["users"]:
        raise HTTPException(status_code=404, detail="Owner user not found")
    item_id = db["next_item_id"]
    db["next_item_id"] += 1
    item = {"id": item_id, **payload.model_dump()}
    db["items"][item_id] = item
    return item


@router.patch("/{item_id}", response_model=ItemResponse)
async def update_item(item_id: int, payload: ItemUpdate, db: dict = Depends(get_db)):
    item = db["items"].get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    updates = payload.model_dump(exclude_unset=True)
    item.update(updates)
    return item


@router.delete("/{item_id}", status_code=204)
async def delete_item(item_id: int, db: dict = Depends(get_db)):
    if item_id not in db["items"]:
        raise HTTPException(status_code=404, detail="Item not found")
    del db["items"][item_id]
