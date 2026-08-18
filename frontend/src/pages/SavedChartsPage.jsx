/**
 * SavedChartsPage — displays charts saved from the AI chat, loaded from the backend.
 */
import { useState, useEffect, useCallback } from "react";
import { BarChart2, Trash2, Eye, RefreshCw, BookmarkX } from "lucide-react";
import Layout    from "../components/Layout";
import Modal     from "../components/Modal";
import Spinner   from "../components/Spinner";
import { savedChartsAPI, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  Tooltip, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

const FILTER_OPTIONS = ["all", "bar", "line", "pie"];

function ChartPreview({ chart_type, chart_data }) {
  if (!chart_data || !Array.isArray(chart_data) || chart_data.length === 0) {
    return <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No chart data available.</p>;
  }

  const firstKey = Object.keys(chart_data[0] || {}).filter((k) => k !== "name" && k !== "label")[0];

  if (chart_type === "pie") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={chart_data} dataKey={firstKey || "value"} nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
            {chart_data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip /><Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  if (chart_type === "line") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chart_data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey={firstKey || "value"} stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  // default bar
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chart_data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey={firstKey || "value"} fill="#6366f1" radius={[4,4,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function SavedChartsPage() {
  const { toast } = useToast();
  const [charts,    setCharts]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState("all");
  const [search,    setSearch]    = useState("");
  const [viewChart, setViewChart] = useState(null);
  const [deleteId,  setDeleteId]  = useState(null);
  const [deleting,  setDeleting]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await savedChartsAPI.list();
      setCharts(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await savedChartsAPI.delete(deleteId);
      setCharts((prev) => prev.filter((c) => c.id !== deleteId));
      setDeleteId(null);
      toast.success("Chart deleted.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const filtered = charts.filter((c) => {
    const matchType   = filter === "all" || c.chart_type === filter;
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
                        c.question.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h2 className="page-title">Saved Charts</h2>
            <p className="page-subtitle">
              {loading ? "Loading…" : `${charts.length} chart${charts.length !== 1 ? "s" : ""} saved`}
            </p>
          </div>
          <button className="btn btn-secondary" onClick={load} disabled={loading} id="refresh-charts-btn">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="page-body">
          {/* Controls */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
            <input
              className="form-input"
              placeholder="Search charts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 280 }}
              id="charts-search"
            />
            <div className="filter-tabs" role="group" aria-label="Filter by chart type">
              {FILTER_OPTIONS.map((f) => (
                <button
                  key={f}
                  className={`filter-tab ${filter === f ? "filter-tab-active" : ""}`}
                  onClick={() => setFilter(f)}
                  id={`filter-${f}`}
                >
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
              <Spinner /> Loading saved charts…
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon"><BookmarkX size={48} /></div>
              <h3>{search || filter !== "all" ? "No charts match your filter." : "No saved charts yet."}</h3>
              <p>
                {search || filter !== "all"
                  ? "Try adjusting your search or filter."
                  : "In the AI Chat, click the 📌 Save Chart button after a chart is generated."}
              </p>
            </div>
          )}

          {/* Grid */}
          {!loading && filtered.length > 0 && (
            <div className="chart-cards-grid">
              {filtered.map((chart) => (
                <div key={chart.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Chart type badge */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: "3px 8px", borderRadius: 4,
                        background: "rgba(99,102,241,0.12)", color: "var(--primary)", textTransform: "uppercase",
                      }}>
                        {chart.chart_type || "table"}
                      </span>
                      <h4 style={{ margin: "8px 0 4px", fontSize: 14, fontWeight: 700, color: "var(--text-heading)" }}>
                        {chart.title}
                      </h4>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
                        {new Date(chart.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "5px 10px", fontSize: 12 }}
                        onClick={() => setViewChart(chart)}
                        id={`view-chart-${chart.id}`}
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: "5px 10px", fontSize: 12 }}
                        onClick={() => setDeleteId(chart.id)}
                        id={`delete-chart-${chart.id}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Mini preview */}
                  {chart.chart_data && chart.chart_type && (
                    <div style={{ pointerEvents: "none", opacity: 0.85 }}>
                      <ChartPreview chart_type={chart.chart_type} chart_data={chart.chart_data} />
                    </div>
                  )}

                  {/* Question */}
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                    "{chart.question}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* View Modal */}
      <Modal isOpen={!!viewChart} onClose={() => setViewChart(null)} title={viewChart?.title || "Chart"} size="lg"
        footer={<div style={{ display: "flex", justifyContent: "flex-end" }}><button className="btn btn-secondary" onClick={() => setViewChart(null)}>Close</button></div>}
      >
        {viewChart && (
          <div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>
              <strong>Question:</strong> {viewChart.question}
            </p>
            {viewChart.sql_query && (
              <pre style={{ fontSize: 11, background: "var(--surface-elevated)", padding: "8px 12px", borderRadius: 6, marginBottom: 16, overflowX: "auto", color: "var(--text-body)" }}>
                {viewChart.sql_query}
              </pre>
            )}
            <ChartPreview chart_type={viewChart.chart_type} chart_data={viewChart.chart_data} />
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Chart" size="sm"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={deleting} id="confirm-delete-chart">
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        }
      >
        <p style={{ fontSize: 14, color: "var(--text-body)" }}>
          Are you sure you want to delete this chart? This cannot be undone.
        </p>
      </Modal>
    </Layout>
  );
}
