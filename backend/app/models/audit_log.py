"""
AuditLog model — records every significant action across the platform.

Logged actions:
  USER_LOGIN            – successful login
  USER_SIGNUP           – new account created
  EMPLOYEE_JOINED       – employee used a join code (pending state)
  EMPLOYEE_APPROVED     – admin approved an employee
  EMPLOYEE_REJECTED     – admin rejected an employee
  DB_CONNECTED          – admin connected an org database
  DB_DISCONNECTED       – admin disconnected an org database
  CHAT_QUERY            – user asked a question via AI chat
  WORKSPACE_EXECUTE     – admin ran SQL in workspace
  WORKSPACE_COMMIT      – admin committed a transaction
  WORKSPACE_ROLLBACK    – admin rolled back a transaction
  KPI_TILE_CREATED      – admin created a KPI tile
  KPI_TILE_DELETED      – admin deleted a KPI tile
  KPI_CHAT_QUERY        – AI query over dashboard context
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id     = Column(UUID(as_uuid=True), nullable=True, index=True)  # None for superadmin actions
    user_id    = Column(UUID(as_uuid=True), nullable=True, index=True)
    action     = Column(String(80),  nullable=False, index=True)
    detail     = Column(Text,        nullable=True)   # JSON string or human-readable note
    ip_address = Column(String(60),  nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
