/**
 * Centralized API service layer for SQLense v2.
 * All new endpoints (join code, approval, analytics, KPI, superadmin) added here.
 */
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: attach JWT ────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("sqlense_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 ───────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      // Don't redirect if already on auth pages or superadmin login
      if (!path.startsWith("/login") && !path.startsWith("/signup") &&
          !path.startsWith("/join") && !path.startsWith("/superadmin")) {
        localStorage.removeItem("sqlense_token");
        localStorage.removeItem("sqlense_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ───────────────────────────────────────────────────
export const authAPI = {
  login:          (data) => api.post("/auth/login", data),
  signup:         (data) => api.post("/auth/signup", data),
  // NEW: Employee self-registration via join code
  joinWithCode:   (data) => api.post("/auth/join", data),
  createEmployee: (data) => api.post("/auth/admin/create-employee", data),
  // NEW: Admin approval workflow
  getPending:     ()     => api.get("/auth/admin/pending"),
  approveEmployee:(id)   => api.post(`/auth/admin/approve/${id}`),
  rejectEmployee: (id)   => api.post(`/auth/admin/reject/${id}`),
  // NEW: Admin join code retrieval
  getJoinCode:    ()     => api.get("/auth/admin/join-code"),
  // Profile (GET/PUT /auth/me)
  me:             ()     => api.get("/auth/me"),
  updateMe:       (data) => api.put("/auth/me", data),
};

// ── Saved Charts ───────────────────────────────────────────
export const savedChartsAPI = {
  list:   ()     => api.get("/api/saved-charts"),
  save:   (data) => api.post("/api/saved-charts", data),
  delete: (id)   => api.delete(`/api/saved-charts/${id}`),
};


// ── Database Configuration ─────────────────────────────────
export const dbAPI = {
  connect:    (data) => api.post("/api/database/connect", data),
  test:       (data) => api.post("/api/database/test", data),
  update:     (data) => api.put("/api/database/update", data),
  getStatus:  ()     => api.get("/api/database/status"),
  getConfig:  ()     => api.get("/api/database/config"),
  disconnect: ()     => api.delete("/api/database/disconnect"),
};

// ── Chat ───────────────────────────────────────────────────
export const chatAPI = {
  ask: (question) => api.post("/chat", { question }),
};

// ── History ────────────────────────────────────────────────
export const historyAPI = {
  list: (limit = 50, offset = 0) =>
    api.get("/history", { params: { limit, offset } }),
};

// ── Admin Workspace ────────────────────────────────────────
export const workspaceAPI = {
  execute:  (sql) => api.post("/admin/workspace/execute", { sql, action: "execute" }),
  commit:   ()    => api.post("/admin/workspace/execute", { sql: "", action: "commit" }),
  rollback: ()    => api.post("/admin/workspace/execute", { sql: "", action: "rollback" }),
};

// ── Admin Analytics ────────────────────────────────────────
export const analyticsAPI = {
  employees: ()         => api.get("/admin/analytics/employees"),
  daily:     (days=30)  => api.get("/admin/analytics/daily", { params: { days } }),
  auditLog:  (limit=50, offset=0) =>
    api.get("/admin/audit-log", { params: { limit, offset } }),
};

// ── KPI Tiles ──────────────────────────────────────────────
export const kpiAPI = {
  list:    ()           => api.get("/admin/kpi-tiles"),
  create:  (data)       => api.post("/admin/kpi-tiles", data),
  update:  (id, data)   => api.put(`/admin/kpi-tiles/${id}`, data),
  delete:  (id)         => api.delete(`/admin/kpi-tiles/${id}`),
  run:     ()           => api.post("/admin/kpi-tiles/run"),
  chat:    (question, dashboard_data) =>
    api.post("/admin/kpi-chat", { question, dashboard_data }),
};

// ── SuperAdmin ─────────────────────────────────────────────
// Uses a separate token stored under a different key
const superadminApi = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});
superadminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("sqlense_superadmin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const superadminAPI = {
  login:    (data) => superadminApi.post("/api/superadmin/login", data),
  orgs:     ()     => superadminApi.get("/api/superadmin/orgs"),
  stats:    ()     => superadminApi.get("/api/superadmin/stats"),
  reports:  ()     => superadminApi.get("/api/superadmin/reports"),
  chat:     (question) => superadminApi.post("/api/superadmin/chat", { question }),
  me:       ()     => superadminApi.get("/api/superadmin/me"),
  updateMe: (data) => superadminApi.put("/api/superadmin/me", data),
};


// ── Error helper ───────────────────────────────────────────
export function getErrorMessage(error) {
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((d) => d.msg).join(", ");
  }
  if (error.message) return error.message;
  return "An unexpected error occurred.";
}

export default api;
