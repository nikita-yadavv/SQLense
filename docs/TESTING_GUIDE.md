# SQLense — Complete System Testing Guide

**Version:** 2.0.0 | **Platform:** macOS (Apple M1 / Monterey+) | **Last Updated:** August 2026

> This guide covers every feature of SQLense end-to-end.
> Follow the sections in order for your first run, then use individual sections for targeted testing.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Starting the System](#2-starting-the-system)
3. [Test Credentials](#3-test-credentials)
4. [Organisation Databases & Seeding](#4-organisation-databases--seeding)
5. [SuperAdmin Flow](#5-superadmin-flow)
6. [Admin Flow](#6-admin-flow)
7. [Employee Flow](#7-employee-flow)
8. [AI Chat & Smart Chart Suppression](#8-ai-chat--smart-chart-suppression)
9. [Saved Charts Functionality](#9-saved-charts-functionality)
10. [Profile & User Details](#10-profile--user-details)
11. [API Reference (Quick Test)](#11-api-reference-quick-test)
12. [Deployment Checklist](#12-deployment-checklist)
13. [Future Prompts for AI Agents](#13-future-prompts-for-ai-agents)

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│                  http://localhost:5173                       │
│    React + Vite · React Router · Recharts · Lucide Icons    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / JSON (proxied by Vite dev server)
┌──────────────────────────▼──────────────────────────────────┐
│                      BACKEND                                │
│                  http://localhost:8000                       │
│         FastAPI · SQLAlchemy · Pydantic · JWT               │
│                                                             │
│  Routers:                                                   │
│    /auth            ← Login, signup, join code, /auth/me    │
│    /api/database    ← Org DB config (connect/test/update)   │
│    /chat            ← AI query (SELECT-only, all users)     │
│    /saved-charts    ← Save, list, delete saved charts       │
│    /history         ← Query history                         │
│    /admin           ← Workspace, analytics, KPI, audit log  │
│    /api/superadmin  ← Platform admin (separate auth)        │
│                                                             │
│  AI Pipeline (LangGraph):                                   │
│    schema_agent → sql_generator → sql_validator →           │
│    sql_guard → insight_agent → visualization_agent          │
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
│  • query_history      │  │  Organisation DBs (Isolated)     │
│  • audit_logs         │  │  • acme_db (Retail / E-Commerce) │
│  • kpi_tiles          │◄─┼─ • techstart_db (SaaS Subscript)│
│  • saved_charts       │  │  (Connected per Org Admin)       │
│  • superadmins        │  └──────────────────────────────────┘
└───────────────────────┘
```

---

## 2. Starting the System

### Step-by-step Startup

Open **3 terminal tabs**:

**Tab 1 — Ollama AI Engine**
```bash
OLLAMA_MODELS="$HOME/.ollama/models" "$HOME/.local/bin/ollama" serve
```

**Tab 2 — Backend (FastAPI)**
```bash
cd ~/Downloads/SQLense/backend
uvicorn app.main:app --reload --port 8000
```

**Tab 3 — Frontend (Vite)**
```bash
cd ~/Downloads/SQLense/frontend
npm run dev
```

**Open:** http://localhost:5173

---

## 3. Test Credentials

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

| Email | Password |
|---|---|
| `superadmin@sqlense.dev` | `SuperAdmin@2024!` |

---

## 4. Organisation Databases & Seeding

SQLense isolates platform metadata from organisation databases.

To set up or re-seed the demo databases for Acme Corporation and TechStart Inc:
```bash
cd ~/Downloads/SQLense/backend
python3 seed_data.py
python3 create_org_databases.py
```

This automatically builds:
1. `acme_db` (PostgreSQL): `customers`, `products`, `orders`, `order_items`, `employees`, `monthly_revenue`, `support_tickets`
2. `techstart_db` (PostgreSQL): `customers`, `subscriptions`, `usage_logs`, `employees`, `monthly_revenue`, `features`, `support_tickets`
3. Connects each admin to their respective DB and populates 6 live KPI tiles.

---

## 5. SuperAdmin Flow

**URL:** http://localhost:5173/superadmin/login

1. Login with `superadmin@sqlense.dev` / `SuperAdmin@2024!`
2. **Overview**: View total organisations, connected databases, active users, and system stats.
3. **Organisations**: View org list, connection status, join codes, and user counts.
4. **AI Chat**: Ask platform-level questions in natural language.

---

## 6. Admin Flow

**URL:** http://localhost:5173/login (`admin@acme.com` / `AdminAcme@2024`)

1. **Dashboard**: View active employees, pending approvals, and DB status.
2. **KPI Dashboard (`/admin/kpi-dashboard`)**:
   - Click **Run All** to execute live SQL metric tiles against `acme_db` or `techstart_db`.
   - Ask AI questions about KPI metrics using the chat drawer.
3. **Employees (`/admin/employees`)**: Approve/reject pending employees (`meera@techstart.com`), share join code (`ACMEX7Q2`), or add employees directly.
4. **SQL Workspace (`/admin/workspace`)**: Execute raw SQL queries, commit or rollback transactions.
5. **Audit Log (`/admin/audit-log`)**: View security log of all admin activities.

---

## 7. Employee Flow

1. **Join via Code (`/signup`)**: Enter join code `ACMEX7Q2` to request access.
2. **Login (`/login`)**: Login as `rohit@acme.com` / `Employee@2024`.
3. **AI Chat (`/chat`)**: Ask questions like `"Show total revenue by month"` or `"How many products are in stock?"`.

---

## 8. AI Chat & Smart Chart Suppression

1. **Smart Chart Decision**:
   - Aggregated metrics (e.g. revenue over time, counts by category) automatically trigger line, bar, or pie charts.
   - Raw record listings (e.g. `"Show me top 5 recent entries"` or `SELECT *`) default to **clean tables** without forcing awkward charts.
2. **Chart Controls**:
   - **Show/Hide Chart**: Each chart response includes an interactive toggle button so users can collapse/expand charts on demand.
   - **Save Chart**: Click **📌 Save Chart** to persist the chart visualization to your Saved Charts library.

---

## 9. Saved Charts Functionality

**URL:** http://localhost:5173/saved-charts

1. **Saving**: In AI Chat, click **📌 Save Chart** on any generated visualization.
2. **Viewing**: Navigate to **Saved Charts** to view a grid of saved charts backed by the `saved_charts` API.
3. **Filtering**: Search charts by title/query or filter by chart type (`bar`, `line`, `pie`).
4. **Deleting**: Click the trash icon to delete saved charts.

---

## 10. Profile & User Details

**URL:** http://localhost:5173/profile

1. **Real User Credentials**: Displays logged-in user's name, email, role, organisation name (`Acme Corp` or `TechStart Inc`), status, and member join date.
2. **Sidebar User Info**: The bottom sidebar footer displays the user's actual name, email initials, role, and organisation name.
3. **Update Profile**: Update display name or change password using `PUT /auth/me`.

---

## 11. API Reference (Quick Test)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Service health |
| POST | `/auth/login` | None | User/admin login |
| GET | `/auth/me` | User/Admin | Get logged-in profile details |
| PUT | `/auth/me` | User/Admin | Update display name / password |
| GET | `/saved-charts` | User/Admin | List saved charts |
| POST | `/saved-charts` | User/Admin | Save a chart from chat |
| DELETE | `/saved-charts/{id}` | User/Admin | Delete a saved chart |
| POST | `/admin/kpi-tiles/run` | Admin | Execute all KPI tiles |
| POST | `/chat` | User/Admin | AI chat (SELECT-only) |

---

## 12. Deployment Checklist

1. Set `PLATFORM_DATABASE_URL` to your production PostgreSQL instance.
2. Set `SECRET_KEY` and `FERNET_KEY` in `backend/.env`.
3. Set `OLLAMA_BASE_URL` to point to your GPU server.
4. Build frontend using `npm run build` and serve via Nginx / Vercel.

---

## 13. Future Prompts for AI Agents

### Prompt A — Docker Compose Deployment
```
Create a docker-compose.yml for SQLense that packages backend (FastAPI), 
frontend (Nginx), and PostgreSQL platform database.
```

### Prompt B — Email Notifications
```
Implement SMTP background email notifications for employee signup approval/rejection.
```

*End of SQLense Testing Guide v2.0*
