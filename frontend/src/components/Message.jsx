/**
 * Message — renders a single chat message bubble.
 * Handles user messages, rich bot responses, high-contrast SQL view, and friendly error cards.
 */
import { useState } from "react";
import { BarChart2, Bookmark, Check, Eye, EyeOff, AlertCircle, Database, Settings, Terminal, Copy, Lock, ShieldAlert } from "lucide-react";
import ChartRenderer from "./ChartRenderer";
import ResultTable   from "./ResultTable";
import { savedChartsAPI, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";

// Map common backend error patterns to friendly messages + hints
function parseFriendlyError(rawMsg) {
  if (!rawMsg) return { title: "Something went wrong", hint: "Please try again in a moment.", icon: "⚠️" };

  const msg = rawMsg.toLowerCase();

  if (msg.includes("database") && (msg.includes("unavailable") || msg.includes("disconnected") || msg.includes("reconnect"))) {
    return {
      title: "Database Unavailable",
      hint: "The connected database is temporarily offline. Please ask your admin to reconnect from the Database settings page.",
      icon: "🔌",
    };
  }
  if (msg.includes("not been set up") || msg.includes("hasn't been set up") || msg.includes("not configured") || msg.includes("configure")) {
    return {
      title: "No Database Connected",
      hint: "Your organisation doesn't have a database connected yet. Ask your admin to set one up from the Database settings.",
      icon: "🗄️",
    };
  }
  // True security violation checks
  if (
    msg.includes("security violation") ||
    msg.includes("blocked keyword") ||
    msg.includes("only pure select") ||
    msg.includes("write operation") ||
    msg.includes("only select queries are allowed") ||
    msg.includes("dml/ddl not allowed") ||
    msg.includes("modifications are not permitted") ||
    msg.includes("blocked_write_operation")
  ) {
    return {
      title: "Operation Restricted to SQL Workspace",
      hint: "Data modifications (UPDATE, INSERT, DELETE, DROP, ALTER) are disabled in AI Chat to safeguard database integrity. Please use the SQL Workspace in the Admin menu for transaction-controlled operations.",
      icon: "🔒",
    };
  }
  // Query execution or SQL syntax error
  if (
    msg.includes("query execution failed") ||
    msg.includes("syntax error") ||
    msg.includes("psycopg.errors") ||
    msg.includes("does not exist") ||
    msg.includes("sql validation failed") ||
    msg.includes("unknown table")
  ) {
    return {
      title: "Couldn't Execute Query",
      hint: "The database could not process this question with the current schema. Try rephrasing with specific table or column names.",
      icon: "⚠️",
    };
  }
  if (msg.includes("timeout") || msg.includes("timed out")) {
    return {
      title: "Query Timed Out",
      hint: "The query took too long to run. Try a more specific question or a smaller date range.",
      icon: "⏱️",
    };
  }
  if (msg.includes("network") || msg.includes("connection refused") || msg.includes("fetch")) {
    return {
      title: "Connection Error",
      hint: "Unable to reach the server. Please check your internet connection and try again.",
      icon: "📡",
    };
  }
  if (msg.includes("unauthorized") || msg.includes("401") || msg.includes("forbidden")) {
    return {
      title: "Session Expired",
      hint: "Your session has expired. Please refresh the page and log in again.",
      icon: "🔐",
    };
  }
  // Generic fallback
  return {
    title: "Couldn't Process Your Request",
    hint: "Something went wrong while processing your query. Please try rephrasing or try again.",
    icon: "⚠️",
  };
}

function CopySqlButton({ sql }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    if (!sql) return;
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      type="button"
      className="sql-copy-btn"
      title="Copy SQL to clipboard"
    >
      {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
      <span>{copied ? "Copied!" : "Copy SQL"}</span>
    </button>
  );
}

export default function Message({
  type,
  text,
  isError,
  sql,
  sqlExplanation,
  answerText,
  chart,
  rows,
  columns,
  userQuestion,
}) {
  const { toast } = useToast();
  const [showChart, setShowChart] = useState(true);
  const [saved, setSaved]         = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState("");

  if (type === "user") {
    return (
      <div className="message-wrapper user">
        <div className="user-message">{text}</div>
      </div>
    );
  }

  // ── Error Card ──────────────────────────────────────────────────────────────
  if (isError) {
    const { title, hint, icon } = parseFriendlyError(text);
    return (
      <div className="message-wrapper bot">
        <div className="bot-message" style={{ padding: 0, background: "none", boxShadow: "none" }}>
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            padding: "16px 20px",
            background: "linear-gradient(135deg, rgba(239,68,68,0.07) 0%, rgba(239,68,68,0.03) 100%)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 12,
            maxWidth: 480,
          }}>
            <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{icon}</span>
            <div>
              <p style={{
                fontWeight: 600,
                fontSize: 14,
                color: "var(--text-primary)",
                margin: "0 0 6px 0",
              }}>{title}</p>
              <p style={{
                fontSize: 13,
                color: "var(--text-muted)",
                margin: 0,
                lineHeight: 1.5,
              }}>{hint}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if this response is a write-operation restriction notice
  const isWriteRestricted = (answerText || text || "").toLowerCase().includes("data modifications are not permitted in ai chat") ||
    (answerText || text || "").toLowerCase().includes("modifications are not permitted in ai chat");

  // ── Normal bot message ──────────────────────────────────────────────────────
  const hasChart = chart && chart.type && chart.type !== "none" && chart.type !== "table" && chart.data?.length > 0;

  async function handleSaveChart() {
    if (!hasChart || saved || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      await savedChartsAPI.save({
        title: chart.title || userQuestion || "Chart Visualization",
        question: userQuestion || text || "AI Chat Query",
        sql_query: sql || "",
        chart_type: chart.type,
        chart_data: chart.data,
      });
      setSaved(true);
      toast.success("Chart saved!");
    } catch (err) {
      setSaveError("Could not save chart. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="message-wrapper bot">
      <div className="bot-message">
        {/* Write / CRUD Restriction Notice */}
        {isWriteRestricted ? (
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            padding: "16px 20px",
            background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.03) 100%)",
            border: "1px solid rgba(245,158,11,0.25)",
            borderRadius: 12,
            marginBottom: sql ? 12 : 0,
          }}>
            <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>🔒</span>
            <div>
              <p style={{
                fontWeight: 600,
                fontSize: 14,
                color: "var(--text-primary)",
                margin: "0 0 6px 0",
              }}>
                Operation Restricted to SQL Workspace
              </p>
              <p style={{
                fontSize: 13,
                color: "var(--text-primary)",
                margin: "0 0 8px 0",
                lineHeight: 1.5,
              }}>
                AI Chat is strictly restricted to <strong>read-only analytical queries (SELECT)</strong> to safeguard database integrity.
              </p>
              <p style={{
                fontSize: 12,
                color: "var(--text-muted)",
                margin: 0,
                lineHeight: 1.5,
              }}>
                💡 To perform <strong>UPDATE</strong>, <strong>INSERT</strong>, <strong>DELETE</strong>, or schema changes with transaction controls (Preview, Commit, Rollback), please use the <strong>SQL Workspace</strong> in the Admin panel.
              </p>
            </div>
          </div>
        ) : (
          (answerText || text) && (
            <p className="answer-text">🤖 {answerText || text}</p>
          )
        )}

        {/* SQL Explanation */}
        {!isWriteRestricted && sqlExplanation && (
          <div className="sql-explanation">
            💡 {sqlExplanation}
          </div>
        )}

        {/* Generated SQL */}
        {sql && (
          <div className="sql-box">
            <div className="sql-box-header">
              <h4>
                <Terminal size={13} style={{ marginRight: 6 }} />
                Generated SQL
              </h4>
              <CopySqlButton sql={sql} />
            </div>
            <pre>{sql}</pre>
          </div>
        )}

        {/* Action Controls for Chart */}
        {hasChart && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: 12, marginBottom: 8, padding: "6px 12px", borderRadius: 8,
            background: "var(--surface-elevated, rgba(255,255,255,0.04))", border: "1px solid var(--border)",
          }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 6 }}
              onClick={() => setShowChart((v) => !v)}
              id="toggle-chart-btn"
            >
              {showChart ? <EyeOff size={13} /> : <Eye size={13} />}
              {showChart ? "Hide Chart" : "Show Chart"}
            </button>

            <button
              className="btn btn-primary"
              style={{ fontSize: 12, padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 6 }}
              onClick={handleSaveChart}
              disabled={saved || saving}
              id="save-chart-btn"
            >
              {saved ? <Check size={13} /> : <Bookmark size={13} />}
              {saved ? "Saved!" : saving ? "Saving…" : "Save Chart"}
            </button>
          </div>
        )}

        {/* Inline save error (no toast) */}
        {saveError && (
          <p style={{ fontSize: 12, color: "var(--error, #ef4444)", marginTop: 4 }}>{saveError}</p>
        )}

        {/* Chart (bar / line / pie) */}
        {hasChart && showChart && (
          <ChartRenderer chart={chart} />
        )}

        {/* Result table */}
        {rows && columns && rows.length > 0 && (
          <ResultTable rows={rows} columns={columns} />
        )}
      </div>
    </div>
  );
}
