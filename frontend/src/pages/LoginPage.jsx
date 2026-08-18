import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authAPI, getErrorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Spinner from "../components/Spinner";

export default function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const [form,    setForm]    = useState({ email: "", password: "" });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const from = location.state?.from?.pathname || "/chat";

  function validate() {
    const errs = {};
    if (!form.email.trim())    errs.email    = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email.";
    if (!form.password.trim()) errs.password = "Password is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const { data } = await authAPI.login({
        email:    form.email.trim(),
        password: form.password,
      });
      login(data.access_token, data.role);
      toast.success("Welcome back!");
      navigate(from, { replace: true });
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
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <h1>🤖 SQLense</h1>
          <p>AI-powered database analytics</p>
        </div>

        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Sign in to your account to continue.</p>

        {/* API error banner */}
        {apiError && (
          <div className="alert alert-error" role="alert">
            ⚠️ {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              className={`form-input ${errors.email ? "error" : ""}`}
              placeholder="you@company.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              disabled={loading}
            />
            {errors.email && <p className="form-error">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className={`form-input ${errors.password ? "error" : ""}`}
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              disabled={loading}
            />
            {errors.password && <p className="form-error">{errors.password}</p>}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: "8px" }}
          >
            {loading ? <><Spinner /> Signing in…</> : "Sign In"}
          </button>
        </form>

        <p className="auth-link">
          Don&apos;t have an account?{" "}
          <Link to="/signup">Create one</Link>
        </p>
      </div>
    </div>
  );
}
