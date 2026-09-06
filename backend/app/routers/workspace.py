from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Literal
from decimal import Decimal
from datetime import date, datetime as dt

from app.database import get_db
from app.models.user import User, UserRole
from app.models.org_db_config import OrgDbConfig
from app.core.deps import require_role
from app.services.db_connection import build_conn_str_from_config
from app.agents.schema_agent import fetch_schema, schema_to_prompt_string
from app.agents.sql_generator import generate_crud_sql

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
    is_read: bool = False


class GenerateSqlRequest(BaseModel):
    prompt: str


class GenerateSqlResponse(BaseModel):
    prompt: str
    sql: str
    explanation: str
    operation_type: str


# ── Session store (per-admin open transaction) ─────────────────────────────────
_open_connections: dict[str, object] = {}


def _get_org_config(org_id, db: Session):
    config = db.query(OrgDbConfig).filter(OrgDbConfig.org_id == org_id).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No database connection configured. Please connect a database in Database Settings first.",
        )
    return config


def _build_conn_str(config) -> str:
    """Build org DB connection string using the db_connection service."""
    return build_conn_str_from_config(config)


# ── POST /admin/workspace/generate ────────────────────────────────────────────
@router.post("/workspace/generate", response_model=GenerateSqlResponse)
def workspace_generate_sql(
    payload: GenerateSqlRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_dep),
):
    """
    AI Query Assistant for Admin SQL Workspace.
    Generates any CRUD SQL statement (SELECT, INSERT, UPDATE, DELETE, etc.) based on natural language.
    """
    if not payload.prompt or not payload.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    config = _get_org_config(current_user.org_id, db)
    try:
        conn_str = _build_conn_str(config)
        schema = fetch_schema(conn_str)
        schema_str = schema_to_prompt_string(schema)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not load database schema: {exc}")

    try:
        sql, explanation, op_type = generate_crud_sql(payload.prompt.strip(), schema_str)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate SQL: {exc}")

    return GenerateSqlResponse(
        prompt=payload.prompt,
        sql=sql,
        explanation=explanation,
        operation_type=op_type,
    )


# ── POST /admin/workspace/execute ─────────────────────────────────────────────
@router.post("/workspace/execute", response_model=WorkspaceResponse)
def workspace_execute(
    payload: WorkspaceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_dep),
):
    """
    Admin-only SQL Workspace.
    - action='execute' : Run the SQL. SELECT queries return tabular results. Write queries run within an open transaction.
    - action='commit'  : Commit the open transaction and close the connection.
    - action='rollback': Roll back the open transaction and close the connection.
    """
    org_key = str(current_user.org_id)

    # ── COMMIT ──────────────────────────────────────────────────────────────────
    if payload.action == "commit":
        conn_ctx = _open_connections.pop(org_key, None)
        if conn_ctx is None:
            return WorkspaceResponse(rows=[], columns=[], rowcount=0, message="No pending transaction to commit.", is_read=False)
        try:
            conn_ctx["conn"].commit()
            conn_ctx["conn"].close()
            conn_ctx["engine"].dispose()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Commit failed: {exc}")
        return WorkspaceResponse(rows=[], columns=[], rowcount=0, message="Transaction committed successfully.", is_read=False)

    # ── ROLLBACK ────────────────────────────────────────────────────────────────
    if payload.action == "rollback":
        conn_ctx = _open_connections.pop(org_key, None)
        if conn_ctx is None:
            return WorkspaceResponse(rows=[], columns=[], rowcount=0, message="No pending transaction to roll back.", is_read=False)
        try:
            conn_ctx["conn"].rollback()
            conn_ctx["conn"].close()
            conn_ctx["engine"].dispose()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Rollback failed: {exc}")
        return WorkspaceResponse(rows=[], columns=[], rowcount=0, message="Transaction rolled back successfully.", is_read=False)

    # ── EXECUTE ─────────────────────────────────────────────────────────────────
    if not payload.sql or not payload.sql.strip():
        raise HTTPException(status_code=400, detail="SQL query cannot be empty.")

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

    # Check if this query returned rows (SELECT / EXPLAIN / SHOW / etc.)
    if result.returns_rows:
        columns = list(result.keys()) if result.keys() else []
        rows = [dict(zip(columns, row)) for row in result.fetchall()]
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

        msg = f"Query executed successfully. {len(clean_rows)} row(s) returned."
        return WorkspaceResponse(
            rows=clean_rows,
            columns=columns,
            rowcount=len(clean_rows),
            message=msg,
            is_read=True,
        )
    else:
        # DML / DDL statement (INSERT, UPDATE, DELETE, CREATE, DROP, ALTER)
        rowcount = max(result.rowcount, 0) if result.rowcount is not None and result.rowcount >= 0 else 0
        msg = f"Query executed. {rowcount} row(s) affected. Use Commit to save or Rollback to discard."
        return WorkspaceResponse(
            rows=[],
            columns=[],
            rowcount=rowcount,
            message=msg,
            is_read=False,
        )
