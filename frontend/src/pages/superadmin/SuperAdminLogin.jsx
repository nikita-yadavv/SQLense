/**
 * SuperAdminLogin — Luminous Glassmorphism Developer Portal Login.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, Mail, Eye, EyeOff, Sparkles, KeyRound } from "lucide-react";
import Spinner from "../../components/Spinner";
import { superadminAPI, getErrorMessage } from "../../services/api";

export default function SuperAdminLogin() {
  const navigate = useNavigate();

  const [email,    setEmail]    = useState("superadmin@sqlense.dev");
  const [password, setPassword] = useState("");
  const [show,     setShow]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");
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
      background: "radial-gradient(at 10% 10%, rgba(99, 102, 241, 0.18) 0px, transparent 45%), radial-gradient(at 90% 20%, rgba(168, 85, 247, 0.15) 0px, transparent 40%), radial-gradient(at 50% 90%, rgba(56, 189, 248, 0.14) 0px, transparent 50%), #f8fafc",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: 24,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Luminous Ambient Glass Orbs */}
      <div style={{
        position: "absolute", top: "15%", left: "18%",
        width: 380, height: 380,
        background: "radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, rgba(99, 102, 241, 0) 70%)",
        borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute", bottom: "12%", right: "16%",
        width: 420, height: 420,
        background: "radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0) 70%)",
        borderRadius: "50%", filter: "blur(70px)", pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute", top: "45%", right: "35%",
        width: 300, height: 300,
        background: "radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(56, 189, 248, 0) 70%)",
        borderRadius: "50%", filter: "blur(50px)", pointerEvents: "none"
      }} />

      {/* Main Frosted Glass Card */}
      <div style={{
        width: "100%", maxWidth: 430,
        background: "rgba(255, 255, 255, 0.78)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255, 255, 255, 0.9)",
        borderRadius: 24,
        padding: "42px 38px",
        boxShadow: "0 20px 50px -10px rgba(99, 102, 241, 0.18), 0 0 0 1px rgba(99, 102, 241, 0.08), 0 8px 16px -4px rgba(0,0,0,0.03)",
        position: "relative",
        zIndex: 1,
      }}>
        {/* Top Badge & Header */}
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 10px 25px -4px rgba(79, 70, 229, 0.45)",
          }}>
            <Shield size={30} color="#ffffff" />
          </div>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 11, letterSpacing: 1.5, color: "#6366f1", fontWeight: 800,
            background: "rgba(99, 102, 241, 0.1)", padding: "4px 12px", borderRadius: 20,
            marginBottom: 10, border: "1px solid rgba(99, 102, 241, 0.15)"
          }}>
            <Sparkles size={11} /> DEVELOPER PORTAL
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 6px", letterSpacing: -0.5 }}>
            SuperAdmin Access
          </h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
            Restricted to authorised platform administrators only.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: 12, padding: "12px 16px", marginBottom: 20,
            fontSize: 13, color: "#dc2626", display: "flex", alignItems: "center", gap: 8,
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: 0.5, marginBottom: 7 }}>
              ADMIN EMAIL
            </label>
            <div style={{ position: "relative" }}>
              <Mail size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                id="sa-email" type="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="superadmin@sqlense.dev"
                autoComplete="email" disabled={loading}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255, 255, 255, 0.9)",
                  border: "1.5px solid rgba(203, 213, 225, 0.8)",
                  borderRadius: 12, padding: "12px 14px 12px 40px",
                  color: "#0f172a", fontSize: 14, outline: "none",
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)",
                  transition: "all 0.15s ease",
                }}
                onFocus={e => { e.target.style.borderColor = "#6366f1"; e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.15)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(203, 213, 225, 0.8)"; e.target.style.boxShadow = "inset 0 1px 2px rgba(0,0,0,0.02)"; }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 26 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: 0.5, marginBottom: 7 }}>
              PASSWORD
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                id="sa-password" type={show ? "text" : "password"}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password"
                disabled={loading}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255, 255, 255, 0.9)",
                  border: "1.5px solid rgba(203, 213, 225, 0.8)",
                  borderRadius: 12, padding: "12px 42px 12px 40px",
                  color: "#0f172a", fontSize: 14, outline: "none",
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)",
                  transition: "all 0.15s ease",
                }}
                onFocus={e => { e.target.style.borderColor = "#6366f1"; e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.15)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(203, 213, 225, 0.8)"; e.target.style.boxShadow = "inset 0 1px 2px rgba(0,0,0,0.02)"; }}
              />
              <button
                type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4,
                  display: "flex", alignItems: "center"
                }}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit" disabled={loading || !email || !password}
            style={{
              width: "100%", padding: "14px",
              borderRadius: 14, border: "none",
              background: (loading || !email || !password)
                ? "rgba(99, 102, 241, 0.35)"
                : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              color: "#fff", fontWeight: 700, fontSize: 15,
              cursor: (loading || !email || !password) ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: (loading || !email || !password) ? "none" : "0 10px 25px -4px rgba(79, 70, 229, 0.4)",
              transition: "all 0.2s ease",
            }}
            id="superadmin-login-btn"
          >
            {loading ? <><Spinner /> Authenticating…</> : <><Shield size={16} /> Access Developer Portal</>}
          </button>
        </form>

        {/* Quick Credentials Helper Box */}
        <div style={{
          marginTop: 22, padding: "10px 14px", borderRadius: 12,
          background: "rgba(99, 102, 241, 0.05)", border: "1px solid rgba(99, 102, 241, 0.12)",
          fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <KeyRound size={13} color="#6366f1" />
            <span>Pass: <code>SuperAdmin@1234</code></span>
          </div>
          <button
            type="button"
            onClick={() => setPassword("SuperAdmin@1234")}
            style={{
              background: "none", border: "none", color: "#6366f1",
              fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0
            }}
          >
            Auto-fill
          </button>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: "center", marginTop: 20, marginBottom: 0, fontSize: 12, color: "#94a3b8" }}>
          Not a platform developer? <a href="/login" style={{ color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>Regular user login →</a>
        </p>
      </div>
    </div>
  );
}
