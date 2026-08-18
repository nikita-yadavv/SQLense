/**
 * SuperAdmin Dashboard — premium platform portal.
 *
 * Sections:
 *   Overview   — platform-wide stat cards + quick charts
 *   Organisations — full table with status indicators + search
 *   Reports    — daily trend charts (queries + signups)
 *   AI Chat    — platform AI assistant
 *   Profile    — name/password update
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Building2, BarChart2, Bot, User, LogOut, Send,
  RefreshCw, Wifi, WifiOff, Users, MessageSquare, TrendingUp,
  ChevronRight, Search, X, Save, Eye, EyeOff, Shield, Check,
  AlertCircle,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import Spinner from "../../components/Spinner";
import { superadminAPI, getErrorMessage } from "../../services/api";

/* ────────────────────────────────────────────────────────────────
   THEME TOKENS (inline — separate from main app CSS)
──────────────────────────────────────────────────────────────── */
const T = {
  bg:       "#0a0a1a",
  bgCard:   "rgba(20,20,50,0.85)",
  bgHover:  "rgba(99,102,241,0.08)",
  border:   "rgba(99,102,241,0.18)",
  primary:  "#6366f1",
  accent:   "#8b5cf6",
  success:  "#22c55e",
  warning:  "#f59e0b",
  danger:   "#ef4444",
  muted:    "rgba(165,180,252,0.55)",
  text:     "#e0e7ff",
  sidebar:  "rgba(15,10,40,0.98)",
  topbar:   "rgba(15,10,40,0.92)",
};

const glass = {
  background: T.bgCard,
  border: `1px solid ${T.border}`,
  borderRadius: 16,
  backdropFilter: "blur(12px)",
};

/* ────────────────────────────────────────────────────────────────
   STAT CARD
──────────────────────────────────────────────────────────────── */
function Stat({ icon, value, label, color, sub }) {
  return (
    <div style={{
      ...glass, padding: "22px 24px",
      display: "flex", flexDirection: "column", gap: 8,
      borderLeft: `3px solid ${color}`,
      transition: "transform 0.15s",
    }}
    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
    onMouseLeave={e => e.currentTarget.style.transform = ""}
    >
      <div style={{ color, opacity: 0.9 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: T.text, lineHeight: 1 }}>
        {value ?? <Spinner />}
      </div>
      <div style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: T.muted }}>{sub}</div>}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   OVERVIEW TAB
──────────────────────────────────────────────────────────────── */
function OverviewTab({ stats, loading, onNavigate }) {
  if (loading) return <div style={{ padding: 60, textAlign: "center" }}><Spinner /></div>;
  if (!stats)  return <p style={{ color: T.danger }}>Failed to load platform stats.</p>;

  return (
    <div>
      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16, marginBottom: 28 }}>
        <Stat icon={<Building2 size={22} />} value={stats.total_organizations}      label="Total Organisations"     color={T.primary} />
        <Stat icon={<Wifi size={22} />}       value={stats.connected_organizations}  label="DB Connected"           color={T.success}
              sub={`${stats.total_organizations - stats.connected_organizations} disconnected`} />
        <Stat icon={<Users size={22} />}       value={stats.total_users}             label="Total Users"            color={T.warning} />
        <Stat icon={<Users size={22} />}       value={stats.active_users}            label="Active Users"           color={T.success} />
        <Stat icon={<Users size={22} />}       value={stats.pending_users}           label="Pending Approval"       color={T.danger} />
        <Stat icon={<MessageSquare size={22} />} value={stats.total_ai_queries?.toLocaleString()} label="Total AI Queries" color={T.accent} />
        <Stat icon={<TrendingUp size={22} />}  value={stats.ai_queries_last_7_days?.toLocaleString()} label="Queries (7 Days)" color="#06b6d4" />
      </div>

      {/* Quick links */}
      <div style={{ ...glass, padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, letterSpacing: 1, marginBottom: 14 }}>QUICK ACCESS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10 }}>
          {[
            { label: "View Organisations", icon: <Building2 size={16} />, tab: "orgs", color: T.primary },
            { label: "Platform Reports",   icon: <BarChart2 size={16} />, tab: "reports", color: T.accent },
            { label: "AI Chat",            icon: <Bot size={16} />,       tab: "chat", color: T.success },
            { label: "My Profile",         icon: <User size={16} />,      tab: "profile", color: T.warning },
          ].map(item => (
            <button key={item.tab} onClick={() => onNavigate(item.tab)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                background: `${item.color}12`, border: `1px solid ${item.color}30`,
                borderRadius: 10, padding: "12px 14px", cursor: "pointer", color: T.text,
                fontSize: 13, fontWeight: 600, transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${item.color}25`; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${item.color}12`; e.currentTarget.style.transform = ""; }}
            >
              <span style={{ color: item.color }}>{item.icon}</span>
              {item.label}
              <ChevronRight size={13} style={{ marginLeft: "auto", color: T.muted }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   ORGANISATIONS TAB
──────────────────────────────────────────────────────────────── */
function OrgsTab() {
  const [orgs,    setOrgs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    superadminAPI.orgs()
      .then(({ data }) => setOrgs(data))
      .catch(err => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 60, textAlign: "center" }}><Spinner /></div>;
  if (error)   return <p style={{ color: T.danger }}>{error}</p>;

  const filtered = orgs.filter(o =>
    (o.organization_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.join_code || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16, maxWidth: 360 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.muted }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search organisations…"
          style={{
            width: "100%", boxSizing: "border-box",
            background: T.bgCard, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: "9px 12px 9px 36px",
            color: T.text, fontSize: 13, outline: "none",
          }}
        />
        {search && (
          <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.muted }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ ...glass, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Organisation", "Join Code", "DB Status", "Users", "Queries", "Registered"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: T.muted, fontWeight: 700, fontSize: 11, letterSpacing: 0.5, whiteSpace: "nowrap" }}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((org, i) => (
                <tr key={org.id} style={{
                  borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = T.bgHover}
                onMouseLeave={e => e.currentTarget.style.background = ""}
                >
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 700, color: T.text }}>{org.organization_name || "—"}</div>
                    <div style={{ fontSize: 10, color: T.muted, fontFamily: "monospace", marginTop: 2 }}>
                      {(org.org_id || "").slice(0, 8)}…
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <code style={{ background: `${T.primary}18`, color: T.primary, padding: "3px 8px", borderRadius: 6, fontSize: 12, letterSpacing: 2, fontWeight: 700 }}>
                      {org.join_code}
                    </code>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      background: org.connection_status === "connected" ? `${T.success}18` : `${T.warning}18`,
                      color:  org.connection_status === "connected" ? T.success : T.warning,
                      padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    }}>
                      {org.connection_status === "connected"
                        ? <><Wifi size={11} /> Connected</>
                        : <><WifiOff size={11} /> Disconnected</>}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", color: T.text }}>
                    <strong>{org.active_users}</strong>
                    <span style={{ color: T.muted }}> / {org.total_users}</span>
                    <div style={{ fontSize: 10, color: T.muted }}>active / total</div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <strong style={{ color: T.text }}>{org.total_queries?.toLocaleString()}</strong>
                  </td>
                  <td style={{ padding: "14px 16px", color: T.muted, fontSize: 12 }}>
                    {org.created_at ? new Date(org.created_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: T.muted }}>No organisations found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: T.muted }}>{filtered.length} of {orgs.length} organisations</div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   REPORTS TAB
──────────────────────────────────────────────────────────────── */
function ReportsTab() {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superadminAPI.reports()
      .then(({ data }) => setReports(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 60, textAlign: "center" }}><Spinner /></div>;
  if (!reports) return <p style={{ color: T.danger }}>Failed to load reports.</p>;

  const chartStyle = { ...glass, padding: "20px 24px", marginBottom: 20 };

  return (
    <div>
      <div style={chartStyle}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: T.text }}>Daily AI Query Volume — Last 30 Days</div>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>Total queries processed across all organisations per day.</div>
        {reports.daily_query_volume.length === 0
          ? <p style={{ color: T.muted, fontSize: 13, padding: "20px 0" }}>No data yet — queries will appear here once organisations start using the platform.</p>
          : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={reports.daily_query_volume}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: T.muted }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: T.muted }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text }} />
                <Line type="monotone" dataKey="count" name="Queries" stroke={T.primary} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )
        }
      </div>

      <div style={chartStyle}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: T.text }}>New Organisation Signups — Last 30 Days</div>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>Number of new organisations registering per day.</div>
        {reports.daily_org_signups.length === 0
          ? <p style={{ color: T.muted, fontSize: 13, padding: "20px 0" }}>No new signups in the last 30 days.</p>
          : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={reports.daily_org_signups}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: T.muted }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: T.muted }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text }} />
                <Bar dataKey="count" name="New Orgs" fill={T.success} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )
        }
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   AI CHAT TAB
──────────────────────────────────────────────────────────────── */
const SUGGESTIONS = [
  "Which organisation has the most AI queries?",
  "How many users joined in the last 7 days?",
  "Which organisations still haven't connected a database?",
  "What is the total number of AI queries processed?",
];

function AIChatTab() {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hello! I'm your platform AI assistant. I have access to live data about all organisations and usage metrics.\n\nTry one of the suggestions below, or ask me anything." }
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [ollamaOk, setOllamaOk] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(q) {
    const question = (q || input).trim();
    if (!question || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: question }]);
    setLoading(true);
    try {
      const { data } = await superadminAPI.chat(question);
      setMessages(prev => [...prev, { role: "ai", text: data.answer }]);
      // If answer contains AI unavailable notice, flag it
      if (data.answer?.includes("unavailable")) setOllamaOk(false);
      else setOllamaOk(true);
    } catch (err) {
      setMessages(prev => [...prev, { role: "ai", text: `Error: ${getErrorMessage(err)}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Ollama status banner */}
      {!ollamaOk && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: `${T.warning}12`, border: `1px solid ${T.warning}30`,
          borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13,
        }}>
          <AlertCircle size={16} color={T.warning} />
          <span style={{ color: T.warning }}>
            <strong>Ollama is not running.</strong> Start it with <code style={{ background: "rgba(0,0,0,0.3)", padding: "1px 6px", borderRadius: 4 }}>ollama serve</code> in your terminal to enable AI responses.
            The AI will fall back to a summary based on platform statistics.
          </span>
        </div>
      )}

      <div style={{ ...glass, display: "flex", flexDirection: "column", height: 520 }}>
        {/* Suggestion chips */}
        {messages.length <= 1 && (
          <div style={{ padding: "14px 16px 0", display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)}
                style={{
                  background: `${T.primary}15`, border: `1px solid ${T.primary}30`,
                  borderRadius: 20, padding: "6px 14px", fontSize: 12, color: T.text,
                  cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = `${T.primary}30`}
                onMouseLeave={e => e.currentTarget.style.background = `${T.primary}15`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
            }}>
              {msg.role === "ai" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: T.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Bot size={11} color="#fff" />
                  </div>
                  <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Platform AI</span>
                </div>
              )}
              <div style={{
                background: msg.role === "user" ? `linear-gradient(135deg,${T.primary},${T.accent})` : "rgba(255,255,255,0.05)",
                color: T.text, padding: "10px 14px", borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
                fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap",
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: "flex-start", padding: "10px 14px", background: "rgba(255,255,255,0.05)", borderRadius: "4px 14px 14px 14px" }}>
              <Spinner />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 10 }}>
          <input
            className="form-input"
            style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: `1px solid ${T.border}`, color: T.text, fontSize: 13 }}
            placeholder="Ask about platform metrics, org usage, queries…"
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            disabled={loading}
            id="sa-chat-input"
          />
          <button
            onClick={() => send()} disabled={loading || !input.trim()}
            style={{
              background: `linear-gradient(135deg,${T.primary},${T.accent})`,
              border: "none", borderRadius: 10, padding: "0 16px",
              color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              opacity: (!input.trim() || loading) ? 0.5 : 1, transition: "opacity 0.15s",
            }}
            id="sa-chat-send-btn"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   PROFILE TAB
──────────────────────────────────────────────────────────────── */
function ProfileTab() {
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState("");
  const [error,    setError]    = useState("");
  const [name,     setName]     = useState("");
  const [curPw,    setCurPw]    = useState("");
  const [newPw,    setNewPw]    = useState("");
  const [showPw,   setShowPw]   = useState(false);

  useEffect(() => {
    superadminAPI.me()
      .then(({ data }) => { setProfile(data); setName(data.name || ""); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!name.trim()) { setError("Name cannot be empty."); return; }
    if (newPw && newPw.length < 8) { setError("New password must be at least 8 characters."); return; }
    setSaving(true);
    try {
      await superadminAPI.updateMe({
        name: name.trim(),
        current_password: curPw || undefined,
        new_password: newPw || undefined,
      });
      setSuccess("Profile updated successfully!");
      setCurPw(""); setNewPw("");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 60, textAlign: "center" }}><Spinner /></div>;

  return (
    <div style={{ maxWidth: 520 }}>
      {/* Profile card */}
      <div style={{ ...glass, padding: "28px 28px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 60, height: 60, borderRadius: "50%",
            background: `linear-gradient(135deg,${T.primary},${T.accent})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 800, color: "#fff",
          }}>
            {(profile?.name || "S")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: T.text }}>{profile?.name || "SuperAdmin"}</div>
            <div style={{ fontSize: 13, color: T.muted }}>{profile?.email}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>
              Last login: {profile?.last_login_at ? new Date(profile.last_login_at).toLocaleString() : "—"}
            </div>
          </div>
        </div>

        {error   && <div style={{ background: `${T.danger}15`, border: `1px solid ${T.danger}30`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: T.danger, marginBottom: 16 }}>{error}</div>}
        {success && <div style={{ background: `${T.success}15`, border: `1px solid ${T.success}30`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: T.success, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><Check size={14} />{success}</div>}

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 }}>DISPLAY NAME</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", color: T.text, fontSize: 14, outline: "none" }}
              id="sa-profile-name"
            />
          </div>

          <div style={{ ...glass, padding: "16px 18px", marginBottom: 16, background: "rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 12 }}>CHANGE PASSWORD (leave blank to keep current)</div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 12, color: T.muted, marginBottom: 4 }}>Current Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  value={curPw} onChange={e => setCurPw(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 38px 9px 12px", color: T.text, fontSize: 13, outline: "none" }}
                  placeholder="Required if changing password"
                  id="sa-cur-pw"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.muted }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: T.muted, marginBottom: 4 }}>New Password</label>
              <input
                type={showPw ? "text" : "password"}
                value={newPw} onChange={e => setNewPw(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", color: T.text, fontSize: 13, outline: "none" }}
                placeholder="Min. 8 characters"
                id="sa-new-pw"
              />
            </div>
          </div>

          <button type="submit" disabled={saving}
            style={{
              width: "100%", padding: "12px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg,${T.primary},${T.accent})`,
              color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: saving ? 0.7 : 1,
            }}
            id="sa-save-profile-btn"
          >
            {saving ? <><Spinner /> Saving…</> : <><Save size={15} /> Save Changes</>}
          </button>
        </form>
      </div>

      {/* Security info */}
      <div style={{ ...glass, padding: "16px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 10 }}>ACCOUNT INFO</div>
        {[
          ["Account ID", profile?.id?.slice(0, 16) + "…"],
          ["Email", profile?.email],
          ["Role", "SuperAdmin — Platform Developer"],
          ["Account Created", profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
            <span style={{ color: T.muted }}>{k}</span>
            <span style={{ color: T.text, fontWeight: 500, fontFamily: k === "Account ID" ? "monospace" : undefined, fontSize: k === "Account ID" ? 11 : 13 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   MAIN DASHBOARD
──────────────────────────────────────────────────────────────── */
const TABS = [
  { id: "overview", label: "Overview",       icon: <LayoutDashboard size={18} /> },
  { id: "orgs",     label: "Organisations",  icon: <Building2 size={18} /> },
  { id: "reports",  label: "Reports",        icon: <BarChart2 size={18} /> },
  { id: "chat",     label: "AI Chat",        icon: <Bot size={18} /> },
  { id: "profile",  label: "Profile",        icon: <User size={18} /> },
];

export default function SuperAdminDashboard() {
  const navigate        = useNavigate();
  const [stats,    setStats]    = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [saName,   setSaName]   = useState("SuperAdmin");

  useEffect(() => {
    superadminAPI.stats()
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
    // Get name from stored token payload or fetch profile
    superadminAPI.me()
      .then(({ data }) => setSaName(data.name || "SuperAdmin"))
      .catch(() => {});
  }, []);

  function logout() {
    localStorage.removeItem("sqlense_superadmin_token");
    navigate("/superadmin/login", { replace: true });
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", fontFamily: "'Inter', 'Segoe UI', sans-serif", color: T.text }}>
      {/* ── Sidebar ── */}
      <div style={{
        width: 230, flexShrink: 0, background: T.sidebar,
        borderRight: `1px solid ${T.border}`,
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh", overflow: "hidden",
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 26 }}>🛡️</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 15, color: T.primary, letterSpacing: -0.5 }}>SQLense</div>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1 }}>SUPERADMIN PORTAL</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "14px 10px", overflowY: "auto" }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px", borderRadius: 10, border: "none",
                  background: active ? `${T.primary}20` : "transparent",
                  color: active ? T.primary : T.muted,
                  fontWeight: active ? 700 : 500, fontSize: 14,
                  cursor: "pointer", transition: "all 0.15s", marginBottom: 2,
                  textAlign: "left",
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.bgHover; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                id={`sa-nav-${tab.id}`}
              >
                {tab.icon}
                {tab.label}
                {active && <ChevronRight size={14} style={{ marginLeft: "auto" }} />}
              </button>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div style={{ padding: "14px 16px", borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: `linear-gradient(135deg,${T.primary},${T.accent})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0,
            }}>
              {saName[0]?.toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{saName}</div>
              <div style={{ fontSize: 10, color: T.muted }}>SuperAdmin</div>
            </div>
          </div>
          <button onClick={logout}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
              padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`,
              background: "transparent", color: T.muted, cursor: "pointer", fontSize: 13,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.danger; e.currentTarget.style.color = T.danger; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
            id="sa-logout-btn"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Topbar */}
        <div style={{
          background: T.topbar, borderBottom: `1px solid ${T.border}`,
          padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(12px)",
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: T.text }}>
              {TABS.find(t => t.id === activeTab)?.label}
            </div>
            <div style={{ fontSize: 12, color: T.muted }}>
              Platform-wide developer portal
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {activeTab === "overview" && (
              <button
                onClick={() => { setStatsLoading(true); superadminAPI.stats().then(({ data }) => setStats(data)).finally(() => setStatsLoading(false)); }}
                style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 12px", color: T.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
                id="sa-refresh-btn"
              >
                <RefreshCw size={13} /> Refresh
              </button>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: `${T.success}12`, border: `1px solid ${T.success}25`, borderRadius: 8, padding: "6px 12px" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.success }} />
              <span style={{ fontSize: 12, color: T.success, fontWeight: 600 }}>Platform Online</span>
            </div>
          </div>
        </div>

        {/* Page body */}
        <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
          {activeTab === "overview"  && <OverviewTab stats={stats} loading={statsLoading} onNavigate={setActiveTab} />}
          {activeTab === "orgs"      && <OrgsTab />}
          {activeTab === "reports"   && <ReportsTab />}
          {activeTab === "chat"      && <AIChatTab />}
          {activeTab === "profile"   && <ProfileTab />}
        </div>
      </div>
    </div>
  );
}
