/**
 * EmployeesPage (Admin only) — real API-connected employee management.
 * Tabs:
 *   1. Active Employees  — live from analytics API
 *   2. Pending Approvals — employees awaiting approval (NEW)
 *   3. Add Employee      — admin-created employee (direct, immediate access)
 *   4. Join Code         — display and copy the org join code (NEW)
 */
import { useState, useEffect, useCallback } from "react";
import {
  UserPlus, Users, Clock, Copy, CheckCircle2, XCircle,
  RefreshCw, Key, Shield,
} from "lucide-react";
import Layout    from "../../components/Layout";
import Spinner   from "../../components/Spinner";
import { authAPI, analyticsAPI, getErrorMessage } from "../../services/api";
import { useToast } from "../../context/ToastContext";

const PASSWORD_RULES = "Min 8 chars, one uppercase, one lowercase, one digit.";
const EMPTY = { name: "", email: "", password: "" };

function validatePassword(pw) {
  if (pw.length < 8)      return "At least 8 characters required.";
  if (!/[A-Z]/.test(pw)) return "Must contain an uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Must contain a lowercase letter.";
  if (!/[0-9]/.test(pw)) return "Must contain a digit.";
  return "";
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/* ── Active Employees Tab ─────────────────────────────────── */
function ActiveEmployeesTab() {
  const [employees, setEmployees] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data } = await analyticsAPI.employees();
      setEmployees(data.filter(e => e.status === "active"));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: 32, textAlign: "center" }}><Spinner /></div>;
  if (error)   return <div className="alert alert-error">{error}</div>;
  if (!employees.length)
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Users size={40} /></div>
        <h3>No active employees</h3>
        <p>Use the "Add Employee" or "Join Code" tab to onboard team members.</p>
      </div>
    );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button className="btn btn-secondary btn-sm" onClick={load} id="refresh-employees-btn">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Email</th>
              <th>Total Queries</th>
              <th>Last Query</th>
              <th>Recent Questions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.user_id}>
                <td>
                  <div className="emp-name-cell">
                    <div className="emp-avatar-sm">
                      {emp.name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
                    </div>
                    <span>{emp.name}</span>
                  </div>
                </td>
                <td className="text-muted">{emp.email}</td>
                <td><strong>{emp.total_queries}</strong></td>
                <td className="text-muted" style={{ fontSize: 12 }}>
                  {emp.last_query_at ? formatDate(emp.last_query_at) : "Never"}
                </td>
                <td style={{ fontSize: 12, maxWidth: 260 }}>
                  {emp.recent_questions.length ? (
                    <ul style={{ margin: 0, padding: "0 0 0 14px", color: "var(--text-muted)" }}>
                      {emp.recent_questions.map((q, i) => (
                        <li key={i} style={{ marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240 }}>
                          {q}
                        </li>
                      ))}
                    </ul>
                  ) : <span className="text-muted">No queries yet</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Pending Approvals Tab ────────────────────────────────── */
function PendingApprovalsTab() {
  const { toast }       = useToast();
  const [pending,  setPending]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [actingId, setActingId] = useState(null);
  const [error,    setError]    = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data } = await authAPI.getPending();
      setPending(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id, name) {
    setActingId(id);
    try {
      await authAPI.approveEmployee(id);
      toast.success(`${name} approved — they can now log in.`);
      setPending(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(id, name) {
    setActingId(id);
    try {
      await authAPI.rejectEmployee(id);
      toast.info(`${name}'s request has been rejected.`);
      setPending(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActingId(null);
    }
  }

  if (loading) return <div style={{ padding: 32, textAlign: "center" }}><Spinner /></div>;
  if (error)   return <div className="alert alert-error">{error}</div>;
  if (!pending.length)
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><CheckCircle2 size={40} color="var(--success)" /></div>
        <h3>No pending requests</h3>
        <p>All employee join requests have been processed.</p>
      </div>
    );

  return (
    <div>
      <div className="alert" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
        <Clock size={13} style={{ display: "inline", marginRight: 6, color: "#ca8a04" }} />
        <span style={{ color: "#92400e" }}>
          {pending.length} employee{pending.length > 1 ? "s" : ""} waiting for your approval.
          They used your organisation's join code to register.
        </span>
      </div>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Requested On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((emp) => (
              <tr key={emp.id}>
                <td>
                  <div className="emp-name-cell">
                    <div className="emp-avatar-sm">
                      {emp.name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
                    </div>
                    <span>{emp.name}</span>
                  </div>
                </td>
                <td className="text-muted">{emp.email}</td>
                <td className="text-muted" style={{ fontSize: 12 }}>{formatDate(emp.created_at)}</td>
                <td>
                  <div className="flex-row" style={{ gap: 8 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={actingId === emp.id}
                      onClick={() => handleApprove(emp.id, emp.name)}
                      id={`approve-${emp.id}`}
                    >
                      {actingId === emp.id ? <Spinner /> : <><CheckCircle2 size={13} /> Approve</>}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      disabled={actingId === emp.id}
                      onClick={() => handleReject(emp.id, emp.name)}
                      id={`reject-${emp.id}`}
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Join Code Tab ────────────────────────────────────────── */
function JoinCodeTab() {
  const [info,    setInfo]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    authAPI.getJoinCode()
      .then(({ data }) => setInfo(data))
      .catch(err => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  function copyCode() {
    navigator.clipboard.writeText(info.join_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  if (loading) return <div style={{ padding: 32, textAlign: "center" }}><Spinner /></div>;
  if (error)   return <div className="alert alert-error">{error}</div>;

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Key size={18} color="var(--primary)" />
        <h3 className="card-title" style={{ margin: 0 }}>Organisation Join Code</h3>
      </div>
      <p className="card-subtitle" style={{ marginBottom: 24 }}>
        Share this code with employees so they can self-register. They'll need
        admin approval before gaining access.
      </p>

      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        background: "var(--bg-input, #f1f5f9)",
        border: "2px dashed var(--primary)",
        borderRadius: 12, padding: "18px 20px", marginBottom: 20,
      }}>
        <span style={{
          fontFamily: "monospace", fontSize: 28, fontWeight: 800,
          letterSpacing: 6, color: "var(--primary)", flex: 1,
        }}>
          {info?.join_code}
        </span>
        <button
          className={`btn ${copied ? "btn-success" : "btn-primary"} btn-sm`}
          onClick={copyCode}
          id="copy-join-code-btn"
        >
          {copied ? <><CheckCircle2 size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
        </button>
      </div>

      <div style={{
        background: "var(--primary-xlight, #EAE2ED)", border: "1px solid var(--border)",
        borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "var(--text-heading)",
        display: "flex", alignItems: "flex-start", gap: 10, lineHeight: 1.6
      }}>
        <Shield size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>How it works:</strong> Employees go to the <em>Sign Up</em> page, select "Join with Code", enter this code, and fill in their details. Their request appears in your <strong>Pending Approvals</strong> tab.
        </div>
      </div>
    </div>
  );
}

/* ── Add Employee Tab ────────────────────────────────────── */
function AddEmployeeTab() {
  const { toast } = useToast();
  const [form,    setForm]    = useState(EMPTY);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  function validate() {
    const errs = {};
    if (!form.name.trim())  errs.name  = "Full name is required.";
    if (!form.email.trim()) errs.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email.";
    const pwErr = validatePassword(form.password);
    if (pwErr) errs.password = pwErr;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: "" }));
    setSuccess(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await authAPI.createEmployee({
        name: form.name.trim(), email: form.email.trim(),
        password: form.password, role: "employee",
      });
      toast.success(`Employee account created for ${form.name.trim()}.`);
      setSuccess({ name: form.name.trim(), email: form.email.trim() });
      setForm(EMPTY);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h3 className="card-title">
        <UserPlus size={16} style={{ display: "inline", marginRight: 6 }} />
        Create Employee Account
      </h3>
      <p className="card-subtitle">
        Employee gets immediate access — no approval step needed for admin-created accounts.
      </p>

      {success && (
        <div className="alert alert-success">
          ✅ Account created for <strong>{success.name}</strong> ({success.email}).
          Share the password with them directly.
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="emp-name">Full name</label>
          <input id="emp-name" name="name" type="text"
            className={`form-input ${errors.name ? "error" : ""}`}
            placeholder="Jane Smith" value={form.name} onChange={handleChange} disabled={loading} />
          {errors.name && <p className="form-error">{errors.name}</p>}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="emp-email">Email address</label>
          <input id="emp-email" name="email" type="email"
            className={`form-input ${errors.email ? "error" : ""}`}
            placeholder="jane@company.com" value={form.email} onChange={handleChange}
            autoComplete="off" disabled={loading} />
          {errors.email && <p className="form-error">{errors.email}</p>}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="emp-password">Temporary password</label>
          <input id="emp-password" name="password" type="password"
            className={`form-input ${errors.password ? "error" : ""}`}
            placeholder="••••••••" value={form.password} onChange={handleChange}
            autoComplete="new-password" disabled={loading} />
          {errors.password
            ? <p className="form-error">{errors.password}</p>
            : <p className="form-hint">{PASSWORD_RULES}</p>}
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} id="create-employee-btn">
          {loading ? <><Spinner /> Creating…</> : <><UserPlus size={14} /> Create Employee</>}
        </button>
      </form>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────── */
export default function EmployeesPage() {
  const [activeTab, setActiveTab] = useState("list");
  const [pendingCount, setPendingCount] = useState(0);

  // Pre-fetch pending count for badge
  useEffect(() => {
    authAPI.getPending().then(({ data }) => setPendingCount(data.length)).catch(() => {});
  }, []);

  const TABS = [
    { id: "list",    label: "Active Employees", icon: <Users size={14} /> },
    { id: "pending", label: "Pending Approvals", icon: <Clock size={14} />, badge: pendingCount },
    { id: "add",     label: "Add Employee",      icon: <UserPlus size={14} /> },
    { id: "code",    label: "Join Code",         icon: <Key size={14} /> },
  ];

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h2 className="page-title">Employee Management</h2>
            <p className="page-subtitle">
              Manage employees, approve join requests, and share your organisation code.
            </p>
          </div>
        </div>

        <div className="page-body">
          <div className="tabs" role="tablist" aria-label="Employee management tabs">
            {TABS.map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`tab-btn ${activeTab === tab.id ? "tab-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
                id={`tab-${tab.id}`}
                style={{ position: "relative" }}
              >
                {tab.icon} {tab.label}
                {tab.badge > 0 && (
                  <span style={{
                    position: "absolute", top: -4, right: -4,
                    background: "#ef4444", color: "#fff",
                    fontSize: 10, fontWeight: 800, borderRadius: "50%",
                    width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{tab.badge}</span>
                )}
              </button>
            ))}
          </div>

          {activeTab === "list"    && <ActiveEmployeesTab />}
          {activeTab === "pending" && <PendingApprovalsTab />}
          {activeTab === "add"     && <AddEmployeeTab />}
          {activeTab === "code"    && <JoinCodeTab />}
        </div>
      </div>
    </Layout>
  );
}
