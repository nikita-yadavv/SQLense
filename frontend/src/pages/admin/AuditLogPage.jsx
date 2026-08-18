/**
 * AuditLogPage (Admin only) — paginated timeline of all actions in this org.
 */
import { useState, useEffect, useCallback } from "react";
import {
  Shield, ChevronLeft, ChevronRight, RefreshCw,
  LogIn, MessageSquare, Database, UserCheck, UserX,
  UserPlus, Terminal, Star, Trash2,
} from "lucide-react";
import Layout  from "../../components/Layout";
import Spinner from "../../components/Spinner";
import { analyticsAPI, getErrorMessage } from "../../services/api";

const ACTION_META = {
  USER_LOGIN:          { icon: <LogIn size={14} />,         color: "#22c55e", label: "Login" },
  USER_SIGNUP:         { icon: <UserPlus size={14} />,      color: "#6366f1", label: "Signup" },
  EMPLOYEE_JOINED:     { icon: <UserPlus size={14} />,      color: "#f59e0b", label: "Join Request" },
  EMPLOYEE_APPROVED:   { icon: <UserCheck size={14} />,     color: "#10b981", label: "Approved" },
  EMPLOYEE_REJECTED:   { icon: <UserX size={14} />,         color: "#ef4444", label: "Rejected" },
  EMPLOYEE_CREATED:    { icon: <UserPlus size={14} />,      color: "#6366f1", label: "Employee Created" },
  DB_CONNECTED:        { icon: <Database size={14} />,      color: "#22c55e", label: "DB Connected" },
  DB_DISCONNECTED:     { icon: <Database size={14} />,      color: "#ef4444", label: "DB Disconnected" },
  CHAT_QUERY:          { icon: <MessageSquare size={14} />, color: "#6366f1", label: "AI Query" },
  WORKSPACE_EXECUTE:   { icon: <Terminal size={14} />,      color: "#f59e0b", label: "SQL Executed" },
  WORKSPACE_COMMIT:    { icon: <Terminal size={14} />,      color: "#22c55e", label: "Committed" },
  WORKSPACE_ROLLBACK:  { icon: <Terminal size={14} />,      color: "#ef4444", label: "Rollback" },
  KPI_TILE_CREATED:    { icon: <Star size={14} />,          color: "#6366f1", label: "KPI Tile Created" },
  KPI_TILE_DELETED:    { icon: <Trash2 size={14} />,        color: "#ef4444", label: "KPI Tile Deleted" },
  KPI_CHAT_QUERY:      { icon: <Star size={14} />,          color: "#8b5cf6", label: "KPI AI Query" },
};

function getActionMeta(action) {
  return ACTION_META[action] || { icon: <Shield size={14} />, color: "#94a3b8", label: action };
}

function timeAgo(iso) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const PAGE_SIZE = 25;

export default function AuditLogPage() {
  const [entries, setEntries] = useState([]);
  const [total,   setTotal]   = useState(0);
  const [offset,  setOffset]  = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const load = useCallback(async (off = offset) => {
    setLoading(true); setError("");
    try {
      const { data } = await analyticsAPI.auditLog(PAGE_SIZE, off);
      setEntries(data.entries);
      setTotal(data.total);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => { load(); }, [offset]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h2 className="page-title">Audit Log</h2>
            <p className="page-subtitle">
              Complete history of all actions in your organisation — logins, queries, approvals, and more.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => load(offset)} id="refresh-audit-btn">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="page-body">
          {loading ? (
            <div style={{ padding: 48, textAlign: "center" }}><Spinner /></div>
          ) : entries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Shield size={40} /></div>
              <h3>No audit entries yet</h3>
              <p>Actions will appear here as your team uses the platform.</p>
            </div>
          ) : (
            <div className="card">
              {/* Timeline */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {entries.map((entry, i) => {
                  const meta = getActionMeta(entry.action);
                  return (
                    <div key={entry.id} style={{
                      display: "flex", alignItems: "flex-start", gap: 14,
                      padding: "12px 0",
                      borderBottom: i < entries.length - 1 ? "1px solid var(--border, rgba(255,255,255,0.06))" : "none",
                    }}>
                      {/* Icon dot */}
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: `${meta.color}18`,
                        border: `2px solid ${meta.color}40`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, color: meta.color,
                      }}>
                        {meta.icon}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{meta.label}</span>
                          <span style={{
                            background: `${meta.color}18`, color: meta.color,
                            fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                          }}>{entry.action}</span>
                        </div>
                        {entry.detail && (
                          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {entry.detail}
                          </p>
                        )}
                      </div>

                      {/* Time */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{timeAgo(entry.created_at)}</div>
                        {entry.ip_address && (
                          <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace", marginTop: 2 }}>
                            {entry.ip_address}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total} entries
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn btn-secondary btn-sm btn-icon"
                      disabled={offset === 0}
                      onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                      id="audit-prev-btn"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: 13, padding: "4px 8px" }}>
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm btn-icon"
                      disabled={offset + PAGE_SIZE >= total}
                      onClick={() => setOffset(offset + PAGE_SIZE)}
                      id="audit-next-btn"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
