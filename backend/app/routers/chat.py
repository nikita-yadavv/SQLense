from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.org_db_config import OrgDbConfig
from app.models.query_history import QueryHistory
from app.schemas.chat import ChatRequest, ChatResponse, ChartConfig
from app.core.deps import get_current_user
from app.core.audit import log_action
from app.services.db_connection import build_conn_str_from_config  # NEW: use service
from app.agents.graph import run_pipeline

router = APIRouter()


def _get_conn_str(org_id, db: Session) -> str:
    """Retrieve the org DB connection string using the db_connection service."""
    config = db.query(OrgDbConfig).filter(OrgDbConfig.org_id == org_id).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "No database connection configured for your organisation. "
                "Please ask your admin to configure it via POST /api/database/connect."
            ),
        )
    if config.connection_status != "connected":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "The organisation database is currently disconnected. "
                "Please ask your admin to reconnect via POST /api/database/connect."
            ),
        )
    return build_conn_str_from_config(config)


# ── POST /chat ─────────────────────────────────────────────────────────────────
@router.post("/chat", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Natural-language question → SQL → validated → executed → insight + chart.
    Available to all authenticated users (admin + employee).
    The AI pipeline enforces SELECT-only; write operations are impossible here.
    """
    conn_str = _get_conn_str(current_user.org_id, db)

    result = run_pipeline(question=payload.question, conn_str=conn_str)

    if result.get("error"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=result["error"],
        )

    # Persist to query history
    history_entry = QueryHistory(
        user_id=current_user.id,
        org_id=current_user.org_id,
        question=payload.question,
        sql_query=result["sql"],
        sql_explanation=result.get("sql_explanation", ""),
        answer_text=result.get("answer_text", ""),
        chart_type=result.get("chart", {}).get("type", "none"),
    )
    db.add(history_entry)
    db.commit()

    log_action(db, "CHAT_QUERY", org_id=current_user.org_id, user_id=current_user.id,
               detail=payload.question[:200])

    chart_data = result.get("chart", {})
    return ChatResponse(
        question=payload.question,
        sql_query=result["sql"],
        sql_explanation=result.get("sql_explanation", ""),
        answer_text=result.get("answer_text", ""),
        chart=ChartConfig(
            type=chart_data.get("type", "none"),
            title=chart_data.get("title", ""),
            data=chart_data.get("data", []),
            x_key=chart_data.get("x_key", ""),
            y_keys=chart_data.get("y_keys", []),
        ),
        rows=result.get("rows", []),
        columns=result.get("columns", []),
    )
