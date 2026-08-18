"""Full validation script — runs without a DB or Ollama connection."""
import sys
sys.path.insert(0, ".")

# ── Config ─────────────────────────────────────────────────────────────────────
from app.config import get_settings
s = get_settings()
print(f"Config OK  — model: {s.ollama_model}, origins: {s.allowed_origins_list}")

# ── Security ───────────────────────────────────────────────────────────────────
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
h = hash_password("test123")
assert verify_password("test123", h), "Password verify failed"
token = create_access_token({"sub": "test-id", "role": "admin", "org_id": "org-id"})
payload = decode_access_token(token)
assert payload["sub"] == "test-id", "JWT decode failed"
print("Security OK — bcrypt hash + JWT round-trip passed")

# ── Encryption ─────────────────────────────────────────────────────────────────
from app.core.encryption import encrypt, decrypt
ct = encrypt("super-secret-password")
assert decrypt(ct) == "super-secret-password", "Decryption mismatch"
print("Encryption OK — Fernet round-trip passed")

# ── SQL Guard ──────────────────────────────────────────────────────────────────
from app.agents.sql_guard import guard_select_only, SQLGuardError

assert guard_select_only("SELECT * FROM users") == "SELECT * FROM users"

for bad in [
    "DELETE FROM users",
    "DROP TABLE users",
    "INSERT INTO users VALUES (1)",
    "UPDATE users SET name='x'",
    "SELECT * FROM users; DROP TABLE users",
]:
    try:
        guard_select_only(bad)
        raise AssertionError(f"Should have blocked: {bad}")
    except SQLGuardError:
        pass

print("SQL Guard OK — all blocked statements correctly rejected")

# ── SQL Validator ──────────────────────────────────────────────────────────────
from app.agents.sql_validator import validate_sql, SQLValidationError

schema = {
    "tables": {
        "customers": {
            "columns": [{"name": "id"}, {"name": "name"}, {"name": "revenue"}],
            "foreign_keys": [],
        },
        "orders": {
            "columns": [{"name": "id"}, {"name": "customer_id"}, {"name": "amount"}],
            "foreign_keys": [],
        },
    }
}

valid = validate_sql("SELECT name, revenue FROM customers ORDER BY revenue DESC LIMIT 5", schema)
assert valid, "Valid SQL rejected"

try:
    validate_sql("SELECT * FROM ghost_table", schema)
    raise AssertionError("Should have rejected unknown table")
except SQLValidationError:
    pass

print("SQL Validator OK — valid query passed, unknown table correctly rejected")

# ── Agent Imports ──────────────────────────────────────────────────────────────
from app.agents.schema_agent import fetch_schema, schema_to_prompt_string
from app.agents.sql_generator import generate_sql, explain_sql
from app.agents.insight_agent import generate_insight
from app.agents.visualization_agent import build_chart_config
print("Agent imports OK")

# ── Visualization Logic ────────────────────────────────────────────────────────
test_cases = [
    {
        "q": "Revenue by product",
        "cols": ["product", "revenue"],
        "rows": [{"product": "A", "revenue": 50000}, {"product": "B", "revenue": 30000}],
        "expected_types": ["bar", "pie"],
    },
    {
        "q": "Monthly sales trend",
        "cols": ["month", "sales"],
        "rows": [{"month": "2024-01", "sales": 10000}, {"month": "2024-02", "sales": 12000}],
        "expected_types": ["line"],
    },
    {
        "q": "All user records",
        "cols": ["name", "email"],
        "rows": [{"name": "Vipin", "email": "v@x.com"}],
        "expected_types": ["table"],
    },
]

for tc in test_cases:
    chart = build_chart_config(tc["q"], tc["cols"], tc["rows"])
    assert chart["type"] in tc["expected_types"], (
        f"Wrong chart type for '{tc['q']}': got {chart['type']}, expected one of {tc['expected_types']}"
    )
    print(f"  Chart for '{tc['q']}': {chart['type']} [OK]")

print("Visualization OK — all chart type heuristics correct")

# ── LangGraph Pipeline ─────────────────────────────────────────────────────────
from app.agents.graph import pipeline
print("LangGraph pipeline compiled OK")

# ── Routers ────────────────────────────────────────────────────────────────────
from app.routers.auth import router as auth_r
from app.routers.db_config import router as db_r
from app.routers.chat import router as chat_r
from app.routers.history import router as history_r
from app.routers.workspace import router as workspace_r
print("All routers imported OK")

# ── FastAPI App ────────────────────────────────────────────────────────────────
from app.main import app

# Use the OpenAPI schema as source of truth — it enumerates every route
# including those inside mounted _IncludedRouter objects.
openapi = app.openapi()
all_routes = list(openapi.get("paths", {}).keys())

required = [
    "/health",
    "/auth/signup",
    "/auth/login",
    "/auth/admin/create-employee",
    "/api/database/connect",
    "/api/database/test",
    "/api/database/update",
    "/api/database/status",
    "/api/database/disconnect",
    "/api/database/config",
    "/chat",
    "/history",
    "/admin/workspace/execute",
]
for r in required:
    assert r in all_routes, f"Missing route: {r}  (registered routes: {sorted(all_routes)})"
print(f"FastAPI app OK -- {len(all_routes)} routes, all required routes confirmed")



print()
print("=" * 50)
print("  ALL CHECKS PASSED — Backend is ready!")
print("=" * 50)
