"""
Database Connection Service
────────────────────────────
Dedicated service for all organisation database connection operations.
No AI logic lives here — this is purely infrastructure.

Responsibilities:
  - Building connection strings from raw credentials or stored config
  - Testing a connection without saving anything
  - Creating SQLAlchemy engines for query execution
  - Counting tables (used to verify a connection is alive)

Why a separate service?
  Routers (db_config, chat, workspace) all need to open connections to the
  organisation's database. Centralising this logic here means:
    1. One place to fix if the connection format changes.
    2. Routers stay thin — they call this service and handle HTTP responses.
    3. No password handling is scattered across multiple files.

Used by:
  - app/routers/db_config.py   (connect, test, update, status, disconnect)
  - app/routers/chat.py        (build conn string before running AI pipeline)
  - app/routers/workspace.py   (build conn string for admin SQL workspace)
"""
from sqlalchemy import create_engine, inspect
from app.core.encryption import decrypt


# ── Connection String Builders ─────────────────────────────────────────────────

def build_conn_str(
    host: str,
    port: int,
    database: str,
    username: str,
    password: str,
    ssl_mode: str | None = None,
) -> str:
    """
    Build a psycopg v3 (psycopg[binary]) connection string.

    ssl_mode is appended as a query parameter if provided.
    Example: postgresql+psycopg://user:pass@host:5432/db?sslmode=require
    """
    base = f"postgresql+psycopg://{username}:{password}@{host}:{port}/{database}"
    if ssl_mode:
        base += f"?sslmode={ssl_mode}"
    return base


def build_conn_str_from_config(config) -> str:
    """
    Build a connection string from an OrgDbConfig ORM row.

    Automatically decrypts the stored Fernet-encrypted password.
    The password is used only to build the string and is never returned
    or logged anywhere.

    Raises ValueError if the config row has no credentials stored yet.
    """
    if not config.encrypted_password:
        raise ValueError(
            "No database credentials configured for this organisation. "
            "Please configure them via POST /api/database/connect."
        )
    password = decrypt(config.encrypted_password)
    return build_conn_str(
        host=config.host,
        port=config.port,
        database=config.database_name,
        username=config.username,
        password=password,
        ssl_mode=config.ssl_mode,
    )


# ── Engine Factory ─────────────────────────────────────────────────────────────

def get_engine(conn_str: str):
    """
    Create a disposable SQLAlchemy engine for the given connection string.

    IMPORTANT: Always call engine.dispose() after you are done to release
    all pooled connections. Use a try/finally block:

        engine = get_engine(conn_str)
        try:
            with engine.connect() as conn:
                ...
        finally:
            engine.dispose()
    """
    return create_engine(conn_str, pool_pre_ping=True)


# ── Connection Verification ────────────────────────────────────────────────────

def get_table_count(conn_str: str) -> int:
    """
    Open a connection, count public tables, then immediately dispose.
    Used as a lightweight health check.
    Raises an exception if the connection fails.
    """
    engine = get_engine(conn_str)
    try:
        inspector = inspect(engine)
        return len(inspector.get_table_names())
    finally:
        engine.dispose()


def test_connection(
    host: str,
    port: int,
    database: str,
    username: str,
    password: str,
    ssl_mode: str | None = None,
) -> tuple[bool, str, int | None]:
    """
    Test a database connection WITHOUT saving anything.

    Returns a 3-tuple: (success, message, table_count)
      success     : True if connection worked, False otherwise
      message     : human-readable result string
      table_count : number of tables found (None on failure)

    Example:
        ok, msg, count = test_connection("localhost", 5432, "sales", "user", "pass")
        if ok:
            print(f"Connected! Found {count} tables.")
        else:
            print(f"Failed: {msg}")
    """
    conn_str = build_conn_str(host, port, database, username, password, ssl_mode)
    try:
        count = get_table_count(conn_str)
        return True, f"Connection successful. {count} table(s) found.", count
    except Exception as exc:
        # Never include raw password in error messages
        safe_msg = str(exc).replace(password, "***") if password in str(exc) else str(exc)
        return False, f"Connection failed: {safe_msg}", None


# ── Org Engine Factory (used by KPI tiles) ─────────────────────────────────────

def build_org_engine(org_id, db):
    """
    Build a SQLAlchemy engine for an organisation's database.
    Looks up the OrgDbConfig by org_id, decrypts credentials, returns engine.
    Caller is responsible for calling engine.dispose().
    """
    from app.models.org_db_config import OrgDbConfig
    config = db.query(OrgDbConfig).filter(OrgDbConfig.org_id == org_id).first()
    if not config:
        raise ValueError("No database config found for this organisation.")
    if config.connection_status != "connected":
        raise ValueError("Organisation database is not connected.")
    conn_str = build_conn_str_from_config(config)
    return get_engine(conn_str)

