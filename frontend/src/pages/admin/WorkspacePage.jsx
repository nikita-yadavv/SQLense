/**
 * WorkspacePage (Admin only)
 * Full SQL workspace with execute / commit / rollback.
 * Integrates: POST /admin/workspace/execute
 */
import { useState } from "react";
import { Terminal, Play, CheckCircle, XCircle } from "lucide-react";
import Layout       from "../../components/Layout";
import ResultTable  from "../../components/ResultTable";
import Spinner      from "../../components/Spinner";
import { workspaceAPI, getErrorMessage } from "../../services/api";
import { useToast } from "../../context/ToastContext";

const PLACEHOLDER = `-- Admin SQL Workspace
-- You can run any SQL here (SELECT, INSERT, UPDATE, DELETE, etc.)
-- Always COMMIT or ROLLBACK after write operations.

SELECT * FROM users LIMIT 10;`;

export default function WorkspacePage() {
  const { toast } = useToast();
  const [sql,        setSql]        = useState("");
  const [result,     setResult]     = useState(null);   // WorkspaceResponse
  const [message,    setMessage]    = useState("");
  const [loading,    setLoading]    = useState(false);
  const [inTxn,      setInTxn]      = useState(false);  // track open transaction
  const [msgType,    setMsgType]    = useState("info"); // info | success | error

  async function exec(action) {
    setLoading(true);
    setResult(null);
    setMessage("");
    try {
      const { data } = action === "execute"
        ? await workspaceAPI.execute(sql)
        : action === "commit"
          ? await workspaceAPI.commit()
          : await workspaceAPI.rollback();

      setResult(data);
      setMessage(data.message);
      setMsgType("success");

      if (action === "execute" && data.rowcount > 0 && !data.rows?.length) {
        // DML executed — open transaction pending
        setInTxn(true);
        toast.info("Write executed. Use Commit or Rollback to finalise.");
      } else if (action === "commit") {
        setInTxn(false);
        toast.success("Transaction committed.");
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

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h2 className="page-title">SQL Workspace</h2>
            <p className="page-subtitle">
              Run any SQL against your organisation&apos;s database.
              Write operations must be committed or rolled back.
            </p>
          </div>
          {inTxn && (
            <span className="badge badge-warning">⚠️ Open transaction</span>
          )}
        </div>

        <div className="page-body">
          <div className="workspace-layout">

            {/* Editor */}
            <div className="card">
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
              />

              <div className="workspace-actions" style={{ marginTop: "12px" }}>
                <button
                  className="btn btn-primary"
                  onClick={() => exec("execute")}
                  disabled={loading || !sql.trim()}
                >
                  {loading ? <><Spinner /> Running…</> : <><Play size={14} /> Execute</>}
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={() => exec("commit")}
                  disabled={loading || !inTxn}
                  title="Commit the open transaction"
                >
                  <CheckCircle size={14} /> Commit
                </button>

                <button
                  className="btn btn-danger"
                  onClick={() => exec("rollback")}
                  disabled={loading || !inTxn}
                  title="Roll back the open transaction"
                >
                  <XCircle size={14} /> Rollback
                </button>
              </div>
            </div>

            {/* Result area */}
            {message && (
              <div className={`workspace-message alert alert-${msgType === "error" ? "error" : "success"}`}>
                {msgType === "error" ? "❌" : "✅"} {message}
              </div>
            )}

            {result && result.rows?.length > 0 && (
              <div className="workspace-result">
                <ResultTable rows={result.rows} columns={result.columns} />
              </div>
            )}

          </div>
        </div>
      </div>
    </Layout>
  );
}
