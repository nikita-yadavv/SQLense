from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Literal

from app.database import get_db
from app.models.user import User, UserRole
from app.models.org_db_config import OrgDbConfig
from app.core.deps import require_role
from app.services.db_connection import build_conn_str_from_config  # NEW: use service

router = APIRouter()

_admin_dep = require_role(UserRole.admin)


# ── Schemas ────────────────────────────────────────────────────────────────────
class WorkspaceRequest(BaseModel):
    sql: str
    action: Literal["execute", "commit", "rollback"] = "execute"


class WorkspaceResponse(BaseModel):
    rows: list[dict]
    columns: list[str]
    rowcount: int
    message: str


# ── Session store (per-admin open transaction) ─────────────────────────────────
# Stores active SQLAlchemy connections keyed by org_id (str).
# This is in-memory only — restarting the server clears all open transactions.
_open_connections: dict[str, object] = {}


def _get_org_config(org_id, db: Session):
    config = db.query(OrgDbConfig).filter(OrgDbConfig.org_id == org_id).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No database connection configured. Use POST /admin/db-config first.",
        )
    return config


def _build_conn_str(config) -> str:
    """Build org DB connection string using the db_connection service."""
    return build_conn_str_from_config(config)


# ── POST /admin/workspace/execute ─────────────────────────────────────────────
@router.post("/workspace/execute", response_model=WorkspaceResponse)
def workspace_execute(
    payload: WorkspaceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_dep),
):
    """
    Admin-only SQL Workspace.
    - action='execute' : Run the SQL within an open transaction.
    - action='commit'  : Commit the open transaction and close the connection.
    - action='rollback': Roll back the open transaction and close the connection.

    An open transaction is kept in memory per org until commit or rollback.
    """
    org_key = str(current_user.org_id)

    # ── COMMIT ──────────────────────────────────────────────────────────────────
    if payload.action == "commit":
        conn_ctx = _open_connections.pop(org_key, None)
        if conn_ctx is None:
            raise HTTPException(status_code=400, detail="No open transaction to commit.")
        try:
            conn_ctx["conn"].commit()
            conn_ctx["conn"].close()
            conn_ctx["engine"].dispose()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Commit failed: {exc}")
        return WorkspaceResponse(rows=[], columns=[], rowcount=0, message="Transaction committed successfully.")

    # ── ROLLBACK ────────────────────────────────────────────────────────────────
    if payload.action == "rollback":
        conn_ctx = _open_connections.pop(org_key, None)
        if conn_ctx is None:
            raise HTTPException(status_code=400, detail="No open transaction to roll back.")
        try:
            conn_ctx["conn"].rollback()
            conn_ctx["conn"].close()
            conn_ctx["engine"].dispose()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Rollback failed: {exc}")
        return WorkspaceResponse(rows=[], columns=[], rowcount=0, message="Transaction rolled back successfully.")

    # ── EXECUTE ─────────────────────────────────────────────────────────────────
    # Reuse or create a connection for this org
    if org_key not in _open_connections:
        config = _get_org_config(current_user.org_id, db)
        try:
            conn_str = _build_conn_str(config)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            )
        try:
            engine = create_engine(conn_str, pool_pre_ping=True)
            raw_conn = engine.connect()
            raw_conn.execute(text("BEGIN"))
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not connect to organisation database: {exc}",
            )
        _open_connections[org_key] = {"engine": engine, "conn": raw_conn}

    conn_ctx = _open_connections[org_key]
    conn = conn_ctx["conn"]

    try:
        result = conn.execute(text(payload.sql))
    except Exception as exc:
        # On error, roll back and clean up so the next request starts fresh
        try:
            conn.rollback()
            conn.close()
            conn_ctx["engine"].dispose()
        except Exception:
            pass
        _open_connections.pop(org_key, None)
        raise HTTPException(status_code=400, detail=f"SQL execution error: {exc}")

    # DML returns no rows; SELECT returns rows
    try:
        columns = list(result.keys())
        rows = [dict(zip(columns, row)) for row in result.fetchall()]
        # Serialize non-JSON-native types
        from decimal import Decimal
        from datetime import date, datetime as dt
        clean_rows = []
        for row in rows:
            clean = {}
            for k, v in row.items():
                if isinstance(v, Decimal):
                    clean[k] = float(v)
                elif isinstance(v, (date, dt)):
                    clean[k] = v.isoformat()
                else:
                    clean[k] = v
            clean_rows.append(clean)
    except Exception:
        columns, clean_rows = [], []

    rowcount = result.rowcount if result.rowcount is not None else 0
    msg = (
        f"Query executed. {len(clean_rows)} row(s) returned."
        if clean_rows
        else f"Query executed. {rowcount} row(s) affected. Use commit or rollback to finalise."
    )

    return WorkspaceResponse(rows=clean_rows, columns=columns, rowcount=rowcount, message=msg)
