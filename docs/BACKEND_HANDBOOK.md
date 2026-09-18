# SQLense — Backend Comprehensive Handbook (1-Hour Master Guide)

> **Audience:** Developers, Project Presenters, Evaluators.  
> **Goal:** Complete mastery of the SQLense backend architecture, code structure, data flow, agentic AI pipeline, security, and viva questions.

---

## 1. Executive Summary & Core Concept

**SQLense** is an enterprise-grade multi-tenant platform that translates natural language queries into executable PostgreSQL statements, runs them safely on an organization's private database, and returns executive insights and interactive visualizations.

### The Dual-Database Model (Core Architectural Highlight)
SQLense strictly separates platform metadata from tenant business data:
1. **Platform Database (`sqlense`)**:
   - Stores user accounts, password hashes, organizations, encrypted tenant DB credentials, KPI tile configurations, query history, audit logs, and saved charts.
2. **Organization Database (`acme_db`, `techstart_db`, etc.)**:
   - The private, isolated relational database owned by the client organization.
   - Read-only queries are executed here through an isolated disposable SQLAlchemy connection pool.
   - **Cross-tenant data leakage is mathematically impossible** because tenant queries are dynamically connected per-request using the authenticated user's `org_id`.

```
[Browser / Frontend]
        │
        ▼ (HTTP / JWT Bearer)
[FastAPI Backend] ──(Fernet Decrypt)──► [Platform DB] (Users, Orgs, Audit, KPI)
        │
        ├──► [Local Ollama LLM] (Schema Analysis, SQL Generation, Insights)
        │
        └──► [Tenant Org DB] (acme_db / techstart_db - Read-only query execution)
```

---

## 2. Technology Stack & Tooling

| Component | Technology | Version / Tool | Purpose & Why It Was Chosen |
|---|---|---|---|
| **Framework** | FastAPI | `0.111+` | High performance asynchronous REST API, auto-generated OpenAPI/Swagger documentation, native Pydantic validation. |
| **Language** | Python | `3.12` | Rich ecosystem for AI/LLM orchestration, database adapters, and cryptographic libraries. |
| **ORM & Database Engine** | SQLAlchemy | `2.0+` | Robust connection pooling, metadata inspection, connection recycling, and dialect translation. |
| **DB Driver** | `psycopg` (v3) | `psycopg 3.1+` | Modern asynchronous and binary-protocol PostgreSQL driver for high throughput. |
| **AI Orchestration** | LangGraph & LangChain | `langgraph`, `langchain-ollama` | Stateful directed acyclic graph (DAG) pipeline managing multi-agent handoffs. |
| **Local LLM Runner** | Ollama | `qwen2.5:3b` | 100% offline, local AI inference. Zero cloud data transmission; sub-1.5s response latency. |
| **SQL Parsing & AST** | `sqlparse` | `0.5+` | Lexical analysis, Abstract Syntax Tree inspection, and keyword token validation for security guards. |
| **Cryptography** | `cryptography` (Fernet) | Symmetric AES-CBC | 128-bit AES encryption for tenant database connection strings and passwords at rest. |
| **Authentication** | `python-jose` & `passlib` | JWT (HS256) + `bcrypt` | Stateless, cryptographically signed access tokens and salt-hashed user passwords. |
| **Environment Management** | Pydantic Settings | `pydantic-settings` | Strongly typed `.env` configuration loading with LRU caching. |

---

## 3. Directory & File Structure

```
backend/
├── app/
│   ├── agents/                   # Multi-Agent LangGraph AI Engine
│   │   ├── graph.py              # Main LangGraph pipeline compilation & node sequencing
│   │   ├── schema_agent.py       # Live database schema inspection & prompt formatter
│   │   ├── sql_generator.py      # Natural language to PostgreSQL dialect LLM agent
│   │   ├── sql_guard.py          # Hard security boundary (SELECT-only AST enforcement)
│   │   ├── sql_validator.py      # Schema alignment & table existence validator
│   │   ├── insight_agent.py      # Factual, non-hallucinating executive summary generator
│   │   └── visualization_agent.py# Smart dimension vs metric classifier & chart builder
│   │
│   ├── core/                     # Security, Auth & Cross-Cutting Concerns
│   │   ├── deps.py               # FastAPI dependency injection (get_current_user, require_role)
│   │   ├── security.py           # Password hashing (bcrypt) & JWT creation/decoding
│   │   ├── encryption.py         # Symmetric Fernet encryption/decryption for credentials
│   │   └── audit.py              # Centralized immutable audit logging service
│   │
│   ├── models/                   # SQLAlchemy ORM Database Models
│   │   ├── user.py               # User table (roles: admin, employee; status: active, pending)
│   │   ├── org_db_config.py      # Encrypted database connection parameters per organization
│   │   ├── kpi_tile.py           # Customizable SQL metric tiles for organization dashboard
│   │   ├── query_history.py      # Persistent record of questions, SQL, and responses
│   │   ├── saved_chart.py        # Bookmarked user charts with Recharts config
│   │   ├── audit_log.py          # Security and compliance access logs
│   │   └── superadmin.py         # Platform SuperAdmin root credentials and metadata
│   │
│   ├── routers/                  # API Endpoint Controllers (REST API)
│   │   ├── auth.py               # Login, signup, employee approval, join codes
│   │   ├── chat.py               # Natural language querying endpoint (/api/chat)
│   │   ├── db_config.py          # Tenant database credential setup, test & connect
│   │   ├── kpi.py                # Live KPI tile CRUD, execution & AI chat drawer
│   │   ├── workspace.py          # Admin direct SQL Workspace with AI CRUD generator
│   │   ├── history.py            # Paginated query history & live replay endpoint
│   │   ├── saved_charts.py       # Saved visual chart management
│   │   ├── analytics.py          # Admin usage analytics, top queries, and trends
│   │   └── superadmin.py         # Multi-tenant oversight, platform metrics, and platform AI
│   │
│   ├── schemas/                  # Pydantic Request & Response Data Contracts
│   │   ├── auth.py               # Login/Signup schemas, token responses, user profiles
│   │   ├── chat.py               # ChatRequest, ChatResponse, ChartConfig contracts
│   │   ├── db_config.py          # Database connection payload validation
│   │   └── history.py            # HistoryItem and HistoryDetailItem schemas
│   │
│   ├── services/                 # Business Logic & Connection Services
│   │   └── db_connection.py      # Dynamic connection string construction & testing
│   │
│   ├── config.py                 # Application settings (.env configuration)
│   ├── database.py               # Platform DB engine, session factory & Base declaration
│   └── main.py                   # FastAPI app factory, CORS middleware, router registration
```

---

## 4. The Multi-Agent AI Pipeline (Deep Dive)

The core innovation in SQLense is its **LangGraph multi-agent pipeline**. Rather than relying on a single prompt, the system breaks natural-language query processing into distinct specialized agent nodes:

```
[User Question] ──► (1. Schema Agent) 
                         │
                         ▼
                    (2. SQL Generator) ──► (Dialect Normalizer)
                         │
                         ▼
                    (3. SQL Validator & Guard) ──► [Destructive/Invalid? ──► Error 422]
                         │
                         ▼
                    (4. Execution Engine) (Org DB)
                         │
                         ▼
                    (5. Insight Agent) 
                         │
                         ▼
                    (6. Visualization Agent) 
                         │
                         ▼
[Structured Response: SQL + Explanation + Answer + Rows + Columns + Chart Config]
```

### Agent Node Breakdown

#### 1. Schema Agent (`schema_agent.py`)
- **Action**: Uses SQLAlchemy `inspect(engine)` on the tenant's database to extract table names, column names, data types, primary keys, and foreign-key relationships.
- **Output**: Formatted compact schema string (e.g. `Table: customers | Columns: id (INT), name (VARCHAR)... | FK: customer_id -> customers.id`).

#### 2. SQL Generator Agent (`sql_generator.py`)
- **Action**: Injects the schema context and user question into local Ollama (`qwen2.5:3b`).
- **Specialized Rules**:
  - **Case-Insensitive Filters**: Mandates `ILIKE` or `LOWER(col) = LOWER(...)` for all string matching.
  - **Direct Attribute Selection**: Prefers existing columns (`stock_quantity` in `products`) over redundant joins (`order_items`).
  - **Dialect Normalizer**: Automatically corrects any generic SQL hallucinations into PostgreSQL syntax (e.g. `YEAR(x)` → `EXTRACT(YEAR FROM x)`, `IFNULL(a, b)` → `COALESCE(a, b)`).
  - **Dynamic Range Bucketing**: Converts range queries into clean integer buckets using `CONCAT((FLOOR(salary/10000)*10)::INT, 'k - ', ...)` or `CASE` expressions.

#### 3. SQL Validator & Security Guard (`sql_guard.py` & `sql_validator.py`)
- **Hard Security Boundary**:
  1. Parses the statement into an AST using `sqlparse`.
  2. Ensures strictly **one single statement**.
  3. Rejects any statement whose root type is not `SELECT`.
  4. Scans for blocked tokens (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `EXEC`, `GRANT`, `REVOKE`, `INTO`).
  5. Verifies all table identifiers exist in the inspected schema.

#### 4. Execution Node (`graph.py`)
- **Action**: Opens a short-lived connection to the tenant database, executes the validated SQL with `fetchmany(500)` to guard against memory exhaustion, serializes Decimals/Dates to JSON-compatible types, and disposes the connection.

#### 5. Insight Agent (`insight_agent.py`)
- **Action**: Receives the user question, column headers, returned sample rows, **and the executed SQL query**.
- **Anti-Hallucination Grounding**: Because the agent sees the executed `WHERE` filters, it understands that rows are already filtered by the database, producing crisp, factual 2-sentence business summaries without inventing false claims.

#### 6. Visualization Agent (`visualization_agent.py`)
- **Action**: Intelligently classifies dimensions vs metrics:
  - **Aggregates** (`count`, `employee_count`, `num_customers`, `total_revenue`) always become **Y-axis metric series**.
  - **Grouping columns** (`month`, `salary_range`, `product_name`, `category`) become the **X-axis labels**.
  - Selects chart type: `bar` for discrete categories/registrations, `line`/`area` for multi-point trends, `pie` for proportions ($\le 6$ items), and `table` for raw record listings.

---

## 5. Security & Authentication Architecture

### 1. Cryptographic Credential Storage (Fernet Encryption)
When an admin connects an organization database (host, user, password, port, database name):
- The credentials are serialized and encrypted using **AES-128-CBC via Fernet**.
- The encrypted ciphertext is stored in `org_db_configs.encrypted_connection_string`.
- The encryption key is loaded strictly from the environment variable `FERNET_KEY`. Plaintext passwords never touch database disks.

### 2. Stateless JWT Authentication & Role-Based Access Control (RBAC)
- **Token Format**: Standard HS256 JWT containing `sub` (user email), `id` (user UUID), `org_id` (organization UUID), and `role` (`admin` or `employee`).
- **Dependencies**:
  - `get_current_user`: Validates token signature, expiration, and user active status.
  - `require_role(UserRole.admin)`: Rejects employee access to administrative endpoints (employee approvals, DB setup, SQL workspace, audit logs).

### 3. SuperAdmin Total Isolation
- SuperAdmin accounts use an entirely separate table (`superadmins`), separate route (`/superadmin/login`), and separate JWT validator (`get_superadmin`). Regular admin or employee tokens cannot access SuperAdmin endpoints under any circumstances.

---

## 6. End-to-End Request Flow Examples

### Flow A: Natural Language Chat (`POST /api/chat`)
1. User sends `{ "question": "Which customers registered in April?" }` with `Authorization: Bearer <JWT>`.
2. `get_current_user` extracts `org_id`.
3. `_get_conn_str` fetches and decrypts the organization's database connection.
4. `run_pipeline(question, conn_str)` executes the LangGraph DAG:
   - Schema Agent reads `customers` table.
   - SQL Generator produces `SELECT id, name, email FROM customers WHERE EXTRACT(MONTH FROM created_at) = 4 LIMIT 500`.
   - SQL Guard validates SELECT-only.
   - Executor fetches rows from `acme_db`.
   - Insight Agent summarizes: *"The customers who registered in April are Amit Verma, Sunita Joshi, and Vikram Singh."*
   - Visualization Agent classifies columns and formats results.
5. Entry is persisted to `query_history` in Platform DB.
6. `log_action` records the query in `audit_logs`.
7. Returns `ChatResponse` JSON to frontend.

### Flow B: Live Replay of Historical Chat (`GET /api/history/{history_id}`)
1. User clicks a previous chat from the Recent Chats sidebar.
2. Frontend calls `GET /api/history/{id}`.
3. Backend fetches `QueryHistory` record, validates tenant permissions.
4. Backend re-executes `entry.sql_query` against the live org database to retrieve fresh rows and columns.
5. Returns full `HistoryDetailItem` with rows, columns, explanation, and chart config.

---

## 7. Evaluator Viva Questions & Model Answers

**Q1: How does SQLense prevent SQL Injection through natural language prompts?**  
*Answer:* SQLense implements multi-layered protection: (1) Prompt engineering instructs the LLM to output pure SQL without DDL/DML; (2) The `sql_guard` agent parses the Abstract Syntax Tree (AST) using `sqlparse` and strictly rejects any query with multiple statements or non-SELECT operations; (3) Queries are executed inside isolated read-only transactions.

**Q2: How is multi-tenancy enforced? Can Admin of Org A see data of Org B?**  
*Answer:* Multi-tenancy is enforced at both the Platform DB and Org DB layers. Every platform table has an indexed `org_id` column, and all SQLAlchemy queries automatically filter by `current_user.org_id` extracted from the cryptographically signed JWT. For tenant business data, connection strings are isolated per organization; a user from Org A has no access to Org B's connection parameters.

**Q3: Why use local Ollama (`qwen2.5:3b`) instead of OpenAI API?**  
*Answer:* Enterprise data privacy and compliance. Corporate databases contain confidential customer, financial, and employee records that cannot be transmitted to third-party cloud APIs. Running `qwen2.5:3b` locally ensures zero data leakage, works completely offline, and delivers sub-1.5 second query latency without recurring API subscription costs.

**Q4: How do you handle schema changes in the tenant's database?**  
*Answer:* The Schema Agent dynamically inspects the database schema on-demand using SQLAlchemy reflection (`inspect(engine)`). It reads live column names, data types, and foreign keys directly from PostgreSQL system catalogs (`information_schema`), meaning schema alterations are reflected immediately in the next prompt context.

**Q5: What happens if the LLM produces invalid SQL syntax?**  
*Answer:* SQLense features built-in self-healing and dialect normalization. In `sql_generator.py`, `normalize_pg_sql()` intercepts and translates common cross-dialect idioms (e.g. MySQL `YEAR()` to Postgres `EXTRACT(YEAR FROM ...)`). If a query still fails during execution, the error is caught, formatted gracefully, and returned without crashing the server.
