/**
 * AdminDashboardPage — real API-powered organisation overview.
 * Shows live stats, pending approval alert, quick-action shortcuts,
 * daily query chart, and recent audit log entries.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Database, TrendingUp, Star, FileText, Clock,
  ArrowRight, RefreshCw, Activity, MessageSquare, CheckCircle2,
  AlertTriangle, Wifi, WifiOff,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";
import Layout       from "../../components/Layout";
import Spinner      from "../../components/Spinner";
import {
  analyticsAPI, authAPI, dbAPI, getErrorMessage,
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";

/* ── Stat Card ───────────────────────────────────────────────── */
function Stat({ icon, value, label, color, onClick }) {
  return (
    <div
      className="stat-card"
      onClick={onClick}
      style={{
        borderLeft: `4px solid ${color}`,
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)"; }}}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      <div className="stat-icon" style={{ color }}>{icon}</div>
      <div className="stat-value">{value ?? <Spinner />}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/* ── Quick-Action Card ───────────────────────────────────────── */
function QuickAction({ icon, title, desc, to, color, badge }) {
  const navigate = useNavigate();
  return (
    <div
      className="card"
      onClick={() => navigate(to)}
      id={`qa-${to.replace(/\//g, "-")}`}
      style={{
        cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
        padding: "16px 18px", transition: "all 0.15s", position: "relative",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = color; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = ""; }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 10,
        background: `${color}18`, display: "flex", alignItems: "center",
        justifyContent: "center", color, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{desc}</div>
      </div>
      {badge > 0 && (
        <div style={{
          background: "#ef4444", color: "#fff",
          fontSize: 11, fontWeight: 800, borderRadius: 50,
          padding: "2px 8px", flexShrink: 0,
        }}>{badge}</div>
      )}
      <ArrowRight size={16} color="var(--text-muted)" />
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function AdminDashboardPage() {
  const { user }   = useAuth();
  const [empStats,  setEmpStats]  = useState(null);
  const [daily,     setDaily]     = useState([]);
  const [dbStatus,  setDbStatus]  = useState(null);
  const [pending,   setPending]   = useState(0);
  const [auditLog,  setAuditLog]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [empRes, dailyRes, dbRes, pendRes, auditRes] = await Promise.allSettled([
        analyticsAPI.employees(),
        analyticsAPI.daily(30),
        dbAPI.getStatus(),
        authAPI.getPending(),
        analyticsAPI.auditLog(5, 0),
      ]);

      if (empRes.status === "fulfilled")   setEmpStats(empRes.value.data);
      if (dailyRes.status === "fulfilled") setDaily(dailyRes.value.data);
      if (dbRes.status === "fulfilled")    setDbStatus(dbRes.value.data);
      if (pendRes.status === "fulfilled")  setPending(pendRes.value.data.length);
      if (auditRes.status === "fulfilled") setAuditLog(auditRes.value.data.entries || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalQueries   = empStats ? empStats.reduce((s, e) => s + e.total_queries, 0) : null;
  const activeEmpCount = empStats ? empStats.filter(e => e.status === "active").length : null;
  const isConnected    = dbStatus?.connection_status === "connected";

  const timeAgo = (iso) => {
    const d = Date.now() - new Date(iso).getTime();
    const m = Math.floor(d / 60000);
    const h = Math.floor(d / 3600000);
    if (m < 60)  return `${m}m ago`;
    if (h < 24)  return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const ACTION_LABEL = {
    USER_LOGIN: "Login", CHAT_QUERY: "AI Query",
    EMPLOYEE_APPROVED: "Approved", EMPLOYEE_JOINED: "Join Request",
    DB_CONNECTED: "DB Connected", KPI_TILE_CREATED: "KPI Created",
    WORKSPACE_EXECUTE: "SQL Run",
  };

  return (
    <Layout>
      <div className="page">
        {/* Header */}
        <div className="page-header">
          <div>
            <h2 className="page-title">Admin Dashboard</h2>
            <p className="page-subtitle">
              Welcome back, <strong>{user?.name || "Admin"}</strong> —
              here's your organisation overview.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={load} id="dashboard-refresh-btn">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {/* Pending approval alert */}
        {pending > 0 && (
          <div
            className="alert"
            style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "rgba(234,179,8,0.10)", border: "1px solid rgba(234,179,8,0.3)",
              borderRadius: 10, padding: "12px 16px", marginBottom: 20, cursor: "pointer",
            }}
            onClick={() => window.location.href = "/admin/employees"}
          >
            <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: "#92400e" }}>
              <strong>{pending} employee{pending > 1 ? "s" : ""}</strong> waiting for your approval.
            </span>
            <span style={{ marginLeft: "auto", fontSize: 13, color: "#d97706", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              Review now <ArrowRight size={14} />
            </span>
          </div>
        )}

        <div className="page-body">
          {loading ? (
            <div style={{ padding: 48, textAlign: "center" }}><Spinner /></div>
          ) : (
            <>
              {/* ── Stat Cards ── */}
              <div className="dashboard-stats-grid" style={{ marginBottom: 24 }}>
                <Stat
                  icon={<Users size={20} />}
                  value={activeEmpCount}
                  label="Active Employees"
                  color="#6366f1"
                />
                <Stat
                  icon={<MessageSquare size={20} />}
                  value={totalQueries?.toLocaleString()}
                  label="Total AI Queries"
                  color="#22c55e"
                />
                <Stat
                  icon={isConnected ? <Wifi size={20} /> : <WifiOff size={20} />}
                  value={isConnected ? "Connected" : "Disconnected"}
                  label="Database Status"
                  color={isConnected ? "#10b981" : "#ef4444"}
                  onClick={() => window.location.href = "/admin/database"}
                />
                <Stat
                  icon={<Clock size={20} />}
                  value={pending}
                  label="Pending Approvals"
                  color={pending > 0 ? "#f59e0b" : "#94a3b8"}
                  onClick={() => window.location.href = "/admin/employees"}
                />
              </div>

              {/* ── Grid: Chart + Quick Actions ── */}
              <div className="dashboard-grid-2" style={{ marginBottom: 24 }}>
                {/* Daily query trend */}
                <div className="card">
                  <h3 className="card-title" style={{ marginBottom: 4 }}>
                    <Activity size={15} style={{ display: "inline", marginRight: 6 }} />
                    Query Trend — Last 30 Days
                  </h3>
                  <p className="card-subtitle">Daily AI query activity across all employees.</p>
                  {daily.length === 0 ? (
                    <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                      No query data yet — employees haven't run any queries.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={daily}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip labelFormatter={l => `Date: ${l}`} />
                        <Line type="monotone" dataKey="count" name="Queries"
                          stroke="#6366f1" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Quick Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 0.5 }}>
                    QUICK ACTIONS
                  </h3>
                  <QuickAction
                    icon={<Users size={18} />}
                    title="Manage Employees"
                    desc={pending > 0 ? `${pending} pending approval` : "View, add, approve employees"}
                    to="/admin/employees"
                    color="#6366f1"
                    badge={pending}
                  />
                  <QuickAction
                    icon={<Star size={18} />}
                    title="KPI Dashboard"
                    desc="View & manage your key performance indicators"
                    to="/admin/kpi-dashboard"
                    color="#f59e0b"
                  />
                  <QuickAction
                    icon={<TrendingUp size={18} />}
                    title="Employee Analytics"
                    desc="Who's using the platform and how often"
                    to="/admin/analytics"
                    color="#22c55e"
                  />
                  <QuickAction
                    icon={<FileText size={18} />}
                    title="Audit Log"
                    desc="Full history of all platform actions"
                    to="/admin/audit-log"
                    color="#8b5cf6"
                  />
                  {!isConnected && (
                    <QuickAction
                      icon={<Database size={18} />}
                      title="Connect Database"
                      desc="No database connected — set it up to enable AI chat"
                      to="/admin/database"
                      color="#ef4444"
                    />
                  )}
                </div>
              </div>

              {/* ── Recent Activity (from real audit log) ── */}
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 className="card-title" style={{ margin: 0 }}>Recent Activity</h3>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => window.location.href = "/admin/audit-log"}
                    id="view-full-audit-btn"
                  >
                    View All <ArrowRight size={13} />
                  </button>
                </div>
                {auditLog.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 16 }}>
                    No activity yet — actions will appear here as your team uses the platform.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {auditLog.map((entry, i) => (
                      <div key={entry.id} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        paddingBottom: i < auditLog.length - 1 ? 12 : 0,
                        borderBottom: i < auditLog.length - 1 ? "1px solid var(--border, rgba(255,255,255,0.06))" : "none",
                      }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: entry.action.includes("LOGIN") ? "#22c55e"
                            : entry.action.includes("QUERY") ? "#6366f1"
                            : entry.action.includes("APPROVE") ? "#10b981"
                            : "#f59e0b",
                          flexShrink: 0,
                        }} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>
                            {ACTION_LABEL[entry.action] || entry.action}
                          </span>
                          {entry.detail && (
                            <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>
                              — {entry.detail.slice(0, 60)}{entry.detail.length > 60 ? "…" : ""}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
                          {timeAgo(entry.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
