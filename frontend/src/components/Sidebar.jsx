/**
 * Sidebar — role-aware navigation with enhanced sections.
 * Includes: dashboard, recent chats (real data), database tables (real data).
 * Shows admin-only menu items only when role === "admin".
 * Clicking a recent chat restores the full conversation in chat.
 * Clicking a database table fires a SELECT query in chat.
 */
import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Plus, MessageSquare, History, Database,
  Terminal, Users, User, LogOut, Settings,
  LayoutDashboard, BarChart2, ChevronDown, ChevronRight,
  Table2, Shield, TrendingUp, Star, FileText, Loader2,
} from "lucide-react";
import { useAuth }  from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { authAPI, historyAPI, dbAPI } from "../services/api";

export default function Sidebar({ onNewChat }) {
  const { user, logout, isAdmin } = useAuth();
  const { toast }   = useToast();
  const navigate    = useNavigate();
  const profileRef  = useRef(null);

  const [showMenu,     setShowMenu]     = useState(false);
  const [showChats,    setShowChats]    = useState(true);
  const [showTables,   setShowTables]   = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Real data state
  const [recentChats,   setRecentChats]   = useState([]);
  const [chatsLoading,  setChatsLoading]  = useState(false);
  const [dbTables,      setDbTables]      = useState([]);
  const [tablesLoading, setTablesLoading] = useState(false);

  // Close profile menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch pending approval count for admins
  useEffect(() => {
    if (isAdmin) {
      authAPI.getPending()
        .then(({ data }) => setPendingCount(data.length))
        .catch(() => {});
    }
  }, [isAdmin]);

  // Fetch recent chats from real history
  useEffect(() => {
    if (!showChats) return;
    setChatsLoading(true);
    historyAPI.list(5, 0)
      .then(({ data }) => setRecentChats(data || []))
      .catch(() => setRecentChats([]))
      .finally(() => setChatsLoading(false));
  }, [showChats]);

  // Fetch real database tables when expanded
  useEffect(() => {
    if (!showTables) return;
    setTablesLoading(true);
    dbAPI.listTables()
      .then(({ data }) => setDbTables(data || []))
      .catch(() => setDbTables([]))
      .finally(() => setTablesLoading(false));
  }, [showTables]);

  function handleLogout() {
    logout();
    toast.info("You have been signed out.");
    navigate("/login", { replace: true });
  }

  // When a recent chat is clicked — restore the full conversation in chat window
  function handleRecentChatClick(item) {
    const messages = [
      {
        id: "hist-user-" + item.id,
        role: "user",
        text: item.question,
        userQuestion: item.question,
        timestamp: item.created_at,
      },
      {
        id: "hist-bot-" + item.id,
        role: "bot",
        text: item.answer_text || "Query executed.",
        answerText: item.answer_text || "",
        sql: item.sql_query || "",
        sqlExplanation: item.sql_explanation || "",
        chart: item.chart_type && item.chart_type !== "none"
          ? { type: item.chart_type }
          : null,
        columns: [],
        rows: [],
        timestamp: item.created_at,
      },
    ];
    localStorage.setItem("sqlense_restore_chat", JSON.stringify(messages));
    window.dispatchEvent(new CustomEvent("sqlense:restore_chat", { detail: messages }));
    navigate(`/chat?chat_id=${item.id}`, { state: { restoreMessages: messages, timestamp: Date.now() } });
  }

  // When a database table is clicked — auto-query it in chat
  function handleTableClick(tableName) {
    const question = `Show all records from ${tableName} (first 100 rows)`;
    const autoQuery = { pendingQuestion: question };
    localStorage.setItem("sqlense_auto_query", JSON.stringify(autoQuery));
    localStorage.removeItem("sqlense_active_chat");
    localStorage.removeItem("sqlense_restore_chat");
    window.dispatchEvent(new CustomEvent("sqlense:auto_query", { detail: question }));
    navigate(`/chat?table=${encodeURIComponent(tableName)}&t=${Date.now()}`, { state: { tableQuery: question, timestamp: Date.now() } });
  }

  function handleNewChat() {
    localStorage.removeItem("sqlense_restore_chat");
    localStorage.removeItem("sqlense_auto_query");
    localStorage.removeItem("sqlense_pending_query");
    window.dispatchEvent(new CustomEvent("sqlense:new_chat"));
    if (onNewChat) {
      onNewChat();
    }
    navigate(`/chat?new=${Date.now()}`);
  }

  const navClass = ({ isActive }) =>
    `menu-item ${isActive ? "active" : ""}`;

  // User initials for avatar
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  // Format time for recent chats
  function timeAgo(iso) {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  // Truncate title to fit sidebar width
  function truncate(str, n = 28) {
    return str && str.length > n ? str.slice(0, n) + "…" : str;
  }

  return (
    <div className="sidebar">
      {/* Logo */}
      <h2 className="logo">
        SQLense
      </h2>

      {/* New Chat button */}
      <button
        className="new-chat-btn"
        onClick={handleNewChat}
        id="sidebar-new-chat-btn"
      >
        <Plus size={16} /> New Chat
      </button>

      {/* Main navigation */}
      <div className="nav-section">
        <NavLink to="/dashboard" className={navClass} id="nav-dashboard">
          <LayoutDashboard size={17} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/chat" className={navClass} id="nav-chat">
          <MessageSquare size={17} />
          <span>Chat</span>
        </NavLink>

        <NavLink to="/history" className={navClass} id="nav-history">
          <History size={17} />
          <span>Query History</span>
        </NavLink>

        <NavLink to="/saved-charts" className={navClass} id="nav-saved-charts">
          <BarChart2 size={17} />
          <span>Saved Charts</span>
        </NavLink>

        <NavLink to={isAdmin ? "/admin/kpi-dashboard" : "/kpi-dashboard"} className={navClass} id="nav-kpi-dashboard">
          <Star size={17} />
          <span>KPI Dashboard</span>
        </NavLink>
      </div>

      {/* Recent Chats — real data from history API */}
      <div className="nav-section">
        <button
          className="sidebar-section-toggle"
          onClick={() => setShowChats((v) => !v)}
          aria-expanded={showChats}
          id="toggle-recent-chats"
        >
          <span className="nav-section-label">Recent Chats</span>
          {showChats ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        {showChats && (
          <div className="recent-chats-list">
            {chatsLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : recentChats.length === 0 ? (
              <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--text-muted)", opacity: 0.7 }}>
                No chats yet
              </div>
            ) : (
              recentChats.map((chat) => (
                <button
                  key={chat.id}
                  className="recent-chat-item"
                  onClick={() => handleRecentChatClick(chat)}
                  title={chat.question}
                  id={`recent-chat-${chat.id}`}
                >
                  <MessageSquare size={12} className="recent-chat-icon" />
                  <span className="recent-chat-title">{truncate(chat.question)}</span>
                  <span className="recent-chat-time">{timeAgo(chat.created_at)}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Database Tables — real tables from org's connected DB */}
      <div className="nav-section">
        <button
          className="sidebar-section-toggle"
          onClick={() => setShowTables((v) => !v)}
          aria-expanded={showTables}
          id="toggle-db-tables"
        >
          <span className="nav-section-label">Database Tables</span>
          {showTables ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        {showTables && (
          <div className="db-tables-list">
            {tablesLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : dbTables.length === 0 ? (
              <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--text-muted)", opacity: 0.7 }}>
                No tables found
              </div>
            ) : (
              dbTables.map((table) => (
                <button
                  key={table.name}
                  className="db-table-item"
                  id={`db-table-${table.name}`}
                  onClick={() => handleTableClick(table.name)}
                  title={`Click to query ${table.name}`}
                  style={{ cursor: "pointer", background: "none", border: "none", width: "100%", textAlign: "left", padding: 0 }}
                >
                  <span className="db-table-icon">🗄️</span>
                  <div className="db-table-info">
                    <span className="db-table-name">{table.name}</span>
                    <span className="db-table-rows">{table.rows.toLocaleString()} rows</span>
                  </div>
                  <Table2 size={11} className="db-table-schema-icon" />
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Admin-only section */}
      {isAdmin && (
        <div className="nav-section">
          <div className="nav-section-label">Admin</div>

          <NavLink to="/admin/dashboard" className={navClass} id="nav-admin-dashboard">
            <Shield size={17} />
            <span>Admin Dashboard</span>
          </NavLink>

          <NavLink to="/admin/database" className={navClass} id="nav-admin-database">
            <Database size={17} />
            <span>Database</span>
          </NavLink>

          <NavLink to="/admin/workspace" className={navClass} id="nav-admin-workspace">
            <Terminal size={17} />
            <span>SQL Workspace</span>
          </NavLink>

          <NavLink to="/admin/employees" className={navClass} id="nav-admin-employees"
            style={{ position: "relative" }}>
            <Users size={17} />
            <span>Employees</span>
            {pendingCount > 0 && (
              <span style={{
                marginLeft: "auto",
                background: "#ef4444", color: "#fff",
                fontSize: 10, fontWeight: 800,
                borderRadius: 50, padding: "1px 6px",
                lineHeight: "16px",
              }}>{pendingCount}</span>
            )}
          </NavLink>

          <NavLink to="/admin/analytics" className={navClass} id="nav-admin-analytics">
            <TrendingUp size={17} />
            <span>Analytics</span>
          </NavLink>

          <NavLink to="/admin/audit-log" className={navClass} id="nav-admin-audit">
            <FileText size={17} />
            <span>Audit Log</span>
          </NavLink>
        </div>
      )}

      {/* Profile section */}
      <div className="bottom-section" ref={profileRef}>
        {/* Profile popup */}
        {showMenu && (
          <div className="profile-popup">
            <NavLink
              to="/profile"
              className="popup-item"
              onClick={() => setShowMenu(false)}
              id="popup-profile"
            >
              <User size={16} />
              <span>Profile</span>
            </NavLink>
            <NavLink
              to="/settings"
              className="popup-item"
              onClick={() => setShowMenu(false)}
              id="popup-settings"
            >
              <Settings size={16} />
              <span>Settings</span>
            </NavLink>
            <div className="popup-divider" />
            <div className="popup-item logout" onClick={handleLogout} id="popup-logout">
              <LogOut size={16} />
              <span>Sign out</span>
            </div>
          </div>
        )}

        {/* Profile button */}
        <div
          className="profile"
          onClick={() => setShowMenu((v) => !v)}
          role="button"
          tabIndex={0}
          aria-label="Profile menu"
          id="sidebar-profile-btn"
          onKeyDown={(e) => e.key === "Enter" && setShowMenu((v) => !v)}
        >
          <div className="profile-icon" aria-hidden="true">
            {user?.name
              ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
              : user?.email ? user.email.slice(0, 2).toUpperCase() : "U"}
          </div>
          <div className="profile-info" style={{ overflow: "hidden" }}>
            <h4 style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
              {user?.name || user?.email || "User"}
            </h4>
            <p style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
              {user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : "User"}
              {user?.organization_name ? ` · ${user.organization_name}` : ""}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
