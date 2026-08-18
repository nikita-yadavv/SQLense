/**
 * DatabasePage (Admin only)
 * Manage the organisation's database connection.
 * Endpoints: POST /api/database/connect | POST /api/database/test
 *            PUT  /api/database/update  | GET  /api/database/status
 *            DELETE /api/database/disconnect
 */
import { useState, useEffect } from "react";
import { Plug, PlugZap, RefreshCw } from "lucide-react";
import Layout       from "../../components/Layout";
import Spinner      from "../../components/Spinner";
import { dbAPI, getErrorMessage } from "../../services/api";
import { useToast } from "../../context/ToastContext";

const EMPTY_FORM = {
  organization_name: "",
  host:      "localhost",
  port:      "5432",
  database:  "",
  username:  "",
  password:  "",
  ssl_mode:  "",
};

export default function DatabasePage() {
  const { toast } = useToast();

  const [status,        setStatus]        = useState(null);
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [errors,        setErrors]        = useState({});
  const [mode,          setMode]          = useState("view"); // "view" | "connect" | "update"
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [testResult,    setTestResult]    = useState(null);
  const [refreshKey,    setRefreshKey]    = useState(0); // trigger re-fetch

  // ── Fetch current status ────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    dbAPI.getStatus()
      .then(({ data }) => {
        if (!cancelled) {
          setStatus(data);
          setLoadingStatus(false);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status !== 404) {
          toast.error(getErrorMessage(err));
        }
        setLoadingStatus(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  function triggerRefresh() {
    setRefreshKey((k) => k + 1);
  }

  // ── Validation ──────────────────────────────────────────
  function validate() {
    const errs = {};
    if (!form.organization_name.trim()) errs.organization_name = "Required";
    if (!form.host.trim())     errs.host     = "Required";
    if (!form.port)            errs.port     = "Required";
    if (!form.database.trim()) errs.database = "Required";
    if (!form.username.trim()) errs.username = "Required";
    if (mode === "connect" && !form.password.trim()) errs.password = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
    setTestResult(null);
  }

  // ── Test connection ─────────────────────────────────────
  async function handleTest() {
    if (!validate()) return;
    setLoadingAction(true);
    setTestResult(null);
    try {
      const payload = { ...form, port: Number(form.port) };
      const { data } = await dbAPI.test(payload);
      setTestResult(data);
      if (data.success) toast.success(`Connected! ${data.tables_found} table(s) found.`);
      else              toast.error(data.message);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingAction(false);
    }
  }

  // ── Connect / Update ────────────────────────────────────
  async function handleSave() {
    if (!validate()) return;
    setLoadingAction(true);
    try {
      const payload = { ...form, port: Number(form.port) };
      if (!payload.ssl_mode) delete payload.ssl_mode;
      if (mode === "connect") {
        await dbAPI.connect(payload);
        toast.success("Database connected successfully!");
      } else {
        if (!payload.password) delete payload.password;
        await dbAPI.update(payload);
        toast.success("Database configuration updated.");
      }
      setMode("view");
      triggerRefresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingAction(false);
    }
  }

  // ── Disconnect ──────────────────────────────────────────
  async function handleDisconnect() {
    if (!window.confirm("Mark the database as disconnected? Credentials are kept.")) return;
    setLoadingAction(true);
    try {
      await dbAPI.disconnect();
      toast.info("Database disconnected. Credentials retained.");
      triggerRefresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingAction(false);
    }
  }

  // ── Pre-fill form for update ────────────────────────────
  function openUpdate() {
    setForm({
      organization_name: status?.organization_name || "",
      host:     status?.host     || "",
      port:     String(status?.port || 5432),
      database: status?.database || "",
      username: "",
      password: "",
      ssl_mode: "",
    });
    setErrors({});
    setTestResult(null);
    setMode("update");
  }

  const isConnected = status?.connection_status === "connected";
  const showForm    = mode === "connect" || mode === "update";

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <h2 className="page-title">Database Configuration</h2>
          <p className="page-subtitle">Manage your organisation&apos;s database connection.</p>
        </div>

        <div className="page-body">

          {/* ── Status card ── */}
          <div className="card" style={{ marginBottom: "20px" }}>
            <div className="flex-between" style={{ marginBottom: "12px" }}>
              <h3 className="card-title">Connection Status</h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={triggerRefresh}
                disabled={loadingStatus}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {loadingStatus ? (
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <Spinner /> <span>Loading status…</span>
              </div>
            ) : status ? (
              <div style={{ display: "grid", gap: "8px" }}>
                <div className="flex-row">
                  <span className={`status-dot ${isConnected ? "connected" : "disconnected"}`} />
                  <span className={`badge ${isConnected ? "badge-success" : "badge-error"}`}>
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>
                {status.organization_name && (
                  <p style={{ fontSize: "13px", color: "var(--text-body)" }}>
                    <strong>Organisation:</strong> {status.organization_name}
                  </p>
                )}
                {status.host && (
                  <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                    {status.host} / {status.database} ({status.db_type})
                  </p>
                )}
                {status.last_connected_at && (
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Last connected: {new Date(status.last_connected_at).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                No database configured yet. Click &ldquo;Connect Database&rdquo; to get started.
              </p>
            )}

            {/* Action buttons */}
            <div className="flex-row" style={{ marginTop: "16px", flexWrap: "wrap" }}>
              {!isConnected && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => { setMode("connect"); setForm(EMPTY_FORM); setErrors({}); setTestResult(null); }}
                >
                  <Plug size={14} /> Connect Database
                </button>
              )}
              {isConnected && (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={openUpdate}>
                    <PlugZap size={14} /> Update Config
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={handleDisconnect}
                    disabled={loadingAction}
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Connection form ── */}
          {showForm && (
            <div className="card">
              <h3 className="card-title">
                {mode === "connect" ? "Connect a Database" : "Update Connection"}
              </h3>
              <p className="card-subtitle">
                {mode === "connect"
                  ? "Enter your PostgreSQL credentials. Test the connection before saving."
                  : "Update one or more fields. Leave password blank to keep the existing one."}
              </p>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Organisation name *</label>
                  <input name="organization_name"
                    className={`form-input ${errors.organization_name ? "error" : ""}`}
                    placeholder="Acme Corp" value={form.organization_name} onChange={handleChange} />
                  {errors.organization_name && <p className="form-error">{errors.organization_name}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Database name *</label>
                  <input name="database"
                    className={`form-input ${errors.database ? "error" : ""}`}
                    placeholder="sales_db" value={form.database} onChange={handleChange} />
                  {errors.database && <p className="form-error">{errors.database}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Host *</label>
                  <input name="host"
                    className={`form-input ${errors.host ? "error" : ""}`}
                    placeholder="localhost" value={form.host} onChange={handleChange} />
                  {errors.host && <p className="form-error">{errors.host}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Port *</label>
                  <input name="port" type="number"
                    className={`form-input ${errors.port ? "error" : ""}`}
                    placeholder="5432" value={form.port} onChange={handleChange} />
                  {errors.port && <p className="form-error">{errors.port}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input name="username"
                    className={`form-input ${errors.username ? "error" : ""}`}
                    placeholder="db_user" value={form.username} onChange={handleChange}
                    autoComplete="username" />
                  {errors.username && <p className="form-error">{errors.username}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Password {mode === "update" ? "(leave blank to keep existing)" : "*"}
                  </label>
                  <input name="password" type="password"
                    className={`form-input ${errors.password ? "error" : ""}`}
                    placeholder="••••••••" value={form.password} onChange={handleChange}
                    autoComplete="new-password" />
                  {errors.password && <p className="form-error">{errors.password}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">SSL mode (optional)</label>
                  <select name="ssl_mode" className="form-input"
                    value={form.ssl_mode} onChange={handleChange}>
                    <option value="">Default (prefer)</option>
                    <option value="disable">disable</option>
                    <option value="allow">allow</option>
                    <option value="prefer">prefer</option>
                    <option value="require">require</option>
                    <option value="verify-ca">verify-ca</option>
                    <option value="verify-full">verify-full</option>
                  </select>
                </div>
              </div>

              {/* Test result banner */}
              {testResult && (
                <div className={`alert ${testResult.success ? "alert-success" : "alert-error"}`}>
                  {testResult.success
                    ? `✅ ${testResult.message}`
                    : `❌ ${testResult.message}`}
                </div>
              )}

              <div className="flex-row" style={{ marginTop: "8px", flexWrap: "wrap" }}>
                <button className="btn btn-secondary" onClick={handleTest} disabled={loadingAction}>
                  {loadingAction ? <><Spinner /> Testing…</> : "🔌 Test Connection"}
                </button>
                <button className="btn btn-primary" onClick={handleSave} disabled={loadingAction}>
                  {loadingAction
                    ? <><Spinner /> Saving…</>
                    : (mode === "connect" ? "Connect & Save" : "Save Changes")}
                </button>
                <button className="btn btn-secondary" onClick={() => setMode("view")} disabled={loadingAction}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
