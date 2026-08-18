/**
 * AnalyticsPage (Admin only) — Employee activity analytics + daily query volume.
 * Uses live data from the backend analytics API.
 */
import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Users, MessageSquare, RefreshCw } from "lucide-react";
import Layout    from "../../components/Layout";
import Spinner   from "../../components/Spinner";
import { analyticsAPI, getErrorMessage } from "../../services/api";

export default function AnalyticsPage() {
  const [employees, setEmployees] = useState([]);
  const [daily,     setDaily]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [days,      setDays]      = useState(30);

  async function load() {
    setLoading(true); setError("");
    try {
      const [empRes, dayRes] = await Promise.all([
        analyticsAPI.employees(),
        analyticsAPI.daily(days),
      ]);
      setEmployees(empRes.data);
      setDaily(dayRes.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [days]);

  const totalQueries = employees.reduce((s, e) => s + e.total_queries, 0);
  const activeEmp    = employees.filter(e => e.status === "active").length;

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h2 className="page-title">Employee Analytics</h2>
            <p className="page-subtitle">
              Track query activity, engagement, and platform usage across your team.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={load} id="refresh-analytics-btn">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div style={{ padding: 48, textAlign: "center" }}><Spinner /></div>
        ) : (
          <div className="page-body">
            {/* Stat cards */}
            <div className="stats-grid" style={{ marginBottom: 28 }}>
              <div className="stat-card">
                <div className="stat-icon"><Users size={20} /></div>
                <div className="stat-value">{activeEmp}</div>
                <div className="stat-label">Active Employees</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><MessageSquare size={20} /></div>
                <div className="stat-value">{totalQueries}</div>
                <div className="stat-label">Total AI Queries</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><TrendingUp size={20} /></div>
                <div className="stat-value">{daily.reduce((s, d) => s + d.count, 0)}</div>
                <div className="stat-label">Queries Last {days} Days</div>
              </div>
            </div>

            {/* Daily chart */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 className="card-title" style={{ margin: 0 }}>Daily Query Volume</h3>
                <select
                  className="form-input"
                  style={{ width: "auto", fontSize: 13, padding: "4px 10px" }}
                  value={days}
                  onChange={e => setDays(Number(e.target.value))}
                  id="days-filter"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={60}>Last 60 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </div>
              {daily.length === 0 ? (
                <div className="empty-state" style={{ padding: 32 }}>
                  <p>No query data for this period yet.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip labelFormatter={l => `Date: ${l}`} />
                    <Line type="monotone" dataKey="count" name="Queries" stroke="#6366f1" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Employee breakdown */}
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 className="card-title">Employee Activity Breakdown</h3>
              {employees.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>
                  <p>No employees found.</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={employees.slice(0,10)} layout="vertical" margin={{ left: 60, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="total_queries" name="Queries" fill="#6366f1" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="admin-table-wrapper" style={{ marginTop: 24 }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Status</th>
                          <th>Total Queries</th>
                          <th>Last Query</th>
                          <th>Recent Questions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map(emp => (
                          <tr key={emp.user_id}>
                            <td>
                              <div className="emp-name-cell">
                                <div className="emp-avatar-sm">
                                  {emp.name.split(" ").map(n => n[0]).join("").slice(0,2)}
                                </div>
                                <div>
                                  <div>{emp.name}</div>
                                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{emp.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${emp.status === "active" ? "badge-success" : "badge-warning"}`}>
                                {emp.status}
                              </span>
                            </td>
                            <td><strong>{emp.total_queries}</strong></td>
                            <td className="text-muted" style={{ fontSize: 12 }}>
                              {emp.last_query_at
                                ? new Date(emp.last_query_at).toLocaleDateString()
                                : "Never"}
                            </td>
                            <td style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 200 }}>
                              {emp.recent_questions.join(" · ").slice(0, 80) || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
