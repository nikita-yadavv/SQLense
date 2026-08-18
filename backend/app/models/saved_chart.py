"""SavedChart model — persists AI chat chart outputs."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, JSON, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class SavedChart(Base):
    __tablename__ = "saved_charts"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id     = Column(UUID(as_uuid=True), nullable=False, index=True)
    user_id    = Column(UUID(as_uuid=True), nullable=False, index=True)
    title      = Column(String(200), nullable=False)
    question   = Column(String(500), nullable=False)   # original user question
    sql_query  = Column(String(2000), nullable=True)
    chart_type = Column(String(30), nullable=True)     # bar | line | pie | null
    chart_data = Column(JSON, nullable=True)           # full chart object
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
