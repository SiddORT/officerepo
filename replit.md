# FastAPI Backend

A clean Python FastAPI backend with example CRUD routes, Pydantic validation, and interactive API docs.

## Running

The server starts automatically. It listens on port 8000.

- Interactive docs: `/docs` (Swagger UI)
- Alternative docs: `/redoc`
- Health check: `/health`

## Project Structure

```
main.py          # App entry point, middleware, router registration
app/
  database.py    # In-memory store + lifespan handler
  schemas.py     # Pydantic request/response models
  routers/
    users.py     # CRUD endpoints for /users
    items.py     # CRUD endpoints for /items
```

## Routes

| Method | Path            | Description                     |
|--------|-----------------|---------------------------------|
| GET    | /               | Root / info                     |
| GET    | /health         | Health check                    |
| GET    | /users          | List all users                  |
| GET    | /users/{id}     | Get a user by ID                |
| POST   | /users          | Create a user                   |
| PATCH  | /users/{id}     | Update a user                   |
| DELETE | /users/{id}     | Delete a user                   |
| GET    | /items          | List items (filter by owner_id) |
| GET    | /items/{id}     | Get an item by ID               |
| POST   | /items          | Create an item                  |
| PATCH  | /items/{id}     | Update an item                  |
| DELETE | /items/{id}     | Delete an item                  |

## Stack

- **Python 3.11**
- **FastAPI** — web framework
- **Uvicorn** — ASGI server (with auto-reload)
- **Pydantic v2** — data validation and serialization

## Notes

- The in-memory store in `app/database.py` resets on every restart. Replace it with a real database (PostgreSQL via SQLAlchemy/SQLModel, SQLite, etc.) for persistence.
- CORS is open (`allow_origins=["*"]`) for development — tighten this for production.
