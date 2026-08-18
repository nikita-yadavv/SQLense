"""
Pydantic request/response schemas for database configuration.

Changes from original:
  - DbConfigRequest          : added organization_name, ssl_mode
  - DbConfigResponse         : unchanged (message + tables_found)
  - DbConfigRead             : extended with new readable fields
  - DbConfigTestRequest      : NEW — test without saving
  - DbConfigTestResponse     : NEW — result of a connection test
  - DbConfigUpdateRequest    : NEW — partial update (all fields optional)
  - DbConfigStatus           : NEW — returned by GET /api/database/status

Passwords are NEVER included in any response schema.
"""
from pydantic import BaseModel
from datetime import datetime


# ── Request Schemas ────────────────────────────────────────────────────────────

class DbConfigRequest(BaseModel):
    """
    POST /api/database/connect
    Save and verify the organisation's database connection.
    Credentials are encrypted before storage.
    """
    organization_name: str           # human-readable name, e.g. "Acme Corp"
    host: str
    port: int = 5432
    database: str
    username: str
    password: str
    ssl_mode: str | None = None      # optional: disable | require | verify-full


class DbConfigTestRequest(BaseModel):
    """
    POST /api/database/test
    Test a connection without saving anything.
    Useful for admins to verify credentials before committing.
    """
    host: str
    port: int = 5432
    database: str
    username: str
    password: str
    ssl_mode: str | None = None


class DbConfigUpdateRequest(BaseModel):
    """
    PUT /api/database/update
    Partial update — only fields that are provided will be changed.
    If password is omitted, the existing encrypted password is kept.
    """
    organization_name: str | None = None
    host: str | None = None
    port: int | None = None
    database: str | None = None
    username: str | None = None
    password: str | None = None   # None = keep existing password
    ssl_mode: str | None = None


# ── Response Schemas ───────────────────────────────────────────────────────────

class DbConfigResponse(BaseModel):
    """
    Returned after a successful POST /api/database/connect or PUT /api/database/update.
    """
    message: str
    tables_found: int


class DbConfigTestResponse(BaseModel):
    """
    Returned by POST /api/database/test.
    success=True means the credentials work; False means they don't.
    """
    success: bool
    message: str
    tables_found: int | None = None


class DbConfigRead(BaseModel):
    """
    Returned by GET /admin/db-config (original endpoint, kept for compatibility).
    Extended with the new readable fields. Password is NEVER returned.
    """
    host: str | None
    port: int | None
    database: str | None
    username: str | None
    organization_name: str | None
    db_type: str
    ssl_mode: str | None
    connection_status: str
    last_connected_at: datetime | None


class DbConfigStatus(BaseModel):
    """
    Returned by GET /api/database/status.
    Shows connection health — safe for all authenticated users to read.
    No credentials are exposed.
    """
    connection_status: str           # "connected" | "disconnected"
    organization_name: str | None
    db_type: str
    host: str | None                 # host shown for admin reference only
    database: str | None
    last_connected_at: datetime | None
