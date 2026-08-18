"""
Audit log helper — a single function to record any platform action.

Usage (in any router):
    from app.core.audit import log_action
    log_action(db, action="USER_LOGIN", org_id=user.org_id,
               user_id=user.id, detail="Login from browser", request=request)
"""
from __future__ import annotations
from typing import Any
from sqlalchemy.orm import Session
from fastapi import Request
from app.models.audit_log import AuditLog
import json


def log_action(
    db: Session,
    action: str,
    *,
    org_id: Any = None,
    user_id: Any = None,
    detail: str | dict | None = None,
    request: Request | None = None,
) -> None:
    """Insert an audit log row. Silently swallows exceptions so it never breaks the main flow."""
    try:
        ip = None
        if request:
            # Respect X-Forwarded-For if behind a proxy
            forwarded = request.headers.get("x-forwarded-for")
            ip = forwarded.split(",")[0].strip() if forwarded else request.client.host

        detail_str: str | None = None
        if isinstance(detail, dict):
            detail_str = json.dumps(detail, default=str)
        elif detail is not None:
            detail_str = str(detail)

        entry = AuditLog(
            org_id=org_id,
            user_id=user_id,
            action=action,
            detail=detail_str,
            ip_address=ip,
        )
        db.add(entry)
        db.commit()
    except Exception:
        # Never let audit logging crash the main request
        db.rollback()
