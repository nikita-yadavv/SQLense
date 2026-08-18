"""SQLAlchemy ORM model for platform users.

Changes from original:
  - Added status field: 'active' | 'pending' | 'rejected'
    Employees who self-register via join code start as 'pending'.
    Admins who create employees directly start as 'active'.
    Admin accounts are always 'active'.
  - Added is_superadmin flag for the superadmin module.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Enum as SAEnum, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    admin    = "admin"
    employee = "employee"


class UserStatus(str, enum.Enum):
    active   = "active"
    pending  = "pending"
    rejected = "rejected"


class User(Base):
    __tablename__ = "users"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name            = Column(String(120), nullable=False)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role            = Column(SAEnum(UserRole),   nullable=False, default=UserRole.employee)
    status          = Column(SAEnum(UserStatus), nullable=False, default=UserStatus.active)

    # org_id links employees to an admin's connected DB.
    # For admins this equals their own id; for employees it equals the admin's id.
    org_id          = Column(UUID(as_uuid=True), nullable=True)

    # Timestamps
    created_at      = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
