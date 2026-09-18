# SQLense — Frontend Comprehensive Handbook (1-Hour Master Guide)

> **Audience:** Frontend Developers, UI/UX Engineers, Presenters, Evaluators.  
> **Goal:** Complete mastery of the SQLense frontend architecture, component hierarchy, state management, Recharts visualization engine, routing, and viva questions.

---

## 1. Executive Summary & UI Concept

The **SQLense** frontend is a high-performance, single-page enterprise web application (SPA) built with **React 18** and **Vite**. It provides a conversational data analytics interface, real-time database management tools, role-based dashboards, and glassmorphic data visualizations.

### Design System & Theme Identity
SQLense uses an editorial **Luxury Royal & Midnight** aesthetic:
- **Primary Color Palette:**
  - `Royal (#334EAC)` — Primary CTA buttons, active state badges.
  - `Midnight (#081F5C)` — High-contrast sidebar, primary headings, terminal code containers.
  - `China (#7096D1)` — Sub-headers, focus outlines, secondary buttons.
  - `Moon (#F7F2EB)` — Elevated modal surfaces, glassmorphic card backdrops.
  - `Jicama (#FFF9F0)` — Warm porcelain background canvas.
- **Glassmorphism & Micro-Animations:** Backdrops use `backdrop-filter: blur(12px)`, multi-stop gradient top borders, smooth hover transitions, and animated glowing active indicators.
- **Pure CSS Flexibility:** Built with structured Vanilla CSS (`index.css` & `App.css`) avoiding bulky CSS utility frameworks for maximum layout precision.

---

## 2. Technology Stack & Libraries

| Library / Tool | Version | Purpose & Why It Was Chosen |
|---|---|---|
| **React** | `18.3+` | Declarative component UI, Concurrent Mode rendering, and unidirectional data flow. |
| **Vite** | `5.0+` | Lightning-fast ESM dev server, instant Hot Module Replacement (HMR), and optimized rollup production bundles. |
| **React Router** | `v6` | Client-side declarative routing, nested routes, and protected role-based route wrappers. |
| **Axios** | `1.7+` | Promise-based HTTP client with global request/response interceptors for JWT token injection and 401 expiration handling. |
| **Recharts** | `2.12+` | Composable SVG chart library for React; powers responsive Bar, Area/Line, and Donut/Pie charts. |
| **Lucide React** | `0.380+` | Clean, high-contrast, scalable vector icons across all navigation and interactive components. |
| **Context API** | Native React | Global state management for authentication (`AuthContext`) and notifications (`ToastContext`). |

---

## 3. Directory & Component Structure

```
frontend/src/
├── assets/                    # Static branding SVGs and imagery
├── components/                # Reusable UI & Widget Components
│   ├── charts/                # Recharts Visualization Implementations
│   │   ├── BarChartView.jsx   # Multi-stop gradient bar chart with dynamic scaling
│   │   ├── LineChartView.jsx  # Smooth area glow trend chart with active dot hovers
│   │   └── PieChartView.jsx   # Modern Donut chart with percentage breakdowns & badges
│   ├── Layout.jsx             # Shared top-level frame (Sidebar + Main Content Area)
│   ├── Sidebar.jsx            # Role-aware sidebar navigation, live tables & recent chats
│   ├── ChatWindow.jsx         # Chat bubble stream, suggestion chips & sticky query input
│   ├── Message.jsx            # Rich bot response bubble (SQL preview, Copy, Insights, Table)
│   ├── ChartRenderer.jsx      # Dynamic dispatcher for Bar, Line, or Pie charts
│   ├── ResultTable.jsx        # High-contrast, paginated tabular query result renderer
│   ├── Modal.jsx              # Accessible modal dialog with glassmorphic backdrop
│   ├── Toast.jsx              # Global notification alerts (success, error, info)
│   ├── StatCard.jsx           # KPI & metric summary cards
│   ├── SearchBar.jsx          # Debounced search input filter
│   └── ErrorBoundary.jsx      # React error boundary catching render crashes gracefully
│
├── context/                   # Global React Context Providers
│   ├── AuthContext.jsx        # Login, logout, JWT persistence, user profile, role flags
│   └── ToastContext.jsx       # Global notification queue (toast.success, toast.error)
│
├── pages/                     # Routed View Pages
│   ├── LoginPage.jsx          # User and admin authentication
│   ├── SignupPage.jsx         # Org creation (admin) & Join Code registration (employee)
│   ├── ChatPage.jsx           # Main natural-language AI query interface & session manager
│   ├── HistoryPage.jsx        # Paginated query history list with search
│   ├── SavedChartsPage.jsx    # Visual library of bookmarked charts with filters
│   ├── DashboardPage.jsx      # Org employee overview dashboard
│   ├── ProfilePage.jsx        # User profile details and password modification
│   ├── SettingsPage.jsx       # User preferences and appearance settings
│   │
│   ├── admin/                 # Admin-Only Pages (Protected by AdminRoute)
│   │   ├── AdminDashboardPage.jsx # Organization high-level management overview
│   │   ├── DatabasePage.jsx       # Database connection credentials configuration
│   │   ├── WorkspacePage.jsx      # Raw SQL Workspace with AI CRUD query generator
│   │   ├── KPIDashboardPage.jsx   # Live SQL metric tiles with "Ask AI" KPI drawer
│   │   ├── EmployeesPage.jsx      # Employee approval workflow & join code sharing
│   │   ├── AnalyticsPage.jsx      # 30-day query trends & user activity breakdown
│   │   └── AuditLogPage.jsx       # Immutable compliance & security audit viewer
│   │
│   └── superadmin/            # SuperAdmin Platform Portal
│       ├── SuperAdminLogin.jsx     # Isolated SuperAdmin authentication
│       └── SuperAdminDashboard.jsx # Multi-tenant overview, orgs, users, reports, AI chat
│
├── router/                    # Route Protection & Guards
│   ├── ProtectedRoute.jsx     # Guards authenticated routes from anonymous access
│   └── AdminRoute.jsx         # Enforces role === "admin"
│
├── services/                  # API Client & Network Layer
│   └── api.js                 # Axios instance, baseURL, request interceptors & endpoints
│
├── App.css                    # Component-specific styles and glassmorphic themes
├── index.css                  # Global CSS variables, typography, reset and design tokens
└── main.jsx                   # Application entry point & React DOM root mounting
```

---

## 4. Key Functional Modules & Flows

### 1. Authentication & Role-Based Routing
- **Token Storage**: On successful login, the JWT access token is stored in `localStorage.getItem("token")` and the user profile in `localStorage.getItem("user")`.
- **Axios Interceptor**: Every HTTP request automatically injects `Authorization: Bearer <token>`. If the backend returns `401 Unauthorized`, the interceptor triggers automatic logout and redirects to `/login`.
- **Route Guarding**:
  - `<ProtectedRoute>`: Redirects unauthenticated users to `/login`.
  - `<AdminRoute>`: Redirects employees attempting to access `/admin/*` back to the employee dashboard.

### 2. AI Chat & Session Management (`ChatPage.jsx` & `ChatWindow.jsx`)
- **Session-Scoped Storage**: Active session messages are saved in `sessionStorage` (`sqlense_active_chat`). Opening a new tab starts clean.
- **Historical Chat Replay**: Clicking a recent chat in the Sidebar navigates to `/chat?chat_id=<id>`, fetching full SQL, explanation, rows, columns, and chart data from `historyAPI.getById()`.
- **Live Database Table Clicking**: Clicking any table in the Sidebar's *Database Tables* list dispatches an automated query (e.g. `Show all records from customers (first 100 rows)`).

### 3. Rich Message Bubble Architecture (`Message.jsx`)
Each AI response bubble renders:
1. **Business Insight**: Clean executive answer with an emoji indicator.
2. **SQL Explanation**: Plain English explanation of the SQL logic.
3. **Generated SQL Box**: Syntax-highlighted SQL with a 1-click **Copy SQL** button.
4. **Action Controls**: Interactive **Hide/Show Chart** and **📌 Save Chart** buttons.
5. **Interactive Visualization**: Recharts Bar, Line, or Pie chart (if applicable).
6. **Result Table**: High-contrast tabular view with column formatting and row counts.
7. **Smart Error Cards**: Friendly error cards with icons and actionable hints (e.g. Database Offline, Session Expired, Query Timed Out).

### 4. Recharts Visualization Engine (`components/charts/`)
- **BarChartView**: Renders multi-stop vertical linear gradients with rounded pill caps (`radius={[6, 6, 0, 0]}`), formatted metric names, and glassmorphic tooltips.
- **LineChartView**: Uses an `AreaChart` with soft gradient area fills under the curve, contrasting stroke lines, and glowing active dots.
- **PieChartView**: Renders a Donut Chart with inner radius cutouts, percentage badges, and clean legend callouts.

### 5. SQL Workspace with AI Query Assistant (`WorkspacePage.jsx`)
- For administrators who need to manage data directly:
  1. **AI Query Assistant (CRUD Generator)**: Admin enters a plain English prompt (e.g. `delete customer named john doe`). The AI generates valid SQL with `ILIKE` case-insensitivity.
  2. **1-Click Insertion**: Click **Insert into Editor** or **Insert & Run** to populate the raw SQL editor.
  3. **Transactional Controls**: Execute, Commit, or Rollback changes with table outputs.

### 6. Live KPI Dashboard (`KPIDashboardPage.jsx`)
- Admin configures SQL metric tiles (e.g. `Total Orders`, `Monthly Revenue`, `Active Customers`).
- **Run All**: Re-executes all SQL queries against the live database in parallel.
- **"Ask AI" Drawer**: Slide-over panel where users can chat with the local LLM specifically about the live KPI numbers.

---

## 5. State Management & Data Flow Architecture

```
[User Action: Types Query]
        │
        ▼
[ChatWindow Component] ──► [chatAPI.askQuestion(prompt)]
        │                           │
        │                           ▼ (HTTP POST /api/chat)
        │                   [FastAPI Agentic Backend]
        │                           │
        ▼                           ▼ (JSON Response)
[Updates messages state] ◄── [Appends Bot Message]
        │
        ├──► [Renders Business Insight Text]
        ├──► [Renders Copyable SQL Container]
        ├──► [Dispatches to ChartRenderer (Bar/Line/Pie)]
        └──► [Renders Tabular ResultTable]
```

---

## 6. Evaluator Viva Questions & Model Answers

**Q1: How does the frontend maintain session state without leaking chat history across browser tabs?**  
*Answer:* SQLense utilizes `sessionStorage` for active chat conversations (`sqlense_active_chat`), which is strictly tab-scoped. Closing a tab or opening a new session starts with a clean welcome screen, while historical chats can be recalled on demand from the persistent `QueryHistory` API.

**Q2: How does the chart system know whether to display a Bar, Line, or Pie chart?**  
*Answer:* The backend Visualization Agent analyzes the SQL result structure and query intent, returning a Recharts-compatible config object with `type: "bar" | "line" | "pie" | "table"`. `ChartRenderer.jsx` dynamically mounts the corresponding chart component with gradient definitions, axis labels, and metric formatters.

**Q3: How are JWT tokens handled securely across page reloads and API requests?**  
*Answer:* Tokens are stored in browser storage and bound to an Axios request interceptor in `api.js`. Every outgoing request automatically attaches `Authorization: Bearer <token>`. An Axios response interceptor intercepts any `401 Unauthorized` responses (e.g. expired tokens), clears user state, and forces a graceful redirect to the login screen.

**Q4: How do you prevent layout shifts or crashes when rendering complex database tables with null values or large datasets?**  
*Answer:* (1) Result rows are capped at 500 records with pagination in `ResultTable.jsx`; (2) All cell values are safely coerced to strings with `null` fallbacks (`val ?? "—"`); (3) The entire component tree is wrapped in a React `ErrorBoundary` to gracefully catch and display isolated widget errors without crashing the main application.

**Q5: What makes the UI/UX look and feel enterprise-grade compared to standard open-source dashboards?**  
*Answer:* SQLense implements custom Luxury Royal design tokens, glassmorphic surfaces (`backdrop-filter: blur`), multi-stop SVG gradients for charts, high-contrast monospace SQL containers with copy-to-clipboard feedback, responsive slide-out drawers, and contextual error handling cards.
