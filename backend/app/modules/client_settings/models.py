import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String, Text

from backend.app.database.client_db import ClientBase


def _uuid() -> str:
    return str(uuid.uuid4())


class ClientGeneralSettings(ClientBase):
    __tablename__ = "cs_general"

    id             = Column(String(36), primary_key=True, default=lambda: "default")
    client_id      = Column(String(36), nullable=False, index=True)
    client_name    = Column(String(255))
    display_name   = Column(String(255))
    default_company= Column(String(255))
    default_language = Column(String(20), default="en")
    date_format    = Column(String(50),  default="DD/MM/YYYY")
    time_format    = Column(String(5),   default="12")
    fiscal_year_start = Column(Integer,  default=4)
    week_start_day = Column(String(15),  default="Monday")
    created_by     = Column(String(36))
    updated_by     = Column(String(36))
    created_at     = Column(DateTime, default=datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status         = Column(String(20), default="active")


class ClientBranding(ClientBase):
    __tablename__ = "cs_branding"

    id                = Column(String(36), primary_key=True, default=lambda: "default")
    client_id         = Column(String(36), nullable=False, index=True)
    logo_url          = Column(Text)
    favicon_url       = Column(Text)
    seal_url          = Column(Text)
    signature_url     = Column(Text)
    signatory_name    = Column(String(255))
    designation       = Column(String(255))
    website           = Column(String(500))
    support_email     = Column(String(255))
    phone             = Column(String(50))
    registered_address= Column(Text)
    corporate_address = Column(Text)
    created_by        = Column(String(36))
    updated_by        = Column(String(36))
    created_at        = Column(DateTime, default=datetime.utcnow)
    updated_at        = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status            = Column(String(20), default="active")


class ClientLocalization(ClientBase):
    __tablename__ = "cs_localization"

    id                = Column(String(36), primary_key=True, default=lambda: "default")
    client_id         = Column(String(36), nullable=False, index=True)
    currency_code     = Column(String(10),  default="INR")
    currency_symbol   = Column(String(10),  default="₹")
    currency_position = Column(String(10),  default="before")
    decimal_precision = Column(Integer,     default=2)
    timezone          = Column(String(100), default="Asia/Kolkata")
    country           = Column(String(100), default="India")
    language          = Column(String(20),  default="en")
    date_format       = Column(String(50),  default="DD/MM/YYYY")
    time_format       = Column(String(5),   default="12")
    number_format     = Column(String(30),  default="1,00,000.00")
    created_by        = Column(String(36))
    updated_by        = Column(String(36))
    created_at        = Column(DateTime, default=datetime.utcnow)
    updated_at        = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status            = Column(String(20), default="active")


class ClientNotificationChannel(ClientBase):
    __tablename__ = "cs_notification_channels"

    id         = Column(String(36), primary_key=True, default=_uuid)
    client_id  = Column(String(36), nullable=False, index=True)
    channel    = Column(String(50), nullable=False)
    is_enabled = Column(Boolean, default=False)
    created_by = Column(String(36))
    updated_by = Column(String(36))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status     = Column(String(20), default="active")


class ClientCredential(ClientBase):
    __tablename__ = "cs_credentials"

    id              = Column(String(36), primary_key=True, default=_uuid)
    client_id       = Column(String(36), nullable=False, index=True)
    credential_type = Column(String(50), nullable=False)
    is_configured   = Column(Boolean, default=False)
    encrypted_data  = Column(Text)
    created_by      = Column(String(36))
    updated_by      = Column(String(36))
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status          = Column(String(20), default="active")


class ClientCommonMaster(ClientBase):
    __tablename__ = "cs_common_masters"

    id            = Column(String(36), primary_key=True, default=_uuid)
    client_id     = Column(String(36), nullable=False, index=True)
    master_type   = Column(String(50), nullable=False, index=True)
    code          = Column(String(100), nullable=False)
    label         = Column(String(255), nullable=False)
    sort_order    = Column(Integer, default=0)
    is_active     = Column(Boolean, default=True)
    metadata_json = Column(JSON)
    created_by    = Column(String(36))
    updated_by    = Column(String(36))
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status        = Column(String(20), default="active")
