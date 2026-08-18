"""
Saved Charts Router
────────────────────
Routes:
  GET    /api/saved-charts  &  /saved-charts          List saved charts for current user
  POST   /api/saved-charts  &  /saved-charts          Save a chart from AI chat response
  DELETE /api/saved-charts/{id} & /saved-charts/{id} Delete a saved chart
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Any

from app.database import get_db
from app.models.user import User, UserRole
from app.models.saved_chart import SavedChart
from app.core.deps import get_current_user

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────
class SaveChartRequest(BaseModel):
    title:      str
    question:   str
    sql_query:  Optional[str] = None
    chart_type: Optional[str] = None
    chart_data: Optional[Any] = None   # any JSON


class SavedChartOut(BaseModel):
    id:         str
    user_id:    str
    title:      str
    question:   str
    sql_query:  Optional[str]
    chart_type: Optional[str]
    chart_data: Optional[Any]
    created_at: str

    model_config = {"from_attributes": True}


# ── GET /saved-charts & /api/saved-charts ──────────────────────────────────────
@router.get("/saved-charts", response_model=list[SavedChartOut])
@router.get("/api/saved-charts", response_model=list[SavedChartOut])
def list_saved_charts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List saved charts. Admins see all org charts; employees see only their own."""
    query = db.query(SavedChart).filter(SavedChart.org_id == current_user.org_id)

    if current_user.role == UserRole.employee:
        query = query.filter(SavedChart.user_id == current_user.id)

    charts = query.order_by(SavedChart.created_at.desc()).all()

    return [
        SavedChartOut(
            id=str(c.id),
            user_id=str(c.user_id),
            title=c.title,
            question=c.question,
            sql_query=c.sql_query,
            chart_type=c.chart_type,
            chart_data=c.chart_data,
            created_at=c.created_at.isoformat(),
        )
        for c in charts
    ]


# ── POST /saved-charts & /api/saved-charts ────────────────────────────────────
@router.post("/saved-charts", status_code=status.HTTP_201_CREATED)
@router.post("/api/saved-charts", status_code=status.HTTP_201_CREATED)
def save_chart(
    payload: SaveChartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save a chart from the AI chat page."""
    chart = SavedChart(
        org_id=current_user.org_id,
        user_id=current_user.id,
        title=payload.title or payload.question[:80],
        question=payload.question,
        sql_query=payload.sql_query,
        chart_type=payload.chart_type,
        chart_data=payload.chart_data,
    )
    db.add(chart)
    db.commit()
    db.refresh(chart)
    return {"id": str(chart.id), "message": "Chart saved successfully."}


# ── DELETE /saved-charts/{id} & /api/saved-charts/{id} ────────────────────────
@router.delete("/saved-charts/{chart_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/api/saved-charts/{chart_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_chart(
    chart_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a saved chart. Users can only delete their own; admins can delete any in the org."""
    chart = db.query(SavedChart).filter(SavedChart.id == chart_id).first()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found.")
    if chart.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if current_user.role == UserRole.employee and chart.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own charts.")
    db.delete(chart)
    db.commit()
