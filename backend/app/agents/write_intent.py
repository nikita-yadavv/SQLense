"""
write_intent.py — Detects natural language and SQL write/modification intents.
Used by AI Chat to intercept and reject non-SELECT operations gracefully.
"""
import re

WRITE_COMMAND_PATTERNS = [
    # Direct SQL DML / DDL statements
    r'^\s*(UPDATE|INSERT\s+INTO|DELETE\s+FROM|DROP\s+TABLE|DROP\s+DATABASE|ALTER\s+TABLE|TRUNCATE\s+TABLE|TRUNCATE\s+[a-zA-Z_]|CREATE\s+TABLE)\b',
    # Natural language imperative commands
    r'^\s*update\s+[a-zA-Z_0-9]+',
    r'^\s*delete\s+(from\s+)?[a-zA-Z_0-9]+',
    r'^\s*insert\s+(into\s+)?[a-zA-Z_0-9]+',
    r'^\s*drop\s+(table\s+)?[a-zA-Z_0-9]+',
    r'^\s*truncate\s+(table\s+)?[a-zA-Z_0-9]+',
    r'^\s*alter\s+table\b',
    r'^\s*modify\s+[a-zA-Z_0-9]+\b.*(to|set|=)',
    r'^\s*change\s+[a-zA-Z_0-9]+\b.*(to|set|=)',
    r'^\s*set\s+[a-zA-Z_0-9]+\b.*(to|=)',
    r'^\s*remove\s+(row|record|customer|product|order|employee|category|table|item|entry)\b',
    r'^\s*add\s+(a\s+)?(new\s+)?(row|record|customer|product|order|employee|category|item|entry)\b',
]

def is_write_intent(query: str) -> bool:
    """Return True if the query is attempting a data modification or schema change."""
    if not query:
        return False
    q_clean = query.strip()
    for pattern in WRITE_COMMAND_PATTERNS:
        if re.search(pattern, q_clean, re.IGNORECASE):
            return True
    return False
