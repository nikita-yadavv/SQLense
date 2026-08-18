from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.query_history import QueryHistory
from app.schemas.history import HistoryItem
from app.core.deps import get_current_user

router = APIRouter()


# ── GET /history ───────────────────────────────────────────────────────────────
@router.get("/history", response_model=list[HistoryItem])
def get_history(
    limit: int = Query(default=50, le=200, description="Maximum number of records to return"),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return the authenticated user's query history, newest first.
    Employees see only their own queries; admins see all org queries.
    """
    from app.models.user import UserRole

    query = db.query(QueryHistory)

    if current_user.role == UserRole.admin:
        # Admin sees the whole org's history
        query = query.filter(QueryHistory.org_id == current_user.org_id)
    else:
        # Employee sees only their own
        query = query.filter(QueryHistory.user_id == current_user.id)

    records = (
        query.order_by(QueryHistory.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return records
