"""
SuperAdmin Router
──────────────────
Completely separate from the regular admin/user system.
SuperAdmin credentials are stored in the `superadmins` table with hashed passwords.
Registration is done via the `register_superadmin.py` CLI script (run once by developer).

Routes:
  POST /superadmin/login        Authenticate → JWT with role=superadmin
  GET  /superadmin/orgs         List all registered organisations
  GET  /superadmin/stats        Platform-wide statistics
  GET  /superadmin/reports      Daily query volume + org growth charts
  POST /superadmin/chat         AI chat about platform data
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from pydantic import BaseModel

from app.database import get_db
from app.core.security import verify_password, create_access_token, decode_access_token
from app.models.superadmin import SuperAdmin
from app.models.user import User, UserStatus
from app.models.org_db_config import OrgDbConfig
from app.models.query_history import QueryHistory
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError

router = APIRouter()
_bearer = HTTPBearer()

SUPERADMIN_ROLE = "superadmin"


# ── Schemas ─────────────────────────────────────────────────────────────────────
class SuperAdminLoginRequest(BaseModel):
    email: str
    password: str

class SuperAdminUpdateRequest(BaseModel):
    name: str | None = None
    current_password: str | None = None
    new_password: str | None = None


# ── SuperAdmin auth dependency ──────────────────────────────────────────────────
def get_superadmin(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
):
    """Verify the superadmin JWT. Raises 401/403 if invalid or wrong role."""
    try:
        payload = decode_access_token(credentials.credentials)
        if payload.get("role") != SUPERADMIN_ROLE:
            raise HTTPException(status_code=403, detail="SuperAdmin access required.")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired superadmin token.")


# ── POST /superadmin/login ──────────────────────────────────────────────────────
@router.post("/login")
def superadmin_login(
    payload: SuperAdminLoginRequest,
    db: Session = Depends(get_db),
):
    """
    Authenticate as superadmin using DB-stored hashed credentials.
    Registration is done via the `register_superadmin.py` CLI script.
    """
    sa = db.query(SuperAdmin).filter(
        SuperAdmin.email == payload.email.strip().lower(),
        SuperAdmin.is_active == True,
    ).first()

    if not sa or not verify_password(payload.password, sa.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid superadmin credentials.",
        )

    # Update last login timestamp
    sa.last_login_at = datetime.now(timezone.utc)
    db.commit()

    token = create_access_token(
        {"sub": str(sa.id), "email": sa.email, "role": SUPERADMIN_ROLE},
        expires_delta=timedelta(hours=12),
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": SUPERADMIN_ROLE,
        "name": sa.name or "SuperAdmin",
        "email": sa.email,
    }


# ── GET /api/superadmin/me ──────────────────────────────────────────────────────
@router.get("/me")
def get_profile(
    db: Session = Depends(get_db),
    payload: dict = Depends(get_superadmin),
):
    """Return the authenticated superadmin's profile."""
    sa = db.query(SuperAdmin).filter(SuperAdmin.id == payload["sub"]).first()
    if not sa:
        raise HTTPException(status_code=404, detail="SuperAdmin not found.")
    return {
        "id":            str(sa.id),
        "name":          sa.name or "",
        "email":         sa.email,
        "created_at":    sa.created_at,
        "last_login_at": sa.last_login_at,
    }


# ── PUT /api/superadmin/me ──────────────────────────────────────────────────────
@router.put("/me")
def update_profile(
    body: SuperAdminUpdateRequest,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_superadmin),
):
    """Update the authenticated superadmin's name and/or password."""
    sa = db.query(SuperAdmin).filter(SuperAdmin.id == payload["sub"]).first()
    if not sa:
        raise HTTPException(status_code=404, detail="SuperAdmin not found.")

    if body.name is not None:
        sa.name = body.name.strip()

    if body.new_password:
        if not body.current_password:
            raise HTTPException(status_code=400, detail="Current password is required to set a new one.")
        if not verify_password(body.current_password, sa.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect.")
        if len(body.new_password) < 8:
            raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")
        sa.hashed_password = hash_password(body.new_password)

    db.commit()
    return {"message": "Profile updated successfully.", "name": sa.name}


# ── GET /superadmin/orgs ────────────────────────────────────────────────────────
@router.get("/orgs")
def list_organisations(
    db: Session = Depends(get_db),
    _: dict = Depends(get_superadmin),
):
    """List all registered organisations with their connection and user stats."""
    orgs = db.query(OrgDbConfig).order_by(OrgDbConfig.created_at.desc()).all()
    result = []
    for org in orgs:
        total_users = db.query(func.count(User.id)).filter(User.org_id == org.org_id).scalar()
        active_users = db.query(func.count(User.id)).filter(
            User.org_id == org.org_id, User.status == UserStatus.active
        ).scalar()
        total_queries = db.query(func.count(QueryHistory.id)).filter(
            QueryHistory.org_id == org.org_id
        ).scalar()

        result.append({
            "id":                str(org.id),
            "org_id":            str(org.org_id),
            "organization_name": org.organization_name,
            "join_code":         org.join_code,
            "db_type":           org.db_type,
            "connection_status": org.connection_status,
            "last_connected_at": org.last_connected_at,
            "created_at":        org.created_at,
            "total_users":       total_users,
            "active_users":      active_users,
            "total_queries":     total_queries,
        })
    return result


# ── GET /superadmin/stats ───────────────────────────────────────────────────────
@router.get("/stats")
def platform_stats(
    db: Session = Depends(get_db),
    _: dict = Depends(get_superadmin),
):
    """Platform-wide statistics overview."""
    total_orgs     = db.query(func.count(OrgDbConfig.id)).scalar()
    connected_orgs = db.query(func.count(OrgDbConfig.id)).filter(
        OrgDbConfig.connection_status == "connected"
    ).scalar()
    total_users    = db.query(func.count(User.id)).scalar()
    active_users   = db.query(func.count(User.id)).filter(User.status == UserStatus.active).scalar()
    pending_users  = db.query(func.count(User.id)).filter(User.status == UserStatus.pending).scalar()
    total_queries  = db.query(func.count(QueryHistory.id)).scalar()

    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    queries_7d = db.query(func.count(QueryHistory.id)).filter(
        QueryHistory.created_at >= seven_days_ago
    ).scalar()

    return {
        "total_organizations":     total_orgs,
        "connected_organizations": connected_orgs,
        "total_users":             total_users,
        "active_users":            active_users,
        "pending_users":           pending_users,
        "total_ai_queries":        total_queries,
        "ai_queries_last_7_days":  queries_7d,
    }


# ── GET /superadmin/reports ─────────────────────────────────────────────────────
@router.get("/reports")
def platform_reports(
    db: Session = Depends(get_db),
    _: dict = Depends(get_superadmin),
):
    """Daily query volume and org signups for the last 30 days."""
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

    rows = db.execute(
        text("""
            SELECT DATE(created_at) as day, COUNT(*) as query_count
            FROM query_history
            WHERE created_at >= :since
            GROUP BY DATE(created_at)
            ORDER BY day ASC
        """),
        {"since": thirty_days_ago},
    ).fetchall()

    org_rows = db.execute(
        text("""
            SELECT DATE(created_at) as day, COUNT(*) as new_orgs
            FROM org_db_configs
            WHERE created_at >= :since
            GROUP BY DATE(created_at)
            ORDER BY day ASC
        """),
        {"since": thirty_days_ago},
    ).fetchall()

    return {
        "daily_query_volume": [{"date": str(r.day), "count": r.query_count} for r in rows],
        "daily_org_signups":  [{"date": str(r.day), "count": r.new_orgs}   for r in org_rows],
    }


# ── POST /superadmin/chat ───────────────────────────────────────────────────────
@router.post("/chat")
def superadmin_chat(
    payload: dict,
    db: Session = Depends(get_db),
    _: dict = Depends(get_superadmin),
):
    """
    SuperAdmin AI chat — answers questions about the platform.
    Only accesses the Platform DB, never any org's database.
    """
    question = payload.get("question", "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    stats = {
        "total_orgs":    db.query(func.count(OrgDbConfig.id)).scalar(),
        "connected_orgs": db.query(func.count(OrgDbConfig.id)).filter(
            OrgDbConfig.connection_status == "connected"
        ).scalar(),
        "total_users":   db.query(func.count(User.id)).scalar(),
        "active_users":  db.query(func.count(User.id)).filter(User.status == UserStatus.active).scalar(),
        "total_queries": db.query(func.count(QueryHistory.id)).scalar(),
    }

    top_orgs = db.execute(
        text("""
            SELECT o.organization_name, COUNT(q.id) as query_count
            FROM org_db_configs o
            LEFT JOIN query_history q ON q.org_id = o.org_id
            GROUP BY o.org_id, o.organization_name
            ORDER BY query_count DESC
            LIMIT 5
        """)
    ).fetchall()

    context = f"""
You are the SQLense platform AI assistant. You have access to the following platform data:

Platform Statistics:
- Total organisations: {stats['total_orgs']}
- Connected organisations (with DB set up): {stats['connected_orgs']}
- Total users: {stats['total_users']}
- Active users: {stats['active_users']}
- Total AI queries processed: {stats['total_queries']}

Top 5 Most Active Organisations:
{chr(10).join(f"  - {r.organization_name}: {r.query_count} queries" for r in top_orgs)}

Answer the following question based on this data. Be concise and helpful.
Question: {question}
"""

    try:
        from langchain_ollama import OllamaLLM
        from app.config import get_settings
        settings = get_settings()
        llm = OllamaLLM(base_url=settings.ollama_base_url, model=settings.ollama_model)
        answer = llm.invoke(context)
    except Exception:
        answer = (
            f"AI service is currently unavailable. "
            f"Based on the data: There are {stats['total_orgs']} organisations "
            f"and {stats['total_queries']} total queries on the platform."
        )

    return {"question": question, "answer": answer, "context_stats": stats}
