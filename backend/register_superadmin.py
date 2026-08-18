#!/usr/bin/env python3
"""
SuperAdmin Registration Script
─────────────────────────────────────────────────────────────
Run this ONCE (or whenever you want to add a new superadmin):

    cd /Users/shreedeviyadav/Downloads/SQLense/backend
    python3 register_superadmin.py

This script:
  1. Connects to the platform database
  2. Asks for superadmin name, email, and password interactively
  3. Validates the password strength
  4. Hashes the password with bcrypt
  5. Saves the superadmin to the `superadmins` table
  6. Prints the credentials for your records

Security notes:
  - Passwords are NEVER stored in plain text
  - This script is run by the developer only, not exposed via any API
  - You can register multiple superadmins (e.g., one per team member)
  - To deactivate a superadmin, set is_active=False in the database

Usage:
  python3 register_superadmin.py           (interactive)
  python3 register_superadmin.py --list    (list existing superadmins)
"""
import sys
import os
import argparse
import getpass

# ── Add project root to path ──────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ── Load .env BEFORE importing app modules ────────────────────
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from sqlalchemy.orm import Session
from app.database import engine, Base
from app.models import superadmin  # noqa — ensure table is created
from app.models.superadmin import SuperAdmin
from app.core.security import hash_password


# ── Password validation ───────────────────────────────────────
def validate_password(pw: str) -> list[str]:
    errors = []
    if len(pw) < 8:         errors.append("  ✗ Must be at least 8 characters")
    if not any(c.isupper() for c in pw): errors.append("  ✗ Must have at least one uppercase letter")
    if not any(c.islower() for c in pw): errors.append("  ✗ Must have at least one lowercase letter")
    if not any(c.isdigit() for c in pw): errors.append("  ✗ Must have at least one digit")
    return errors


# ── Ensure tables exist ───────────────────────────────────────
def ensure_tables():
    Base.metadata.create_all(bind=engine)


# ── List existing superadmins ─────────────────────────────────
def list_superadmins():
    with Session(bind=engine) as db:
        admins = db.query(SuperAdmin).order_by(SuperAdmin.created_at).all()
        if not admins:
            print("\n  No superadmins registered yet.\n")
            return
        print(f"\n  {'Name':<20} {'Email':<35} {'Active':<8} {'Created'}")
        print("  " + "─" * 75)
        for sa in admins:
            created = sa.created_at.strftime("%Y-%m-%d %H:%M") if sa.created_at else "—"
            active = "✅ Yes" if sa.is_active else "❌ No"
            print(f"  {(sa.name or '—'):<20} {sa.email:<35} {active:<8} {created}")
        print()


# ── Register a new superadmin ─────────────────────────────────
def register():
    print("\n" + "═" * 60)
    print("  SQLense — SuperAdmin Registration")
    print("═" * 60)
    print("  This creates a platform-level developer account.")
    print("  These credentials will be used to log into:")
    print("  http://localhost:5173/superadmin/login")
    print("─" * 60 + "\n")

    # Name
    name = input("  Full name (optional, press Enter to skip): ").strip()

    # Email
    while True:
        email = input("  Email address: ").strip().lower()
        if not email or "@" not in email:
            print("  ✗ Please enter a valid email address.\n")
            continue
        break

    # Password
    while True:
        print()
        pw1 = getpass.getpass("  Password: ")
        errors = validate_password(pw1)
        if errors:
            print("\n  ✗ Password does not meet requirements:")
            for e in errors: print(e)
            print()
            continue
        pw2 = getpass.getpass("  Confirm password: ")
        if pw1 != pw2:
            print("  ✗ Passwords do not match. Try again.\n")
            continue
        break

    # Check for duplicates & save
    with Session(bind=engine) as db:
        existing = db.query(SuperAdmin).filter(SuperAdmin.email == email).first()
        if existing:
            if existing.is_active:
                print(f"\n  ✗ A superadmin with email '{email}' already exists and is active.")
                print("    Use --list to see all superadmins.\n")
                sys.exit(1)
            else:
                # Reactivate and update password
                existing.hashed_password = hash_password(pw1)
                existing.name = name or existing.name
                existing.is_active = True
                db.commit()
                print(f"\n  ✅ Superadmin '{email}' reactivated with new password.\n")
                return

        sa = SuperAdmin(
            email=email,
            hashed_password=hash_password(pw1),
            name=name or None,
        )
        db.add(sa)
        db.commit()
        db.refresh(sa)

    print()
    print("  ✅ SuperAdmin registered successfully!")
    print("─" * 60)
    print(f"  Name:    {name or '(not set)'}")
    print(f"  Email:   {email}")
    print(f"  Login:   http://localhost:5173/superadmin/login")
    print("─" * 60)
    print("  Keep these credentials safe — they grant platform-wide access.")
    print()


# ── Main ──────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SQLense SuperAdmin Registration")
    parser.add_argument("--list", action="store_true", help="List all registered superadmins")
    args = parser.parse_args()

    try:
        ensure_tables()
        if args.list:
            list_superadmins()
        else:
            register()
    except KeyboardInterrupt:
        print("\n\n  Cancelled.\n")
        sys.exit(0)
    except Exception as e:
        print(f"\n  ✗ Error: {e}")
        print("  Make sure the backend .env file exists and PostgreSQL is running.\n")
        sys.exit(1)
