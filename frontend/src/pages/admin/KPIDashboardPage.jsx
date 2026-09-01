/**
 * KPIDashboardPage (Admin only) — KPI tiles with live SQL query execution
 * and "Ask AI about this data" embedded chat panel.
 */
import { useState, useEffect, useRef } from "react";
import {
  Plus, Trash2, Play, Send, X, Bot, BarChart2, RefreshCw, Pencil, Save,
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Layout    from "../../components/Layout";
import Spinner   from "../../components/Spinner";
import { kpiAPI, getErrorMessage } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";

/* ── KPI Tile Card ──────────────────────────────────────────── */
function TileCard({ tile, result, onDelete, onEdit, isAdmin }) {
  const rows = result?.rows || [];
  const cols = result?.columns || [];
  const hasError = !!result?.error;
  const firstVal = rows[0] ? Object.values(rows[0])[0] : null;
  const isAgg = rows.length > 1 && cols.length >= 2;

  return (
    <div className="card" style={{ position: "relative", minHeight: 160 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{tile.title}</h4>
          {tile.description && (
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{tile.description}</p>
          )}
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-secondary btn-sm btn-icon" onClick={() => onEdit(tile)} id={`edit-tile-${tile.id}`}>
              <Pencil size={12} />
            </button>
            <button className="btn btn-danger btn-sm btn-icon" onClick={() => onDelete(tile.id)} id={`delete-tile-${tile.id}`}>
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {!result ? (
        <div style={{ textAlign: "center", padding: 16, color: "var(--text-muted)", fontSize: 12 }}>
          Click <strong>Run All</strong> to load data
        </div>
      ) : hasError ? (
        <div className="alert alert-error" style={{ fontSize: 12, padding: "8px 12px" }}>
          ⚠️ {result.error}
        </div>
      ) : isAgg ? (
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={rows.slice(0, 10)}>
            <XAxis dataKey={cols[0]} tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip />
            <Bar dataKey={cols[1]} fill="#2563EB" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : firstVal !== null ? (
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#081F5C", fontFamily: "var(--font-heading)" }}>
            {typeof firstVal === "number" ? firstVal.toLocaleString() : firstVal}
          </div>
          <div style={{ fontSize: 11, color: "#64748B", marginTop: 4, fontWeight: 500 }}>{cols[0]}</div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No data returned</div>
      )}
    </div>
  );
}

/* ── Tile Form Modal ─────────────────────────────────────────── */
function TileFormModal({ tile, onClose, onSave }) {
  const [form, setForm] = useState(
    tile
      ? { title: tile.title, description: tile.description || "", sql_query: tile.sql_query, position: tile.position }
      : { title: "", description: "", sql_query: "SELECT COUNT(*) AS total FROM your_table", position: 0 }
  );
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleSave() {
    if (!form.title.trim() || !form.sql_query.trim()) {
      toast.error("Title and SQL query are required.");
      return;
    }
    setSaving(true);
    try {
      if (tile) {
        await kpiAPI.update(tile.id, form);
        toast.success("Tile updated.");
      } else {
        await kpiAPI.create(form);
        toast.success("Tile created.");
      }
      onSave();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div className="card" style={{ width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>{tile ? "Edit KPI Tile" : "New KPI Tile"}</h3>
          <button className="btn btn-secondary btn-sm btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="tile-title">Title</label>
          <input id="tile-title" type="text" className="form-input" placeholder="Total Revenue"
            value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="tile-desc">Description (optional)</label>
          <input id="tile-desc" type="text" className="form-input" placeholder="All-time revenue across orders"
            value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="tile-sql">SQL Query</label>
          <textarea id="tile-sql" className="form-input" rows={5}
            style={{ fontFamily: "monospace", fontSize: 13, resize: "vertical" }}
            placeholder="SELECT SUM(amount) AS revenue FROM orders"
            value={form.sql_query}
            onChange={e => setForm(p => ({ ...p, sql_query: e.target.value }))}
          />
          <p className="form-hint">Use SELECT only. The query runs against your connected database.</p>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="tile-pos">Position (display order)</label>
          <input id="tile-pos" type="number" className="form-input" min={0} max={20}
            value={form.position} onChange={e => setForm(p => ({ ...p, position: Number(e.target.value) }))} />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} id="save-tile-btn">
            {saving ? <><Spinner /> Saving…</> : <><Save size={14} /> Save Tile</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── AI Chat Panel ───────────────────────────────────────────── */
function AIChatPanel({ dashboardData, onClose }) {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hi! I can answer questions about your dashboard data. What would you like to know?" }
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const { data } = await kpiAPI.chat(q, dashboardData);
      setMessages(prev => [...prev, { role: "ai", text: data.answer }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "ai", text: `Error: ${getErrorMessage(err)}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed", right: 24, bottom: 24, width: 380, maxHeight: "70vh",
      background: "var(--surface, #ffffff)", border: "1px solid var(--border)",
      borderRadius: 16, boxShadow: "0 20px 60px rgba(8,31,92,0.25)",
      display: "flex", flexDirection: "column", zIndex: 200, overflow: "hidden"
    }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", background: "var(--surface-elevated, #F7F2EB)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Bot size={18} color="var(--primary)" />
          <strong style={{ fontSize: 14, color: "var(--text-heading)" }}>Ask about this dashboard</strong>
        </div>
        <button className="btn btn-secondary btn-sm btn-icon" onClick={onClose}><X size={14} /></button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10, background: "var(--bg)" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
            background: msg.role === "user" ? "var(--primary)" : "var(--primary-light)",
            color: msg.role === "user" ? "#ffffff" : "var(--text-heading)",
            padding: "9px 14px", borderRadius: 12, fontSize: 13, fontWeight: 500,
            maxWidth: "88%", lineHeight: 1.5, boxShadow: "0 2px 6px rgba(8,31,92,0.06)",
          }}>
            {msg.text}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start", padding: "8px 12px", background: "var(--primary-light)", borderRadius: 12 }}>
            <Spinner />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
        <input
          className="form-input"
          style={{ flex: 1, fontSize: 13, padding: "8px 12px" }}
          placeholder="Why did revenue drop in March?"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          disabled={loading}
          id="kpi-chat-input"
        />
        <button className="btn btn-primary btn-sm btn-icon" onClick={handleSend} disabled={loading || !input.trim()} id="kpi-chat-send-btn">
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function KPIDashboardPage() {
  const { toast }    = useToast();
  const { isAdmin }  = useAuth();
  const [tiles,      setTiles]      = useState([]);
  const [results,    setResults]    = useState({});   // tile_id → result
  const [loading,    setLoading]    = useState(true);
  const [running,    setRunning]    = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [editTile,   setEditTile]   = useState(null);
  const [showChat,   setShowChat]   = useState(false);
  const [error,      setError]      = useState("");

  async function loadTiles() {
    setLoading(true); setError("");
    try {
      const { data } = await kpiAPI.list();
      setTiles(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTiles(); }, []);

  async function runAll() {
    if (!tiles.length) return;
    setRunning(true);
    try {
      const { data } = await kpiAPI.run();
      const map = {};
      data.forEach(r => { map[r.tile_id] = r; });
      setResults(map);
      toast.success("Dashboard data refreshed.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRunning(false);
    }
  }

  async function deleteTile(id) {
    try {
      await kpiAPI.delete(id);
      toast.success("Tile deleted.");
      setTiles(prev => prev.filter(t => t.id !== id));
      setResults(prev => { const n = { ...prev }; delete n[id]; return n; });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function openEdit(tile) {
    setEditTile(tile);
    setShowForm(true);
  }

  const dashboardData = tiles.map(t => ({
    title: t.title,
    rows:  results[t.id]?.rows || [],
  }));

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h2 className="page-title">KPI Dashboard</h2>
            <p className="page-subtitle">
              Configure key performance indicators and view live data across your organisation.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-secondary btn-sm" onClick={loadTiles} id="refresh-tiles-btn">
              <RefreshCw size={14} />
            </button>
            <button className="btn btn-secondary" onClick={runAll} disabled={running || !tiles.length} id="run-all-btn">
              {running ? <><Spinner /> Running…</> : <><Play size={14} /> Run All</>}
            </button>
            {isAdmin && (
              <button
                className="btn btn-primary"
                onClick={() => { setEditTile(null); setShowForm(true); }}
                disabled={tiles.length >= 8}
                id="add-tile-btn"
              >
                <Plus size={14} /> Add Tile
              </button>
            )}
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {tiles.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-state-icon"><BarChart2 size={48} /></div>
            <h3>No KPI tiles yet</h3>
            <p>Add tiles with SQL queries to build your custom dashboard.</p>
            {isAdmin && (
              <button className="btn btn-primary" onClick={() => setShowForm(true)} id="first-tile-btn">
                <Plus size={14} /> Add Your First Tile
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 48, textAlign: "center" }}><Spinner /></div>
        ) : (
          <div className="page-body">
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 20, marginBottom: 32,
            }}>
              {tiles.map(tile => (
                <TileCard
                  key={tile.id}
                  tile={tile}
                  result={results[tile.id] || null}
                  onDelete={deleteTile}
                  onEdit={openEdit}
                  isAdmin={isAdmin}
                />
              ))}
            </div>

            {/* Ask AI button */}
            {tiles.length > 0 && (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowChat(true)}
                  style={{ padding: "12px 28px", borderRadius: 50, gap: 10 }}
                  id="open-kpi-chat-btn"
                >
                  <Bot size={18} />
                  Ask AI about this dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <TileFormModal
          tile={editTile}
          onClose={() => { setShowForm(false); setEditTile(null); }}
          onSave={loadTiles}
        />
      )}
      {showChat && (
        <AIChatPanel
          dashboardData={dashboardData}
          onClose={() => setShowChat(false)}
        />
      )}
    </Layout>
  );
}
