"""
Insight Agent
──────────────
Takes the query results (rows + columns), the executed SQL query, and the original question
to generate a crisp, factual, plain-English business explanation of the findings.
"""
from langchain_ollama import OllamaLLM
from langchain_core.prompts import PromptTemplate
from app.config import get_settings
import json

settings = get_settings()

_llm = OllamaLLM(
    base_url=settings.ollama_base_url,
    model=settings.ollama_model,
    temperature=0.1,
)

_INSIGHT_PROMPT = PromptTemplate(
    input_variables=["question", "sql", "columns", "rows_sample", "total_rows"],
    template="""You are an intelligent data assistant delivering clear, factual insights.

USER QUESTION: "{question}"
EXECUTED SQL: {sql}

DATA SUMMARY:
- Total matching records: {total_rows}
- Columns: {columns}
- Returned records:
{rows_sample}

INSTRUCTIONS:
1. Directly answer the user's question in 1 to 3 concise, natural sentences.
2. The records shown above ARE the exact results that matched the user's criteria. Specifically highlight matching names, metrics, or key values.
3. If 0 records were returned, state clearly that no records matched the criteria.
4. Do NOT speculate on unrelated details (such as email domain providers like @gmail.com or unasked assumptions).
5. Never contradict the database results.

INSIGHT:""",
)


def generate_insight(question: str, columns: list[str], rows: list[dict], sql: str = "") -> str:
    """Generate a plain-English business insight from query results."""
    sample = rows[:10]
    chain = _INSIGHT_PROMPT | _llm
    result = chain.invoke({
        "question": question,
        "sql": sql or "N/A",
        "columns": ", ".join(columns) if columns else "None",
        "rows_sample": json.dumps(sample, default=str, indent=2) if sample else "[]",
        "total_rows": len(rows),
    })
    return result.strip()
