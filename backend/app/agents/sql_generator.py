"""
SQL Generator Agent
────────────────────
Takes a natural-language question/prompt + schema string and calls the local
Ollama LLM to produce SQL statements.
- generate_sql: for Chat (SELECT only)
- generate_crud_sql: for SQL Workspace (SELECT, INSERT, UPDATE, DELETE, DDL)
"""
from langchain_ollama import OllamaLLM
from langchain_core.prompts import PromptTemplate
from app.config import get_settings

settings = get_settings()

_llm = OllamaLLM(
    base_url=settings.ollama_base_url,
    model=settings.ollama_model,
    temperature=0,          # deterministic SQL output
)

_SQL_PROMPT = PromptTemplate(
    input_variables=["schema", "question"],
    template="""You are an expert PostgreSQL analyst. Given the database schema below, write a single,
correct PostgreSQL SELECT query that answers the user's question.

RULES:
- Output ONLY the raw SQL query with no explanation, no markdown, no code fences.
- Use ONLY table and column names that exist in the schema below.
- Do NOT invent table names. Column names like 'month', 'year', 'revenue' are NOT tables — query the table where they belong (e.g., 'monthly_revenue' or 'orders').
- In the 'monthly_revenue' table, 'month' is a VARCHAR string (e.g. 'January') and 'year' is an INTEGER (e.g. 2026).
- When querying 'monthly_revenue', filter by year using `year = 2026` or `year = EXTRACT(YEAR FROM CURRENT_DATE)::INT`. Do NOT apply date functions like EXTRACT to the 'month' column!
- Limit results to 500 rows unless requested otherwise.
- NEVER use INSERT, UPDATE, DELETE, DROP, or any DML/DDL.

DATABASE SCHEMA:
{schema}

USER QUESTION:
{question}

SQL QUERY:""",
)

_EXPLAIN_PROMPT = PromptTemplate(
    input_variables=["sql", "question"],
    template="""You are a helpful data analyst. Explain the following SQL query in plain English 
so that a non-technical business user can understand what it does.
Keep the explanation to 2-3 sentences maximum.

USER QUESTION: {question}

SQL QUERY:
{sql}

PLAIN ENGLISH EXPLANATION:""",
)

_CRUD_SQL_PROMPT = PromptTemplate(
    input_variables=["schema", "prompt"],
    template="""You are an expert PostgreSQL database engineer and administrator.
Given the database schema below, write a single, valid PostgreSQL statement that satisfies the user's request.
The request can be ANY CRUD operation:
- SELECT (query records, aggregation, filters, joins)
- INSERT (insert new rows into tables)
- UPDATE (update existing rows with appropriate WHERE clauses)
- DELETE (delete rows with appropriate WHERE clauses)
- CREATE TABLE / ALTER TABLE / DROP TABLE (schema modifications)

RULES:
- Output ONLY the raw SQL with no markdown, no code fences, no extra commentary.
- Use only valid table and column names from the schema below (or valid PostgreSQL names if creating a new table).
- For INSERT statements, specify explicit column lists.
- For UPDATE and DELETE statements, always include a safe WHERE clause matching the user's condition.
- Use proper PostgreSQL syntax and data types.

DATABASE SCHEMA:
{schema}

USER REQUEST:
{prompt}

SQL STATEMENT:""",
)

_CRUD_EXPLAIN_PROMPT = PromptTemplate(
    input_variables=["sql", "prompt"],
    template="""You are an expert PostgreSQL engineer. Explain what the following SQL statement does in 1-2 clear, concise sentences.
Highlight the table affected and the main action (insert, update, delete, query, etc.).

USER REQUEST: {prompt}

SQL STATEMENT:
{sql}

PLAIN ENGLISH EXPLANATION:""",
)


def generate_sql(question: str, schema_str: str) -> str:
    """Call the LLM and return the raw SQL SELECT string."""
    chain = _SQL_PROMPT | _llm
    result = chain.invoke({"schema": schema_str, "question": question})
    sql = result.strip()
    for fence in ["```sql", "```SQL", "```", "`"]:
        sql = sql.replace(fence, "")
    return sql.strip()


def explain_sql(sql: str, question: str) -> str:
    """Ask the LLM to explain the SQL in plain English."""
    chain = _EXPLAIN_PROMPT | _llm
    return chain.invoke({"sql": sql, "question": question}).strip()


def generate_crud_sql(prompt: str, schema_str: str) -> tuple[str, str, str]:
    """
    Generate any CRUD SQL statement (SELECT, INSERT, UPDATE, DELETE, etc.)
    and return (sql, explanation, operation_type).
    """
    chain = _CRUD_SQL_PROMPT | _llm
    result = chain.invoke({"schema": schema_str, "prompt": prompt})
    sql = result.strip()
    for fence in ["```sql", "```SQL", "```", "`"]:
        sql = sql.replace(fence, "")
    sql = sql.strip()

    # Determine operation type
    first_word = sql.split()[0].upper() if sql.split() else "QUERY"
    if first_word in {"SELECT", "WITH", "EXPLAIN", "SHOW"}:
        op_type = "SELECT"
    elif first_word == "INSERT":
        op_type = "INSERT"
    elif first_word == "UPDATE":
        op_type = "UPDATE"
    elif first_word == "DELETE":
        op_type = "DELETE"
    elif first_word in {"CREATE", "ALTER", "DROP", "TRUNCATE"}:
        op_type = "SCHEMA"
    else:
        op_type = first_word

    # Generate explanation
    try:
        explain_chain = _CRUD_EXPLAIN_PROMPT | _llm
        explanation = explain_chain.invoke({"sql": sql, "prompt": prompt}).strip()
    except Exception:
        explanation = f"Executes a {op_type} operation on the database."

    return sql, explanation, op_type
