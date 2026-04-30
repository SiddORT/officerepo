from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from datetime import datetime
from backend.app.database.platform import Base


class MobileDeviceSession(Base):
    __tablename__ = "mobile_device_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    device_id = Column(String(255), nullable=False)
    device_name = Column(String(255))
    device_type = Column(String(20), default="mobile")  # mobile | web
    refresh_token = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
