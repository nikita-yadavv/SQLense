"""
Visualization Agent
────────────────────
Analyses query result columns and query intent to decide the best chart type,
or suppresses the chart (returns "table") for raw record lists, SELECT *, etc.

Key capabilities:
  - Strict distinction between Dimensions (time, categories, IDs) and Metrics (counts, revenues, stock, totals).
  - Time dimensions (year, month, date) and IDs are NEVER included as Y-axis metrics.
  - Smart metric selection: picks the exact metric matching the user query (e.g. stock_quantity for stock questions,
    price for price questions, revenue for revenue questions).
  - Combines year + month (or formats month numbers 1-12) into human-readable X labels (e.g. "Feb 2026", "Mar 2026").
  - Preserves full product/item names (up to 30 chars) without harsh truncation.
  - Selects intuitive chart types:
      * Counts/Stock/Registrations per product/category/month → "bar"
      * Continuous multi-period trends (≥ 5 points) → "line"
      * Proportions / Status breakdowns (≤ 6 categories) → "pie"
      * Raw row lists (SELECT *, etc.) → "table"
"""
import re
from datetime import date, datetime
from decimal import Decimal

_MONTH_NAMES = {
    1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr",
    5: "May", 6: "Jun", 7: "Jul", 8: "Aug",
    9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"
}

_ID_PATTERNS = re.compile(
    r"^(id|uuid|guid|_id)$|(_id|id)$",
    re.IGNORECASE,
)

_TIME_DIMENSIONS = {
    "year", "month", "day", "week", "quarter", "date", "time",
    "period", "hour", "minute", "log_date", "start_date", "end_date",
    "joined_at", "created_at", "resolved_at", "launch_date",
}

_RAW_LIST_PATTERNS = re.compile(
    r"\b(recent entries|latest entries|show all records|list all|all rows|which customers|who are)\b",
    re.IGNORECASE,
)

_TREND_KEYWORDS = re.compile(
    r"\b(trend|growth|over time|trajectory|forecast|evolution)\b",
    re.IGNORECASE,
)

_PIE_KEYWORDS = re.compile(
    r"\b(proportion|share|breakdown|ratio|percentage|split|distribution)\b",
    re.IGNORECASE,
)

_BAR_KEYWORDS = re.compile(
    r"\b(bar|compare|comparison|top|ranking|count|number of|each month|per month|by category|by department|stock|inventory)\b",
    re.IGNORECASE,
)

_METRIC_SYNONYMS = {
    "stock": ["stock_quantity", "stock", "inventory", "units_available"],
    "inventory": ["stock_quantity", "stock", "inventory"],
    "price": ["price", "unit_price", "cost"],
    "revenue": ["revenue", "total_amount", "mrr", "arr", "sales"],
    "sales": ["sales", "revenue", "total_amount", "calls_count"],
    "profit": ["profit", "net_profit"],
    "expense": ["expenses", "expense", "costs"],
    "salary": ["salary", "compensation"],
    "order": ["total_orders", "order_count", "orders_count", "orders", "quantity"],
    "customer": ["num_customers", "customer_count", "new_customers", "churned_customers", "count"],
    "count": ["count", "num_customers", "total_orders", "quantity", "calls_count"],
    "quantity": ["quantity", "stock_quantity", "calls_count"],
    "fee": ["monthly_fee", "fee"],
}


def _is_id_col(col_name: str) -> bool:
    c = col_name.lower().strip()
    return bool(_ID_PATTERNS.search(c)) or c in {"id", "uuid", "guid"}


def _is_time_dimension(col_name: str) -> bool:
    c = col_name.lower().strip()
    return c in _TIME_DIMENSIONS or "date" in c or "time" in c


def _try_float(s: str) -> bool:
    if len(s) > 15:
        return False
    try:
        float(s)
        return True
    except (ValueError, TypeError):
        return False


def _is_metric_column(col_name: str, sample_value) -> bool:
    """True ONLY if the column represents a numerical measure (count, revenue, stock, amount, etc.)."""
    if _is_id_col(col_name) or _is_time_dimension(col_name):
        return False
    if isinstance(sample_value, (int, float, Decimal)):
        return True
    if isinstance(sample_value, str):
        return _try_float(sample_value)
    return False


def _pick_best_metrics(question: str, available_metrics: list[str]) -> list[str]:
    """Select the most relevant metric columns based on the question intent."""
    if not available_metrics:
        return []
    if len(available_metrics) == 1:
        return available_metrics

    q_lower = question.lower()
    matched = []

    # 1. Direct name match in question
    for m in available_metrics:
        m_clean = m.lower().replace("_", " ")
        if m.lower() in q_lower or m_clean in q_lower:
            matched.append(m)

    # 2. Match via synonym keywords
    if not matched:
        for word, syns in _METRIC_SYNONYMS.items():
            if word in q_lower:
                for m in available_metrics:
                    if m.lower() in syns and m not in matched:
                        matched.append(m)

    if matched:
        return matched[:3]

    # If no specific metric was mentioned, avoid mixing vastly different scales (return up to 2)
    return available_metrics[:2]


def _format_x_label(row: dict, columns: list[str]) -> str:
    """Generate a clean, human-readable X-axis label from the row data."""
    col_map = {c.lower().strip(): c for c in columns}

    # 1. Combined Year + Month (e.g. year: 2026, month: 2 → "Feb 2026")
    if "year" in col_map and "month" in col_map:
        y_val = row.get(col_map["year"])
        m_val = row.get(col_map["month"])
        try:
            y_int = int(float(y_val)) if y_val is not None else None
            m_int = int(float(m_val)) if m_val is not None else None
            m_str = _MONTH_NAMES.get(m_int, str(m_val))
            if y_int and m_str:
                return f"{m_str} {y_int}"
        except Exception:
            pass

    # 2. Single month column (e.g. month: 4 → "Apr")
    if "month" in col_map:
        m_val = row.get(col_map["month"])
        try:
            m_int = int(float(m_val))
            if m_int in _MONTH_NAMES:
                return _MONTH_NAMES[m_int]
        except Exception:
            pass
        if m_val is not None:
            return str(m_val)[:28]

    # 3. Categorical / Dimension columns (e.g. name, company_name, product, category, city)
    for c in columns:
        if not _is_id_col(c) and not _is_time_dimension(c) and not _is_metric_column(c, row.get(c)):
            val = row.get(c)
            if val is not None:
                s = str(val)
                if len(s) > 30:
                    return s[:28] + "…"
                return s

    # 4. Date / Timestamp columns
    for c in columns:
        if _is_time_dimension(c):
            val = row.get(c)
            if val is not None:
                s = str(val)
                if "T" in s or "-" in s:
                    return s.split("T")[0]
                return s[:28]

    # 5. Fallback to first non-ID column or first column
    for c in columns:
        if not _is_id_col(c):
            return str(row.get(c, ""))[:28]

    return str(row.get(columns[0], ""))[:28]


def _decide_chart_type(question: str, metric_cols: list[str], row_count: int, columns: list[str]) -> str:
    q_lower = question.lower()

    # Raw listings or too many columns
    if _RAW_LIST_PATTERNS.search(q_lower) or len(columns) > 8:
        return "table"

    # Must have at least one numeric metric
    if not metric_cols or row_count < 2:
        return "table"

    # Explicit chart requests
    if "line" in q_lower:
        return "line"
    if "pie" in q_lower or (_PIE_KEYWORDS.search(q_lower) and row_count <= 8):
        return "pie"
    if "bar" in q_lower:
        return "bar"

    # Trend queries with continuous points
    if _TREND_KEYWORDS.search(q_lower) and row_count >= 5:
        return "line"

    # Proportions with small cardinality
    if _PIE_KEYWORDS.search(q_lower) and 2 <= row_count <= 6 and len(metric_cols) == 1:
        return "pie"

    # Default to clean Bar chart for discrete items (products, categories, departments, months)
    return "bar"


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
    all_metrics = [c for c in columns if _is_metric_column(c, sample_row.get(c))]

    # If no pure metric column detected, fallback to table
    if not all_metrics:
        return {
            "type": "table",
            "title": question,
            "data": rows,
            "x_key": columns[0] if columns else "",
            "y_keys": [],
        }

    chart_type = _decide_chart_type(question, all_metrics, len(rows), columns)
    if chart_type == "table":
        return {
            "type": "table",
            "title": question,
            "data": rows,
            "x_key": columns[0] if columns else "",
            "y_keys": [],
        }

    # Intelligently choose the most relevant metric series for the chart
    y_keys = _pick_best_metrics(question, all_metrics)
    x_key = "name"

    chart_data = []
    for row in rows:
        label = _format_x_label(row, columns)
        entry = {"name": label}
        for y in y_keys:
            raw_val = row.get(y, 0)
            try:
                entry[y] = float(raw_val) if raw_val is not None else 0.0
            except (ValueError, TypeError):
                entry[y] = 0.0
        chart_data.append(entry)

    return {
        "type": chart_type,
        "title": question,
        "data": chart_data,
        "x_key": x_key,
        "y_keys": y_keys,
    }
