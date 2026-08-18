# SQLense — Enterprise AI SQL Analytics Platform

> An AI-powered database analytics platform that allows users to interact with organisational databases using natural language instead of writing SQL queries manually. Built to make database analytics accessible to both technical and non-technical users.
>
> **Authors:** Shreede Yadav, Nikita Yadav

---

## Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL (Postgres.app recommended on macOS)
- [Ollama](https://ollama.com/) installed and running:
  ```bash
  ollama pull qwen3:8b
  ```
- Node.js (included in `~/.local/share/nodejs/`)

---

### 1. Backend Setup

```bash
cd backend

# Install all dependencies
pip install -r requirements.txt

# .env is pre-configured — only update PLATFORM_DATABASE_URL if needed
# Default: postgresql+psycopg://shreedeviyadav@localhost:5432/sqlense

# Create the database (run once in psql):
# CREATE DATABASE sqlense;

# Start the backend
uvicorn app.main:app --reload --port 8000
```

Visit **http://localhost:8000/docs** for the interactive Swagger UI.

---

### 2. SuperAdmin Registration (run once)

```bash
cd backend
python3 register_superadmin.py
```

Follow the prompts to create your superadmin account. Login at `/superadmin/login`.

---

### 3. Seed Dummy Data (optional but recommended)

```bash
cd backend
python3 seed_data.py
```

This creates 2 sample organisations, admins, employees, query history, and KPI tiles.

**Credentials after seeding:**

| Role | Email | Password |
|---|---|---|
| Admin (Acme Corp) | `admin@acme.com` | `AdminAcme@2024` |
| Admin (TechStart) | `admin@techstart.com` | `AdminTech@2024` |
| Employee | `emp1@acme.com` | `Employee@2024` |
| SuperAdmin | Set during `register_superadmin.py` | — |

---

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```

Open **http://localhost:5173**

---

## Environment Configuration (`backend/.env`)

| Key | Description |
|-----|-------------|
| `PLATFORM_DATABASE_URL` | PostgreSQL URL for the platform DB |
| `SECRET_KEY` | Pre-generated JWT signing key |
| `FERNET_KEY` | Pre-generated encryption key for org DB passwords |
| `OLLAMA_BASE_URL` | Ollama server URL (default: `http://localhost:11434`) |
| `OLLAMA_MODEL` | Model name (default: `qwen3:8b`) |
| `ALLOWED_ORIGINS` | Comma-separated frontend URLs |

> **Note:** `SUPERADMIN_EMAIL`/`SUPERADMIN_PASSWORD` are no longer used. SuperAdmin credentials are stored in the database via `register_superadmin.py`.

---

## API Contract

> All endpoints that require authentication expect a `Bearer <token>` header.

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Service health check |

---

### Auth — `/auth`

#### POST `/auth/signup`
Register a new admin or employee.

**Request:**
```json
{
  "name": "Vipin Kumar",
  "email": "vipin@company.com",
  "password": "secret123",
  "role": "admin"
}
```
> `role` is `"admin"` or `"employee"`. Default: `"employee"`.

**Response `201`:**
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "role": "admin"
}
```

---

#### POST `/auth/login`

**Request:**
```json
{
  "email": "vipin@company.com",
  "password": "secret123"
}
```

**Response `200`:**
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "role": "admin"
}
```

---

#### POST `/auth/join`
Employee self-registration with join code.

**Request:**
```json
{
  "name": "Ravi Sharma",
  "email": "ravi@company.com",
  "password": "pass123",
  "join_code": "ACMEX7Q2"
}
```

**Response `201`:** Employee created with `status: "pending"` (requires admin approval).

---

#### GET `/auth/pending`
List all pending employees for this org *(admin only)*.

#### POST `/auth/approve/{user_id}`
Approve a pending employee *(admin only)*.

#### POST `/auth/reject/{user_id}`
Reject a pending employee *(admin only)*.

#### GET `/auth/join-code`
Get the org's join code *(admin only)*.

---

### Admin — DB Config — `/admin`

> All routes under `/admin` require `role: admin`.

#### POST `/admin/db-config`
Save (or update) the organisation's database connection.

**Request:**
```json
{
  "host": "localhost",
  "port": 5432,
  "database": "sales_db",
  "username": "db_user",
  "password": "db_pass"
}
```

**Response `200`:**
```json
{
  "message": "Database connected successfully.",
  "tables_found": 12
}
```

---

#### GET `/admin/db-config`
Retrieve current DB connection info (password never returned).

---

### Chat — `/chat`

Available to **all authenticated users** (admin + employee).
The AI pipeline is hardcoded to SELECT-only — write operations are impossible.

#### POST `/chat`

**Request:**
```json
{
  "question": "Show the top 5 customers by revenue"
}
```

**Response `200`:**
```json
{
  "question": "Show the top 5 customers by revenue",
  "sql_query": "SELECT customer_name, SUM(amount) AS revenue FROM orders GROUP BY customer_name ORDER BY revenue DESC LIMIT 5",
  "sql_explanation": "Finds the five customers who have spent the most in total.",
  "answer_text": "Acme Corp leads with ₹4.2L in revenue...",
  "chart": {
    "type": "bar",
    "title": "Top 5 Customers by Revenue",
    "data": [{ "name": "Acme Corp", "revenue": 420000 }],
    "x_key": "name",
    "y_keys": ["revenue"]
  },
  "rows": [{ "customer_name": "Acme Corp", "revenue": 420000 }],
  "columns": ["customer_name", "revenue"]
}
```

> **Chart types**: `"bar"` | `"line"` | `"pie"` | `"table"` | `"none"`
> Smart suppression: charts are omitted for simple lookups (no `GROUP BY` / aggregation detected).

---

### History — `/history`

#### GET `/history`
Returns query history. Employees see only their own; admins see the whole org.

Query params: `?limit=50&offset=0`

---

### Admin SQL Workspace — `/admin/workspace`

> Requires `role: admin`. Allows all SQL (SELECT, INSERT, UPDATE, DELETE, etc.)

#### POST `/admin/workspace/execute`

**Request — execute SQL:**
```json
{ "sql": "UPDATE products SET price = 999 WHERE id = 1", "action": "execute" }
```

**Request — commit:**
```json
{ "sql": "", "action": "commit" }
```

**Request — rollback:**
```json
{ "sql": "", "action": "rollback" }
```

---

### Analytics — `/admin/analytics`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/analytics/employees` | Per-employee query stats |
| GET | `/admin/analytics/daily?days=30` | Daily query volume |
| GET | `/admin/audit-log?limit=25&offset=0` | Paginated audit trail |

---

### KPI Tiles — `/admin/kpi`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/kpi/tiles` | List all KPI tiles |
| POST | `/admin/kpi/tiles` | Create new tile |
| PUT | `/admin/kpi/tiles/{id}` | Update tile |
| DELETE | `/admin/kpi/tiles/{id}` | Delete tile |
| POST | `/admin/kpi/run` | Execute all tile SQL queries |
| POST | `/admin/kpi/chat` | AI chat about dashboard data |

---

### SuperAdmin — `/superadmin`

> Completely separate from the regular admin system.
> Login at `/superadmin/login`. Register via `python3 register_superadmin.py`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/superadmin/login` | Authenticate → JWT |
| GET | `/superadmin/orgs` | List all organisations |
| GET | `/superadmin/stats` | Platform-wide statistics |
| GET | `/superadmin/reports` | Daily charts (queries + signups) |
| POST | `/superadmin/chat` | AI chat about platform data |

---

## Project Structure

```
SQLense/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── superadmin.py        ← SuperAdmin DB model
│   │   │   ├── org_db_config.py
│   │   │   ├── query_history.py
│   │   │   ├── audit_log.py
│   │   │   └── kpi_tile.py
│   │   ├── routers/
│   │   │   ├── auth.py              ← Login, signup, join code, approval
│   │   │   ├── chat.py              ← AI chat with audit logging
│   │   │   ├── db_config.py
│   │   │   ├── history.py
│   │   │   ├── workspace.py
│   │   │   ├── analytics.py         ← Employee analytics + audit log
│   │   │   ├── kpi.py               ← KPI tiles + AI chat
│   │   │   └── superadmin.py        ← Platform admin endpoints
│   │   ├── core/
│   │   │   ├── security.py
│   │   │   ├── deps.py
│   │   │   ├── audit.py
│   │   │   └── encryption.py
│   │   └── agents/
│   │       ├── graph.py             ← LangGraph pipeline + chart suppression
│   │       ├── schema_agent.py
│   │       ├── sql_generator.py
│   │       ├── sql_validator.py
│   │       ├── sql_guard.py
│   │       ├── insight_agent.py
│   │       └── visualization_agent.py
│   ├── .env                         ← Pre-configured (update DB URL only)
│   ├── requirements.txt
│   ├── seed_data.py                 ← Populate with dummy data
│   └── register_superadmin.py       ← Register platform admin (run once)
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  ← All routes
│   │   ├── components/              ← Layout, Sidebar, Toast, etc.
│   │   ├── pages/
│   │   │   ├── admin/               ← Dashboard, Employees, Analytics, KPI, AuditLog
│   │   │   └── superadmin/          ← Login, Dashboard
│   │   └── services/api.js          ← All API calls
│   ├── vite.config.js               ← Dev proxy to :8000
│   └── package.json
└── docs/
    ├── SQLense_Sequence_Diagram.html
    └── SQLense_System_Architecture_PPT.html
```

---

## Security Design

| Path | Who | SQL Allowed |
|------|-----|-------------|
| `POST /chat` | Admin + Employee | **SELECT only** (enforced by `sql_guard.py`) |
| `POST /admin/workspace/execute` | Admin only | All SQL (admin's responsibility) |

- Org DB passwords encrypted with **Fernet** before storage — never plaintext.
- Passwords hashed with **bcrypt**.
- JWT tokens expire after 60 minutes (configurable).
- Organisations are isolated — each admin's `org_id` scopes all data access.
- SuperAdmin credentials stored in database (hashed), not in environment variables.
