# SQLense — System Summary for Demo

> One-page reference. Every module in plain language.

---

## What SQLense Is

A **web platform** that lets organisations connect their PostgreSQL database and let employees query it using plain English. The AI converts the question into SQL, runs it, and returns an answer with charts. No SQL knowledge needed.

---

## Architecture in One Line

```
Browser (React/Vite)  →  FastAPI Backend  →  Ollama AI (local LLM)  →  Org PostgreSQL DB
                                          →  Platform PostgreSQL DB (users, configs, history)
```

**Two separate databases always:**
- **Platform DB** — stores users, orgs, KPI tiles, history, saved charts, audit logs
- **Org DB** — the company's actual data (Acme Corp / TechStart Inc) — queried read-only by AI

---

## Pages & Modules

### Login / Signup (`/login`, `/signup`)
- **What:** JWT-based auth. Admin signs up to create an org. Employee joins using an 8-char code, awaits admin approval.
- **How:** `POST /auth/login` → FastAPI issues JWT → stored in `localStorage` → auto-attached via Axios interceptor on every API call.
- **Resources:** Platform DB → `users` table.

---

### AI Chat (`/chat`)
- **What:** Type a question in English → get SQL + answer + chart.
- **How (pipeline):**
  1. Question → `POST /api/chat`
  2. Backend fetches org DB schema
  3. Ollama LLM generates SQL (local, no internet)
  4. SQL validated (SELECT-only enforced)
  5. Executed against org DB → rows returned
  6. LLM writes a plain-language answer
  7. System picks chart type (bar/line/pie) or plain table
  8. Saved to `query_history`
- **Persistence:** If user navigates away mid-response, query re-fires automatically on return via `localStorage`.
- **Resources:** Platform DB (history), Org DB (execution), Ollama LLM.

---

### Query History (`/history`)
- **What:** All past questions, SQL generated, chart type.
- **How:** `GET /api/history` → `query_history` rows filtered by `user_id` + `org_id`.
- **Resources:** Platform DB → `query_history` table.

---

### Saved Charts (`/saved-charts`)
- **What:** Charts saved from Chat. View, search by type, delete.
- **How:** "Save Chart" → `POST /api/saved-charts`. Page loads via `GET /api/saved-charts`. Admin sees all org charts; employee sees only their own.
- **Resources:** Platform DB → `saved_charts` table.

---

### KPI Dashboard (`/admin/kpi-dashboard` for admin, `/kpi-dashboard` for employees)
- **What:** Pre-configured SQL metric tiles run live against the org DB. Admin creates tiles; all employees can view + refresh.
- **How:**
  - Admin creates tile with a SQL query (e.g. `SELECT COUNT(*) as value FROM orders`)
  - "Run All" → `POST /api/admin/kpi-tiles/run` → executes each tile's SQL live
  - "Ask AI" drawer → `POST /api/admin/kpi-chat` → Ollama answers about the live tile data
- **Security:** Admin-only for create/edit/delete. Employees can view + run + AI-chat (enforced at API level, not just UI).
- **Resources:** Platform DB (tile configs), Org DB (execution), Ollama LLM.

---

### Employees (`/admin/employees`) — Admin only
- **What:** View all employees, pending approval requests, add employees directly.
- **How:** Pending users (self-joined via code) are approved via `POST /auth/admin/approve/{id}`. Direct add via `POST /auth/admin/create-employee`. Join code from `GET /auth/admin/join-code`.
- **Resources:** Platform DB → `users` table.

---

### Database Config (`/admin/database`) — Admin only
- **What:** Admin enters org DB credentials (host, port, name, user, password). System tests and stores them.
- **How:** `POST /api/database/connect` → tests connection → encrypts credentials with Fernet → stores in `org_db_configs`.
- **Resources:** Platform DB → `org_db_configs`. Credentials encrypted at rest.

---

### SQL Workspace (`/admin/workspace`) — Admin only
- **What:** Raw SQL editor. Admin runs any query directly (including writes, unlike Chat).
- **How:** `POST /api/admin/workspace/execute` → runs SQL → returns table. Logged to audit log.
- **Resources:** Org DB (direct).

---

### Audit Log (`/admin/audit-log`) — Admin only
- **What:** Timestamped log of every action — logins, queries, approvals, tile changes.
- **How:** Every API handler calls `log_action()` → writes to `audit_logs`. `GET /api/admin/audit-log` (paginated).
- **Resources:** Platform DB → `audit_logs` table.

---

### Profile (`/profile`) & Settings (`/settings`)
- **What:** View/edit name and password.
- **How:** `PUT /auth/me` with optional new name and new password (requires current password).
- **Resources:** Platform DB → `users` table.

---

### SuperAdmin Portal (`/superadmin/login`, `/superadmin/dashboard`)
Completely separate from the main app. Own JWT, own login, own auth stack.

| Tab | What | Endpoint |
|---|---|---|
| Overview | Orgs, users, queries, 7-day trend | `GET /api/superadmin/stats` |
| Organisations | All orgs, DB status, join codes, user counts | `GET /api/superadmin/orgs` |
| Users | Every user across all orgs — name, email, role, status, query count | `GET /api/superadmin/users` |
| Reports | 30-day daily query + org signup charts | `GET /api/superadmin/reports` |
| AI Chat | Natural language platform questions | `POST /api/superadmin/chat` |
| Profile | Update SuperAdmin name/password | `PUT /api/superadmin/me` |

**Security:** `get_superadmin` dependency rejects all regular user/admin tokens.

---

## Technology Stack

| Layer | Technology | Role |
|---|---|---|
| Frontend | React + Vite | SPA, component-based UI |
| Backend | FastAPI (Python) | REST API, auth, business logic |
| AI / LLM | Ollama (local) | SQL generation, answer text, KPI chat — fully offline |
| ORM | SQLAlchemy | DB access for both Platform DB and Org DBs |
| Auth | JWT (HS256) | Stateless, role embedded in token |
| Encryption | Fernet (symmetric) | Org DB credentials encrypted at rest |
| Charts | Recharts | Bar, line, pie — React-native |

---

## Security Model

| What | How |
|---|---|
| SQL injection prevention | AI SQL is SELECT-only validated before execution |
| Org data isolation | All queries scoped by `org_id` from JWT; cross-org impossible |
| Encrypted credentials | Fernet key in `.env`; never stored in plain text |
| Admin-only routes | `require_role(admin)` FastAPI dependency |
| SuperAdmin isolation | Entirely separate auth chain; normal tokens rejected |
| Audit trail | Every action logged with user, timestamp, IP |

---

*SQLense System Summary v1.0*
