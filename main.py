from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import items, users
from app.database import lifespan

app = FastAPI(
    title="FastAPI Backend",
    description="A clean FastAPI backend with example routes.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(items.router, prefix="/items", tags=["items"])


@app.get("/", tags=["root"])
async def root():
    return {"message": "FastAPI backend is running!", "docs": "/docs"}


@app.get("/health", tags=["root"])
async def health():
    return {"status": "ok"}
