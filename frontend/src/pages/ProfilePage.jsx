/**
 * ProfilePage — shows real user data from /auth/me and allows updates via PUT /auth/me.
 * Also includes Danger Zone for account self-deletion.
 */
import { useState } from "react";
import { User, Shield, Save, Eye, EyeOff, Loader, Trash2, AlertTriangle } from "lucide-react";
import Layout from "../components/Layout";
import { useNavigate } from "react-router-dom";
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
  const { user, updateUser, logout, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [nameVal, setNameVal] = useState(user?.name || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, newPw: false });
  const [savingPw, setSavingPw] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

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
    if (!pwForm.current) { toast.error("Enter your current password."); return; }
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

  // ── Delete account ───────────────────────────────────────────────────────────
  async function handleDeleteAccount() {
    setDeletingAccount(true);
    try {
      await authAPI.deleteMyAccount();
      logout();
      navigate("/login", { replace: true });
    } catch (err) {
      const msg = getErrorMessage(err);
      if (msg.toLowerCase().includes("employee")) {
        toast.error(msg, "Cannot Delete Account");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      setShowDeleteModal(false);
    } finally {
      setDeletingAccount(false);
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
                  background: isAdmin ? "rgba(99,102,241,0.12)" : "rgba(16,185,129,0.12)",
                  color: isAdmin ? "var(--primary)" : "#10b981",
                  fontSize: 12, fontWeight: 700,
                }}>
                  <Shield size={11} />
                  {isAdmin ? "Admin" : "Employee"}
                </div>
              </div>

              {/* Account info */}
              <div className="card">
                <h4 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "var(--text-heading)" }}>
                  Account Details
                </h4>
                <InfoRow label="User ID" value={user?.id ? user.id.slice(0, 16) + "…" : "—"} />
                <InfoRow label="Email" value={user?.email} />
                <InfoRow label="Role" value={user?.role} />
                <InfoRow label="Organisation" value={user?.organization_name} />
                <InfoRow label="Status" value={user?.status} />
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
                    { key: "current", label: "Current Password", id: "pw-current" },
                    { key: "newPw", label: "New Password", id: "pw-new" },
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
                      <button
                        type="button"
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

          {/* ── Delete Account ── */}
          <div style={{ marginTop: 24 }}>
            <div className="card" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "#ef4444", display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={16} /> Danger Zone
              </h4>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.6 }}>
                {isAdmin
                  ? "Permanently delete your admin account and all organisation data. You must remove all employees first."
                  : "Permanently delete your account and all your query history, saved charts, and data."}
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                id="delete-account-btn"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 8,
                  border: "1px solid rgba(239,68,68,0.4)",
                  background: "rgba(239,68,68,0.06)", color: "#ef4444",
                  fontWeight: 600, fontSize: 13, cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; }}
              >
                <Trash2 size={14} /> Delete My Account
              </button>
            </div>
          </div>
        </div>

        {/* Delete Account Confirmation Modal */}
        {showDeleteModal && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
          }}>
            <div style={{
              background: "var(--bg, #fff)", borderRadius: 16,
              padding: "32px 28px", maxWidth: 440, width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              border: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "rgba(239,68,68,0.1)", display: "flex",
                  alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Trash2 size={22} color="#ef4444" />
                </div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-heading)" }}>
                  Delete Your Account
                </h3>
              </div>
              <p style={{ fontSize: 14, color: "var(--text-body)", lineHeight: 1.6, margin: "0 0 8px" }}>
                You are about to permanently delete your account.
              </p>
              {isAdmin ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, margin: "0 0 6px" }}>
                  This will delete your admin account, the organisation's database config, all KPI tiles, and all associated data.
                </p>
              ) : (
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, margin: "0 0 6px" }}>
                  All your query history, saved charts, and audit records will also be deleted.
                </p>
              )}
              <p style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", margin: "0 0 24px" }}>
                This action is permanent and cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deletingAccount}
                  id="delete-modal-cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  id="delete-modal-confirm"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "8px 18px", borderRadius: 8, border: "none",
                    background: "#ef4444", color: "#fff", fontWeight: 600,
                    fontSize: 13, cursor: deletingAccount ? "not-allowed" : "pointer",
                    opacity: deletingAccount ? 0.7 : 1,
                  }}
                >
                  <Trash2 size={14} />
                  {deletingAccount ? "Deleting…" : "Yes, Delete My Account"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
