/**
 * App.jsx — root application with full routing and context providers.
 *
 * Route map:
 *   /                         → redirect to /dashboard
 *   /login                    → LoginPage  (public)
 *   /signup                   → SignupPage (public — admin or employee-join)
 *   /dashboard                → DashboardPage (protected, role-aware)
 *   /chat                     → ChatPage   (protected)
 *   /history                  → HistoryPage (protected)
 *   /saved-charts             → SavedChartsPage (protected)
 *   /profile                  → ProfilePage (protected)
 *   /settings                 → SettingsPage (protected)
 *   /admin/dashboard          → AdminDashboardPage (admin only)
 *   /admin/database           → DatabasePage  (admin only)
 *   /admin/workspace          → WorkspacePage (admin only)
 *   /admin/employees          → EmployeesPage (admin only)
 *   /admin/analytics          → AnalyticsPage  (admin only) [NEW]
 *   /admin/kpi-dashboard      → KPIDashboardPage (admin only) [NEW]
 *   /admin/audit-log          → AuditLogPage (admin only) [NEW]
 *   /superadmin/login         → SuperAdminLogin (public, separate) [NEW]
 *   /superadmin/dashboard     → SuperAdminDashboard (superadmin only) [NEW]
 *   *                         → NotFoundPage
 */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider }  from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Toast             from "./components/Toast";
import ErrorBoundary     from "./components/ErrorBoundary";
import ProtectedRoute    from "./router/ProtectedRoute";
import AdminRoute        from "./router/AdminRoute";

import LoginPage            from "./pages/LoginPage";
import SignupPage           from "./pages/SignupPage";
import DashboardPage        from "./pages/DashboardPage";
import ChatPage             from "./pages/ChatPage";
import HistoryPage          from "./pages/HistoryPage";
import SavedChartsPage      from "./pages/SavedChartsPage";
import ProfilePage          from "./pages/ProfilePage";
import SettingsPage         from "./pages/SettingsPage";
import NotFoundPage         from "./pages/NotFoundPage";

// Admin pages
import DatabasePage         from "./pages/admin/DatabasePage";
import WorkspacePage        from "./pages/admin/WorkspacePage";
import EmployeesPage        from "./pages/admin/EmployeesPage";
import AdminDashboardPage   from "./pages/admin/AdminDashboardPage";
import AnalyticsPage        from "./pages/admin/AnalyticsPage";
import KPIDashboardPage     from "./pages/admin/KPIDashboardPage";
import AuditLogPage         from "./pages/admin/AuditLogPage";

// SuperAdmin pages (completely separate, no Layout)
import SuperAdminLogin      from "./pages/superadmin/SuperAdminLogin";
import SuperAdminDashboard  from "./pages/superadmin/SuperAdminDashboard";

const P = (C) => <ProtectedRoute><C /></ProtectedRoute>;
const A = (C) => <ProtectedRoute><AdminRoute><C /></AdminRoute></ProtectedRoute>;

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* ── Public ──────────────────────────────── */}
              <Route path="/login"  element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              {/* ── Protected (any authenticated user) ───── */}
              <Route path="/dashboard"   element={P(DashboardPage)} />
              <Route path="/chat"        element={P(ChatPage)} />
              <Route path="/history"     element={P(HistoryPage)} />
              <Route path="/saved-charts" element={P(SavedChartsPage)} />
              <Route path="/profile"     element={P(ProfilePage)} />
              <Route path="/settings"    element={P(SettingsPage)} />

              {/* ── Admin only ──────────────────────────── */}
              <Route path="/admin/dashboard"    element={A(AdminDashboardPage)} />
              <Route path="/admin/database"     element={A(DatabasePage)} />
              <Route path="/admin/workspace"    element={A(WorkspacePage)} />
              <Route path="/admin/employees"    element={A(EmployeesPage)} />
              <Route path="/admin/analytics"    element={A(AnalyticsPage)} />
              <Route path="/admin/kpi-dashboard" element={A(KPIDashboardPage)} />
              <Route path="/admin/audit-log"    element={A(AuditLogPage)} />

              {/* ── SuperAdmin (completely separate, no auth context needed) ── */}
              <Route path="/superadmin/login"     element={<SuperAdminLogin />} />
              <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />

              {/* ── Default redirect ────────────────────── */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* ── 404 ─────────────────────────────────── */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
          <Toast />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}