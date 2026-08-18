"""KPI Tile model — stores admin-configured KPI queries for the dashboard."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class KPITile(Base):
    __tablename__ = "kpi_tiles"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id      = Column(UUID(as_uuid=True), nullable=False, index=True)
    created_by  = Column(UUID(as_uuid=True), nullable=False)   # admin's user id
    title       = Column(String(120), nullable=False)
    description = Column(String(255), nullable=True)
    sql_query   = Column(Text, nullable=False)    # SELECT query that returns the KPI value
    position    = Column(Integer, nullable=False, default=0)   # display order
    created_at  = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at  = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
