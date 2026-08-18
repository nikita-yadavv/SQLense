"""
Visualization Agent
────────────────────
Analyses query result columns and query intent to decide the best chart type,
or suppresses the chart (returns "table") for raw record lists, SELECT *, etc.

Chart decision heuristics:
  - Raw record lists (SELECT *, "recent entries", "list all", > 10 raw columns) → "table" (no chart)
  - ID/UUID columns are ignored for numeric metrics
  - 1 numeric aggregate metric + 1 categorical column → bar chart
  - Time/date/month column + aggregated metric → line chart
  - 1 numeric aggregate metric + 1 categorical column (≤ 8 categories) → pie chart or bar chart
  - Otherwise → "table" (no chart)
"""
import re
from datetime import date, datetime
from decimal import Decimal

_DATE_PATTERNS = re.compile(
    r"(date|month|year|day|week|quarter|period|time)",
    re.IGNORECASE,
)

_ID_PATTERNS = re.compile(
    r"^(id|uuid|guid|_id)$|(_id|id)$",
    re.IGNORECASE,
)

_RAW_LIST_PATTERNS = re.compile(
    r"\b(recent entries|latest entries|show all records|list all|all rows)\b",
    re.IGNORECASE,
)

_TREND_KEYWORDS = re.compile(
    r"\b(trend|monthly|revenue|growth|over time|daily|yearly|mrr|sales)\b",
    re.IGNORECASE,
)


def _is_id_col(col_name: str) -> bool:
    return bool(_ID_PATTERNS.search(col_name))


def _is_numeric(col_name: str, value) -> bool:
    if _is_id_col(col_name):
        return False
    if isinstance(value, (int, float, Decimal)):
        return True
    if isinstance(value, str) and not _is_id_col(col_name):
        return _try_float(value)
    return False


def _try_float(s: str) -> bool:
    if len(s) > 15:  # Probably a UUID or hash
        return False
    try:
        float(s)
        return True
    except (ValueError, TypeError):
        return False


def _is_date_col(col_name: str, sample_value=None) -> bool:
    if _DATE_PATTERNS.search(col_name) and not col_name.lower().endswith("by"):
        return True
    if isinstance(sample_value, (date, datetime)):
        return True
    return False


def _classify_columns(columns: list[str], sample_row: dict) -> dict:
    numeric_cols = [c for c in columns if _is_numeric(c, sample_row.get(c))]
    date_cols = [c for c in columns if _is_date_col(c, sample_row.get(c))]
    cat_cols = [c for c in columns if c not in numeric_cols and c not in date_cols and not _is_id_col(c)]
    id_cols = [c for c in columns if _is_id_col(c)]
    return {
        "numeric": numeric_cols,
        "date": date_cols,
        "categorical": cat_cols,
        "id": id_cols,
    }


def _decide_chart_type(question: str, classification: dict, row_count: int, columns: list[str]) -> str:
    num = classification["numeric"]
    dat = classification["date"]
    cat = classification["categorical"]

    # 1. If user explicitly asks for raw list / recent entries -> table
    if _RAW_LIST_PATTERNS.search(question) or len(columns) > 10:
        return "table"

    # 2. If no valid numeric metrics -> table
    if not num:
        return "table"

    # 3. If trend / date / month column exists AND there's a numeric metric -> line chart
    if (dat or cat or _TREND_KEYWORDS.search(question)) and num:
        if "month" in cat or dat or "trend" in question.lower():
            return "line"
        return "bar"

    # 4. Numeric metric + categorical column
    if num and cat:
        if row_count <= 8 and len(num) == 1:
            return "pie"
        return "bar"

    if len(num) >= 2:
        return "bar"

    return "table"


def _format_x_val(val) -> str:
    if val is None:
        return ""
    s = str(val)
    if len(s) > 20 and ("-" in s or ":" in s):
        try:
            return s.split("T")[0]
        except Exception:
            pass
    if len(s) > 18:
        return s[:15] + "…"
    return s


def _shape_data(chart_type: str, rows: list[dict], classification: dict) -> tuple[list, str, list[str]]:
    num = classification["numeric"]
    dat = classification["date"]
    cat = classification["categorical"]

    x_key = (cat or dat or num or list(rows[0].keys()))[0] if rows else ""
    y_keys = num[:5]

    chart_data = []
    for row in rows:
        raw_x = row.get(x_key, "")
        entry = {"name": _format_x_val(raw_x)}
        for y in y_keys:
            raw = row.get(y, 0)
            try:
                entry[y] = float(raw) if raw is not None else 0
            except (ValueError, TypeError):
                entry[y] = 0
        chart_data.append(entry)

    return chart_data, x_key, y_keys


def build_chart_config(question: str, columns: list[str], rows: list[dict]) -> dict:
    """
    Returns a Recharts-compatible chart config or table fallback:
    {
        "type": "bar" | "line" | "pie" | "table" | "none",
        "title": str,
        "data": list[dict],
        "x_key": str,
        "y_keys": list[str]
    }
    """
    if not rows or not columns:
        return {"type": "none", "title": "", "data": [], "x_key": "", "y_keys": []}

    sample_row = rows[0]
    classification = _classify_columns(columns, sample_row)
    chart_type = _decide_chart_type(question, classification, len(rows), columns)

    if chart_type == "table":
        return {
            "type": "table",
            "title": question,
            "data": rows,
            "x_key": columns[0] if columns else "",
            "y_keys": columns[1:] if len(columns) > 1 else [],
        }

    chart_data, x_key, y_keys = _shape_data(chart_type, rows, classification)

    if not y_keys:
        return {"type": "table", "title": question, "data": rows, "x_key": columns[0], "y_keys": []}

    return {
        "type": chart_type,
        "title": question,
        "data": chart_data,
        "x_key": x_key,
        "y_keys": y_keys,
    }
