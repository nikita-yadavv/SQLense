from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import get_settings

settings = get_settings()

# ── Platform DB engine (sync) ──────────────────────────────────────────────────
engine = create_engine(
    settings.platform_database_url,
    pool_pre_ping=True,   # check connection health before use
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a platform DB session and closes it after."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all platform tables on startup (idempotent)."""
    # Import models here so Base.metadata knows about them
    from app.models import user, org_db_config, query_history  # noqa: F401
    Base.metadata.create_all(bind=engine)
