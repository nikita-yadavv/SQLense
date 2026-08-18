"""
SQL Generator Agent
────────────────────
Takes a natural-language question + schema string and calls the local Ollama
LLM (qwen2.5:3b) to produce a raw SQL SELECT statement.
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


def generate_sql(question: str, schema_str: str) -> str:
    """Call the LLM and return the raw SQL string."""
    chain = _SQL_PROMPT | _llm
    result = chain.invoke({"schema": schema_str, "question": question})
    # Strip any accidental markdown fences the model might add
    sql = result.strip()
    for fence in ["```sql", "```SQL", "```", "`"]:
        sql = sql.replace(fence, "")
    return sql.strip()


def explain_sql(sql: str, question: str) -> str:
    """Ask the LLM to explain the SQL in plain English."""
    chain = _EXPLAIN_PROMPT | _llm
    return chain.invoke({"sql": sql, "question": question}).strip()
