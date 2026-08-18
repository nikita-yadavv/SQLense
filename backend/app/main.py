"""
FastAPI Application Factory
────────────────────────────
SQLense v2.0 — expanded with SuperAdmin, Employee Approval,
Audit Log, Employee Analytics, KPI Dashboard, and Smart Chart Suppression.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db
from app.routers import auth, db_config, chat, history, workspace
from app.routers import superadmin, analytics, kpi, saved_charts
from app.models import saved_chart as _saved_chart_model   # ensure table is created

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="SQLense",
    description=(
        "AI-powered SQL analytics platform — ask questions in plain English, "
        "get instant insights and visualizations from your organisation's database."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health Check ───────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "SQLense", "version": "2.0.0"}


# ── Core Routes ────────────────────────────────────────────────────────────────
app.include_router(auth.router,       prefix="/auth",           tags=["Auth"])
app.include_router(db_config.router,  prefix="/api/database",   tags=["Database Config"])
app.include_router(chat.router,       prefix="",                tags=["Chat"])
app.include_router(history.router,    prefix="",                tags=["History"])
app.include_router(workspace.router,  prefix="/admin",          tags=["Admin - Workspace"])

# ── New Phase 1–5 Routes ────────────────────────────────────────────────────────
app.include_router(superadmin.router, prefix="/api/superadmin",  tags=["SuperAdmin"])

app.include_router(analytics.router,     prefix="/admin",          tags=["Admin - Analytics"])
app.include_router(kpi.router,           prefix="/admin",          tags=["Admin - KPI"])
app.include_router(saved_charts.router,  prefix="",               tags=["Saved Charts"])


