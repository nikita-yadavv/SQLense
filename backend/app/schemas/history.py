from pydantic import BaseModel
from datetime import datetime
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
