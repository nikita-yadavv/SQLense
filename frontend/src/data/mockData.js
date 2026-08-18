/**
 * mockData.js — Static mock data for SQLense frontend development.
 * Used by all new pages/components to display realistic dummy data
 * without any backend API calls.
 */

// ── Mock Users ─────────────────────────────────────────────────────
export const mockAdminUser = {
  id: "usr_admin_001",
  name: "Sarah Mitchell",
  email: "sarah.mitchell@acmecorp.com",
  role: "admin",
  org_id: "org_001",
  organization_name: "Acme Corporation",
  avatar_initials: "SM",
  joined_at: "2024-01-15T09:00:00Z",
};

export const mockEmployeeUser = {
  id: "usr_emp_001",
  name: "James Carter",
  email: "james.carter@acmecorp.com",
  role: "employee",
  org_id: "org_001",
  organization_name: "Acme Corporation",
  avatar_initials: "JC",
  joined_at: "2024-03-20T10:30:00Z",
};

// ── Dashboard Stats ────────────────────────────────────────────────
export const mockDashboardStats = {
  totalQueries: 1284,
  queriesThisWeek: 47,
  queriesChange: +12.4,
  savedCharts: 18,
  savedChartsChange: +3,
  connectedDatabase: "sales_db",
  dbStatus: "connected",
  lastQueryAt: "2026-08-07T12:45:00Z",
  avgResponseTime: "1.3s",
  successRate: 97.2,
};

export const mockAdminStats = {
  ...mockDashboardStats,
  totalEmployees: 14,
  activeEmployees: 11,
  employeesChange: +2,
  orgQueriesTotal: 8420,
  orgQueriesThisWeek: 312,
  topTable: "orders",
};

// ── Recent Chats (sidebar) ─────────────────────────────────────────
export const mockRecentChats = [
  { id: "chat_001", title: "Monthly revenue breakdown", time: "2 min ago" },
  { id: "chat_002", title: "Top 10 customers by sales", time: "1 hour ago" },
  { id: "chat_003", title: "Product inventory below 50", time: "Yesterday" },
  { id: "chat_004", title: "New user registrations Q2", time: "2 days ago" },
  { id: "chat_005", title: "Average order value by region", time: "3 days ago" },
  { id: "chat_006", title: "Churn rate last 6 months", time: "1 week ago" },
];

// ── Database Tables (sidebar) ──────────────────────────────────────
export const mockDatabaseTables = [
  { name: "customers", rows: 24580, icon: "👥" },
  { name: "orders", rows: 182340, icon: "🛒" },
  { name: "products", rows: 4210, icon: "📦" },
  { name: "employees", rows: 148, icon: "👤" },
  { name: "revenue", rows: 98720, icon: "💰" },
  { name: "inventory", rows: 6500, icon: "🏭" },
];

// ── Query History ──────────────────────────────────────────────────
export const mockQueryHistory = [
  {
    id: "qh_001",
    question: "Show the top 10 customers by total revenue",
    sql_query: "SELECT c.name, SUM(o.amount) as total FROM customers c JOIN orders o ON c.id = o.customer_id GROUP BY c.name ORDER BY total DESC LIMIT 10",
    sql_explanation: "Joins customers with orders, aggregates revenue per customer, and returns the top 10 sorted by total spend.",
    answer_text: "Here are your top 10 customers ranked by total revenue. Acme Corp leads with $2.4M in total purchases.",
    chart_type: "bar",
    created_at: "2026-08-07T12:45:00Z",
  },
  {
    id: "qh_002",
    question: "What were total sales last month?",
    sql_query: "SELECT SUM(amount) as total_sales FROM orders WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')",
    sql_explanation: "Filters orders within the previous calendar month and sums all amounts.",
    answer_text: "Total sales last month were $847,230 — a 12.4% increase over the previous month.",
    chart_type: "none",
    created_at: "2026-08-07T11:20:00Z",
  },
  {
    id: "qh_003",
    question: "List all products with inventory below 50",
    sql_query: "SELECT name, sku, stock_qty FROM products WHERE stock_qty < 50 ORDER BY stock_qty ASC",
    sql_explanation: "Retrieves products where current stock quantity is below the 50-unit threshold.",
    answer_text: "Found 23 products with inventory below 50 units. 5 are critically low (< 10 units).",
    chart_type: "none",
    created_at: "2026-08-06T16:30:00Z",
  },
  {
    id: "qh_004",
    question: "Show monthly revenue trend for this year",
    sql_query: "SELECT DATE_TRUNC('month', created_at) as month, SUM(amount) as revenue FROM orders WHERE EXTRACT(YEAR FROM created_at) = 2026 GROUP BY month ORDER BY month",
    sql_explanation: "Groups orders by month for the current year and sums revenue per month.",
    answer_text: "Revenue peaked in March at $1.1M and has shown consistent growth since May.",
    chart_type: "line",
    created_at: "2026-08-06T10:00:00Z",
  },
  {
    id: "qh_005",
    question: "How many new customers signed up this week?",
    sql_query: "SELECT COUNT(*) FROM customers WHERE created_at >= DATE_TRUNC('week', NOW())",
    sql_explanation: "Counts customers created since the start of the current week.",
    answer_text: "142 new customers signed up this week, compared to 118 last week (+20.3%).",
    chart_type: "none",
    created_at: "2026-08-05T14:15:00Z",
  },
  {
    id: "qh_006",
    question: "Average order value by product category",
    sql_query: "SELECT p.category, AVG(oi.price * oi.quantity) as avg_order_value FROM order_items oi JOIN products p ON oi.product_id = p.id GROUP BY p.category ORDER BY avg_order_value DESC",
    sql_explanation: "Calculates average order value per product category.",
    answer_text: "Electronics has the highest average order value at $342, followed by Software at $218.",
    chart_type: "bar",
    created_at: "2026-08-05T09:00:00Z",
  },
];

// ── Saved Charts ────────────────────────────────────────────────────
export const mockSavedCharts = [
  {
    id: "sc_001",
    title: "Monthly Revenue 2026",
    type: "line",
    query: "Show monthly revenue for this year",
    saved_at: "2026-08-07T11:00:00Z",
    data: [
      { name: "Jan", value: 820000 },
      { name: "Feb", value: 940000 },
      { name: "Mar", value: 1100000 },
      { name: "Apr", value: 980000 },
      { name: "May", value: 1050000 },
      { name: "Jun", value: 1120000 },
      { name: "Jul", value: 1180000 },
      { name: "Aug", value: 850000 },
    ],
  },
  {
    id: "sc_002",
    title: "Top Customers by Revenue",
    type: "bar",
    query: "Top 10 customers by total revenue",
    saved_at: "2026-08-06T15:30:00Z",
    data: [
      { name: "Acme Corp", value: 2400000 },
      { name: "TechStart", value: 1800000 },
      { name: "GlobalEx", value: 1600000 },
      { name: "BlueSky Inc", value: 1200000 },
      { name: "DataFlow", value: 980000 },
    ],
  },
  {
    id: "sc_003",
    title: "Sales by Category",
    type: "pie",
    query: "Sales breakdown by product category",
    saved_at: "2026-08-05T09:15:00Z",
    data: [
      { name: "Electronics", value: 38 },
      { name: "Software", value: 27 },
      { name: "Services", value: 20 },
      { name: "Hardware", value: 15 },
    ],
  },
  {
    id: "sc_004",
    title: "Weekly Active Users",
    type: "line",
    query: "Weekly active users last 3 months",
    saved_at: "2026-08-04T14:00:00Z",
    data: [
      { name: "W1", value: 1200 },
      { name: "W2", value: 1450 },
      { name: "W3", value: 1380 },
      { name: "W4", value: 1620 },
      { name: "W5", value: 1750 },
      { name: "W6", value: 1900 },
    ],
  },
  {
    id: "sc_005",
    title: "Order Volume by Region",
    type: "bar",
    query: "Order count by geographic region",
    saved_at: "2026-08-03T10:30:00Z",
    data: [
      { name: "North", value: 4200 },
      { name: "South", value: 3100 },
      { name: "East", value: 5800 },
      { name: "West", value: 4900 },
    ],
  },
  {
    id: "sc_006",
    title: "Customer Churn Rate",
    type: "line",
    query: "Monthly churn rate last 6 months",
    saved_at: "2026-08-01T08:00:00Z",
    data: [
      { name: "Mar", value: 4.2 },
      { name: "Apr", value: 3.8 },
      { name: "May", value: 3.5 },
      { name: "Jun", value: 3.1 },
      { name: "Jul", value: 2.9 },
      { name: "Aug", value: 2.6 },
    ],
  },
];

// ── Employees List (Admin) ──────────────────────────────────────────
export const mockEmployees = [
  {
    id: "emp_001",
    name: "James Carter",
    email: "james.carter@acmecorp.com",
    role: "employee",
    status: "active",
    queries: 248,
    joined_at: "2024-03-20T10:30:00Z",
    last_active: "2026-08-07T12:00:00Z",
  },
  {
    id: "emp_002",
    name: "Lisa Wang",
    email: "lisa.wang@acmecorp.com",
    role: "employee",
    status: "active",
    queries: 192,
    joined_at: "2024-05-10T09:00:00Z",
    last_active: "2026-08-07T11:30:00Z",
  },
  {
    id: "emp_003",
    name: "Marcus Johnson",
    email: "marcus.j@acmecorp.com",
    role: "employee",
    status: "active",
    queries: 317,
    joined_at: "2024-02-01T08:00:00Z",
    last_active: "2026-08-06T16:45:00Z",
  },
  {
    id: "emp_004",
    name: "Priya Sharma",
    email: "priya.s@acmecorp.com",
    role: "employee",
    status: "inactive",
    queries: 78,
    joined_at: "2024-07-15T11:00:00Z",
    last_active: "2026-07-20T09:00:00Z",
  },
  {
    id: "emp_005",
    name: "Tom Reynolds",
    email: "tom.r@acmecorp.com",
    role: "employee",
    status: "active",
    queries: 445,
    joined_at: "2023-11-05T10:00:00Z",
    last_active: "2026-08-07T13:00:00Z",
  },
  {
    id: "emp_006",
    name: "Aisha Patel",
    email: "aisha.p@acmecorp.com",
    role: "employee",
    status: "active",
    queries: 133,
    joined_at: "2025-01-20T09:30:00Z",
    last_active: "2026-08-05T14:00:00Z",
  },
];

// ── Activity Feed ──────────────────────────────────────────────────
export const mockActivityFeed = [
  { id: "act_001", type: "query", user: "James Carter", action: "ran a query", detail: "Top customers by revenue", time: "2 min ago", icon: "💬" },
  { id: "act_002", type: "chart", user: "Lisa Wang", action: "saved a chart", detail: "Monthly Revenue 2026", time: "15 min ago", icon: "📊" },
  { id: "act_003", type: "query", user: "Tom Reynolds", action: "ran a query", detail: "Inventory below threshold", time: "1 hour ago", icon: "💬" },
  { id: "act_004", type: "db", user: "Sarah Mitchell", action: "updated database config", detail: "sales_db", time: "3 hours ago", icon: "🗄️" },
  { id: "act_005", type: "employee", user: "Sarah Mitchell", action: "added employee", detail: "Aisha Patel", time: "2 days ago", icon: "👤" },
  { id: "act_006", type: "query", user: "Marcus Johnson", action: "ran a query", detail: "Q2 new user signups", time: "2 days ago", icon: "💬" },
];

// ── Popular Queries ─────────────────────────────────────────────────
export const mockPopularQueries = [
  { query: "Show top 10 customers by revenue", count: 48, trend: "up" },
  { query: "Monthly revenue breakdown", count: 41, trend: "up" },
  { query: "Products with low inventory", count: 35, trend: "stable" },
  { query: "New customer signups this week", count: 29, trend: "up" },
  { query: "Average order value by category", count: 22, trend: "down" },
];

// ── System Logs (Admin) ─────────────────────────────────────────────
export const mockSystemLogs = [
  { id: "log_001", level: "info", message: "Database connection test successful", timestamp: "2026-08-07T13:00:00Z" },
  { id: "log_002", level: "info", message: "Employee account created: aisha.p@acmecorp.com", timestamp: "2026-08-07T12:00:00Z" },
  { id: "log_003", level: "warning", message: "Query timeout: execution exceeded 5s", timestamp: "2026-08-07T11:30:00Z" },
  { id: "log_004", level: "info", message: "Database config updated by admin", timestamp: "2026-08-07T10:00:00Z" },
  { id: "log_005", level: "error", message: "Failed login attempt: unknown@test.com", timestamp: "2026-08-06T22:15:00Z" },
  { id: "log_006", level: "info", message: "Chat session started: usr_emp_005", timestamp: "2026-08-06T16:00:00Z" },
];

// ── Mock AI Response (for mock chat mode) ──────────────────────────
export function getMockAIResponse(question) {
  return {
    role: "bot",
    text: `Here's the analysis for: "${question}"`,
    answerText: `I found the relevant data for your query. Based on the current database records, here is the breakdown for "${question}". The results show strong patterns worth exploring further.`,
    sql: `SELECT *\nFROM orders\nWHERE created_at >= NOW() - INTERVAL '30 days'\nORDER BY amount DESC\nLIMIT 10;`,
    sqlExplanation: `This query retrieves the most recent records from the orders table, filtered to the last 30 days and sorted by value. The LIMIT clause ensures only the top 10 results are returned for performance.`,
    chart: { type: "bar", x_key: "name", y_key: "value" },
    columns: ["Customer", "Amount", "Date", "Status"],
    rows: [
      ["Acme Corp", "$24,500", "Aug 5, 2026", "Completed"],
      ["TechStart Ltd", "$18,200", "Aug 4, 2026", "Completed"],
      ["GlobalEx Inc", "$16,800", "Aug 3, 2026", "Pending"],
      ["BlueSky Solutions", "$12,100", "Aug 2, 2026", "Completed"],
      ["DataFlow Systems", "$9,800", "Aug 1, 2026", "Completed"],
    ],
  };
}

// ── Suggested prompts ──────────────────────────────────────────────
export const SUGGESTED_PROMPTS = [
  { icon: "📈", text: "Show monthly revenue trend for this year" },
  { icon: "👥", text: "Who are our top 10 customers by revenue?" },
  { icon: "📦", text: "List products with inventory below 50 units" },
  { icon: "🛒", text: "What were total sales last month?" },
  { icon: "📊", text: "Average order value by product category" },
  { icon: "🔄", text: "Show customer churn rate over 6 months" },
];
