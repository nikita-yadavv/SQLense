from pydantic import BaseModel
from datetime import datetime
from typing import Any
import uuid


class HistoryItem(BaseModel):
    id: uuid.UUID
    question: str
    sql_query: str
    sql_explanation: str | None
    answer_text: str | None
    chart_type: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class HistoryDetailItem(BaseModel):
    id: uuid.UUID
    question: str
    sql_query: str
    sql_explanation: str | None = None
    answer_text: str | None = None
    chart: dict[str, Any] | None = None
    columns: list[str] = []
    rows: list[dict[str, Any]] = []
    created_at: datetime

    class Config:
        from_attributes = True
