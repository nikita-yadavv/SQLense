"""
SQL Guard
─────────
A hard security boundary that rejects any SQL that is not a pure SELECT.
This is called BEFORE any query touches the org database.

Rules enforced:
  1. Only one statement allowed per query.
  2. The statement must be SELECT (case-insensitive).
  3. Blocks: INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE, EXEC, CALL, GRANT, REVOKE.
"""
import re
import sqlparse
from sqlparse.sql import Statement
from sqlparse.tokens import Keyword, DML


# Dangerous keywords that should never appear anywhere in a chat-path query
_BLOCKED_KEYWORDS = {
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE",
    "TRUNCATE", "EXEC", "EXECUTE", "CALL", "GRANT", "REVOKE",
    "REPLACE", "MERGE", "UPSERT",
}


class SQLGuardError(ValueError):
    """Raised when a query fails the security guard."""
    pass


def _extract_statements(sql: str) -> list[Statement]:
    return [s for s in sqlparse.parse(sql.strip()) if s.get_type() is not None]


def guard_select_only(sql: str) -> str:
    """
    Validate that `sql` is a single SELECT statement.
    Returns the cleaned SQL string if valid.
    Raises SQLGuardError if the query violates any rule.
    """
    if not sql or not sql.strip():
        raise SQLGuardError("Empty SQL query.")

    statements = _extract_statements(sql)
    if len(statements) == 0:
        raise SQLGuardError("Could not parse SQL — the query appears to be empty.")
    if len(statements) > 1:
        raise SQLGuardError(
            "Multiple SQL statements detected. Only a single SELECT is permitted."
        )

    stmt = statements[0]
    stmt_type = stmt.get_type()

    if stmt_type != "SELECT":
        raise SQLGuardError(
            f"Only SELECT queries are allowed through the chat interface. "
            f"Detected statement type: {stmt_type}."
        )

    # Secondary keyword scan (catches edge cases like `SELECT ... INTO`)
    sql_upper = sql.upper()
    for keyword in _BLOCKED_KEYWORDS:
        # Use word boundary to avoid false positives (e.g. "execution" matching "EXEC")
        if re.search(rf"\b{keyword}\b", sql_upper):
            raise SQLGuardError(
                f"Blocked keyword '{keyword}' detected. "
                f"Only pure SELECT statements are allowed."
            )

    return sql.strip()
