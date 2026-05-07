from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
import bcrypt
from backend.app.config.settings import settings


def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")


def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.REFRESH_SECRET, algorithm="HS256")


def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except JWTError:
        if settings.PREVIOUS_JWT_SECRET and settings.previous_secret_grace_active():
            return jwt.decode(token, settings.PREVIOUS_JWT_SECRET, algorithms=["HS256"])
        raise


def decode_refresh_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, settings.REFRESH_SECRET, algorithms=["HS256"])
    except JWTError:
        if settings.PREVIOUS_REFRESH_SECRET and settings.previous_secret_grace_active():
            return jwt.decode(token, settings.PREVIOUS_REFRESH_SECRET, algorithms=["HS256"])
        raise
