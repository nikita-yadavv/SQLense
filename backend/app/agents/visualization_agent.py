"""
Visualization Agent
────────────────────
Analyses query result columns and query intent to decide the best chart type,
or suppresses the chart (returns "table") for raw record lists, SELECT *, etc.

Robust Axis Classification:
  1. Aggregates (count, employee_count, num_customers, total_amount, sum_*, avg_*) ALWAYS become Y-axis metrics.
  2. The grouping column (e.g. salary, salary_range, category, city, department, month, status) ALWAYS becomes the X-axis dimension.
  3. When querying raw product attributes (e.g. products with stock), product name is X-axis and stock_quantity is Y-axis.
  4. Numbers on the X-axis are formatted cleanly (e.g. $50,000 or 50K instead of 50000.00).
  5. Month numbers (1-12) or month+year are converted into readable strings ("Feb 2026", "Mar 2026").
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

_AGGREGATE_METRIC_PATTERNS = re.compile(
    r"^(count|total|sum|avg|average|min|max|num_|number_of|employee_count|customer_count|order_count|orders_count|sales_count|total_revenue|total_amount|total_orders|total_stock|calls_count)",
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

_METRIC_SYNONYMS = {
    "stock": ["stock_quantity", "stock", "inventory", "units_available"],
    "inventory": ["stock_quantity", "stock", "inventory"],
    "price": ["price", "unit_price", "cost"],
    "revenue": ["revenue", "total_amount", "total_revenue", "mrr", "arr", "sales"],
    "sales": ["sales", "revenue", "total_amount", "calls_count"],
    "profit": ["profit", "net_profit"],
    "expense": ["expenses", "expense", "costs"],
    "salary": ["salary", "compensation"],
    "order": ["total_orders", "order_count", "orders_count", "orders", "quantity"],
    "customer": ["num_customers", "customer_count", "new_customers", "churned_customers", "count"],
    "count": ["count", "employee_count", "num_customers", "total_orders", "quantity", "calls_count"],
    "quantity": ["quantity", "stock_quantity", "calls_count"],
    "fee": ["monthly_fee", "fee"],
}


def _is_id_col(col_name: str) -> bool:
    c = col_name.lower().strip()
    return bool(_ID_PATTERNS.search(c)) or c in {"id", "uuid", "guid"}


def _is_time_dimension(col_name: str) -> bool:
    c = col_name.lower().strip()
    return c in _TIME_DIMENSIONS or "date" in c or "time" in c


def _is_aggregate_metric(col_name: str) -> bool:
    c = col_name.lower().strip()
    return (
        bool(_AGGREGATE_METRIC_PATTERNS.search(c))
        or c.endswith("_count")
        or c.startswith("total_")
        or c.startswith("sum_")
        or c.startswith("avg_")
        or c.startswith("num_")
    )


def _try_float(s: str) -> bool:
    if len(s) > 15:
        return False
    try:
        float(s)
        return True
    except (ValueError, TypeError):
        return False


def _is_numeric(col_name: str, sample_value) -> bool:
    if _is_id_col(col_name):
        return False
    if isinstance(sample_value, (int, float, Decimal)):
        return True
    if isinstance(sample_value, str):
        return _try_float(sample_value)
    return False


def _classify_axes(question: str, columns: list[str], sample_row: dict) -> tuple[str, list[str]]:
    """
    Intelligently separate X-axis grouping dimension from Y-axis metric series.
    """
    q_lower = question.lower()
    
    # Check for aggregate metrics
    agg_metrics = [c for c in columns if _is_aggregate_metric(c) and _is_numeric(c, sample_row.get(c))]
    
    # Check for general numerical columns (price, salary, stock_quantity, etc.)
    other_numerics = [
        c for c in columns 
        if c not in agg_metrics 
        and _is_numeric(c, sample_row.get(c)) 
        and not _is_time_dimension(c)
    ]
    
    # Check for non-numeric dimensions
    dimensions = [
        c for c in columns 
        if c not in agg_metrics 
        and c not in other_numerics 
        and not _is_id_col(c)
    ]

    # Rule 1: If an explicit aggregate exists (e.g. employee_count, total_revenue), it is ALWAYS the Y metric!
    if agg_metrics:
        y_keys = agg_metrics[:3]
        # X is the dimension column (e.g. salary_range, department, city, or salary)
        if dimensions:
            x_col = dimensions[0]
        elif other_numerics:
            x_col = other_numerics[0]
        else:
            x_col = columns[0]
        return x_col, y_keys

    # Rule 2: If no aggregate, check if question explicitly asks for a specific numeric attribute (e.g. stock, price)
    if other_numerics:
        matched = []
        for word, syns in _METRIC_SYNONYMS.items():
            if word in q_lower:
                for m in other_numerics:
                    if (m.lower() in syns or m.lower() == word) and m not in matched:
                        matched.append(m)
        
        if not matched:
            for m in other_numerics:
                if m.lower() in q_lower or m.lower().replace("_", " ") in q_lower:
                    matched.append(m)

        y_keys = matched[:3] if matched else other_numerics[:2]
        dim_candidates = [c for c in columns if c not in y_keys and not _is_id_col(c)]
        x_col = dim_candidates[0] if dim_candidates else columns[0]
        return x_col, y_keys

    # Rule 3: Fallback
    return columns[0] if columns else "", []


def _format_x_value(val, col_name: str, row: dict, columns: list[str]) -> str:
    """Format any dimension value into a clean, human-readable string."""
    col_map = {c.lower().strip(): c for c in columns}

    # Combined Year + Month
    if "year" in col_map and "month" in col_map and col_name in {col_map["year"], col_map["month"]}:
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

    # Single Month
    if col_name.lower() == "month":
        try:
            m_int = int(float(val))
            if m_int in _MONTH_NAMES:
                return _MONTH_NAMES[m_int]
        except Exception:
            pass

    if val is None:
        return ""

    # Numeric dimension (e.g. salary = 50000.0, price = 1800)
    if isinstance(val, (int, float, Decimal)) or (isinstance(val, str) and _try_float(val)):
        try:
            num = float(val)
            if num >= 1000 and num.is_integer():
                return f"{int(num):,}"
            if num.is_integer():
                return str(int(num))
            return f"{num:,.2f}"
        except Exception:
            pass

    s = str(val).strip()
    if "T" in s and ("-" in s or ":" in s):
        return s.split("T")[0]

    if len(s) > 30:
        return s[:28] + "…"
    return s


def _decide_chart_type(question: str, y_keys: list[str], row_count: int, columns: list[str]) -> str:
    q_lower = question.lower()

    if _RAW_LIST_PATTERNS.search(q_lower) or len(columns) > 8:
        return "table"

    if not y_keys or row_count < 2:
        return "table"

    if "line" in q_lower:
        return "line"
    if "pie" in q_lower or (_PIE_KEYWORDS.search(q_lower) and 2 <= row_count <= 8):
        return "pie"
    if "bar" in q_lower:
        return "bar"

    if _TREND_KEYWORDS.search(q_lower) and row_count >= 5:
        return "line"

    if _PIE_KEYWORDS.search(q_lower) and 2 <= row_count <= 6 and len(y_keys) == 1:
        return "pie"

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
    x_col, y_keys = _classify_axes(question, columns, sample_row)

    if not y_keys:
        return {
            "type": "table",
            "title": question,
            "data": rows,
            "x_key": columns[0] if columns else "",
            "y_keys": [],
        }

    chart_type = _decide_chart_type(question, y_keys, len(rows), columns)
    if chart_type == "table":
        return {
            "type": "table",
            "title": question,
            "data": rows,
            "x_key": columns[0] if columns else "",
            "y_keys": [],
        }

    chart_data = []
    for row in rows:
        label = _format_x_value(row.get(x_col), x_col, row, columns)
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
        "x_key": "name",
        "y_keys": y_keys,
    }
