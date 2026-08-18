"""
SQL Validation Agent
─────────────────────
Validates a generated SQL string against the actual schema before execution.

Checks performed:
  1. sql_guard — must be a single SELECT (hard security boundary).
  2. Table name validation — all referenced tables must exist in the schema.
  3. Basic syntax check via sqlparse.
"""
import re
import sqlparse
from app.agents.sql_guard import guard_select_only, SQLGuardError

_SQL_KEYWORDS = {
    "month", "year", "day", "week", "quarter", "date", "time",
    "select", "where", "group", "order", "by", "limit", "as",
    "and", "or", "in", "is", "not", "null", "dual", "from", "join",
}


class SQLValidationError(ValueError):
    """Raised when SQL fails schema or syntax validation."""
    pass


def _extract_identifiers(sql: str) -> set[str]:
    """
    Extract table references from SQL.
    Strips function constructs like EXTRACT(... FROM ...) to prevent false positives.
    """
    # Remove EXTRACT(... FROM ...) or SUBSTRING(... FROM ...) patterns
    sql_clean = re.sub(r'EXTRACT\s*\(\s*\w+\s+FROM\s+[\w.]+\s*\)', '', sql, flags=re.IGNORECASE)

    from_pattern = re.compile(r'\bFROM\s+([a-zA-Z_][a-zA-Z0-9_.]*)', re.IGNORECASE)
    join_pattern = re.compile(r'\bJOIN\s+([a-zA-Z_][a-zA-Z0-9_.]*)', re.IGNORECASE)

    tables = set()
    for match in from_pattern.finditer(sql_clean):
        tbl = match.group(1).lower()
        if tbl not in _SQL_KEYWORDS:
            tables.add(tbl)
    for match in join_pattern.finditer(sql_clean):
        tbl = match.group(1).lower()
        if tbl not in _SQL_KEYWORDS:
            tables.add(tbl)

    return tables


def validate_sql(sql: str, schema: dict) -> str:
    """
    Run all validation checks on the generated SQL.
    Returns the cleaned SQL if valid.
    Raises SQLValidationError with a descriptive message on failure.
    """
    # 1. Security guard (SELECT-only)
    try:
        sql = guard_select_only(sql)
    except SQLGuardError as exc:
        raise SQLValidationError(f"Security violation: {exc}")

    # 2. Basic syntax check
    parsed = sqlparse.parse(sql)
    if not parsed or not parsed[0].tokens:
        raise SQLValidationError("SQL could not be parsed — it may be malformed.")

    # 3. Table name validation
    known_tables = {t.lower() for t in schema.get("tables", {}).keys()}
    referenced_tables = _extract_identifiers(sql)

    if known_tables:
        unknown_tables = referenced_tables - known_tables
        if unknown_tables:
            raise SQLValidationError(
                f"Query references unknown table(s): {unknown_tables}. "
                f"Available tables: {known_tables}."
            )

    return sql
