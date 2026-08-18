"""
Seed script — populates the SQLense platform database with realistic dummy data.

Run this AFTER starting the backend (which auto-creates all tables via init_db):
    cd backend/
    python3 seed_data.py

Creates:
  - 2 Organisations (Acme Corp, TechStart Inc)
  - 1 Admin + 4 Employees per org (2 active, 2 pending)
  - 50 query history entries per org
  - 3 KPI tiles per org
  - Audit log entries
"""
import sys
import os
import uuid
import random
from datetime import datetime, timezone, timedelta

sys.path.insert(0, ".")

# ── Load settings first ──────────────────────────────────────
from dotenv import load_dotenv
load_dotenv(".env")

from app.database import engine, Base, get_db
from app.models.user import User, UserRole, UserStatus
from app.models.org_db_config import OrgDbConfig
from app.models.query_history import QueryHistory
from app.models.audit_log import AuditLog
from app.models.kpi_tile import KPITile
from app.core.security import hash_password

# ── Recreate all tables ──────────────────────────────────────
print("Creating tables...")
Base.metadata.create_all(bind=engine)
print("✅ Tables created")

# ── Open a session ───────────────────────────────────────────
from sqlalchemy.orm import Session
db = Session(bind=engine)

# ── Helper ───────────────────────────────────────────────────
def make_dt(days_ago=0, hours_ago=0):
    return datetime.now(timezone.utc) - timedelta(days=days_ago, hours=hours_ago)

# ── Sample data ──────────────────────────────────────────────
SAMPLE_QUESTIONS = [
    "Show me total revenue by month for the last year",
    "How many active customers do we have?",
    "What are the top 10 products by sales volume?",
    "Show me orders placed in the last 30 days",
    "Which region has the highest revenue?",
    "What is the average order value this quarter?",
    "List all employees in the engineering department",
    "How many orders were cancelled last month?",
    "Show me customer acquisition trends by quarter",
    "What is the total inventory value?",
    "Which product categories are declining in sales?",
    "Show me daily active users for the past week",
    "How many new signups did we get this month?",
    "What is the churn rate for Q3?",
    "Show me the top 5 customers by lifetime value",
]

SAMPLE_SQL = [
    "SELECT SUM(revenue) FROM orders WHERE created_at > NOW() - INTERVAL '1 year' GROUP BY DATE_TRUNC('month', created_at)",
    "SELECT COUNT(*) FROM customers WHERE status = 'active'",
    "SELECT product_name, SUM(quantity) as total_sales FROM order_items GROUP BY product_name ORDER BY total_sales DESC LIMIT 10",
    "SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '30 days'",
    "SELECT region, SUM(revenue) FROM sales GROUP BY region ORDER BY SUM(revenue) DESC",
]

# ── Create Organisations ──────────────────────────────────────
orgs_data = [
    {
        "admin_name":    "Priya Sharma",
        "admin_email":   "admin@acme.com",
        "admin_password": "AdminAcme@2024",
        "org_name":      "Acme Corporation",
        "join_code":     "ACMEX7Q2",
        "employees": [
            {"name": "Rohit Gupta",   "email": "rohit@acme.com",   "status": UserStatus.active,  "queries": 23},
            {"name": "Sneha Patel",   "email": "sneha@acme.com",   "status": UserStatus.active,  "queries": 17},
            {"name": "Arjun Mehta",   "email": "arjun@acme.com",   "status": UserStatus.pending, "queries": 0},
            {"name": "Kavya Nair",    "email": "kavya@acme.com",   "status": UserStatus.pending, "queries": 0},
        ],
        "kpi_tiles": [
            {"title": "Total Revenue",    "sql": "SELECT SUM(amount) AS total_revenue FROM orders"},
            {"title": "Active Customers", "sql": "SELECT COUNT(*) AS active_customers FROM customers WHERE status = 'active'"},
            {"title": "Orders This Month","sql": "SELECT COUNT(*) AS orders_this_month FROM orders WHERE created_at >= DATE_TRUNC('month', NOW())"},
        ]
    },
    {
        "admin_name":    "Vivek Anand",
        "admin_email":   "admin@techstart.com",
        "admin_password": "AdminTech@2024",
        "org_name":      "TechStart Inc",
        "join_code":     "TECHK9P4",
        "employees": [
            {"name": "Ananya Singh",  "email": "ananya@techstart.com",  "status": UserStatus.active,  "queries": 31},
            {"name": "Dev Kumar",     "email": "dev@techstart.com",     "status": UserStatus.active,  "queries": 12},
            {"name": "Meera Joshi",   "email": "meera@techstart.com",   "status": UserStatus.pending, "queries": 0},
            {"name": "Raj Verma",     "email": "raj@techstart.com",     "status": UserStatus.pending, "queries": 0},
        ],
        "kpi_tiles": [
            {"title": "Monthly Signups",  "sql": "SELECT COUNT(*) AS signups FROM users WHERE created_at >= DATE_TRUNC('month', NOW())"},
            {"title": "Total Products",   "sql": "SELECT COUNT(*) AS total_products FROM products"},
            {"title": "Avg Order Value",  "sql": "SELECT ROUND(AVG(total_amount), 2) AS avg_order_value FROM orders"},
        ]
    }
]

for org_data in orgs_data:
    print(f"\nSeeding: {org_data['org_name']}...")

    # Check if admin already exists
    existing = db.query(User).filter(User.email == org_data["admin_email"]).first()
    if existing:
        print(f"  ⚠️  Admin {org_data['admin_email']} already exists — skipping this org")
        continue

    # Create admin
    admin = User(
        name=org_data["admin_name"],
        email=org_data["admin_email"],
        hashed_password=hash_password(org_data["admin_password"]),
        role=UserRole.admin,
        status=UserStatus.active,
        created_at=make_dt(days_ago=30),
    )
    db.add(admin)
    db.flush()
    admin.org_id = admin.id

    # Create org config
    org_config = OrgDbConfig(
        org_id=admin.id,
        organization_name=org_data["org_name"],
        join_code=org_data["join_code"],
        db_type="postgresql",
        connection_status="disconnected",
        created_at=make_dt(days_ago=30),
        updated_at=make_dt(days_ago=30),
    )
    db.add(org_config)

    # Audit: signup
    db.add(AuditLog(org_id=admin.id, user_id=admin.id, action="USER_SIGNUP",
                    detail=f"Admin signup: {admin.email}", created_at=make_dt(days_ago=30)))
    db.flush()

    # Create employees
    for emp_data in org_data["employees"]:
        emp = User(
            name=emp_data["name"],
            email=emp_data["email"],
            hashed_password=hash_password("Employee@2024"),
            role=UserRole.employee,
            status=emp_data["status"],
            org_id=admin.id,
            created_at=make_dt(days_ago=random.randint(1, 20)),
        )
        db.add(emp)
        db.flush()

        action = "EMPLOYEE_JOINED" if emp_data["status"] == UserStatus.pending else "EMPLOYEE_APPROVED"
        db.add(AuditLog(org_id=admin.id, user_id=emp.id, action=action,
                        detail=f"{emp.name} ({emp.email})", created_at=emp.created_at))

        # Create query history for active employees
        if emp_data["status"] == UserStatus.active:
            for i in range(emp_data["queries"]):
                q = random.choice(SAMPLE_QUESTIONS)
                s = random.choice(SAMPLE_SQL)
                db.add(QueryHistory(
                    user_id=emp.id,
                    org_id=admin.id,
                    question=q,
                    sql_query=s,
                    sql_explanation="AI-generated SQL based on your question.",
                    answer_text="Based on the data, here are the key insights...",
                    chart_type=random.choice(["bar", "line", "none", "none"]),
                    created_at=make_dt(days_ago=random.randint(0, 25),
                                       hours_ago=random.randint(0, 23)),
                ))
                db.add(AuditLog(org_id=admin.id, user_id=emp.id, action="CHAT_QUERY",
                                detail=q[:200],
                                created_at=make_dt(days_ago=random.randint(0, 25))))

    # Add some admin queries too
    for i in range(10):
        q = random.choice(SAMPLE_QUESTIONS)
        db.add(QueryHistory(
            user_id=admin.id, org_id=admin.id,
            question=q, sql_query=random.choice(SAMPLE_SQL),
            sql_explanation="AI-generated SQL.",
            answer_text="Key insights from the data...",
            chart_type=random.choice(["bar", "line", "none"]),
            created_at=make_dt(days_ago=random.randint(0, 28)),
        ))

    # KPI tiles
    for i, tile_data in enumerate(org_data["kpi_tiles"]):
        db.add(KPITile(
            org_id=admin.id, created_by=admin.id,
            title=tile_data["title"],
            description=f"Auto-generated KPI for {org_data['org_name']}",
            sql_query=tile_data["sql"],
            position=i,
        ))
        db.add(AuditLog(org_id=admin.id, user_id=admin.id, action="KPI_TILE_CREATED",
                        detail=f"Created tile: {tile_data['title']}"))

    # Login audit entries
    for i in range(5):
        db.add(AuditLog(org_id=admin.id, user_id=admin.id, action="USER_LOGIN",
                        detail=f"Login: {admin.email}", ip_address="127.0.0.1",
                        created_at=make_dt(days_ago=random.randint(0, 15))))

    db.commit()
    print(f"  ✅ {org_data['org_name']}: admin + {len(org_data['employees'])} employees + KPI tiles seeded")

print("\n🎉 Seed complete!")
print("\nCredentials:")
print("  Admin 1:    admin@acme.com       / AdminAcme@2024")
print("  Admin 2:    admin@techstart.com  / AdminTech@2024")
print("  Employees:  *@acme.com, *@techstart.com / Employee@2024")
print("  SuperAdmin: superadmin@sqlense.dev / SuperAdmin@2024!  (env-based, not in DB)")
print("\nJoin Codes:")
print("  Acme Corp:    ACMEX7Q2")
print("  TechStart:    TECHK9P4")
