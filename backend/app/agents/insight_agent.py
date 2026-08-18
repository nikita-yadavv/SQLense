"""
Insight Agent
──────────────
Takes the query results (rows + columns) plus the original question and
generates a plain-English business explanation of the findings.
"""
from langchain_ollama import OllamaLLM
from langchain_core.prompts import PromptTemplate
from app.config import get_settings
import json

settings = get_settings()

_llm = OllamaLLM(
    base_url=settings.ollama_base_url,
    model=settings.ollama_model,
    temperature=0.2,
)

_INSIGHT_PROMPT = PromptTemplate(
    input_variables=["question", "columns", "rows_sample", "total_rows"],
    template="""You are a senior business analyst presenting data findings to an executive audience.

The user asked: "{question}"

The query returned {total_rows} row(s). Here is a sample of the data:
Columns: {columns}
Sample rows (up to 10): {rows_sample}

Write a concise business insight (3-5 sentences) that:
1. Directly answers the user's question.
2. Highlights the most important finding or trend.
3. Uses specific numbers from the data where relevant.
4. Avoids technical jargon.
5. Does NOT mention SQL or databases.

BUSINESS INSIGHT:""",
)


def generate_insight(question: str, columns: list[str], rows: list[dict]) -> str:
    """Generate a plain-English business insight from query results."""
    sample = rows[:10]
    chain = _INSIGHT_PROMPT | _llm
    result = chain.invoke({
        "question": question,
        "columns": ", ".join(columns),
        "rows_sample": json.dumps(sample, default=str, indent=2),
        "total_rows": len(rows),
    })
    return result.strip()
