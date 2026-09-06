/**
 * DashboardPage — role-aware dashboard.
 * Shows employee metrics or admin org overview based on user role.
 * Fetches real data from API — no mock data used.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, BarChart2, Database, Activity, Users,
  Zap, TrendingUp, ArrowRight, Clock,
} from "lucide-react";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import ActivityFeed from "../components/ActivityFeed";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import { dashboardAPI, analyticsAPI, historyAPI, getErrorMessage } from "../services/api";
import { SUGGESTED_PROMPTS } from "../data/mockData";

function formatDate(iso) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

// Map audit action to icon
function actionIcon(action) {
  if (action?.includes("QUERY") || action?.includes("CHAT")) return "💬";
  if (action?.includes("CHART")) return "📊";
  if (action?.includes("DB") || action?.includes("DATABASE")) return "🗄️";
  if (action?.includes("EMPLOYEE") || action?.includes("USER")) return "👤";
  if (action?.includes("LOGIN")) return "🔐";
  return "⚡";
}

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // Real data state
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activityItems, setActivityItems] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [popularQueries, setPopularQueries] = useState([]);
  const [popularLoading, setPopularLoading] = useState(false);

  const firstName = user?.name?.split(" ")[0] || "there";

  // Greet based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // ── Fetch dashboard stats ──
  useEffect(() => {
    setStatsLoading(true);
    dashboardAPI.stats()
      .then(({ data }) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, []);

  // ── Fetch activity feed when tab selected ──
  useEffect(() => {
    if (activeTab !== "activity") return;
    setActivityLoading(true);
    if (isAdmin) {
      analyticsAPI.auditLog(15, 0)
        .then(({ data }) => {
          const entries = (data.entries || []).map((e) => ({
            id: e.id,
            type: e.action?.toLowerCase().includes("query") ? "query" : "other",
            user: e.user_name || "Unknown",
            action: e.action?.toLowerCase().replace(/_/g, " ") || "performed action",
            detail: e.detail || "",
            time: timeAgo(e.created_at),
            icon: actionIcon(e.action),
          }));
          setActivityItems(entries);
        })
        .catch(() => setActivityItems([]))
        .finally(() => setActivityLoading(false));
    } else {
      // Employees see their own recent history as activity
      historyAPI.list(10, 0)
        .then(({ data }) => {
          const entries = data.map((h) => ({
            id: h.id,
            type: "query",
            user: user?.name || "You",
            action: "asked",
            detail: h.question,
            time: timeAgo(h.created_at),
            icon: "💬",
          }));
          setActivityItems(entries);
        })
        .catch(() => setActivityItems([]))
        .finally(() => setActivityLoading(false));
    }
  }, [activeTab, isAdmin]);

  // ── Fetch popular queries when tab selected ──
  useEffect(() => {
    if (activeTab !== "popular") return;
    setPopularLoading(true);
    historyAPI.list(100, 0)
      .then(({ data }) => {
        // Count frequency of question stems (first 60 chars)
        const counts = {};
        data.forEach((h) => {
          const key = h.question.slice(0, 70);
          counts[key] = (counts[key] || 0) + 1;
        });
        const sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([query, count]) => ({ query, count, trend: count > 3 ? "up" : "stable" }));
        setPopularQueries(sorted);
      })
      .catch(() => setPopularQueries([]))
      .finally(() => setPopularLoading(false));
  }, [activeTab]);

  return (
    <Layout>
      <div className="page">
        {/* ── Page Header ── */}
        <div className="page-header">
          <div>
            <h2 className="page-title">
              {greeting}, {firstName} 👋
            </h2>
            <p className="page-subtitle">
              {isAdmin
                ? `Managing ${user?.organization_name || "your organisation"} — here's your overview.`
                : "Here's a summary of your query activity."}
            </p>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate("/chat")}
            id="dashboard-new-chat-btn"
          >
            <MessageSquare size={14} /> New Chat
          </button>
        </div>

        <div className="page-body">
          {/* ── Stat Cards Grid ── */}
          {statsLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="dashboard-stats-grid">
              <StatCard
                icon={<MessageSquare size={20} />}
                label="Total Queries"
                value={(stats?.total_queries ?? 0).toLocaleString()}
                change={stats?.queries_change ?? 0}
                changeLabel={`${stats?.queries_this_week ?? 0} this week`}
                accent="primary"
              />
              <StatCard
                icon={<BarChart2 size={20} />}
                label="Saved Charts"
                value={stats?.saved_charts ?? 0}
                change={stats?.saved_charts_change ?? 0}
                changeLabel="vs. last month"
                accent="info"
              />
              <StatCard
                icon={<Database size={20} />}
                label="Connected Database"
                value={stats?.connected_database ?? "Not configured"}
                accent="success"
              />
              <StatCard
                icon={<Activity size={20} />}
                label="Success Rate"
                value={`${stats?.success_rate ?? 0}%`}
                changeLabel={`Avg ${stats?.avg_response_time ?? "—"} response`}
                accent="warning"
              />
              {isAdmin && (
                <>
                  <StatCard
                    icon={<Users size={20} />}
                    label="Active Employees"
                    value={`${stats?.active_employees ?? 0} / ${stats?.total_employees ?? 0}`}
                    change={stats?.employees_change ?? 0}
                    changeLabel="added this month"
                    accent="primary"
                  />
                  <StatCard
                    icon={<Zap size={20} />}
                    label="Org Queries This Week"
                    value={(stats?.org_queries_this_week ?? 0).toLocaleString()}
                    changeLabel={`${(stats?.org_queries_total ?? 0).toLocaleString()} total`}
                    accent="info"
                  />
                </>
              )}
            </div>
          )}

          {/* ── Tabs ── */}
          <div className="tabs" role="tablist" aria-label="Dashboard sections">
            {["overview", "activity", "popular"].map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                className={`tab-btn ${activeTab === tab ? "tab-active" : ""}`}
                onClick={() => setActiveTab(tab)}
                id={`tab-${tab}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* ── Tab Content ── */}
          {activeTab === "overview" && (
            <div className="dashboard-grid-2">
              {/* Quick Start */}
              <div className="card">
                <h3 className="card-title">
                  <Zap size={16} style={{ display: "inline", marginRight: 6, color: "var(--primary)" }} />
                  Quick Start
                </h3>
                <p className="card-subtitle">Try one of these example queries in the chat.</p>
                <div className="quick-prompts">
                  {SUGGESTED_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      className="quick-prompt-item"
                      onClick={() => navigate("/chat")}
                      id={`quick-prompt-${i}`}
                    >
                      <span className="quick-prompt-icon">{p.icon}</span>
                      <span className="quick-prompt-text">{p.text}</span>
                      <ArrowRight size={14} className="quick-prompt-arrow" />
                    </button>
                  ))}
                </div>
              </div>

              {/* DB Info */}
              <div className="card">
                <h3 className="card-title">
                  <Database size={16} style={{ display: "inline", marginRight: 6, color: "var(--primary)" }} />
                  Database Info
                </h3>
                <p className="card-subtitle">Your connected data source.</p>
                {statsLoading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
                    <Spinner />
                  </div>
                ) : (
                  <div className="db-info-grid">
                    <div className="db-info-row">
                      <span className="db-info-label">Database</span>
                      <span className="db-info-value">{stats?.connected_database ?? "—"}</span>
                    </div>
                    <div className="db-info-row">
                      <span className="db-info-label">Status</span>
                      <span className={`badge ${stats?.db_status === "connected" ? "badge-success" : "badge-error"}`}>
                        <span className={`status-dot ${stats?.db_status === "connected" ? "connected" : ""}`} />
                        {stats?.db_status === "connected" ? "Connected" : "Disconnected"}
                      </span>
                    </div>
                    <div className="db-info-row">
                      <span className="db-info-label">Avg Response</span>
                      <span className="db-info-value">{stats?.avg_response_time ?? "—"}</span>
                    </div>
                    <div className="db-info-row">
                      <span className="db-info-label">Last Query</span>
                      <span className="db-info-value" style={{ fontSize: 12 }}>
                        <Clock size={11} style={{ display: "inline", marginRight: 3 }} />
                        {formatDate(stats?.last_query_at)}
                      </span>
                    </div>
                  </div>
                )}
                {isAdmin && (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 16, width: "100%" }}
                    onClick={() => navigate("/admin/database")}
                    id="dashboard-manage-db-btn"
                  >
                    Manage Database
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 16 }}>
                <Activity size={16} style={{ display: "inline", marginRight: 6, color: "var(--primary)" }} />
                Recent Activity
              </h3>
              {activityLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                  <Spinner size="lg" />
                </div>
              ) : activityItems.length === 0 ? (
                <div className="empty-state" style={{ padding: "40px 0" }}>
                  <p>No activity yet. Start querying your database!</p>
                </div>
              ) : (
                <ActivityFeed items={activityItems} />
              )}
            </div>
          )}

          {activeTab === "popular" && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 16 }}>
                <TrendingUp size={16} style={{ display: "inline", marginRight: 6, color: "var(--primary)" }} />
                Popular Queries
              </h3>
              <p className="card-subtitle">Most frequently asked questions in your organisation.</p>
              {popularLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                  <Spinner size="lg" />
                </div>
              ) : popularQueries.length === 0 ? (
                <div className="empty-state" style={{ padding: "40px 0" }}>
                  <p>No queries yet. Ask your first question in the chat!</p>
                </div>
              ) : (
                <div className="popular-queries-list">
                  {popularQueries.map((q, i) => (
                    <div key={i} className="popular-query-item">
                      <div className="popular-query-rank">{i + 1}</div>
                      <div className="popular-query-text">{q.query}</div>
                      <div className="popular-query-count">
                        <MessageSquare size={12} />
                        {q.count}
                      </div>
                      <div className={`popular-query-trend trend-${q.trend}`}>
                        {q.trend === "up" ? "↑" : q.trend === "down" ? "↓" : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
