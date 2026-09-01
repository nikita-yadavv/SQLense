# SQLense — Complete System Testing Guide

**Version:** 2.1.0 | **Platform:** macOS (Apple M1 / Monterey+) | **Last Updated:** August 2026

> This guide covers every feature of SQLense end-to-end.
> Follow the sections in order for your first run, then use individual sections for targeted testing.

---

## Table of Contents

1. [System Architecture & Documentation](#1-system-architecture--documentation)
2. [Prerequisites & Starting the System](#2-prerequisites--starting-the-system)
3. [Luxury UI/UX Theme Reference](#3-luxury-uiux-theme-reference)
4. [Test Credentials](#4-test-credentials)
5. [Organisation Databases & Seeding](#5-organisation-databases--seeding)
6. [SuperAdmin Flow](#6-superadmin-flow)
7. [Admin Flow](#7-admin-flow)
8. [Employee Flow](#8-employee-flow)
9. [AI Chat & Smart Chart Suppression](#9-ai-chat--smart-chart-suppression)
10. [Saved Charts Functionality](#10-saved-charts-functionality)
11. [Profile & User Details](#11-profile--user-details)
12. [API Reference (Quick Test)](#12-api-reference-quick-test)
13. [Deployment Checklist](#13-deployment-checklist)

---

## 1. System Architecture & Documentation

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│                  http://localhost:5173                       │
│  React (Vite) · Luxury Royal/Midnight Theme · Recharts      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / REST API (Proxied by Vite dev server)
┌──────────────────────────▼──────────────────────────────────┐
│                        BACKEND                              │
│                  http://localhost:8000                       │
│         FastAPI · SQLAlchemy · Pydantic · JWT               │
│                                                             │
│  Routers:                                                   │
│    /auth            ← Login, signup, join code, /auth/me    │
│    /api/database    ← Org DB config (connect/test/update)   │
│    /chat            ← AI query (SELECT-only, all users)     │
│    /api/saved-charts← Save, list, delete saved charts       │
│    /history         ← Query history                         │
│    /admin           ← Workspace, analytics, KPI, audit log  │
│    /api/superadmin  ← Platform admin (separate auth)        │
│                                                             │
│  AI Pipeline (LangGraph 6-Agent Core):                      │
│    Schema Agent → SQL Generator → SQL Validator →           │
│    SQL Guard (SELECT-Only) → Insight Agent → Visualization  │
└───────────┬───────────────────────┬─────────────────────────┘
            │                       │
┌───────────▼──────────┐  ┌─────────▼──────────────────────┐
│  Platform DB          │  │  Ollama (AI Engine)             │
│  PostgreSQL           │  │  http://localhost:11434         │
│  DB: sqlense          │  │  Model: qwen2.5:3b              │
│                       │  │  (3B params, ~2GB RAM)          │
│  Tables:              │  └────────────────────────────────┘
│  • users              │
│  • org_db_configs     │  ┌──────────────────────────────────┐
│  • query_histories    │  │  Organisation DBs (Isolated)     │
│  • audit_logs         │  │  • acme_db (Retail / E-Commerce) │
│  • kpi_tiles          │◄─┼─ • techstart_db (SaaS Subscript)│
│  • saved_charts       │  │  (Connected per Org Admin)       │
│  • superadmins        │  └──────────────────────────────────┘
└───────────────────────┘
```

### Official System Documentation Specs
- **Sequence Diagrams (PPT Slide Ready)**: `docs/SQLense_Sequence_Diagram.html` *(UML 2.5 Robustness Notations: sd Frame, Actor, Boundary ├◯, Control ↻, Entity ◯_)*
- **Data Dictionary Spec**: `docs/DATA_DICTIONARY_SPEC.md` *(Full column properties, types, constraints & validation rules)*
- **UML & Schema Blueprint**: `docs/SYSTEM_DIAGRAMS_AND_SCHEMA_SPEC.md` *(ER diagrams, use cases, activity & sequence specifications)*

---

## 2. Prerequisites & Starting the System

### Prerequisites Check

1. **PostgreSQL Database Server**: Ensure PostgreSQL on port `5432` is running.  
   - *If connection fails (`OperationalError: connection refused`)*, launch Postgres via Mac:
     ```bash
     open -a Postgres
     ```
2. **Ollama AI Service**: Ensure Ollama is running locally:
     ```bash
     ollama list
     ```

### Step-by-Step System Startup

Open **3 terminal tabs**:

**Tab 1 — Ollama AI Engine**
```bash
OLLAMA_MODELS="$HOME/.ollama/models" "$HOME/.local/bin/ollama" serve
```

**Tab 2 — Backend (FastAPI)**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Tab 3 — Frontend (Vite)**
```bash
cd frontend
npm run dev
```

**Open Browser:** http://localhost:5173

---

## 3. Luxury UI/UX Theme Reference

SQLense features an editorial Luxury Royal & Midnight color palette (`index.css` & `App.css`):

| Palette Shade | Hex Code | UI Component Role |
|---|---|---|
| **Royal** | `#334EAC` | Primary Action Buttons, Active Navigation Badges |
| **Moon** | `#F7F2EB` | Elevated Cards, Modals, Soft Panel Backgrounds |
| **China** | `#7096D1` | Sub-Headers, Focus Rings, Slate Blue Accents |
| **Asian Pear** | `#F2F0DE` | Pale Golden Highlights & Badge Fills |
| **Midnight** | `#081F5C` | High-Contrast Sidebar, Primary Headings, Code Blocks |
| **Dawn** | `#D0E3FF` | Ice Blue Fills, Active Item Badges, Code Text |
| **Jicama** | `#FFF9F0` | Warm Porcelain App Canvas Background |
| **Porcelain** | `#EDF1F6` | Table Headers, Subtle Card Borders, Inputs |
| **Sky** | `#BAD6EB` | Soft Borders, Hover Rings, Sub-Text |

---

## 4. Test Credentials

### Regular Users (Login at `/login`)

| Role | Email | Password | Org | Status |
|---|---|---|---|---|
| Admin | `admin@acme.com` | `AdminAcme@2024` | Acme Corporation | Active |
| Admin | `admin@techstart.com` | `AdminTech@2024` | TechStart Inc | Active |
| Employee | `rohit@acme.com` | `Employee@2024` | Acme Corporation | Active |
| Employee | `sneha@acme.com` | `Employee@2024` | Acme Corporation | Active |
| Employee | `ananya@techstart.com` | `Employee@2024` | TechStart Inc | Active |
| Employee | `meera@techstart.com` | `Employee@2024` | TechStart Inc | **Pending** |

### SuperAdmin (Login at `/superadmin/login`)

| Email | Password | Role |
|---|---|---|
| `superadmin@sqlense.dev` | `SuperAdmin@2024!` | SuperAdmin |

---

## 5. Organisation Databases & Seeding

SQLense isolates platform metadata from organisation databases.

To set up or re-seed the demo databases for Acme Corporation and TechStart Inc:
```bash
cd backend
python3 seed_data.py
python3 create_org_databases.py
```

This automatically builds:
1. `acme_db` (PostgreSQL): `customers`, `products`, `orders`, `order_items`, `employees`, `monthly_revenue`, `support_tickets`
2. `techstart_db` (PostgreSQL): `customers`, `subscriptions`, `usage_logs`, `employees`, `monthly_revenue`, `features`, `support_tickets`
3. Connects each admin to their DB and populates 6 live KPI tiles.

---

## 6. SuperAdmin Flow

**URL:** http://localhost:5173/superadmin/login

1. Login with `superadmin@sqlense.dev` / `SuperAdmin@2024!`
2. **Overview**: View total organisations, connected databases, active users, and system stats.
3. **Organisations**: View org list, connection status, join codes (`ACMEX7Q2`), and user counts.
4. **AI Chat**: Ask platform-level questions in natural language.

---

## 7. Admin Flow

**URL:** http://localhost:5173/login (`admin@acme.com` / `AdminAcme@2024`)

1. **Dashboard**: View active employees, pending approvals, and DB status.
2. **KPI Dashboard (`/admin/kpi-dashboard`)**:
   - Click **Run All** to execute live SQL metric tiles against `acme_db` or `techstart_db`.
   - Ask AI questions about KPI metrics using the chat drawer.
3. **Employees (`/admin/employees`)**: Approve/reject pending employees (`meera@techstart.com`), share 8-character join code (`ACMEX7Q2`), or add employees.
4. **SQL Workspace (`/admin/workspace`)**: Execute raw SQL queries with commit or rollback transaction control.
5. **Audit Log (`/admin/audit-log`)**: View security log of all admin activities.

---

## 8. Employee Flow

1. **Join via Code (`/signup`)**: Enter join code `ACMEX7Q2` to request access.
2. **Login (`/login`)**: Login as `rohit@acme.com` / `Employee@2024`.
3. **AI Chat (`/chat`)**: Ask questions like `"Show total revenue by month"` or `"How many products are in stock?"`.

---

## 9. AI Chat & Smart Chart Suppression

1. **Smart Chart Decision**:
   - Aggregated metrics (e.g. revenue over time, counts by category) automatically trigger line, bar, or pie charts.
   - Raw record listings (e.g. `"Show me top 5 recent entries"` or `SELECT *`) default to **clean tables** without forcing awkward charts.
2. **Chart Controls**:
   - **Show/Hide Chart**: Each chart response includes an interactive toggle button so users can collapse/expand charts on demand.
   - **Save Chart**: Click **📌 Save Chart** to persist the chart visualization to your Saved Charts library.

---

## 10. Saved Charts Functionality

**URL:** http://localhost:5173/saved-charts

1. **Saving**: In AI Chat, click **📌 Save Chart** on any generated visualization.
2. **Viewing**: Navigate to **Saved Charts** to view a grid of saved charts backed by the `saved_charts` API.
3. **Filtering**: Search charts by title/query or filter by chart type (`bar`, `line`, `pie`).
4. **Deleting**: Click the trash icon to delete saved charts.

---

## 11. Profile & User Details

**URL:** http://localhost:5173/profile

1. **Real User Credentials**: Displays logged-in user's name, email, role, organisation name (`Acme Corp` or `TechStart Inc`), status, and member join date.
2. **Sidebar User Info**: The bottom sidebar footer displays the user's actual name, email initials, role, and organisation name.
3. **Update Profile**: Update display name or change password using `PUT /auth/me`.

---

## 12. API Reference (Quick Test)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Service health |
| POST | `/auth/login` | None | User/admin login |
| GET | `/auth/me` | User/Admin | Get logged-in profile details |
| PUT | `/auth/me` | User/Admin | Update display name / password |
| GET | `/api/saved-charts` | User/Admin | List saved charts |
| POST | `/api/saved-charts` | User/Admin | Save a chart from chat |
| DELETE | `/api/saved-charts/{id}` | User/Admin | Delete a saved chart |
| POST | `/admin/kpi-tiles/run` | Admin | Execute all KPI tiles |
| POST | `/chat` | User/Admin | AI chat (SELECT-only) |

---

## 13. Deployment Checklist

1. Set `PLATFORM_DATABASE_URL` to your production PostgreSQL instance.
2. Set `SECRET_KEY` and `FERNET_KEY` in `backend/.env`.
3. Set `OLLAMA_BASE_URL` to point to your GPU server.
4. Build frontend using `npm run build` and serve via Nginx / Vercel.

---

*End of SQLense Testing Guide v2.2*

---

## 15. Quick Reference — Demo Startup

### Start Servers (3 Terminal Tabs)

**Tab 1 — AI Engine**
```bash
OLLAMA_MODELS="$HOME/.ollama/models" "$HOME/.local/bin/ollama" serve
```

**Tab 2 — Backend**
```bash
cd /Users/shreedeviyadav/Desktop/Nikita/SQLense/backend
uvicorn app.main:app --reload --port 8000
```

**Tab 3 — Frontend**
```bash
cd /Users/shreedeviyadav/Desktop/Nikita/SQLense/frontend
npm run dev
```

**Browser:** http://localhost:5173

---

### Login Credentials

**Admin** — http://localhost:5173/login

| Org | Email | Password |
|---|---|---|
| Acme Corp | `admin@acme.com` | `Admin@1234` |
| TechStart Inc | `admin@techstart.com` | `Admin@1234` |

**Employee** — http://localhost:5173/login

| Email | Password | Org |
|---|---|---|
| `rohit@acme.com` | `Employee@1234` | Acme Corp |
| `sneha@acme.com` | `Employee@1234` | Acme Corp |
| `ananya@techstart.com` | `Employee@1234` | TechStart Inc |
| `dev@techstart.com` | `Employee@1234` | TechStart Inc |

**SuperAdmin** — http://localhost:5173/superadmin/login

| Email | Password |
|---|---|
| `superadmin@sqlense.dev` | `SuperAdmin@1234` |

**Join Codes (Employee Self-Registration)**

| Org | Join Code |
|---|---|
| Acme Corp | `ACMEX7Q2` |
| TechStart Inc | `TECHK9P4` |

*End of SQLense Testing Guide v2.2*
