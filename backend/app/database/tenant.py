from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from typing import Dict
import threading

TenantBase = declarative_base()

_engines: Dict[str, any] = {}
_lock = threading.Lock()


def get_tenant_engine(db_url: str):
    with _lock:
        if db_url not in _engines:
            _engines[db_url] = create_engine(db_url, pool_pre_ping=True)
        return _engines[db_url]


def get_tenant_session(db_url: str):
    engine = get_tenant_engine(db_url)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return Session()


def init_tenant_db(db_url: str):
    from backend.app.modules.employee.models import TenantBase as TB
    engine = get_tenant_engine(db_url)
    TB.metadata.create_all(bind=engine)
