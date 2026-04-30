from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI


# In-memory "database" for demonstration purposes.
# Replace this with a real database (PostgreSQL, SQLite, etc.) as needed.
_db: dict = {
    "users": {
        1: {"id": 1, "name": "Alice", "email": "alice@example.com"},
        2: {"id": 2, "name": "Bob", "email": "bob@example.com"},
    },
    "items": {
        1: {"id": 1, "name": "Widget", "description": "A useful widget", "price": 9.99, "owner_id": 1},
        2: {"id": 2, "name": "Gadget", "description": "A handy gadget", "price": 24.99, "owner_id": 2},
    },
    "next_user_id": 3,
    "next_item_id": 3,
}


def get_db() -> dict:
    return _db


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    print("Starting up FastAPI application...")
    yield
    print("Shutting down FastAPI application...")
