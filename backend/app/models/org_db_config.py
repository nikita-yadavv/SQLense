"""SQLAlchemy ORM model for storing an organisation's DB credentials (encrypted).

Changes from Phase 1:
  - Added join_code: 8-character alphanumeric code employees use to join an org.
    Generated automatically when an admin signs up.
    Unique per organisation.
"""
import uuid
import secrets
import string
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


def _generate_join_code() -> str:
    """Generate a random 8-character alphanumeric join code (e.g. ACMEX7Q2)."""
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(8))


class OrgDbConfig(Base):
    __tablename__ = "org_db_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # org_id = admin's user UUID
    org_id = Column(UUID(as_uuid=True), unique=True, nullable=False, index=True)

    # Organisation identity
    organization_name = Column(String(255), nullable=True)

    # NEW: Unique join code — employees use this to self-register
    join_code = Column(String(20), unique=True, nullable=True, default=_generate_join_code)

    # Database engine type
    db_type = Column(String(50), nullable=False, default="postgresql")

    # Connection details (nullable until admin calls /api/database/connect)
    host              = Column(String(255), nullable=True)
    port              = Column(Integer,     nullable=True, default=5432)
    database_name     = Column(String(255), nullable=True)
    username          = Column(String(255), nullable=True)
    encrypted_password= Column(String(512), nullable=True)
    ssl_mode          = Column(String(50),  nullable=True)

    # Status tracking
    connection_status = Column(String(20), nullable=False, default="disconnected")
    last_connected_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
