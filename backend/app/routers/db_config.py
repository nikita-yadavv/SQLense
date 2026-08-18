"""
Database Configuration Router
──────────────────────────────
Handles all /api/database/* endpoints (registered with prefix in main.py).

Routes:
  POST   /api/database/connect      Save and verify org DB config (admin only)
  POST   /api/database/test         Test connection without saving (admin only)
  PUT    /api/database/update       Update existing config (admin only)
  GET    /api/database/status       Read connection status (all authenticated users)
  DELETE /api/database/disconnect   Mark as disconnected, keep credentials (admin only)

Changes from original db_config.py:
  - Route paths changed from /db-config to /connect, /test, /update, /status, /disconnect
  - Now writes new fields: organization_name, db_type, ssl_mode, connection_status,
    last_connected_at, updated_at
  - Uses db_connection service instead of inline _build_conn_str / _get_table_count
  - Added POST /test, PUT /update, GET /status, DELETE /disconnect endpoints
  - Removed create-employee (moved to routers/auth.py)

Frontend changes required:
  - POST /admin/db-config  →  POST /api/database/connect
  - GET  /admin/db-config  →  GET  /api/database/status
  - New endpoints available: /test, /update, /disconnect
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.org_db_config import OrgDbConfig
from app.schemas.db_config import (
    DbConfigRequest,
    DbConfigTestRequest,
    DbConfigTestResponse,
    DbConfigUpdateRequest,
    DbConfigResponse,
    DbConfigStatus,
    DbConfigRead,
)
from app.core.deps import require_role, get_current_user
from app.core.encryption import encrypt
from app.services.db_connection import (
    build_conn_str,
    build_conn_str_from_config,
    test_connection,
    get_table_count,
)

router = APIRouter()

_admin_dep = require_role(UserRole.admin)


# ── Helper ─────────────────────────────────────────────────────────────────────

def _get_config_or_404(org_id, db: Session) -> OrgDbConfig:
    """Fetch OrgDbConfig for the org, raise 404 if not found."""
    config = db.query(OrgDbConfig).filter(OrgDbConfig.org_id == org_id).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "No database configuration found for your organisation. "
                "Please sign up as admin first."
            ),
        )
    return config


# ── POST /api/database/connect ─────────────────────────────────────────────────
@router.post("/connect", response_model=DbConfigResponse)
def connect_database(
    payload: DbConfigRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_dep),
):
    """
    Admin: save (or replace) the organisation's database connection.

    1. Builds a connection string from the provided credentials.
    2. Tests the connection — raises HTTP 400 if it fails.
    3. Encrypts the password before saving.
    4. Sets connection_status = "connected" and records last_connected_at.
    """
    # Step 1 — Test the connection BEFORE saving anything
    ok, msg, table_count = test_connection(
        host=payload.host,
        port=payload.port,
        database=payload.database,
        username=payload.username,
        password=payload.password,
        ssl_mode=payload.ssl_mode,
    )
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not connect to the database: {msg}",
        )

    # Step 2 — Upsert the OrgDbConfig row
    config = db.query(OrgDbConfig).filter(OrgDbConfig.org_id == current_user.org_id).first()
    now = datetime.now(timezone.utc)

    if config:
        # Update existing row
        config.organization_name = payload.organization_name
        config.host = payload.host
        config.port = payload.port
        config.database_name = payload.database
        config.username = payload.username
        config.encrypted_password = encrypt(payload.password)
        config.ssl_mode = payload.ssl_mode
        config.db_type = "postgresql"
        config.connection_status = "connected"
        config.last_connected_at = now
        config.updated_at = now
    else:
        # Create new row (should already exist from signup, but handle edge case)
        config = OrgDbConfig(
            org_id=current_user.org_id,
            organization_name=payload.organization_name,
            host=payload.host,
            port=payload.port,
            database_name=payload.database,
            username=payload.username,
            encrypted_password=encrypt(payload.password),
            ssl_mode=payload.ssl_mode,
            db_type="postgresql",
            connection_status="connected",
            last_connected_at=now,
        )
        db.add(config)

    db.commit()
    return DbConfigResponse(
        message=f"Database connected successfully. Organisation: {payload.organization_name}",
        tables_found=table_count,
    )


# ── POST /api/database/test ────────────────────────────────────────────────────
@router.post("/test", response_model=DbConfigTestResponse)
def test_database_connection(
    payload: DbConfigTestRequest,
    _: User = Depends(_admin_dep),  # admin-only; no db write needed
):
    """
    Admin: test a database connection WITHOUT saving anything.

    Use this to verify credentials before calling /connect.
    No data is stored — this is a pure read operation against the org's DB.
    """
    ok, msg, table_count = test_connection(
        host=payload.host,
        port=payload.port,
        database=payload.database,
        username=payload.username,
        password=payload.password,
        ssl_mode=payload.ssl_mode,
    )
    return DbConfigTestResponse(success=ok, message=msg, tables_found=table_count)


# ── PUT /api/database/update ───────────────────────────────────────────────────
@router.put("/update", response_model=DbConfigResponse)
def update_database_config(
    payload: DbConfigUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_dep),
):
    """
    Admin: update one or more fields of the existing database configuration.

    Only fields that are explicitly provided in the request body are changed.
    If password is omitted, the existing encrypted password is preserved.

    After updating, the new connection is tested before the change is saved.
    """
    config = _get_config_or_404(current_user.org_id, db)

    # Build the "after update" values (merge new values over existing)
    new_host     = payload.host     or config.host
    new_port     = payload.port     or config.port
    new_database = payload.database or config.database_name
    new_username = payload.username or config.username

    # For password: if a new one is provided, use it; else decrypt existing
    if payload.password:
        new_password = payload.password
        new_encrypted = encrypt(payload.password)
    else:
        # Keep existing password — re-test using the stored (decrypted) one
        from app.core.encryption import decrypt
        new_password  = decrypt(config.encrypted_password)
        new_encrypted = config.encrypted_password  # keep as-is

    new_ssl_mode = payload.ssl_mode if payload.ssl_mode is not None else config.ssl_mode

    # Test the updated connection before committing
    ok, msg, table_count = test_connection(
        host=new_host,
        port=new_port,
        database=new_database,
        username=new_username,
        password=new_password,
        ssl_mode=new_ssl_mode,
    )
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Updated credentials failed connection test: {msg}",
        )

    # Save updated values
    now = datetime.now(timezone.utc)
    if payload.organization_name:
        config.organization_name = payload.organization_name
    config.host              = new_host
    config.port              = new_port
    config.database_name     = new_database
    config.username          = new_username
    config.encrypted_password = new_encrypted
    config.ssl_mode          = new_ssl_mode
    config.connection_status = "connected"
    config.last_connected_at = now
    config.updated_at        = now

    db.commit()
    return DbConfigResponse(
        message="Database configuration updated successfully.",
        tables_found=table_count,
    )


# ── GET /api/database/status ───────────────────────────────────────────────────
@router.get("/status", response_model=DbConfigStatus)
def get_database_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # all authenticated users
):
    """
    Return the organisation's database connection status.

    Available to all authenticated users (admin + employee).
    No credentials are exposed — only host, database name, and status.
    Employees can use this to check if the database is ready before querying.
    """
    config = _get_config_or_404(current_user.org_id, db)
    return DbConfigStatus(
        connection_status=config.connection_status,
        organization_name=config.organization_name,
        db_type=config.db_type,
        host=config.host,
        database=config.database_name,
        last_connected_at=config.last_connected_at,
    )


# ── DELETE /api/database/disconnect ───────────────────────────────────────────
@router.delete("/disconnect")
def disconnect_database(
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_dep),
):
    """
    Admin: mark the database as disconnected.

    Credentials are KEPT in the database (encrypted) so reconnecting
    is a one-click operation via POST /api/database/connect with the
    same credentials, or the admin can update them via PUT /api/database/update.

    This does NOT delete the organisation or any users.
    This does NOT delete the stored credentials.
    """
    config = _get_config_or_404(current_user.org_id, db)

    config.connection_status = "disconnected"
    config.updated_at = datetime.now(timezone.utc)
    # last_connected_at is intentionally preserved — useful audit info

    db.commit()
    return {
        "message": (
            "Database disconnected. Credentials are retained. "
            "Use POST /api/database/connect to reconnect with one click."
        )
    }


# ── GET /api/database/config ───────────────────────────────────────────────────
# (Kept for backward compatibility — same data as /status but with more fields)
@router.get("/config", response_model=DbConfigRead)
def get_db_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_dep),
):
    """
    Admin: retrieve the full connection configuration (no password).
    Equivalent to the original GET /admin/db-config endpoint.
    """
    config = _get_config_or_404(current_user.org_id, db)
    return DbConfigRead(
        host=config.host,
        port=config.port,
        database=config.database_name,
        username=config.username,
        organization_name=config.organization_name,
        db_type=config.db_type,
        ssl_mode=config.ssl_mode,
        connection_status=config.connection_status,
        last_connected_at=config.last_connected_at,
    )
