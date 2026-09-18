import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text

from app.database import get_db
from app.models.user import User, UserRole
from app.models.query_history import QueryHistory
from app.models.org_db_config import OrgDbConfig
from app.schemas.history import HistoryItem, HistoryDetailItem
from app.core.deps import get_current_user
from app.services.db_connection import build_conn_str_from_config
from app.agents.graph import _serialize_rows
from app.agents.visualization_agent import build_chart_config

router = APIRouter()


# ── GET /history ───────────────────────────────────────────────────────────────
@router.get("/history", response_model=list[HistoryItem])
def get_history(
    limit: int = Query(default=50, le=200, description="Maximum number of records to return"),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return the authenticated user's query history, newest first.
    Employees see only their own queries; admins see all org queries.
    """
    query = db.query(QueryHistory)

    if current_user.role == UserRole.admin:
        query = query.filter(QueryHistory.org_id == current_user.org_id)
    else:
        query = query.filter(QueryHistory.user_id == current_user.id)

    records = (
        query.order_by(QueryHistory.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return records


# ── GET /history/{history_id} ──────────────────────────────────────────────────
@router.get("/history/{history_id}", response_model=HistoryDetailItem)
def get_history_detail(
    history_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return full query history item including real-time re-executed columns and rows.
    """
    entry = db.query(QueryHistory).filter(QueryHistory.id == history_id).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Query history record not found."
        )

    # Org / User permission check
    if current_user.role != UserRole.admin and entry.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this query history record."
        )
    if entry.org_id != current_user.org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this query history record."
        )

    columns: list[str] = []
    rows: list[dict] = []
    chart_config: dict = {}

    # Attempt to retrieve live table results
    try:
        config = db.query(OrgDbConfig).filter(OrgDbConfig.org_id == current_user.org_id).first()
        if config and config.connection_status == "connected":
            conn_str = build_conn_str_from_config(config)
            engine = create_engine(conn_str, pool_pre_ping=True, connect_args={"connect_timeout": 5})
            try:
                with engine.connect() as conn:
                    result = conn.execute(text(entry.sql_query))
                    columns = list(result.keys())
                    raw_rows = [dict(zip(columns, r)) for r in result.fetchmany(500)]
                    rows = _serialize_rows(raw_rows)
            finally:
                engine.dispose()

            # Rebuild chart if valid
            if rows and columns:
                chart_config = build_chart_config(entry.question, columns, rows)
    except Exception:
        pass  # Fallback to empty rows gracefully

    return HistoryDetailItem(
        id=entry.id,
        question=entry.question,
        sql_query=entry.sql_query,
        sql_explanation=entry.sql_explanation,
        answer_text=entry.answer_text,
        chart=chart_config if chart_config.get("type") != "none" else None,
        columns=columns,
        rows=rows,
        created_at=entry.created_at,
    )
