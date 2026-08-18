/**
 * ProfilePage — shows real user data from /auth/me and allows updates via PUT /auth/me.
 */
import { useState } from "react";
import { User, Mail, Building, Shield, Calendar, Save, Eye, EyeOff, Loader } from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { authAPI, getErrorMessage } from "../services/api";

function AvatarCircle({ name, size = 80 }) {
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  return (
    <div
      className="profile-avatar-circle"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-label={`Avatar for ${name}`}
    >
      {initials}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--text-body)", fontFamily: "monospace" }}>{value || "—"}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { toast }            = useToast();

  const [nameVal,  setNameVal]  = useState(user?.name  || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwForm, setPwForm]     = useState({ current: "", newPw: "", confirm: "" });
  const [showPw, setShowPw]     = useState({ current: false, newPw: false });
  const [savingPw, setSavingPw] = useState(false);

  // ── Update name ──────────────────────────────────────────────────────────────
  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!nameVal.trim()) { toast.error("Name cannot be empty."); return; }
    setSavingProfile(true);
    try {
      const { data } = await authAPI.updateMe({ name: nameVal.trim() });
      updateUser({ name: data.name });
      toast.success("Profile updated!");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  }

  // ── Change password ──────────────────────────────────────────────────────────
  async function handleSavePassword(e) {
    e.preventDefault();
    if (!pwForm.current)       { toast.error("Enter your current password."); return; }
    if (pwForm.newPw.length < 8) { toast.error("New password must be at least 8 characters."); return; }
    if (pwForm.newPw !== pwForm.confirm) { toast.error("Passwords do not match."); return; }
    setSavingPw(true);
    try {
      await authAPI.updateMe({ current_password: pwForm.current, new_password: pwForm.newPw });
      setPwForm({ current: "", newPw: "", confirm: "" });
      toast.success("Password changed successfully!");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingPw(false);
    }
  }

  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "N/A";

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h2 className="page-title">Profile</h2>
            <p className="page-subtitle">Manage your personal information and account settings.</p>
          </div>
        </div>

        <div className="page-body">
          <div className="profile-layout">
            {/* ── Left: Avatar + Account Info ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Avatar card */}
              <div className="card" style={{ textAlign: "center", padding: "32px 24px" }}>
                <AvatarCircle name={user?.name || nameVal} size={80} />
                <h3 style={{ margin: "14px 0 4px", fontSize: 18, fontWeight: 700, color: "var(--text-heading)" }}>
                  {user?.name || "—"}
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                  {user?.email || "—"}
                </p>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  marginTop: 12, padding: "4px 14px", borderRadius: 20,
                  background: user?.role === "admin" ? "rgba(99,102,241,0.12)" : "rgba(16,185,129,0.12)",
                  color: user?.role === "admin" ? "var(--primary)" : "#10b981",
                  fontSize: 12, fontWeight: 700,
                }}>
                  <Shield size={11} />
                  {user?.role === "admin" ? "Admin" : "Employee"}
                </div>
              </div>

              {/* Account info */}
              <div className="card">
                <h4 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "var(--text-heading)" }}>
                  Account Details
                </h4>
                <InfoRow label="User ID"      value={user?.id ? user.id.slice(0, 16) + "…" : "—"} />
                <InfoRow label="Email"        value={user?.email} />
                <InfoRow label="Role"         value={user?.role} />
                <InfoRow label="Organisation" value={user?.organization_name} />
                <InfoRow label="Status"       value={user?.status} />
                <InfoRow label="Member since" value={joinDate} />
              </div>
            </div>

            {/* ── Right: Edit Forms ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Edit name */}
              <div className="card">
                <h4 style={{ margin: "0 0 20px", fontSize: 14, fontWeight: 700, color: "var(--text-heading)", display: "flex", alignItems: "center", gap: 8 }}>
                  <User size={16} /> Personal Information
                </h4>
                <form onSubmit={handleSaveProfile}>
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label">Display Name</label>
                    <input
                      className="form-input"
                      value={nameVal}
                      onChange={(e) => setNameVal(e.target.value)}
                      placeholder="Your full name"
                      id="profile-name"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label className="form-label">Email Address</label>
                    <input
                      className="form-input"
                      value={user?.email || ""}
                      readOnly
                      style={{ opacity: 0.6, cursor: "not-allowed" }}
                      title="Email cannot be changed"
                      id="profile-email"
                    />
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Email cannot be changed.</p>
                  </div>
                  <button className="btn btn-primary" type="submit" disabled={savingProfile} id="save-profile-btn">
                    {savingProfile ? <><Loader size={14} className="spin" /> Saving…</> : <><Save size={14} /> Save Changes</>}
                  </button>
                </form>
              </div>

              {/* Change password */}
              <div className="card">
                <h4 style={{ margin: "0 0 20px", fontSize: 14, fontWeight: 700, color: "var(--text-heading)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Shield size={16} /> Change Password
                </h4>
                <form onSubmit={handleSavePassword}>
                  {[
                    { key: "current", label: "Current Password",  id: "pw-current" },
                    { key: "newPw",   label: "New Password",      id: "pw-new" },
                    { key: "confirm", label: "Confirm New Password", id: "pw-confirm" },
                  ].map(({ key, label, id }) => (
                    <div className="form-group" key={key} style={{ marginBottom: 16, position: "relative" }}>
                      <label className="form-label">{label}</label>
                      <input
                        id={id}
                        className="form-input"
                        type={showPw[key] ? "text" : "password"}
                        value={pwForm[key] || ""}
                        onChange={(e) => setPwForm((p) => ({ ...p, [key]: e.target.value }))}
                        placeholder="••••••••"
                        style={{ paddingRight: 40 }}
                      />
                      <button type="button"
                        onClick={() => setShowPw((p) => ({ ...p, [key]: !p[key] }))}
                        style={{ position: "absolute", right: 10, bottom: 10, background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                        tabIndex={-1}
                      >
                        {showPw[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  ))}
                  <button className="btn btn-primary" type="submit" disabled={savingPw} id="save-password-btn">
                    {savingPw ? <><Loader size={14} className="spin" /> Updating…</> : <><Shield size={14} /> Update Password</>}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
