"""Models package — import all ORM models so Base.metadata is fully populated."""
from app.models import user, org_db_config, query_history, audit_log, kpi_tile, superadmin  # noqa: F401

