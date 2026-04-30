from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.app.config.settings import settings

engine = create_engine(settings.PLATFORM_DB_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_platform_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
