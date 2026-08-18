/**
 * DashboardPage — role-aware dashboard.
 * Shows employee metrics or admin org overview based on user role.
 * Uses mock data only — no API calls.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, BarChart2, Database, Activity, Users,
  Zap, TrendingUp, ArrowRight, Clock,
} from "lucide-react";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import ActivityFeed from "../components/ActivityFeed";
import { useAuth } from "../context/AuthContext";
import {
  mockDashboardStats,
  mockAdminStats,
  mockActivityFeed,
  mockPopularQueries,
  SUGGESTED_PROMPTS,
} from "../data/mockData";

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const stats = isAdmin ? mockAdminStats : mockDashboardStats;
  const [activeTab, setActiveTab] = useState("overview");

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <Layout>
      <div className="page">
        {/* ── Page Header ── */}
        <div className="page-header">
          <div>
            <h2 className="page-title">
              Good morning, {firstName} 👋
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
          <div className="dashboard-stats-grid">
            <StatCard
              icon={<MessageSquare size={20} />}
              label="Total Queries"
              value={stats.totalQueries.toLocaleString()}
              change={stats.queriesChange}
              changeLabel={`${stats.queriesThisWeek} this week`}
              accent="primary"
            />
            <StatCard
              icon={<BarChart2 size={20} />}
              label="Saved Charts"
              value={stats.savedCharts}
              change={stats.savedChartsChange}
              changeLabel="vs. last month"
              accent="info"
            />
            <StatCard
              icon={<Database size={20} />}
              label="Connected Database"
              value={stats.connectedDatabase}
              accent="success"
            />
            <StatCard
              icon={<Activity size={20} />}
              label="Success Rate"
              value={`${stats.successRate}%`}
              changeLabel={`Avg ${stats.avgResponseTime} response`}
              accent="warning"
            />
            {isAdmin && (
              <>
                <StatCard
                  icon={<Users size={20} />}
                  label="Active Employees"
                  value={`${stats.activeEmployees} / ${stats.totalEmployees}`}
                  change={stats.employeesChange}
                  changeLabel="added this month"
                  accent="primary"
                />
                <StatCard
                  icon={<Zap size={20} />}
                  label="Org Queries This Week"
                  value={stats.orgQueriesThisWeek.toLocaleString()}
                  changeLabel={`${stats.orgQueriesTotal.toLocaleString()} total`}
                  accent="info"
                />
              </>
            )}
          </div>

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
                <div className="db-info-grid">
                  <div className="db-info-row">
                    <span className="db-info-label">Database</span>
                    <span className="db-info-value">{stats.connectedDatabase}</span>
                  </div>
                  <div className="db-info-row">
                    <span className="db-info-label">Status</span>
                    <span className="badge badge-success">
                      <span className="status-dot connected" />
                      Connected
                    </span>
                  </div>
                  <div className="db-info-row">
                    <span className="db-info-label">Avg Response</span>
                    <span className="db-info-value">{stats.avgResponseTime}</span>
                  </div>
                  <div className="db-info-row">
                    <span className="db-info-label">Last Query</span>
                    <span className="db-info-value" style={{ fontSize: 12 }}>
                      <Clock size={11} style={{ display: "inline", marginRight: 3 }} />
                      {formatDate(stats.lastQueryAt)}
                    </span>
                  </div>
                </div>
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
              <ActivityFeed items={mockActivityFeed} />
            </div>
          )}

          {activeTab === "popular" && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 16 }}>
                <TrendingUp size={16} style={{ display: "inline", marginRight: 6, color: "var(--primary)" }} />
                Popular Queries
              </h3>
              <p className="card-subtitle">Most frequently asked questions in your organisation.</p>
              <div className="popular-queries-list">
                {mockPopularQueries.map((q, i) => (
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
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
