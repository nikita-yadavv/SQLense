# SQLense — System Architecture, Schema & Diagram Blueprint

**Version:** 2.0.0 | **Author:** SQLense Engineering Team | **Last Updated:** August 2026

> This document serves as the comprehensive technical specification and blueprint for developers to understand the platform, design UML diagrams (Sequence, Activity, Use Case), ER diagrams, and system flowcharts.

---

## Table of Contents

1. [Official SQLense Platform Database Specification](#1-official-sqlense-platform-database-specification)
   - [Database Overview](#database-overview)
   - [Table 1: users](#table-1-users)
   - [Table 2: org_db_configs](#table-2-org_db_configs)
   - [Table 3: kpi_tiles](#table-3-kpi_tiles)
   - [Table 4: saved_charts](#table-4-saved_charts)
   - [Table 5: query_history](#table-5-query_history)
   - [Table 6: audit_logs](#table-6-audit_logs)
   - [Table 7: superadmins](#table-7-superadmins)
   - [Entity-Relationship (ER) Diagram](#entity-relationship-er-diagram)
2. [UML Use Case Diagrams](#2-uml-use-case-diagrams)
3. [UML Sequence Diagrams](#3-uml-sequence-diagrams)
   - [Sequence 1: AI Chat Query Execution](#sequence-1-ai-chat-query-execution)
   - [Sequence 2: Employee Join & Admin Approval](#sequence-2-employee-join--admin-approval)
   - [Sequence 3: KPI Dashboard Live Execution](#sequence-3-kpi-dashboard-live-execution)
   - [Sequence 4: Saved Chart Creation & Persistence](#sequence-4-saved-chart-creation--persistence)
4. [UML Activity Diagrams](#4-uml-activity-diagrams)
   - [Activity 1: LangGraph AI Pipeline Processing](#activity-1-langgraph-ai-pipeline-processing)
   - [Activity 2: SQL Guard & Validation Security Gatekeeper](#activity-2-sql-guard--validation-security-gatekeeper)
5. [System Architecture Flowchart](#5-system-architecture-flowchart)

---

## 1. Official SQLense Platform Database Specification

### Database Overview
The **SQLense Platform Database** (named `sqlense`) is a PostgreSQL relational database that manages platform authentication, organisation configurations, access permissions, query histories, KPI metric tiles, saved visualizations, and security audit trails.

> ℹ️ **Note:** The `sqlense` database stores platform metadata only. End-user organisation databases (e.g. `acme_db`, `techstart_db`) are completely separate and isolated.

---

### Table 1: `users`
Stores all registered administrators and employees.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | Primary Key, Default: `gen_random_uuid()` | Unique user identifier |
| `org_id` | `UUID` | Indexed, Not Null | Organisation UUID (matches `org_db_configs.org_id`) |
| `name` | `VARCHAR(100)` | Not Null | Full display name |
| `email` | `VARCHAR(150)` | Unique, Not Null, Indexed | Login email address |
| `hashed_password` | `VARCHAR(255)` | Not Null | Bcrypt hashed password |
| `role` | `VARCHAR(20)` | Not Null, Default: `'employee'` | User role (`'admin'`, `'employee'`) |
| `status` | `VARCHAR(20)` | Not Null, Default: `'pending'` | Approval status (`'active'`, `'pending'`, `'rejected'`) |
| `created_at` | `TIMESTAMPTZ` | Not Null, Default: `NOW()` | Registration timestamp |

---

### Table 2: `org_db_configs`
Stores encryption keys, connection parameters, and join codes for each organisation.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | Primary Key, Default: `gen_random_uuid()` | Unique configuration ID |
| `org_id` | `UUID` | Unique, Not Null, Indexed | Organisation UUID linking admins and employees |
| `organization_name`| `VARCHAR(255)`| Nullable | Display name of the organisation (e.g. "Acme Corp") |
| `join_code` | `VARCHAR(20)` | Unique, Nullable, Indexed | 8-character code for employee self-registration |
| `db_type` | `VARCHAR(50)` | Not Null, Default: `'postgresql'`| Engine type (`postgresql`, `mysql`, `sqlite`) |
| `host` | `VARCHAR(255)`| Nullable | Hostname or IP of the org's database |
| `port` | `INTEGER` | Nullable, Default: `5432` | Port number |
| `database_name` | `VARCHAR(255)`| Nullable | Target database name |
| `username` | `VARCHAR(255)`| Nullable | Database connection username |
| `encrypted_password`| `VARCHAR(512)`| Nullable | Fernet symmetric encrypted password |
| `ssl_mode` | `VARCHAR(50)` | Nullable | SSL mode (e.g. `require`, `disable`) |
| `connection_status` | `VARCHAR(20)`| Not Null, Default: `'disconnected'`| Status (`'connected'`, `'disconnected'`) |
| `last_connected_at` | `TIMESTAMPTZ`| Nullable | Timestamp of last successful connection check |
| `created_at` | `TIMESTAMPTZ` | Not Null, Default: `NOW()` | Configuration creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | Not Null, Default: `NOW()` | Last configuration update timestamp |

---

### Table 3: `kpi_tiles`
Stores administrator-configured SQL metrics displayed on the Admin KPI Dashboard.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | Primary Key, Default: `gen_random_uuid()` | Unique tile identifier |
| `org_id` | `UUID` | Not Null, Indexed | Organisation UUID |
| `created_by` | `UUID` | Not Null | Admin user ID who created the tile |
| `title` | `VARCHAR(120)` | Not Null | Metric card title (e.g. "Total Revenue") |
| `description` | `VARCHAR(255)` | Nullable | Subtitle/description |
| `sql_query` | `TEXT` | Not Null | Executable SQL SELECT query |
| `position` | `INTEGER` | Not Null, Default: `0` | Order position on grid |
| `created_at` | `TIMESTAMPTZ` | Not Null, Default: `NOW()` | Tile creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | Not Null, Default: `NOW()` | Last modification timestamp |

---

### Table 4: `saved_charts`
Persists user-saved AI chart visualizations and queries.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | Primary Key, Default: `gen_random_uuid()` | Unique saved chart ID |
| `org_id` | `UUID` | Not Null, Indexed | Organisation UUID |
| `user_id` | `UUID` | Not Null, Indexed | User ID who saved the chart |
| `title` | `VARCHAR(200)` | Not Null | Chart title |
| `question` | `VARCHAR(500)` | Not Null | Original natural language user prompt |
| `sql_query` | `VARCHAR(2000)`| Nullable | Generated SQL statement |
| `chart_type` | `VARCHAR(30)` | Nullable | Visualization type (`bar`, `line`, `pie`) |
| `chart_data` | `JSON` | Nullable | JSON array containing Recharts data points |
| `created_at` | `TIMESTAMPTZ` | Default: `NOW()` | Saved timestamp |

---

### Table 5: `query_history`
Maintains an audit trail of all natural language questions and generated SQL queries.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | Primary Key, Default: `gen_random_uuid()` | History record ID |
| `user_id` | `UUID` | Not Null, Indexed | User ID who asked the question |
| `org_id` | `UUID` | Not Null, Indexed | Organisation UUID |
| `question` | `TEXT` | Not Null | Original user prompt |
| `sql_query` | `TEXT` | Not Null | Executed SQL statement |
| `sql_explanation`| `TEXT` | Nullable | Plain English explanation |
| `answer_text` | `TEXT` | Nullable | Business insight response |
| `chart_type` | `VARCHAR(20)` | Default: `'none'` | Resulting chart type |
| `created_at` | `TIMESTAMPTZ` | Not Null, Default: `NOW()` | Execution timestamp |

---

### Table 6: `audit_logs`
Security audit trail recording admin and platform activities.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | Primary Key, Default: `gen_random_uuid()` | Log entry ID |
| `org_id` | `UUID` | Nullable, Indexed | Organisation UUID |
| `user_id` | `UUID` | Nullable, Indexed | User ID who performed the action |
| `action` | `VARCHAR(50)` | Not Null, Indexed | Action code (`LOGIN`, `DB_CONNECT`, `APPROVE_EMP`, etc.) |
| `detail` | `VARCHAR(255)` | Nullable | Human-readable details |
| `created_at` | `TIMESTAMPTZ` | Not Null, Default: `NOW()` | Action timestamp |

---

### Table 7: `superadmins`
Dedicated accounts for platform administrators (developers/operators).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | Primary Key, Default: `gen_random_uuid()` | SuperAdmin ID |
| `name` | `VARCHAR(100)` | Not Null | Display name |
| `email` | `VARCHAR(150)` | Unique, Not Null, Indexed | Login email |
| `hashed_password` | `VARCHAR(255)` | Not Null | Bcrypt hashed password |
| `created_at` | `TIMESTAMPTZ` | Default: `NOW()` | Account creation timestamp |

---

### Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    org_db_configs ||--o{ users : "belongs to org"
    org_db_configs ||--o{ kpi_tiles : "contains"
    org_db_configs ||--o{ saved_charts : "contains"
    org_db_configs ||--o{ query_history : "logs"
    users ||--o{ saved_charts : "creates"
    users ||--o{ query_history : "executes"
    users ||--o{ audit_logs : "triggers"

    org_db_configs {
        uuid id PK
        uuid org_id UK
        string organization_name
        string join_code UK
        string host
        string database_name
        string connection_status
    }

    users {
        uuid id PK
        uuid org_id FK
        string name
        string email UK
        string role
        string status
    }

    kpi_tiles {
        uuid id PK
        uuid org_id FK
        uuid created_by FK
        string title
        text sql_query
        int position
    }

    saved_charts {
        uuid id PK
        uuid org_id FK
        uuid user_id FK
        string title
        string question
        string chart_type
        json chart_data
    }

    query_history {
        uuid id PK
        uuid user_id FK
        uuid org_id FK
        text question
        text sql_query
        string chart_type
    }

    audit_logs {
        uuid id PK
        uuid org_id FK
        uuid user_id FK
        string action
        string detail
    }

    superadmins {
        uuid id PK
        string name
        string email UK
        string hashed_password
    }
```

---

## 2. UML Use Case Diagrams

```mermaid
graph TD
    subgraph Platform Security & Auth
        UC1[Login / JWT Auth]
        UC2[Register Admin / Join Code Signup]
        UC3[Manage Profile / Update Password]
    end

    subgraph Admin Capabilities
        UC4[Configure & Connect Org Database]
        UC5[Approve / Reject Employee Join Requests]
        UC6[Manage KPI Metric Tiles & Run Tiles]
        UC7[Execute Raw SQL in Admin Workspace]
        UC8[View Employee Query Analytics & Audit Log]
    end

    subgraph Employee & Shared Features
        UC9[Natural Language AI Chat Query]
        UC10[Toggle Chart / Table View]
        UC11[Save Visualization to Saved Charts]
        UC12[View Query History]
    end

    subgraph SuperAdmin Features
        UC13[SuperAdmin Login]
        UC14[View Platform-wide System Stats]
        UC15[View All Registered Organisations]
        UC16[Ask Platform-level AI Questions]
    end

    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC4
    Admin --> UC5
    Admin --> UC6
    Admin --> UC7
    Admin --> UC8
    Admin --> UC9
    Admin --> UC11

    Employee --> UC1
    Employee --> UC2
    Employee --> UC3
    Employee --> UC9
    Employee --> UC10
    Employee --> UC11
    Employee --> UC12

    SuperAdmin --> UC13
    SuperAdmin --> UC14
    SuperAdmin --> UC15
    SuperAdmin --> UC16
```

---

## 3. UML Sequence Diagrams

### Sequence 1: AI Chat Query Execution

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Admin
    participant FE as React Frontend (ChatPage)
    participant BE as FastAPI Backend (/chat)
    participant Auth as Auth Middleware (JWT)
    participant LG as LangGraph Pipeline
    participant DB as Org PostgreSQL Database
    participant Ollama as Ollama AI (qwen2.5:3b)
    participant PDB as Platform DB (sqlense)

    User->>FE: Enters prompt ("Show monthly revenue trend")
    FE->>BE: POST /chat { question } [Header: Bearer Token]
    BE->>Auth: Validate JWT & Extract org_id
    Auth-->>BE: Valid User (org_id, role)
    BE->>LG: run_pipeline(question, conn_str)
    
    LG->>DB: Fetch Schema Inspector (tables, columns, FKs)
    DB-->>LG: Schema Metadata
    
    LG->>Ollama: Prompt with Schema + Question
    Ollama-->>LG: Generated SQL SELECT Query
    
    LG->>LG: Validate SQL (SELECT-Only Guard & Identifier Check)
    
    LG->>DB: Execute SQL SELECT Query
    DB-->>LG: Raw Result Rows & Columns
    
    LG->>Ollama: Generate Business Insight Answer
    Ollama-->>LG: Answer Text Summary
    
    LG->>LG: Visualization Agent (Determine Chart Type: line)
    
    LG-->>BE: PipelineState Result
    BE->>PDB: Save to query_history & audit_logs
    BE-->>FE: JSON Response { answer_text, sql_query, chart, rows }
    FE-->>User: Render Insight, SQL Box, Recharts Line Chart & Table
```

---

### Sequence 2: Employee Join & Admin Approval

```mermaid
sequenceDiagram
    autonumber
    actor Emp as New Employee
    actor Admin as Org Admin
    participant FE as React Frontend
    participant BE as FastAPI Backend
    participant PDB as Platform DB (sqlense)

    Emp->>FE: Fills Signup Form with Join Code (e.g. ACMEX7Q2)
    FE->>BE: POST /auth/join { name, email, password, join_code }
    BE->>PDB: Find Org by join_code
    BE->>PDB: Insert User { role: "employee", status: "pending" }
    BE-->>FE: HTTP 201 Created (Pending Approval)
    
    Admin->>FE: Opens Admin Employees Page
    FE->>BE: GET /auth/admin/pending
    BE->>PDB: Query pending users for Admin's org_id
    PDB-->>BE: List of pending employees
    BE-->>FE: JSON [{ id, name, email, status: "pending" }]
    
    Admin->>FE: Clicks "Approve" button
    FE->>BE: POST /auth/admin/approve/{user_id}
    BE->>PDB: Update user set status = "active"
    BE->>PDB: Log AUDIT_LOG ("APPROVE_EMPLOYEE")
    BE-->>FE: HTTP 200 OK
    FE-->>Admin: Toast Notification "Employee approved!"
```

---

### Sequence 3: KPI Dashboard Live Execution

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Org Admin
    participant FE as React Frontend (KPIDashboardPage)
    participant BE as FastAPI Backend (/admin/kpi-tiles/run)
    participant PDB as Platform DB (sqlense)
    participant OrgDB as Org PostgreSQL Database

    Admin->>FE: Opens KPI Dashboard & clicks "Run All"
    FE->>BE: POST /admin/kpi-tiles/run
    BE->>PDB: Query kpi_tiles WHERE org_id = admin.org_id
    PDB-->>BE: List of KPI tiles [{ id, title, sql_query }]
    
    loop For each KPI tile
        BE->>OrgDB: Open fresh connection & execute tile.sql_query
        alt Query Execution Successful
            OrgDB-->>BE: Rows & Columns
        else Query Failure
            OrgDB-->>BE: DB Error Exception
        end
    end
    
    BE-->>FE: JSON Array [{ tile_id, title, rows, error }]
    FE-->>Admin: Display live metric tiles with values or error state
```

---

### Sequence 4: Saved Chart Creation & Persistence

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Admin
    participant FE as React Frontend (ChatPage / SavedChartsPage)
    participant BE as FastAPI Backend (/api/saved-charts)
    participant PDB as Platform DB (sqlense)

    User->>FE: Clicks "📌 Save Chart" on Chat Message
    FE->>BE: POST /api/saved-charts { title, question, sql_query, chart_type, chart_data }
    BE->>PDB: INSERT INTO saved_charts (org_id, user_id, title, chart_type, chart_data)
    PDB-->>BE: SavedChart Record (ID)
    BE-->>FE: HTTP 201 Created { id, message: "Chart saved successfully." }
    FE-->>User: Button changes to "✓ Saved" + Toast Notification
    
    User->>FE: Navigates to Saved Charts Page (/saved-charts)
    FE->>BE: GET /api/saved-charts
    BE->>PDB: SELECT * FROM saved_charts WHERE org_id = user.org_id
    PDB-->>BE: List of saved charts
    BE-->>FE: JSON Array of Saved Charts
    FE-->>User: Render Grid of Saved Chart Cards & Previews
```

---

## 4. UML Activity Diagrams

### Activity 1: LangGraph AI Pipeline Processing

```mermaid
flowchart TD
    A[Start: User Question Received] --> B[Node 1: Schema Agent]
    B --> C{Schema Read Success?}
    C -- No --> ERR[Return Error State & Stop]
    C -- Yes --> D[Node 2: SQL Generator Agent]
    D --> E[Ollama qwen2.5:3b generates SELECT query]
    E --> F[Node 3: SQL Validator Agent]
    F --> G{Security Guard & Schema Check}
    G -- Invalid / Non-SELECT --> ERR
    G -- Valid --> H[Node 4: Query Execution Node]
    H --> I[Execute SELECT against Org PostgreSQL DB]
    I --> J{Query Execution Success?}
    J -- No --> ERR
    J -- Yes --> K[Node 5: Insight Agent]
    K --> L[Ollama generates Business Insight Answer]
    L --> M[Node 6: Visualization Agent]
    M --> N{Is Chart Appropriate?}
    N -- Raw SELECT * or >10 cols --> O[Set Chart Type = 'table']
    N -- Aggregation / Trend / Metrics --> P[Build Recharts Config: line / bar / pie]
    O --> Q[Assemble Final Response State]
    P --> Q
    Q --> R[Persist Query History & Return Response]
    R --> S[End]
```

---

### Activity 2: SQL Guard & Security Gatekeeper

```mermaid
flowchart TD
    Start([SQL Execution Request]) --> Check1{Is Query Single Statement?}
    Check1 -- No multiple statements ; --> Reject1[Reject: Multiple SQL statements forbidden]
    Check1 -- Yes --> Check2{Starts with SELECT or WITH?}
    Check2 -- No --> Reject2[Reject: Write operation DML/DDL detected]
    Check2 -- Yes --> Check3{Contains INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE?}
    Check3 -- Yes --> Reject3[Reject: Security boundary violation]
    Check3 -- No --> Check4{Extracted Tables Exist in Schema?}
    Check4 -- No --> Reject4[Reject: Referenced table does not exist in schema]
    Check4 -- Yes --> Pass[Pass: SQL Validated for Execution]
```

---

## 5. System Architecture Flowchart

```mermaid
flowchart TB
    subgraph Client Layer
        Browser[User Browser / SPA]
        ReactApp[React + Vite Frontend]
        Router[React Router DOM]
    end

    subgraph API Gateway & Service Layer
        FastAPI[FastAPI Backend :8000]
        AuthDep[JWT Authentication & Role Guard]
        ViteProxy[Vite Dev Server Proxy :5173]
    end

    subgraph Agentic AI Core
        LangGraph[LangGraph State Pipeline]
        SchemaAgent[Schema Agent]
        SQLGen[SQL Generator Agent]
        SQLVal[SQL Validator Agent & Guard]
        InsightAgent[Insight Agent]
        VisAgent[Visualization Agent]
    end

    subgraph Data & Storage Layer
        Ollama[Ollama Engine :11434 - qwen2.5:3b]
        PlatformDB[(Platform PostgreSQL: sqlense)]
        OrgDB1[(Org DB: acme_db)]
        OrgDB2[(Org DB: techstart_db)]
    end

    Browser --> ReactApp
    ReactApp --> Router
    ReactApp -->|HTTP Requests| ViteProxy
    ViteProxy -->|Proxy /auth, /api, /chat| FastAPI
    FastAPI --> AuthDep
    AuthDep --> LangGraph

    LangGraph --> SchemaAgent
    SchemaAgent -->|Inspect Metadata| OrgDB1
    SchemaAgent -->|Inspect Metadata| OrgDB2
    LangGraph --> SQLGen
    SQLGen -->|Generate SQL| Ollama
    LangGraph --> SQLVal
    LangGraph -->|Execute SELECT| OrgDB1
    LangGraph -->|Execute SELECT| OrgDB2
    LangGraph --> InsightAgent
    InsightAgent -->|Generate Summary| Ollama
    LangGraph --> VisAgent
    FastAPI -->|Persist History / Audit| PlatformDB

    style PlatformDB fill:#4f46e5,stroke:#312e81,color:#fff
    style OrgDB1 fill:#059669,stroke:#065f46,color:#fff
    style OrgDB2 fill:#059669,stroke:#065f46,color:#fff
    style Ollama fill:#d97706,stroke:#92400e,color:#fff
```

---

*End of System Architecture, Schema & Diagram Blueprint v2.0*
