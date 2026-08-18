/**
 * SuperAdmin Login — premium portal entry page.
 * Completely separate from the regular user/admin login.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { superadminAPI, getErrorMessage } from "../../services/api";
import Spinner from "../../components/Spinner";
import { Shield, Eye, EyeOff, Lock, Mail } from "lucide-react";

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [show,     setShow]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await superadminAPI.login({ email, password });
      localStorage.setItem("sqlense_superadmin_token", data.access_token);
      navigate("/superadmin/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 60% 20%, #1e1b4b 0%, #0a0a1a 60%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter','Segoe UI',sans-serif",
      padding: 24,
      position: "relative", overflow: "hidden",
    }}>
      {/* Decorative blobs */}
      <div style={{ position: "absolute", top: "8%",  left: "12%",  width: 320, height: 320, background: "rgba(99,102,241,0.07)",  borderRadius: "50%", filter: "blur(80px)" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "8%", width: 260, height: 260, background: "rgba(139,92,246,0.06)", borderRadius: "50%", filter: "blur(60px)" }} />

      <div style={{
        width: "100%", maxWidth: 420,
        background: "rgba(15,10,40,0.92)",
        border: "1px solid rgba(99,102,241,0.2)",
        borderRadius: 20,
        padding: "40px 36px",
        backdropFilter: "blur(20px)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        position: "relative", zIndex: 1,
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 8px 32px rgba(99,102,241,0.35)",
          }}>
            <Shield size={28} color="#fff" />
          </div>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "rgba(139,92,246,0.8)", fontWeight: 700, marginBottom: 6 }}>
            DEVELOPER PORTAL
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#e0e7ff", margin: "0 0 6px", letterSpacing: -0.5 }}>
            SuperAdmin Login
          </h1>
          <p style={{ fontSize: 13, color: "rgba(165,180,252,0.55)", margin: 0 }}>
            Restricted to authorised platform developers only.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 10, padding: "10px 14px", marginBottom: 20,
            fontSize: 13, color: "#fca5a5", display: "flex", alignItems: "center", gap: 8,
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(165,180,252,0.7)", letterSpacing: 0.5, marginBottom: 7 }}>
              ADMIN EMAIL
            </label>
            <div style={{ position: "relative" }}>
              <Mail size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "rgba(165,180,252,0.4)" }} />
              <input
                id="sa-email" type="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="superadmin@sqlense.dev"
                autoComplete="email" disabled={loading}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(99,102,241,0.25)",
                  borderRadius: 10, padding: "11px 14px 11px 38px",
                  color: "#e0e7ff", fontSize: 14, outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.7)"}
                onBlur={e => e.target.style.borderColor = "rgba(99,102,241,0.25)"}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 26 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(165,180,252,0.7)", letterSpacing: 0.5, marginBottom: 7 }}>
              PASSWORD
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "rgba(165,180,252,0.4)" }} />
              <input
                id="sa-password" type={show ? "text" : "password"}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password"
                disabled={loading}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(99,102,241,0.25)",
                  borderRadius: 10, padding: "11px 40px 11px 38px",
                  color: "#e0e7ff", fontSize: 14, outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.7)"}
                onBlur={e => e.target.style.borderColor = "rgba(99,102,241,0.25)"}
              />
              <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(165,180,252,0.4)", padding: 2 }}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit" disabled={loading || !email || !password}
            style={{
              width: "100%", padding: "13px",
              borderRadius: 12, border: "none",
              background: (loading || !email || !password)
                ? "rgba(99,102,241,0.3)"
                : "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "#fff", fontWeight: 700, fontSize: 15,
              cursor: (loading || !email || !password) ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
              transition: "all 0.2s",
            }}
            id="superadmin-login-btn"
          >
            {loading ? <><Spinner /> Authenticating…</> : <><Shield size={16} /> Access Portal</>}
          </button>
        </form>

        {/* Footer note */}
        <p style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: "rgba(165,180,252,0.3)" }}>
          Not a developer? <a href="/login" style={{ color: "rgba(99,102,241,0.7)", textDecoration: "none" }}>Regular user login →</a>
        </p>
      </div>
    </div>
  );
}
