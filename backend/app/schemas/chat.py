from pydantic import BaseModel
from typing import Any


class ChatRequest(BaseModel):
    question: str


class ChartConfig(BaseModel):
    type: str          # "bar" | "line" | "pie" | "table" | "none"
    title: str
    data: list[dict]
    x_key: str
    y_keys: list[str]


class ChatResponse(BaseModel):
    question: str
    sql_query: str
    sql_explanation: str
    answer_text: str
    chart: ChartConfig
    rows: list[dict]
    columns: list[str]
