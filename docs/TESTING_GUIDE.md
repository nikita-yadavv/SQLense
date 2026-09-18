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
| Admin | `admin@acme.com` | `Admin@1234` | Acme Corporation | Active (Connected: `acme_db`) |
| Admin | `admin@techstart.com` | `Admin@1234` | TechStart Inc | Active (Connected: `techstart_db`) |
| Admin (Demo) | `admin@novamart.com` | `Admin@1234` | NovaMart Retail | Active (**Disconnected for Live Demo**) |
| Employee | `rohit@acme.com` | `Employee@1234` | Acme Corporation | Active |
| Employee | `sneha@acme.com` | `Employee@1234` | Acme Corporation | Active |
| Employee | `karan@novamart.com` | `Employee@1234` | NovaMart Retail | Active |
| Employee | `priya.n@novamart.com` | `Employee@1234` | NovaMart Retail | Active |
| Employee | `ananya@techstart.com` | `Employee@1234` | TechStart Inc | Active |
| Employee | `meera@techstart.com` | `Employee@1234` | TechStart Inc | **Pending** |
| Employee | `rahul.s@novamart.com` | `Employee@1234` | NovaMart Retail | **Pending** |

### SuperAdmin (Login at `/superadmin/login`)

| Email | Password | Role |
|---|---|---|
| `superadmin@sqlense.dev` | `SuperAdmin@1234` | SuperAdmin |

---

## 5. Organisation Databases & Seeding

SQLense isolates platform metadata from organisation databases.

To set up or re-seed the demo databases for Acme Corporation and TechStart Inc:
```bash
cd backend
python3 seed_data.py
python3 create_org_databases.py
```

This automatically builds 3 distinct enterprise databases:
1. `acme_db` (PostgreSQL): Retail/E-Commerce (`customers`, `products`, `orders`, `order_items`, `employees`, `monthly_revenue`, `support_tickets`) — Connected to Acme Corp.
2. `techstart_db` (PostgreSQL): SaaS Subscriptions (`customers`, `subscriptions`, `usage_logs`, `employees`, `monthly_revenue`, `features`, `support_tickets`) — Connected to TechStart Inc.
3. `novamart_db` (PostgreSQL): Omnichannel Hypermarket & Electronics (`categories`, `products`, `customers`, `suppliers`, `orders`, `order_items`, `inventory_logs`, `monthly_sales_summary`) — **Dedicated for Fresh Live Connection Demo** (Starts in disconnected state for `admin@novamart.com`).

To quickly reset NovaMart Retail back to a disconnected state before your demo:
```bash
cd backend
python3 reset_demo_connection.py
```

---

## 6. SuperAdmin Flow

**URL:** http://localhost:5173/superadmin/login

1. Login with `superadmin@sqlense.dev` / `SuperAdmin@1234`
2. **Overview**: View total organisations, connected databases, active users, and system stats.
3. **Organisations**: View org list, connection status, join codes (`ACMEX7Q2`), and user counts.
4. **AI Chat**: Ask platform-level questions in natural language.

---

## 7. Admin Flow

**URL:** http://localhost:5173/login (`admin@acme.com` / `Admin@1234`)

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
2. **Login (`/login`)**: Login as `rohit@acme.com` / `Employee@1234`.
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

---

## 14. Fresh Database Connection Live Demo Guide (For Project Guide)

### Purpose of this Live Demo
This workflow is specifically designed to prove to your project guide and external evaluators that **SQLense is a true multi-tenant database analytics platform that can dynamically connect to ANY external PostgreSQL database on-the-fly**, discover its tables and schema through zero-shot introspection, and immediately start answering natural language queries without hardcoding or pre-training.

---

### Step 0: Pre-Demo 10-Second Setup

Before presenting to your guide, ensure the demo environment is clean:
```bash
cd backend
python3 reset_demo_connection.py
```
*(This sets `NovaMart Retail` to **Disconnected** status so you can demonstrate the entire live connection ceremony).*

---

### Step 1: Login to the Demo Admin Account

1. Open the browser: **http://localhost:5173/login**
2. Enter credentials:
   - **Email:** `admin@novamart.com`
   - **Password:** `Admin@1234`
3. Click **Sign In**.
4. You arrive at the **NovaMart Retail** Admin Dashboard. Notice the status indicator showing **Database Disconnected**.

---

### Step 2: Navigate to Database Connection Settings

1. In the sidebar, click on **Database Settings** (`/admin/database`).
2. Show the guide:
   - Current status is **Disconnected**.
   - The connection configuration form is ready for input.

---

### Step 3: Enter Connection Parameters & Test Live

Fill in the connection form fields:

| Field | Value to Enter | Evaluator Note |
|---|---|---|
| **Organisation Name** | `NovaMart Retail` | Display name for tenant branding |
| **Database Engine** | `PostgreSQL` | Standard enterprise relational DB |
| **Host** | `localhost` | Local database server address |
| **Port** | `5432` | Standard PostgreSQL port |
| **Database Name** | `novamart_db` | Target demo database with 8 tables & 170+ rows |
| **Username** | `shreedeviyadav` *(or your Mac username)* | Database user account |
| **Password** | *(leave blank for default local Postgres)* | Encrypted using Fernet AES-256 before storage |

1. Click the **"Test Connection"** button.
2. **Immediate Result:** A green success card appears:
   > `✅ Connection successful! Found 8 tables: categories, customers, inventory_logs, monthly_sales_summary, order_items, orders, products, suppliers`
3. *Explain to the guide:* SQLense performs a real-time handshake, queries `information_schema`, and verifies connectivity before saving anything to prevent bad connection strings.

---

### Step 4: Save & Activate Connection

1. Click the **"Connect Database"** (or **Save & Connect**) button.
2. **Immediate Result:**
   - Toast notification: `Database connected successfully. Organisation: NovaMart Retail`
   - Connection status badge updates to **🟢 Connected**.
   - Last connected timestamp is recorded.

---

### Step 5: Verify Live KPI Dashboard Execution

1. In the sidebar, click on **KPI Dashboard** (`/admin/kpi-dashboard`).
2. Click the **"Run All"** button at the top right.
3. Show the guide that SQLense executes 4 live SQL queries against the newly connected `novamart_db`:
   - **Total Delivered Revenue:** `₹37,67,222.00` (Calculated live via `SELECT SUM(total_amount)...`)
   - **Platinum Tier Members:** `6 VIPs` (Calculated live via `SELECT COUNT(*)... WHERE loyalty_tier = 'Platinum'`)
   - **Average Delivery Turnaround:** `2.2 Days` (Calculated live via `SELECT ROUND(AVG(delivery_days), 1)...`)
   - **Low Stock Alert Items:** Live inventory threshold counter

---

### Step 6: Live AI Chat Demonstration (Natural Language to SQL)

1. In the sidebar, click on **AI Chat** (`/chat`).
2. Type and send the following queries in sequence to wow the evaluator:

#### Query 1 — Multi-Table JOIN with Bar Chart
- **Prompt:** `What is the total revenue by product category?`
- **What happens behind the scenes:**
  1. *Schema Agent* pulls schema for `categories`, `products`, and `order_items`.
  2. *SQL Generator Agent* generates:
     ```sql
     SELECT c.category_name, SUM(p.unit_price * oi.quantity) AS total_revenue
     FROM categories c
     JOIN products p ON c.category_id = p.category_id
     JOIN order_items oi ON p.product_id = oi.product_id
     GROUP BY c.category_name
     ORDER BY total_revenue DESC;
     ```
  3. *Validator Agent* verifies read-only safety.
  4. *Executor Agent* runs SQL against `novamart_db`.
  5. *Insight Agent* produces grounded summary bullets (Smartphones ₹13.65L, Laptops ₹13.26L, Gaming ₹5.24L, etc.).
  6. *Visualization Agent* renders a modern gradient **Bar Chart**.

#### Query 2 — Time Series Trend with Line Chart
- **Prompt:** `Show monthly sales trend of gross revenue`
- **What happens:** Generates SQL querying `monthly_sales_summary` and renders a clean **Line Chart** with 12 monthly data points.

#### Query 3 — Filtered Entity Ranking (Tabular Presentation)
- **Prompt:** `Who are our top 5 platinum customers by total spend?`
- **What happens:** Returns a clean table of VIP customers (`Vikram Malhotra ₹5.12L`, `Tanvi Bansal ₹4.45L`, `Aarav Mehta ₹4.28L`, `Ishita Sharma ₹3.89L`, `Maya Sunder ₹3.78L`) without forcing an awkward chart.

#### Query 4 — Case-Insensitive Search
- **Prompt:** `Show details for customer aarav mehta`
- **What happens:** Uses PostgreSQL `ILIKE '%aarav mehta%'` to find the exact customer record regardless of case.

---

### Step 7: SQL Workspace & Transaction Control

1. In the sidebar, click on **SQL Workspace** (`/admin/workspace`).
2. Run direct SQL:
   ```sql
   SELECT p.product_name, c.category_name, p.stock_quantity, p.unit_price 
   FROM products p 
   JOIN categories c ON p.category_id = c.category_id 
   ORDER BY p.stock_quantity ASC 
   LIMIT 5;
   ```
3. Show the guide the interactive table with instant column sorting, execution time display, and pagination.

---

### Step 8: Audit Log Security Proof

1. In the sidebar, click on **Audit Log** (`/admin/audit-log`).
2. Show the evaluator that every single action just performed is permanently recorded:
   - `USER_LOGIN` (Timestamp, IP address)
   - `DB_CONNECTION_TEST`
   - `DB_CONNECTED`
   - `CHAT_QUERY` (Exact question asked)
   - `KPI_RUN`

---

### Evaluator Viva Q&A Cheat Sheet (For Project Defense)

| Question from Evaluator / Guide | Perfect Answer to Deliver |
|---|---|
| **Q: How does SQLense connect to different databases for different companies?** | *"SQLense uses tenant-isolated database connection pooling. The platform database stores encrypted connection parameters per organization. When a request arrives, the backend dynamically instantiates an isolated SQLAlchemy engine with pre-ping health checks for that specific tenant."* |
| **Q: How are customer database passwords protected?** | *"All database passwords and sensitive credentials are encrypted at rest using Fernet symmetric encryption (AES-128-CBC + HMAC-SHA256). Passwords are never returned in plain text via any API endpoint."* |
| **Q: Does the AI need training whenever a new database is connected?** | *"No. SQLense uses Zero-Shot Schema Introspection. When a query is submitted, the Schema Agent queries the connected database's `information_schema` in real-time to build a lightweight Data Definition context that is injected into the LLM prompt. This allows it to work on any PostgreSQL schema immediately."* |
| **Q: What prevents a user from executing `DROP TABLE` or `DELETE` via AI chat?** | *"The SQL Validator Agent uses regex and AST parsing to enforce strict read-only compliance. Any query containing `DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, or `TRUNCATE` is immediately rejected before reaching the database."* |


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

| Org | Email | Password | Status / Purpose |
|---|---|---|---|
| Acme Corp | `admin@acme.com` | `Admin@1234` | Connected (`acme_db`) |
| TechStart Inc | `admin@techstart.com` | `Admin@1234` | Connected (`techstart_db`) |
| NovaMart Retail | `admin@novamart.com` | `Admin@1234` | **Disconnected (Fresh Live Demo)** |

**Employee** — http://localhost:5173/login

| Email | Password | Org |
|---|---|---|
| `rohit@acme.com` | `Employee@1234` | Acme Corp |
| `sneha@acme.com` | `Employee@1234` | Acme Corp |
| `ananya@techstart.com` | `Employee@1234` | TechStart Inc |
| `dev@techstart.com` | `Employee@1234` | TechStart Inc |
| `karan@novamart.com` | `Employee@1234` | NovaMart Retail |
| `priya.n@novamart.com` | `Employee@1234` | NovaMart Retail |

**SuperAdmin** — http://localhost:5173/superadmin/login

| Email | Password |
|---|---|
| `superadmin@sqlense.dev` | `SuperAdmin@1234` |

**Join Codes (Employee Self-Registration)**

| Org | Join Code |
|---|---|
| Acme Corp | `ACMEX7Q2` |
| TechStart Inc | `TECHK9P4` |
| NovaMart Retail | `NOVAM8X2` |

*End of SQLense Testing Guide v2.2*
