"""
reset_demo_connection.py — Reset NovaMart Retail database connection for Live Demo.

Usage:
    cd backend/
    python3 reset_demo_connection.py
"""
import os, sys
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import engine
from app.models.user import User
from app.models.org_db_config import OrgDbConfig

def main():
    print("\n" + "="*60)
    print("  SQLense — Resetting NovaMart Demo Connection")
    print("="*60)
    
    with Session(bind=engine) as db:
        admin = db.query(User).filter(User.email == "admin@novamart.com").first()
        if not admin:
            print("  ❌ NovaMart admin not found. Run 'python3 seed_data.py' first.")
            return

        cfg = db.query(OrgDbConfig).filter(OrgDbConfig.org_id == admin.id).first()
        if not cfg:
            cfg = OrgDbConfig(org_id=admin.id)
            db.add(cfg)

        cfg.organization_name = "NovaMart Retail"
        cfg.join_code = "NOVAM8X2"
        cfg.db_type = "postgresql"
        cfg.connection_status = "disconnected"
        db.commit()

    print("  ✅ NovaMart Retail status set to: DISCONNECTED")
    print("\n  Ready for Live Demo!")
    print("  1. Login as: admin@novamart.com / Admin@1234")
    print("  2. Navigate to: Database Settings (/admin/database)")
    print("  3. Host: localhost | Port: 5432 | DB: novamart_db | User: shreedeviyadav")
    print("  4. Click 'Test Connection' -> Click 'Connect Database'\n")

if __name__ == "__main__":
    main()
