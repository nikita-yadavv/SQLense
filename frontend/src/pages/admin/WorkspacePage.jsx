/**
 * WorkspacePage (Admin only)
 * Full SQL workspace with:
 * 1. AI Query Assistant (CRUD Generator) — generate SELECT, INSERT, UPDATE, DELETE, DDL statements from natural language.
 * 2. SQL Editor with Execute / Commit / Rollback transaction management.
 * 3. Dynamic ResultTable for tabular outputs.
 */
import { useState, useRef } from "react";
import {
  Terminal, Play, CheckCircle, XCircle, Sparkles,
  ArrowDownToLine, Copy, Check, CornerDownRight, Zap, RefreshCw
} from "lucide-react";
import Layout       from "../../components/Layout";
import ResultTable  from "../../components/ResultTable";
import Spinner      from "../../components/Spinner";
import { workspaceAPI, getErrorMessage } from "../../services/api";
import { useToast } from "../../context/ToastContext";

const PLACEHOLDER = `-- Admin SQL Workspace
-- You can write SQL manually or use the AI Query Assistant above to generate CRUD statements.
-- SELECT queries display tabular results immediately.
-- Write operations (INSERT, UPDATE, DELETE) will track transactions and require Commit or Rollback.

SELECT * FROM customers LIMIT 10;`;

const QUICK_PROMPTS = [
  { label: "👥 Insert Customer", text: "Insert a new active customer named Jane Doe with email jane.doe@example.com" },
  { label: "📦 Update Stock", text: "Update stock to 100 for all products where stock is less than 20" },
  { label: "📊 Customer Orders", text: "Show total orders and total revenue per customer sorted by revenue descending" },
  { label: "🗑️ Delete Support Tickets", text: "Delete support tickets that have status 'closed' and were created before 2026-08-01" },
];

export default function WorkspacePage() {
  const { toast } = useToast();
  const editorRef = useRef(null);

  // Editor State
  const [sql, setSql]             = useState("");
  const [result, setResult]       = useState(null);
  const [message, setMessage]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [inTxn, setInTxn]         = useState(false);
  const [msgType, setMsgType]     = useState("info");

  // AI Generator State
  const [aiPrompt, setAiPrompt]           = useState("");
  const [generating, setGenerating]       = useState(false);
  const [generatedQuery, setGeneratedQuery] = useState(null); // { sql, explanation, operation_type }
  const [copied, setCopied]               = useState(false);

  // ── Execute SQL (Execute / Commit / Rollback) ────────────────────────────────
  async function exec(action, overrideSql) {
    const targetSql = overrideSql !== undefined ? overrideSql : sql;
    setLoading(true);
    setResult(null);
    setMessage("");
    try {
      const { data } = action === "execute"
        ? await workspaceAPI.execute(targetSql)
        : action === "commit"
          ? await workspaceAPI.commit()
          : await workspaceAPI.rollback();

      setResult(data);
      setMessage(data.message);
      setMsgType("success");

      if (action === "execute") {
        if (!data.is_read) {
          setInTxn(true);
          toast.info("Write query executed. Click Commit to save or Rollback to discard.");
        } else {
          setInTxn(false);
        }
      } else if (action === "commit") {
        setInTxn(false);
        toast.success("Transaction committed successfully.");
      } else if (action === "rollback") {
        setInTxn(false);
        toast.info("Transaction rolled back.");
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      setMessage(msg);
      setMsgType("error");
      setInTxn(false);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  // ── AI Query Generation ──────────────────────────────────────────────────────
  async function handleGenerate(customPrompt) {
    const p = (customPrompt || aiPrompt).trim();
    if (!p) {
      toast.error("Please enter a description of what query to generate.");
      return;
    }
    setGenerating(true);
    try {
      const { data } = await workspaceAPI.generate(p);
      setGeneratedQuery(data);
      toast.success("SQL query generated!");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  function handleInsertIntoEditor(shouldRun = false) {
    if (!generatedQuery?.sql) return;
    setSql(generatedQuery.sql);
    toast.success("Query copied into SQL Editor.");

    // Scroll smoothly to editor
    if (editorRef.current) {
      editorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    if (shouldRun) {
      setTimeout(() => exec("execute", generatedQuery.sql), 150);
    }
  }

  function handleCopySql() {
    if (!generatedQuery?.sql) return;
    navigator.clipboard.writeText(generatedQuery.sql);
    setCopied(true);
    toast.info("SQL copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  const getBadgeColor = (type) => {
    switch (type) {
      case "INSERT": return { bg: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "rgba(16, 185, 129, 0.3)" };
      case "UPDATE": return { bg: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" };
      case "DELETE": return { bg: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "rgba(239, 68, 68, 0.3)" };
      case "SCHEMA": return { bg: "rgba(168, 85, 247, 0.15)", color: "#a855f7", border: "rgba(168, 85, 247, 0.3)" };
      default:       return { bg: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", border: "rgba(59, 130, 246, 0.3)" };
    }
  };

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h2 className="page-title">SQL Workspace</h2>
            <p className="page-subtitle">
              Run any SQL against your organisation&apos;s database or generate CRUD queries with AI assistance.
            </p>
          </div>
          {inTxn && (
            <span className="badge badge-warning" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#d97706", padding: "6px 14px", borderRadius: 20, fontWeight: 700, fontSize: 12 }}>
              ⚠️ Uncommitted Write Transaction
            </span>
          )}
        </div>

        <div className="page-body">
          <div className="workspace-layout" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* ── AI Query Assistant (CRUD Generator) ── */}
            <div className="card" style={{ border: "1px solid rgba(99, 102, 241, 0.25)", background: "var(--card-bg, #fff)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                <h3 className="card-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)" }}>
                  <Sparkles size={18} color="var(--primary)" />
                  AI Query Assistant (CRUD Generator)
                </h3>
                <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "12px", background: "rgba(99, 102, 241, 0.1)", color: "var(--primary)" }}>
                  Supports SELECT • INSERT • UPDATE • DELETE • DDL
                </span>
              </div>
              <p className="card-subtitle" style={{ marginBottom: "16px" }}>
                Describe what you want to do in plain English. SQLense will build the query against your database schema so you can review and insert it directly into the editor.
              </p>

              {/* Prompt Input Area */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 1, minWidth: "280px" }}
                  placeholder="e.g. Insert a new customer named Sarah with email sarah@example.com, or Update price of product #2 to $49.99..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  disabled={generating}
                  id="workspace-ai-input"
                />
                <button
                  className="btn btn-primary"
                  onClick={() => handleGenerate()}
                  disabled={generating || !aiPrompt.trim()}
                  id="workspace-ai-generate-btn"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}
                >
                  {generating ? <><Spinner /> Generating…</> : <><Sparkles size={14} /> Generate SQL</>}
                </button>
              </div>

              {/* Quick suggestion prompt chips */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: generatedQuery ? "16px" : "0" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", alignSelf: "center", marginRight: "4px" }}>Quick:</span>
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAiPrompt(qp.text);
                      handleGenerate(qp.text);
                    }}
                    style={{
                      background: "var(--bg-input, #f8fafc)",
                      border: "1px solid var(--border)",
                      borderRadius: "16px",
                      padding: "4px 10px",
                      fontSize: "11px",
                      fontWeight: 500,
                      color: "var(--text-body)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-body)"; }}
                  >
                    {qp.label}
                  </button>
                ))}
              </div>

              {/* Generated Query Preview Box */}
              {generatedQuery && (
                <div style={{
                  marginTop: "16px",
                  padding: "16px",
                  borderRadius: "10px",
                  background: "#081226",
                  border: "1px solid rgba(56, 189, 248, 0.25)",
                  boxShadow: "0 4px 18px rgba(0,0,0,0.2)",
                }}>
                  {/* Top bar of query preview */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {(() => {
                        const style = getBadgeColor(generatedQuery.operation_type);
                        return (
                          <span style={{
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 800,
                            letterSpacing: "0.05em",
                            background: style.bg,
                            color: style.color,
                            border: `1px solid ${style.border}`,
                          }}>
                            {generatedQuery.operation_type}
                          </span>
                        );
                      })()}
                      <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>
                        Generated Query Preview
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={handleCopySql}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "4px",
                          background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.15)",
                          color: "#cbd5e1", fontSize: "12px", padding: "4px 10px", borderRadius: "6px", cursor: "pointer",
                        }}
                        id="copy-generated-sql-btn"
                      >
                        {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                        {copied ? "Copied!" : "Copy"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleInsertIntoEditor(false)}
                        className="btn btn-primary"
                        style={{ fontSize: "12px", padding: "4px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                        id="insert-into-editor-btn"
                      >
                        <ArrowDownToLine size={13} /> Insert into Editor
                      </button>

                      <button
                        type="button"
                        onClick={() => handleInsertIntoEditor(true)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "4px",
                          background: "#10b981", border: "none", color: "#ffffff",
                          fontSize: "12px", fontWeight: 600, padding: "4px 12px", borderRadius: "6px", cursor: "pointer",
                        }}
                        id="insert-and-run-btn"
                        title="Insert into editor and execute immediately"
                      >
                        <Zap size={13} /> Insert & Run
                      </button>
                    </div>
                  </div>

                  {/* Plain-English Explanation */}
                  {generatedQuery.explanation && (
                    <div style={{
                      fontSize: "12px", color: "#cbd5e1", marginBottom: "10px", lineHeight: "1.5",
                      background: "rgba(255,255,255,0.04)", padding: "8px 12px", borderRadius: "6px", borderLeft: "3px solid #38bdf8"
                    }}>
                      💡 {generatedQuery.explanation}
                    </div>
                  )}

                  {/* SQL Code */}
                  <pre style={{
                    margin: 0,
                    padding: "12px 14px",
                    background: "#040b17",
                    borderRadius: "6px",
                    color: "#f8fafc",
                    fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
                    fontSize: "13px",
                    lineHeight: "1.6",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}>
                    {generatedQuery.sql}
                  </pre>
                </div>
              )}
            </div>

            {/* ── SQL Editor ── */}
            <div className="card" ref={editorRef}>
              <h3 className="card-title" style={{ marginBottom: "12px" }}>
                <Terminal size={16} style={{ display: "inline", marginRight: "6px" }} />
                SQL Editor
              </h3>
              <textarea
                className="sql-editor"
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                placeholder={PLACEHOLDER}
                spellCheck={false}
                disabled={loading}
                id="workspace-sql-textarea"
                style={{ minHeight: "150px" }}
              />

              <div className="workspace-actions" style={{ marginTop: "14px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  className="btn btn-primary"
                  onClick={() => exec("execute")}
                  disabled={loading || !sql.trim()}
                  id="workspace-execute-btn"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  {loading ? <><Spinner /> Running…</> : <><Play size={14} /> Execute</>}
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={() => exec("commit")}
                  disabled={loading || !inTxn}
                  title={inTxn ? "Commit changes to database" : "No pending write transaction"}
                  id="workspace-commit-btn"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <CheckCircle size={14} /> Commit
                </button>

                <button
                  className="btn btn-danger"
                  onClick={() => exec("rollback")}
                  disabled={loading || !inTxn}
                  title={inTxn ? "Roll back uncommitted changes" : "No pending write transaction"}
                  id="workspace-rollback-btn"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <XCircle size={14} /> Rollback
                </button>

                {sql.trim() && (
                  <button
                    type="button"
                    onClick={() => setSql("")}
                    className="btn btn-secondary"
                    style={{ marginLeft: "auto", fontSize: "12px", padding: "6px 12px" }}
                    title="Clear editor"
                  >
                    Clear Editor
                  </button>
                )}
              </div>
            </div>

            {/* Result message */}
            {message && (
              <div className={`workspace-message alert alert-${msgType === "error" ? "error" : "success"}`}>
                {msgType === "error" ? "❌" : "✅"} {message}
              </div>
            )}

            {/* Result Table Output */}
            {result && result.columns && result.columns.length > 0 && (
              <div className="workspace-result">
                <ResultTable rows={result.rows || []} columns={result.columns} />
              </div>
            )}

          </div>
        </div>
      </div>
    </Layout>
  );
}
