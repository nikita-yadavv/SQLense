/**
 * SignupPage — three modes:
 *   1. Admin signup (creates org, gets join code)
 *   2. Employee signup via join code (status=pending, awaits approval)
 *   3. Legacy direct employee creation (via admin) still works from EmployeesPage
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI, getErrorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Spinner from "../components/Spinner";
import { Key, Crown, Clock } from "lucide-react";

const PASSWORD_RULES = "At least 8 characters, one uppercase, one lowercase, one digit.";

function validatePassword(pw) {
  if (pw.length < 8)       return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw))  return "Must contain at least one uppercase letter.";
  if (!/[a-z]/.test(pw))  return "Must contain at least one lowercase letter.";
  if (!/[0-9]/.test(pw))  return "Must contain at least one digit.";
  return "";
}

export default function SignupPage() {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  // "admin" | "employee-join"
  const [mode, setMode] = useState("admin");
  const [pending, setPending] = useState(false);   // true after successful join

  const [form, setForm] = useState({
    name: "", email: "", password: "",
    organization_name: "",   // admin only
    join_code: "",           // employee-join only
  });
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [apiError, setApiError] = useState("");

  function validate() {
    const errs = {};
    if (!form.name.trim())  errs.name  = "Full name is required.";
    if (!form.email.trim()) errs.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email.";
    const pwErr = validatePassword(form.password);
    if (pwErr) errs.password = pwErr;
    if (mode === "admin" && !form.organization_name.trim())
      errs.organization_name = "Organisation name is required.";
    if (mode === "employee-join" && !form.join_code.trim())
      errs.join_code = "Join code is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError("");
    if (!validate()) return;
    setLoading(true);

    try {
      if (mode === "admin") {
        const { data } = await authAPI.signup({
          name:              form.name.trim(),
          email:             form.email.trim(),
          password:          form.password,
          role:              "admin",
          organization_name: form.organization_name.trim(),
        });
        login(data.access_token, data.role);
        toast.success("Admin account created! Welcome to SQLense.");
        navigate("/admin/dashboard", { replace: true });
      } else {
        // Employee self-registration via join code
        await authAPI.joinWithCode({
          name:      form.name.trim(),
          email:     form.email.trim(),
          password:  form.password,
          join_code: form.join_code.trim().toUpperCase(),
        });
        setPending(true);
      }
    } catch (err) {
      setApiError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    setApiError("");
  }

  // ── Pending approval screen ────────────────────────────────
  if (pending) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>⏳</div>
          <h2 className="auth-title">Request Submitted!</h2>
          <p className="auth-subtitle" style={{ marginBottom: 24 }}>
            Your account request has been sent to your organisation admin.<br />
            You'll be able to log in as soon as they approve your request.
          </p>
          <div className="alert" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
            <Clock size={14} style={{ display: "inline", marginRight: 6, color: "#6366f1" }} />
            <span style={{ fontSize: 13, color: "#4f46e5" }}>
              Approvals are usually processed within a few hours.
            </span>
          </div>
          <Link to="/login" className="btn btn-primary btn-full">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <h1>🤖 SQLense</h1>
          <p>AI-powered database analytics</p>
        </div>

        <h2 className="auth-title">Create an account</h2>

        {/* Mode selector */}
        <div className="role-selector" style={{ marginBottom: 20 }}>
          <div
            className={`role-option ${mode === "admin" ? "selected" : ""}`}
            onClick={() => { setMode("admin"); setApiError(""); }}
            role="button" tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setMode("admin")}
            id="mode-admin"
          >
            <Crown size={16} style={{ display: "inline", marginRight: 6 }} />
            Register as Admin
          </div>
          <div
            className={`role-option ${mode === "employee-join" ? "selected" : ""}`}
            onClick={() => { setMode("employee-join"); setApiError(""); }}
            role="button" tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setMode("employee-join")}
            id="mode-employee-join"
          >
            <Key size={16} style={{ display: "inline", marginRight: 6 }} />
            Join with Code
          </div>
        </div>

        {mode === "admin" && (
          <p className="form-hint" style={{ marginBottom: 12 }}>
            Admins create the organisation, connect a database, and manage employees.
          </p>
        )}
        {mode === "employee-join" && (
          <p className="form-hint" style={{ marginBottom: 12 }}>
            Have a join code from your admin? Register below — your admin will approve your request.
          </p>
        )}

        {apiError && (
          <div className="alert alert-error" role="alert">⚠️ {apiError}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Join Code (employee-join only) */}
          {mode === "employee-join" && (
            <div className="form-group">
              <label className="form-label" htmlFor="join_code">Organisation Join Code</label>
              <input
                id="join_code" name="join_code" type="text"
                className={`form-input ${errors.join_code ? "error" : ""}`}
                placeholder="e.g. ACMEX7Q2"
                value={form.join_code}
                onChange={handleChange}
                style={{ textTransform: "uppercase", letterSpacing: 2, fontFamily: "monospace", fontSize: 16 }}
                maxLength={8}
                disabled={loading}
              />
              {errors.join_code && <p className="form-error">{errors.join_code}</p>}
              <p className="form-hint">Ask your admin for this code.</p>
            </div>
          )}

          {/* Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full name</label>
            <input
              id="name" name="name" type="text"
              className={`form-input ${errors.name ? "error" : ""}`}
              placeholder="Jane Smith"
              value={form.name} onChange={handleChange}
              autoComplete="name" disabled={loading}
            />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="su-email">Email address</label>
            <input
              id="su-email" name="email" type="email"
              className={`form-input ${errors.email ? "error" : ""}`}
              placeholder="you@company.com"
              value={form.email} onChange={handleChange}
              autoComplete="email" disabled={loading}
            />
            {errors.email && <p className="form-error">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="su-password">Password</label>
            <input
              id="su-password" name="password" type="password"
              className={`form-input ${errors.password ? "error" : ""}`}
              placeholder="••••••••"
              value={form.password} onChange={handleChange}
              autoComplete="new-password" disabled={loading}
            />
            {errors.password
              ? <p className="form-error">{errors.password}</p>
              : <p className="form-hint">{PASSWORD_RULES}</p>}
          </div>

          {/* Org name (admin only) */}
          {mode === "admin" && (
            <div className="form-group">
              <label className="form-label" htmlFor="org-name">Organisation name</label>
              <input
                id="org-name" name="organization_name" type="text"
                className={`form-input ${errors.organization_name ? "error" : ""}`}
                placeholder="Acme Corporation"
                value={form.organization_name}
                onChange={handleChange} disabled={loading}
              />
              {errors.organization_name && (
                <p className="form-error">{errors.organization_name}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: 8 }}
            id="signup-submit-btn"
          >
            {loading ? (
              <><Spinner /> {mode === "admin" ? "Creating account…" : "Submitting request…"}</>
            ) : (
              mode === "admin" ? "Create Admin Account" : "Submit Join Request"
            )}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
