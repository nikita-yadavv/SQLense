"""
Admin Analytics Router
──────────────────────
Routes:
  GET /admin/analytics/employees      Activity breakdown per employee
  GET /admin/analytics/daily          Daily query volume for this org
  GET /admin/audit-log                Paginated audit log for this org
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app.database import get_db
from app.models.user import User, UserRole, UserStatus
from app.models.query_history import QueryHistory
from app.models.audit_log import AuditLog
from app.core.deps import require_role

router = APIRouter()
_admin_dep = require_role(UserRole.admin)


# ── GET /admin/analytics/employees ────────────────────────────────────────────
@router.get("/analytics/employees")
def employee_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_dep),
):
    """Per-employee query count, last query time, and question samples."""
    employees = db.query(User).filter(
        User.org_id == current_user.org_id,
        User.role == UserRole.employee,
    ).all()

    result = []
    for emp in employees:
        queries = db.query(QueryHistory).filter(
            QueryHistory.org_id == current_user.org_id,
            QueryHistory.user_id == emp.id,
        ).order_by(QueryHistory.created_at.desc()).all()

        result.append({
            "user_id": str(emp.id),
            "name": emp.name,
            "email": emp.email,
            "status": emp.status.value,
            "total_queries": len(queries),
            "last_query_at": queries[0].created_at if queries else None,
            "recent_questions": [q.question[:80] for q in queries[:3]],
        })

    # Sort by most active
    result.sort(key=lambda x: x["total_queries"], reverse=True)
    return result


# ── GET /admin/analytics/daily ────────────────────────────────────────────────
@router.get("/analytics/daily")
def daily_query_volume(
    days: int = Query(30, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_dep),
):
    """Daily query counts for this org over the last N days."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    rows = db.execute(
        text("""
            SELECT DATE(created_at) as day, COUNT(*) as query_count
            FROM query_history
            WHERE org_id = :org_id AND created_at >= :since
            GROUP BY DATE(created_at)
            ORDER BY day ASC
        """),
        {"org_id": str(current_user.org_id), "since": since},
    ).fetchall()

    return [{"date": str(r.day), "count": r.query_count} for r in rows]


# ── GET /admin/audit-log ───────────────────────────────────────────────────────
@router.get("/audit-log")
def get_audit_log(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_dep),
):
    """Paginated audit log for the current organisation."""
    total = db.query(func.count(AuditLog.id)).filter(
        AuditLog.org_id == current_user.org_id
    ).scalar()

    entries = (
        db.query(AuditLog)
        .filter(AuditLog.org_id == current_user.org_id)
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "entries": [
            {
                "id": str(e.id),
                "action": e.action,
                "user_id": str(e.user_id) if e.user_id else None,
                "detail": e.detail,
                "ip_address": e.ip_address,
                "created_at": e.created_at,
            }
            for e in entries
        ],
    }
