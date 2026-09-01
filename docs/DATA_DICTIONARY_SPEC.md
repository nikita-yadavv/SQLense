# SQLense — Official Data Dictionary Specification

**Version:** 2.0.0 | **Author:** SQLense Engineering Team | **Last Updated:** August 2026

> This document is the single source of truth for the **official SQLense platform database (`sqlense`)** and system Data Transfer Objects (DTOs). It strictly aligns with the official SQLense UML Class Diagram and provides technical properties, validation rules, constraints, allowed values, and entity relationships for every data element.

---

## Master Table & Data Element Directory

1. **`users`** — User Authentication & Identity Management
2. **`org_db_configs`** — Organisation Database Configurations & Security Keys
3. **`kpi_tiles`** — Dashboard Metric KPI Tiles
4. **`saved_charts`** — User-Saved Chart Visualizations
5. **`query_histories`** — Natural Language Query Execution Log
6. **`audit_logs`** — Platform Security & Activity Audit Trail
7. **`super_admins`** — Platform Operator Accounts
8. **`user_roles`** *(ENUM)* — Role Definitions
9. **`user_statuses`** *(ENUM)* — Approval & Account Status Definitions
10. **`chart_configs`** *(DTO / JSON Schema)* — Chart Rendering Payload Structure
11. **`chat_responses`** *(DTO / JSON Schema)* — Full AI Chat Response Structure

---

### 1) `users`

**Description:** Stores account credentials, roles, and status for organisation administrators and employees.  
**Aliases:** System Users, Account Directory, User Accounts.  
**Relationships:** 
- Belongs to `org_db_configs` via `org_id` (`*` to `0..1`).
- References `user_roles` ENUM for `role` and `user_statuses` ENUM for `status`.

| Column Name | Aliases | Data Type | Size / Length | Default Value | Allowed Values | Validation Rules / Constraints | Description |
|---|---|---|---|---|---|---|---|
| **`id`** | User ID, UUID | `UUID` | 16 bytes / 36 chars | `gen_random_uuid()` | Valid UUID v4 string | **Primary Key**, Not Null | Unique identifier for each user account. |
| **`org_id`** | Organisation ID | `UUID` | 16 bytes / 36 chars | *None* | Valid UUID v4 string | **Foreign Key** → `org_db_configs.org_id`, Not Null, Indexed | Identifies the organisation to which the user belongs. |
| **`name`** | Full Name, User Name | `VARCHAR` | 100 chars | *None* | Non-empty text | Not Null, Length between 1 and 100 characters | Full display name of the user. |
| **`email`** | Login Email, Account Email | `VARCHAR` | 150 chars | *None* | Standard email string | **Unique**, Not Null, Indexed, Must match RFC 5322 email regex | Unique email address used for system login. |
| **`hashed_password`** | Password Hash, Encrypted PW | `VARCHAR` | 255 chars | *None* | Bcrypt hash string (`$2b$...`) | Not Null, Cannot be stored as plaintext | Securely hashed password. |
| **`role`** | User Role, Access Level | `VARCHAR` / `ENUM` | 20 chars | `'employee'` | `'admin'`, `'employee'` | Not Null, Must be a valid value from `user_roles` ENUM | Defines system permissions and page access. |
| **`status`** | Account Status, Approval State | `VARCHAR` / `ENUM` | 20 chars | `'pending'` | `'active'`, `'pending'`, `'rejected'` | Not Null, Must be a valid value from `user_statuses` ENUM | Tracks approval lifecycle state. Employees remain `pending` until approved by Admin. |
| **`created_at`** | Registration Date, Signup Time | `TIMESTAMPTZ` | 8 bytes | `NOW()` | Valid UTC ISO timestamp | Not Null, Automatically set on record creation | Timestamp when the user registered. |

---

### 2) `org_db_configs`

**Description:** Stores encryption credentials, connection parameters, and join codes for each organisation's external database.  
**Aliases:** Database Connection Config, Org Config, Database Credentials.  
**Relationships:** 
- Parent entity for `users`, `kpi_tiles`, `saved_charts`, `query_histories`, and `audit_logs` via `org_id`.

| Column Name | Aliases | Data Type | Size / Length | Default Value | Allowed Values | Validation Rules / Constraints | Description |
|---|---|---|---|---|---|---|---|
| **`id`** | Config ID | `UUID` | 16 bytes / 36 chars | `gen_random_uuid()` | Valid UUID v4 string | **Primary Key**, Not Null | Unique identifier for the configuration entry. |
| **`org_id`** | Organisation UUID | `UUID` | 16 bytes / 36 chars | *None* | Valid UUID v4 string | **Unique**, Not Null, Indexed | Unique organisation identifier linking all org data. |
| **`organization_name`** | Company Name, Org Name | `VARCHAR` | 255 chars | *None* | Non-empty text | Nullable, Max 255 chars | Business display name of the organisation. |
| **`join_code`** | Employee Join Code | `VARCHAR` | 20 chars | Auto 8-char random | 8-character uppercase alphanumeric string (e.g., `ACMEX7Q2`) | **Unique**, Nullable, Indexed, Pattern: `^[A-Z0-9]{8}$` | Unique code used by employees to self-register into this organisation. |
| **`db_type`** | Engine Type, Database Driver | `VARCHAR` | 50 chars | `'postgresql'` | `'postgresql'`, `'mysql'`, `'sqlite'` | Not Null | Relational database management system type. |
| **`host`** | DB Host, IP Address | `VARCHAR` | 255 chars | *None* | Hostname or IP string | Nullable | Hostname or IP address of the target database server. |
| **`port`** | DB Port | `INTEGER` | 4 bytes | `5432` | `1024` to `65535` | Nullable, Must be positive integer | Network port for database connection. |
| **`database_name`** | DB Name, Schema Name | `VARCHAR` | 255 chars | *None* | Valid database identifier | Nullable | Name of the target organisation database. |
| **`username`** | DB User | `VARCHAR` | 255 chars | *None* | Valid database username | Nullable | Database user account name. |
| **`encrypted_password`** | Password Cyphertext | `VARCHAR` | 512 chars | *None* | Fernet encrypted token string | Nullable, Private visibility (`-`) | Password encrypted at rest using Fernet symmetric encryption. |
| **`ssl_mode`** | SSL Setting | `VARCHAR` | 50 chars | `'prefer'` | `'disable'`, `'allow'`, `'prefer'`, `'require'` | Nullable | SSL encryption mode for connection. |
| **`connection_status`** | DB Status, Link State | `VARCHAR` | 20 chars | `'disconnected'` | `'connected'`, `'disconnected'` | Not Null | Indicates whether backend can successfully ping the database. |
| **`last_connected_at`** | Last Health Check | `TIMESTAMPTZ` | 8 bytes | *None* | Valid UTC ISO timestamp | Nullable | Timestamp of last successful test connection. |
| **`created_at`** | Configuration Date | `TIMESTAMPTZ` | 8 bytes | `NOW()` | Valid UTC ISO timestamp | Not Null | Timestamp when config entry was created. |
| **`updated_at`** | Last Modified Date | `TIMESTAMPTZ` | 8 bytes | `NOW()` | Valid UTC ISO timestamp | Not Null, Auto-updated on modify | Timestamp when config parameters were last modified. |

---

### 3) `kpi_tiles`

**Description:** Stores administrator-defined SQL queries and metric cards rendered on the Admin KPI Dashboard.  
**Aliases:** Metric Cards, KPI Cards, Dashboard Tiles.  
**Relationships:** 
- Belongs to `org_db_configs` via `org_id`.
- Created by a user in `users` via `created_by`.

| Column Name | Aliases | Data Type | Size / Length | Default Value | Allowed Values | Validation Rules / Constraints | Description |
|---|---|---|---|---|---|---|---|
| **`id`** | Tile ID | `UUID` | 16 bytes / 36 chars | `gen_random_uuid()` | Valid UUID v4 string | **Primary Key**, Not Null | Unique identifier for the KPI tile. |
| **`org_id`** | Organisation ID | `UUID` | 16 bytes / 36 chars | *None* | Valid UUID v4 string | **Foreign Key** → `org_db_configs.org_id`, Not Null, Indexed | Organisation this tile belongs to. |
| **`created_by`** | Creator User ID | `UUID` | 16 bytes / 36 chars | *None* | Valid UUID v4 string | **Foreign Key** → `users.id`, Not Null, Indexed | User ID of the admin who created the tile. |
| **`title`** | Tile Header, Metric Name | `VARCHAR` | 120 chars | *None* | Non-empty text | Not Null, Length between 1 and 120 characters | Display title of the metric card (e.g., "Total Revenue"). |
| **`description`** | Subtitle, Explanation | `VARCHAR` | 255 chars | *None* | Text string | Nullable, Max 255 chars | Secondary summary describing what the metric measures. |
| **`sql_query`** | Execution SQL | `TEXT` | Unlimited | *None* | Single `SELECT` SQL statement | Not Null, Must pass SQL Guard (SELECT-only) | Executable SQL query run against the organisation database. |
| **`position`** | Card Order, Display Sequence | `INTEGER` | 4 bytes | `0` | Non-negative integer (`>= 0`) | Not Null | Grid ordering position of the tile on the dashboard. |
| **`created_at`** | Created Timestamp | `TIMESTAMPTZ` | 8 bytes | `NOW()` | Valid UTC ISO timestamp | Not Null | Timestamp when the KPI tile was created. |
| **`updated_at`** | Modified Timestamp | `TIMESTAMPTZ` | 8 bytes | `NOW()` | Valid UTC ISO timestamp | Not Null | Timestamp when the tile was last updated. |

---

### 4) `saved_charts`

**Description:** Persists chart visualizations saved by users from the AI Chat for re-viewing on the Saved Charts page.  
**Aliases:** User Charts, Bookmarked Visualizations, Saved Insights.  
**Relationships:** 
- Belongs to `org_db_configs` via `org_id`.
- Belongs to `users` via `user_id`.

| Column Name | Aliases | Data Type | Size / Length | Default Value | Allowed Values | Validation Rules / Constraints | Description |
|---|---|---|---|---|---|---|---|
| **`id`** | Chart ID | `UUID` | 16 bytes / 36 chars | `gen_random_uuid()` | Valid UUID v4 string | **Primary Key**, Not Null | Unique identifier for the saved chart record. |
| **`org_id`** | Organisation ID | `UUID` | 16 bytes / 36 chars | *None* | Valid UUID v4 string | **Foreign Key** → `org_db_configs.org_id`, Not Null, Indexed | Organisation scope for data isolation. |
| **`user_id`** | Saved By User ID | `UUID` | 16 bytes / 36 chars | *None* | Valid UUID v4 string | **Foreign Key** → `users.id`, Not Null, Indexed | User ID who saved the chart. |
| **`title`** | Chart Header | `VARCHAR` | 200 chars | *None* | Non-empty text | Not Null, Max 200 chars | Title assigned to the visualization. |
| **`question`** | Prompt, Query Question | `VARCHAR` | 500 chars | *None* | Non-empty text | Not Null, Max 500 chars | Original natural-language question asked by user. |
| **`sql_query`** | Generated SQL | `VARCHAR` | 2000 chars | *None* | Valid SELECT SQL statement | Nullable, Max 2000 chars | SQL query used to fetch chart data. |
| **`chart_type`** | Visualization Type | `VARCHAR` | 30 chars | *None* | `'bar'`, `'line'`, `'pie'`, `'table'`, `'none'` | Nullable | Type of Recharts visualization rendered. |
| **`chart_data`** | Payload JSON | `JSON` | Dynamic | *None* | Array of objects `[{"name": "...", "val": 10}]` | Nullable, Valid JSON array format | Serialized dataset used to render the chart. |
| **`created_at`** | Bookmark Date | `TIMESTAMPTZ` | 8 bytes | `NOW()` | Valid UTC ISO timestamp | Not Null | Timestamp when the chart was saved. |

---

### 5) `query_histories`

**Description:** Audit log of all natural-language prompts, generated SQL, plain-English explanations, and insights.  
**Aliases:** Query Logs, History Trail, Chat Log.  
**Relationships:** 
- Belongs to `org_db_configs` via `org_id`.
- Belongs to `users` via `user_id`.

| Column Name | Aliases | Data Type | Size / Length | Default Value | Allowed Values | Validation Rules / Constraints | Description |
|---|---|---|---|---|---|---|---|
| **`id`** | History Entry ID | `UUID` | 16 bytes / 36 chars | `gen_random_uuid()` | Valid UUID v4 string | **Primary Key**, Not Null | Unique identifier for the query record. |
| **`user_id`** | User ID | `UUID` | 16 bytes / 36 chars | *None* | Valid UUID v4 string | **Foreign Key** → `users.id`, Not Null, Indexed | User ID of the prompt author. |
| **`org_id`** | Organisation ID | `UUID` | 16 bytes / 36 chars | *None* | Valid UUID v4 string | **Foreign Key** → `org_db_configs.org_id`, Not Null, Indexed | Organisation scope of the query. |
| **`question`** | Natural Language Prompt | `TEXT` | Unlimited | *None* | Non-empty text | Not Null | Natural-language question asked by user. |
| **`sql_query`** | Generated SQL | `TEXT` | Unlimited | *None* | Valid SELECT statement | Not Null | Executed SQL generated by AI Generator. |
| **`sql_explanation`** | Query Explanation | `TEXT` | Unlimited | *None* | Text string | Nullable | Plain-English summary of what the SQL query does. |
| **`answer_text`** | AI Insight Summary | `TEXT` | Unlimited | *None* | Text string | Nullable | Plain-English business insight produced by Insight Agent. |
| **`chart_type`** | Rendered Chart | `VARCHAR` | 20 chars | `'none'` | `'bar'`, `'line'`, `'pie'`, `'table'`, `'none'` | Not Null | Visualization type produced for the query. |
| **`created_at`** | Execution Time | `TIMESTAMPTZ` | 8 bytes | `NOW()` | Valid UTC ISO timestamp | Not Null | Timestamp when the query was executed. |

---

### 6) `audit_logs`

**Description:** High-security audit log capturing all administrative actions, connection modifications, workspace executions, and user sign-ins.  
**Aliases:** Security Log, Activity Trail, Platform Audit.  
**Relationships:** 
- Mapped to `org_db_configs` via `org_id` (`0..1`).
- Mapped to `users` via `user_id` (`0..1`).

| Column Name | Aliases | Data Type | Size / Length | Default Value | Allowed Values | Validation Rules / Constraints | Description |
|---|---|---|---|---|---|---|---|
| **`id`** | Audit Log ID | `UUID` | 16 bytes / 36 chars | `gen_random_uuid()` | Valid UUID v4 string | **Primary Key**, Not Null | Unique identifier for the audit log entry. |
| **`org_id`** | Organisation ID | `UUID` | 16 bytes / 36 chars | *None* | Valid UUID v4 string | **Foreign Key** → `org_db_configs.org_id`, Nullable, Indexed | Organisation associated with action (if applicable). |
| **`user_id`** | User ID | `UUID` | 16 bytes / 36 chars | *None* | Valid UUID v4 string | **Foreign Key** → `users.id`, Nullable, Indexed | User who triggered the action. |
| **`action`** | Activity Code | `VARCHAR` | 50 chars | *None* | `'LOGIN'`, `'DB_CONNECT'`, `'APPROVE_EMPLOYEE'`, `'CHAT_QUERY'`, `'WORKSPACE_EXECUTE'`, etc. | Not Null, Indexed | Standardized upper-case action keyword. |
| **`detail`** | Event Description | `TEXT` / `VARCHAR` | 255 chars | *None* | Text string | Nullable, Max 255 chars | Contextual details describing the event. |
| **`ip_address`** | Client IP | `VARCHAR` | 45 chars | *None* | Valid IPv4 or IPv6 string | Nullable | Client IP address associated with request. |
| **`created_at`** | Event Time | `TIMESTAMPTZ` | 8 bytes | `NOW()` | Valid UTC ISO timestamp | Not Null | Timestamp when the audit event occurred. |

---

### 7) `super_admins`

**Description:** Stores authentication accounts for SQLense platform operators and superadministrators.  
**Aliases:** Platform Admins, System Operators, Superuser Directory.  
**Relationships:** Independent entity for platform-level access control.

| Column Name | Aliases | Data Type | Size / Length | Default Value | Allowed Values | Validation Rules / Constraints | Description |
|---|---|---|---|---|---|---|---|
| **`id`** | SuperAdmin ID | `UUID` | 16 bytes / 36 chars | `gen_random_uuid()` | Valid UUID v4 string | **Primary Key**, Not Null | Unique identifier for the SuperAdmin account. |
| **`name`** | Full Name | `VARCHAR` | 100 chars | *None* | Non-empty text | Not Null | Full name of the operator. |
| **`email`** | Operator Email | `VARCHAR` | 150 chars | *None* | Valid email string | **Unique**, Not Null, Indexed | Unique login email address. |
| **`hashed_password`** | Password Hash | `VARCHAR` | 255 chars | *None* | Bcrypt hash string | Not Null | Hashed password credential. |
| **`is_active`** | Account Active | `BOOLEAN` | 1 byte | `TRUE` | `TRUE`, `FALSE` | Not Null | Flag indicating whether operator access is active. |
| **`created_at`** | Account Created | `TIMESTAMPTZ` | 8 bytes | `NOW()` | Valid UTC ISO timestamp | Not Null | Account creation timestamp. |
| **`last_login_at`** | Last Session Time | `TIMESTAMPTZ` | 8 bytes | *None* | Valid UTC ISO timestamp | Nullable | Timestamp of last SuperAdmin login. |

---

### 8) `user_roles` *(ENUM)*

**Description:** Fixed enumeration defining acceptable user roles within an organisation.

| Enumerated Value | Alias | Permitted Capabilities |
|---|---|---|
| **`'admin'`** | Org Administrator | Database setup, employee approvals, workspace execution, analytics, KPI tile management. |
| **`'employee'`** | Standard Employee | AI chat query execution, query history viewing, chart saving. |

---

### 9) `user_statuses` *(ENUM)*

**Description:** Fixed enumeration tracking account lifecycle states for access control.

| Enumerated Value | Alias | Account Behavior |
|---|---|---|
| **`'active'`** | Approved / Active | Account is active and can authenticate to access system features. |
| **`'pending'`** | Awaiting Approval | Employee registered via join code; cannot access dashboard until approved by Admin. |
| **`'rejected'`** | Registration Rejected | Request declined by Admin; authentication is denied. |

---

### 10) `chart_configs` *(DTO / JSON Schema)*

**Description:** Data Transfer Object structure representing chart configuration payloads passed between backend and frontend.

| Attribute Name | Data Type | Size / Format | Required | Allowed Values | Description |
|---|---|---|---|---|---|
| **`type`** | `String` | Max 30 chars | Yes | `'bar'`, `'line'`, `'pie'`, `'table'`, `'none'` | Chart visualization type for Recharts component. |
| **`title`** | `String` | Max 200 chars | Yes | Non-empty text | Title of the chart widget. |
| **`data`** | `List<Dict>` / `JSON` | Dynamic | Yes | Valid JSON array of row dicts | Datasets formatted for Recharts plotting. |
| **`x_key`** | `String` | Max 100 chars | Yes | Valid column key | Property key mapped to X-axis categories/dates. |
| **`y_keys`** | `List<String>` | Array of strings | Yes | Up to 5 metric keys | Property keys mapped to Y-axis numeric values. |

---

### 11) `chat_responses` *(DTO / JSON Schema)*

**Description:** Data Transfer Object structure returned by `POST /chat` to render natural-language AI answers, SQL, charts, and raw data tables.

| Attribute Name | Data Type | Size / Format | Required | Allowed Values | Description |
|---|---|---|---|---|---|
| **`question`** | `String` | Max 500 chars | Yes | Non-empty prompt | Original user query string. |
| **`sql_query`** | `String` | Max 2000 chars | Yes | Valid SELECT statement | Generated and executed SQL statement. |
| **`sql_explanation`** | `String` | Max 1000 chars | Yes | Text summary | Plain-English explanation of the SQL statement. |
| **`answer_text`** | `String` | Max 2000 chars | Yes | Business summary | AI insight summary generated by Insight Agent. |
| **`chart`** | `ChartConfig` | Nested Object | Yes | Valid `ChartConfig` DTO | Chart rendering configuration object. |
| **`rows`** | `List<Dict>` | Array of objects | Yes | Max 500 row objects | Result rows returned by query execution. |
| **`columns`** | `List<String>` | Array of strings | Yes | Array of column names | Result column headers returned by query execution. |

---

*End of SQLense Official Data Dictionary Specification v2.0*
