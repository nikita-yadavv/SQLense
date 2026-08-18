"""SQLAlchemy ORM model for SuperAdmin accounts.

SuperAdmins are platform-level developers/operators.
They are completely separate from org-level users.
Credentials are stored with bcrypt-hashed passwords (NOT in env vars).

There can be multiple superadmins registered.
Registration is done via the `register_superadmin.py` CLI script.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class SuperAdmin(Base):
    __tablename__ = "superadmins"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    name            = Column(String(120), nullable=True)
    is_active       = Column(Boolean, default=True, nullable=False)
    created_at      = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    last_login_at   = Column(DateTime(timezone=True), nullable=True)
