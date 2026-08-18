"""SQLAlchemy ORM model for query history."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class QueryHistory(Base):
    __tablename__ = "query_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    org_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    question = Column(Text, nullable=False)
    sql_query = Column(Text, nullable=False)
    sql_explanation = Column(Text, nullable=True)
    answer_text = Column(Text, nullable=True)
    chart_type = Column(String(20), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
