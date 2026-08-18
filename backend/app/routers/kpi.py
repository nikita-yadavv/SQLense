"""
KPI Tiles Router
─────────────────
Routes:
  GET    /admin/kpi-tiles            List all KPI tiles for this org
  POST   /admin/kpi-tiles            Create a new KPI tile
  PUT    /admin/kpi-tiles/{id}       Update a tile
  DELETE /admin/kpi-tiles/{id}       Delete a tile
  POST   /admin/kpi-tiles/run        Execute all tiles and return live values
  POST   /admin/kpi-chat             AI chat with dashboard context
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Any

from app.database import get_db
from app.models.user import User, UserRole
from app.models.kpi_tile import KPITile
from app.core.deps import require_role
from app.core.audit import log_action
from app.services.db_connection import build_org_engine

router = APIRouter()
_admin_dep = require_role(UserRole.admin)


# ── Schemas ────────────────────────────────────────────────────────────────────
class KPITileCreate(BaseModel):
    title: str
    description: str | None = None
    sql_query: str
    position: int = 0


class KPITileUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    sql_query: str | None = None
    position: int | None = None


class KPIChatRequest(BaseModel):
    question: str
    dashboard_data: list[dict]   # live tile results passed from frontend


# ── GET /admin/kpi-tiles ───────────────────────────────────────────────────────
@router.get("/kpi-tiles")
def list_kpi_tiles(
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_dep),
):
    tiles = (
        db.query(KPITile)
        .filter(KPITile.org_id == current_user.org_id)
        .order_by(KPITile.position)
        .all()
    )
    return [_tile_to_dict(t) for t in tiles]


# ── POST /admin/kpi-tiles ──────────────────────────────────────────────────────
@router.post("/kpi-tiles", status_code=201)
def create_kpi_tile(
    payload: KPITileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_dep),
):
    # Enforce max 8 tiles per org
    count = db.query(KPITile).filter(KPITile.org_id == current_user.org_id).count()
    if count >= 8:
        raise HTTPException(status_code=400, detail="Maximum 8 KPI tiles per organisation.")

    tile = KPITile(
        org_id=current_user.org_id,
        created_by=current_user.id,
        title=payload.title,
        description=payload.description,
        sql_query=payload.sql_query,
        position=payload.position,
    )
    db.add(tile)
    db.commit()
    db.refresh(tile)

    log_action(db, "KPI_TILE_CREATED", org_id=current_user.org_id, user_id=current_user.id,
               detail=f"Created KPI tile: {tile.title}")

    return _tile_to_dict(tile)


# ── PUT /admin/kpi-tiles/{id} ─────────────────────────────────────────────────
@router.put("/kpi-tiles/{tile_id}")
def update_kpi_tile(
    tile_id: str,
    payload: KPITileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_dep),
):
    tile = _get_tile(tile_id, current_user, db)
    if payload.title       is not None: tile.title       = payload.title
    if payload.description is not None: tile.description = payload.description
    if payload.sql_query   is not None: tile.sql_query   = payload.sql_query
    if payload.position    is not None: tile.position    = payload.position
    db.commit()
    db.refresh(tile)
    return _tile_to_dict(tile)


# ── DELETE /admin/kpi-tiles/{id} ──────────────────────────────────────────────
@router.delete("/kpi-tiles/{tile_id}", status_code=204)
def delete_kpi_tile(
    tile_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_dep),
):
    tile = _get_tile(tile_id, current_user, db)
    log_action(db, "KPI_TILE_DELETED", org_id=current_user.org_id, user_id=current_user.id,
               detail=f"Deleted KPI tile: {tile.title}")
    db.delete(tile)
    db.commit()


# ── POST /admin/kpi-tiles/run ─────────────────────────────────────────────────
@router.post("/kpi-tiles/run")
def run_kpi_tiles(
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_dep),
):
    """Execute all KPI tile queries against the org database and return live values."""
    tiles = (
        db.query(KPITile)
        .filter(KPITile.org_id == current_user.org_id)
        .order_by(KPITile.position)
        .all()
    )

    results = []
    try:
        engine = build_org_engine(current_user.org_id, db)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Cannot connect to organisation database: {e}")

    for tile in tiles:
        # Fresh connection per tile — one failure never aborts the rest
        try:
            with engine.connect() as conn:
                result = conn.execute(text(tile.sql_query))
                rows = result.fetchmany(50)
                cols = list(result.keys())
                # Serialize non-JSON-native types
                from decimal import Decimal
                from datetime import date, datetime as dt
                clean_rows = []
                for row in rows:
                    clean = {}
                    for k, v in dict(zip(cols, row)).items():
                        if isinstance(v, Decimal):
                            clean[k] = float(v)
                        elif isinstance(v, (date, dt)):
                            clean[k] = v.isoformat()
                        else:
                            clean[k] = v
                    clean_rows.append(clean)
                results.append({
                    "tile_id": str(tile.id),
                    "title": tile.title,
                    "description": tile.description,
                    "columns": cols,
                    "rows": clean_rows,
                    "error": None,
                })
        except Exception as e:
            # Extract just the meaningful part of the error (not the full traceback)
            err_msg = str(e).split("\n")[0].replace("(Background on this error", "").strip()
            results.append({
                "tile_id": str(tile.id),
                "title": tile.title,
                "description": tile.description,
                "columns": [],
                "rows": [],
                "error": err_msg,
            })

    return results


# ── POST /admin/kpi-chat ───────────────────────────────────────────────────────
@router.post("/kpi-chat")
def kpi_dashboard_chat(
    payload: KPIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_dep),
):
    """
    AI chat with the current dashboard data as context.
    The frontend sends the live tile values; the LLM answers questions about them.
    """
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    # Build context string from dashboard data
    context_parts = []
    for tile in payload.dashboard_data:
        context_parts.append(f"### {tile.get('title', 'Tile')}")
        rows = tile.get("rows", [])
        if rows:
            # Summarise first few rows
            context_parts.append(str(rows[:5]))
        else:
            context_parts.append("(No data)")

    context = "\n".join(context_parts)

    prompt = f"""You are an AI business analyst assistant.
The user is viewing a KPI dashboard with the following live data:

{context}

Answer the following question based on this data. Be concise, insightful, and business-focused.
Question: {payload.question}
"""

    log_action(db, "KPI_CHAT_QUERY", org_id=current_user.org_id, user_id=current_user.id,
               detail=payload.question[:200])

    try:
        from langchain_ollama import OllamaLLM
        from app.config import get_settings
        settings = get_settings()
        llm = OllamaLLM(base_url=settings.ollama_base_url, model=settings.ollama_model)
        answer = llm.invoke(prompt)
    except Exception:
        answer = "AI service is currently unavailable. Please ensure Ollama is running."

    return {"question": payload.question, "answer": answer}


# ── Helpers ────────────────────────────────────────────────────────────────────
def _get_tile(tile_id: str, current_user: User, db: Session) -> KPITile:
    tile = db.query(KPITile).filter(KPITile.id == tile_id).first()
    if not tile:
        raise HTTPException(status_code=404, detail="KPI tile not found.")
    if tile.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return tile


def _tile_to_dict(tile: KPITile) -> dict:
    return {
        "id": str(tile.id),
        "title": tile.title,
        "description": tile.description,
        "sql_query": tile.sql_query,
        "position": tile.position,
        "created_at": tile.created_at,
    }
