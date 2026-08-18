"""
Schema Agent
────────────
Reads the target organisation's database schema and returns a structured
dictionary with table names, column details, and foreign-key relationships.
This information is passed to the SQL Generator Agent as context.
"""
from sqlalchemy import create_engine, inspect, text


def get_org_engine(conn_str: str):
    """Create a disposable SQLAlchemy engine for the org's database."""
    return create_engine(conn_str, pool_pre_ping=True, connect_args={"connect_timeout": 10})


def fetch_schema(conn_str: str) -> dict:
    """
    Returns a dict with:
      {
        "tables": {
          "table_name": {
            "columns": [ {"name": str, "type": str, "nullable": bool, "primary_key": bool} ],
            "foreign_keys": [ {"column": str, "ref_table": str, "ref_column": str} ]
          }
        }
      }
    """
    engine = get_org_engine(conn_str)
    try:
        inspector = inspect(engine)
        schema: dict = {"tables": {}}

        for table_name in inspector.get_table_names():
            columns = []
            for col in inspector.get_columns(table_name):
                columns.append({
                    "name": col["name"],
                    "type": str(col["type"]),
                    "nullable": col.get("nullable", True),
                    "primary_key": col.get("primary_key", False),
                })

            foreign_keys = []
            for fk in inspector.get_foreign_keys(table_name):
                for local_col, ref_col in zip(fk["constrained_columns"], fk["referred_columns"]):
                    foreign_keys.append({
                        "column": local_col,
                        "ref_table": fk["referred_table"],
                        "ref_column": ref_col,
                    })

            schema["tables"][table_name] = {
                "columns": columns,
                "foreign_keys": foreign_keys,
            }

        return schema
    finally:
        engine.dispose()


def schema_to_prompt_string(schema: dict) -> str:
    """
    Convert schema dict into a compact string suitable for injecting into LLM prompts.

    Example output:
        Table: customers
          Columns: id (INTEGER), name (VARCHAR), email (VARCHAR)
          FK: customer_id → orders.id
    """
    lines = []
    for table, info in schema["tables"].items():
        col_str = ", ".join(
            f"{c['name']} ({c['type']})" + (" PK" if c["primary_key"] else "")
            for c in info["columns"]
        )
        lines.append(f"Table: {table}")
        lines.append(f"  Columns: {col_str}")
        if info["foreign_keys"]:
            for fk in info["foreign_keys"]:
                lines.append(f"  FK: {fk['column']} → {fk['ref_table']}.{fk['ref_column']}")
    return "\n".join(lines)
