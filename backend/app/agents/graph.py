"""
Agent Graph (LangGraph Workflow)
─────────────────────────────────
Coordinates the end-to-end execution of a user question through:
  1. Schema Agent       — introspects the connected database.
  2. SQL Generator      — LLM generates PostgreSQL query.
  3. SQL Validator      — schema & syntax validation + security guard.
  4. Query Execution    — runs SQL against org database (fetch up to 500 rows).
  5. Insight Agent      — LLM summarizes results in business English.
  6. Visualization Agent— decides chart type + data format.

Returns the final state with all agent outputs populated.
"""
from typing import TypedDict, Any, Optional
from datetime import date, datetime
from decimal import Decimal
import json

from langgraph.graph import StateGraph, END
from sqlalchemy import create_engine, text

from app.agents.schema_agent import fetch_schema, schema_to_prompt_string
from app.agents.sql_generator import generate_sql, explain_sql
from app.agents.sql_validator import validate_sql, SQLValidationError
from app.agents.sql_guard import SQLGuardError
from app.agents.insight_agent import generate_insight
from app.agents.visualization_agent import build_chart_config


# ── Pipeline State Definition ──────────────────────────────────────────────────
class PipelineState(TypedDict):
    question: str
    conn_str: str
    schema: dict
    schema_str: str
    sql: str
    sql_explanation: str
    columns: list[str]
    rows: list[dict]
    answer_text: str
    chart: dict
    error: Optional[str]


def _serialize_rows(rows: list[dict]) -> list[dict]:
    serialized = []
    for row in rows:
        clean = {}
        for k, v in row.items():
            if isinstance(v, Decimal):
                clean[k] = float(v)
            elif isinstance(v, (date, datetime)):
                clean[k] = v.isoformat()
            else:
                clean[k] = v
        serialized.append(clean)
    return serialized


# ── Node 1: Schema Agent ───────────────────────────────────────────────────────
def node_schema(state: PipelineState) -> PipelineState:
    try:
        schema = fetch_schema(state["conn_str"])
        return {**state, "schema": schema, "schema_str": schema_to_prompt_string(schema)}
    except Exception as exc:
        return {**state, "error": f"Schema Agent failed: {exc}"}


# ── Node 2: SQL Generator ──────────────────────────────────────────────────────
def node_sql_generator(state: PipelineState) -> PipelineState:
    if state.get("error"):
        return state
    try:
        sql = generate_sql(state["question"], state["schema_str"])
        if sql == "BLOCKED_WRITE_OPERATION":
            explanation = "Data modification operations (UPDATE, INSERT, DELETE, DDL) are restricted to the SQL Workspace."
            answer_text = (
                "⚠️ **Data modifications are not permitted in AI Chat.**\n\n"
                "AI Chat is strictly restricted to read-only analytical queries (SELECT) to safeguard database integrity. "
                "To perform data updates, insertions, or deletions, please use the **SQL Workspace** in the Admin menu, "
                "which provides full transaction controls (Preview, Commit, and Rollback)."
            )
            return {
                **state,
                "sql": "",
                "sql_explanation": explanation,
                "answer_text": answer_text,
                "columns": [],
                "rows": [],
                "chart": {"type": "none", "title": "", "data": [], "x_key": "", "y_keys": []},
            }

        explanation = explain_sql(sql, state["question"])
        return {**state, "sql": sql, "sql_explanation": explanation}
    except Exception as exc:
        return {**state, "error": f"SQL Generator failed: {exc}"}


# ── Node 3: SQL Validator ──────────────────────────────────────────────────────
def node_sql_validator(state: PipelineState) -> PipelineState:
    if state.get("error"):
        return state
    # If already intercepted (e.g. write intent blocked), pass through cleanly
    if not state.get("sql"):
        return state
    try:
        validated_sql = validate_sql(state["sql"], state["schema"])
        return {**state, "sql": validated_sql}
    except (SQLValidationError, SQLGuardError) as exc:
        # If validator catches a mutation/security error, return clean write-restriction notice
        err_str = str(exc).lower()
        if "security violation" in err_str or "only select" in err_str or "blocked keyword" in err_str:
            return {
                **state,
                "sql": "",
                "sql_explanation": "Data modification operations (UPDATE, INSERT, DELETE, DDL) are restricted to the SQL Workspace.",
                "answer_text": (
                    "⚠️ **Data modifications are not permitted in AI Chat.**\n\n"
                    "AI Chat is strictly restricted to read-only analytical queries (SELECT) to safeguard database integrity. "
                    "To perform data updates, insertions, or deletions, please use the **SQL Workspace** in the Admin menu, "
                    "which provides full transaction controls (Preview, Commit, and Rollback)."
                ),
                "columns": [],
                "rows": [],
                "chart": {"type": "none", "title": "", "data": [], "x_key": "", "y_keys": []},
            }
        return {**state, "error": f"SQL Validation failed: {exc}"}


# ── Node 4: Query Execution ────────────────────────────────────────────────────
def node_execute(state: PipelineState) -> PipelineState:
    if state.get("error"):
        return state
    # If no SQL to execute (e.g. write operation blocked), skip
    if not state.get("sql"):
        return state
    engine = create_engine(
        state["conn_str"], pool_pre_ping=True, connect_args={"connect_timeout": 10}
    )
    try:
        with engine.connect() as conn:
            result = conn.execute(text(state["sql"]))
            columns = list(result.keys())
            rows = [dict(zip(columns, row)) for row in result.fetchmany(500)]
            rows = _serialize_rows(rows)
        return {**state, "columns": columns, "rows": rows}
    except Exception as exc:
        return {**state, "error": f"Query Execution failed: {exc}"}
    finally:
        engine.dispose()


# ── Node 5: Insight Agent ──────────────────────────────────────────────────────
def node_insight(state: PipelineState) -> PipelineState:
    if state.get("error"):
        return state
    # If answer_text is already set (e.g. write block notice), preserve it
    if state.get("answer_text"):
        return state
    if not state.get("sql"):
        return state
    try:
        answer = generate_insight(state["question"], state["columns"], state["rows"], sql=state.get("sql", ""))
        return {**state, "answer_text": answer}
    except Exception as exc:
        return {**state, "error": f"Insight Agent failed: {exc}"}


# ── Chart Intent Detector ──────────────────────────────────────────────────────
_CHART_KEYWORDS = {
    # Explicit request
    "chart", "graph", "plot", "visuali", "diagram", "visual",
    # Aggregation signals
    "trend", "over time", "per month", "per day", "per week", "per year",
    "monthly", "daily", "weekly", "yearly", "annual",
    "compare", "comparison", "breakdown", "distribution",
    "top 5", "top 10", "top five", "top ten", "ranking", "rank",
    "growth", "decline", "increase", "decrease",
    "by category", "by region", "by department", "by product",
    "percentage", "proportion", "share", "ratio",
    "sum", "total", "average", "avg", "count", "how many",
    "show me",
}

def _needs_chart(question: str, columns: list[str], rows: list[dict]) -> bool:
    q_lower = question.lower()

    # Rule 1: explicit request
    if any(kw in q_lower for kw in {"chart", "graph", "plot", "visuali", "diagram", "visual"}):
        return True

    # Rule 2: keyword match
    if any(kw in q_lower for kw in _CHART_KEYWORDS):
        if len(rows) > 1:
            return True

    # Rule 3: result looks like an aggregation (numeric column + at least 2 rows)
    if len(rows) >= 2:
        numeric_cols = [c for c in columns if any(
            isinstance(r.get(c), (int, float)) for r in rows[:5]
        )]
        if numeric_cols:
            return True

    return False


# ── Node 6: Visualization Agent ────────────────────────────────────────────────
def node_visualization(state: PipelineState) -> PipelineState:
    if state.get("error"):
        return state
    if not state.get("sql") or not state.get("rows"):
        return {**state, "chart": {"type": "none", "title": "", "data": [], "x_key": "", "y_keys": []}}
    try:
        # Smart suppression: skip chart generation for simple lookups
        if not _needs_chart(state["question"], state["columns"], state["rows"]):
            return {**state, "chart": {"type": "none", "title": "", "data": [], "x_key": "", "y_keys": []}}
        chart = build_chart_config(state["question"], state["columns"], state["rows"])
        return {**state, "chart": chart}
    except Exception as exc:
        return {**state, "error": f"Visualization Agent failed: {exc}"}


# ── Build the graph ────────────────────────────────────────────────────────────
def _build_graph() -> Any:
    g = StateGraph(PipelineState)

    g.add_node("schema",        node_schema)
    g.add_node("sql_generator", node_sql_generator)
    g.add_node("sql_validator", node_sql_validator)
    g.add_node("execute",       node_execute)
    g.add_node("insight",       node_insight)
    g.add_node("visualization", node_visualization)

    g.set_entry_point("schema")
    g.add_edge("schema",        "sql_generator")
    g.add_edge("sql_generator", "sql_validator")
    g.add_edge("sql_validator", "execute")
    g.add_edge("execute",       "insight")
    g.add_edge("insight",       "visualization")
    g.add_edge("visualization", END)

    return g.compile()


# Module-level compiled graph (created once, reused per request)
pipeline = _build_graph()


# ── Public entry point ─────────────────────────────────────────────────────────
def run_pipeline(question: str, conn_str: str) -> PipelineState:
    """
    Run the full agentic pipeline for a user question.
    Returns the final PipelineState dict.
    """
    initial_state: PipelineState = {
        "question": question,
        "conn_str": conn_str,
        "schema": {},
        "schema_str": "",
        "sql": "",
        "sql_explanation": "",
        "columns": [],
        "rows": [],
        "answer_text": "",
        "chart": {},
        "error": None,
    }
    return pipeline.invoke(initial_state)
