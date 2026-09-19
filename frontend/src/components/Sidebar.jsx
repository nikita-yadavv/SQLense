import { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  MessageSquare,
  History,
  Bookmark,
  LayoutDashboard,
  Shield,
  Plus,
  LogOut,
  Sparkles,
  ChevronDown,
  Database,
  Users,
  Code2,
  FileText,
  Building,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { historyAPI, dbAPI } from "../services/api";

export default function Sidebar({ onNewChat }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [recentChats, setRecentChats] = useState([]);
  const [tables, setTables] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [chatsOpen, setChatsOpen] = useState(true);
  const [tablesOpen, setTablesOpen] = useState(true);

  // Fetch recent queries from /api/history (last 5)
  useEffect(() => {
    let cancelled = false;
    setLoadingChats(true);

    historyAPI.list({ limit: 5 })
      .then(({ data }) => {
        if (!cancelled) {
          const list = Array.isArray(data) ? data : data?.items || [];
          setRecentChats(list.slice(0, 5));
        }
      })
      .catch(() => {
        if (!cancelled) setRecentChats([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingChats(false);
      });

    return () => { cancelled = true; };
  }, [location.pathname, location.key]);

  // Fetch real database tables
  useEffect(() => {
    let cancelled = false;
    setLoadingTables(true);

    dbAPI.listTables()
      .then(({ data }) => {
        if (!cancelled && Array.isArray(data)) {
          setTables(data);
        }
      })
      .catch(() => {
        if (!cancelled) setTables([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingTables(false);
      });

    return () => { cancelled = true; };
  }, [location.pathname]);

  // When a recent chat item is clicked — restore the question + answer into chat
  async function handleRecentChatClick(item) {
    const initialMessages = [
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
        chart: item.chart || (item.chart_type && item.chart_type !== "none" ? { type: item.chart_type } : null),
        columns: item.columns || [],
        rows: item.rows || [],
        timestamp: item.created_at,
      },
    ];

    // Clear auto query and active chat
    localStorage.removeItem("sqlense_auto_query");
    localStorage.removeItem("sqlense_pending_query");
    localStorage.setItem("sqlense_restore_chat", JSON.stringify(initialMessages));
    window.dispatchEvent(new CustomEvent("sqlense:restore_chat", { detail: initialMessages }));
    navigate(`/chat?chat_id=${item.id}`, { state: { restoreMessages: initialMessages, timestamp: Date.now() } });

    // Load full columns, rows and chart asynchronously
    try {
      const { data } = await historyAPI.getById(item.id);
      if (data && (data.rows?.length > 0 || data.columns?.length > 0)) {
        const fullMessages = [
          {
            id: "hist-user-" + data.id,
            role: "user",
            text: data.question,
            userQuestion: data.question,
            timestamp: data.created_at,
          },
          {
            id: "hist-bot-" + data.id,
            role: "bot",
            text: data.answer_text || "Query executed.",
            answerText: data.answer_text || "",
            sql: data.sql_query || "",
            sqlExplanation: data.sql_explanation || "",
            chart: data.chart || (data.chart_type && data.chart_type !== "none" ? { type: data.chart_type } : null),
            columns: data.columns || [],
            rows: data.rows || [],
            timestamp: data.created_at,
          },
        ];
        localStorage.setItem("sqlense_restore_chat", JSON.stringify(fullMessages));
        window.dispatchEvent(new CustomEvent("sqlense:restore_chat", { detail: fullMessages }));
      }
    } catch {}
  }

  // When a database table is clicked — query it in chat
  function handleTableClick(tableName) {
    const question = `Show all records from ${tableName} (first 100 rows)`;
    localStorage.removeItem("sqlense_active_chat");
    localStorage.removeItem("sqlense_restore_chat");
    localStorage.removeItem("sqlense_auto_query");
    localStorage.removeItem("sqlense_pending_query");
    navigate(`/chat`, { state: { tableQuery: question } });
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("sqlense:auto_query", { detail: question }));
    }, 50);
  }

  function handleChatNavClick() {
    localStorage.removeItem("sqlense_auto_query");
    localStorage.removeItem("sqlense_pending_query");
    window.dispatchEvent(new CustomEvent("sqlense:active_chat"));
  }

  function handleNewChat() {
    localStorage.removeItem("sqlense_restore_chat");
    localStorage.removeItem("sqlense_auto_query");
    localStorage.removeItem("sqlense_pending_query");
    sessionStorage.removeItem("sqlense_active_chat");
    window.dispatchEvent(new CustomEvent("sqlense:new_chat"));
    if (onNewChat) {
      onNewChat();
    }
    navigate(`/chat`);
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
  function truncate(str, max = 22) {
    if (!str) return "Query";
    return str.length > max ? str.slice(0, max) + "…" : str;
  }

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <NavLink to="/dashboard" className="brand-logo" id="sidebar-brand-link">
          <span className="brand-name">SQLense</span>
        </NavLink>
      </div>

      {/* New Chat Button */}
      <div className="sidebar-new-chat">
        <button
          className="btn btn-primary new-chat-btn"
          onClick={handleNewChat}
          id="new-chat-btn"
        >
          <Plus size={16} />
          <span>New Chat</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <div className="nav-section">
          <NavLink to="/dashboard" className={navClass} id="nav-dashboard">
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/chat" className={navClass} onClick={handleChatNavClick} id="nav-chat">
            <MessageSquare size={18} />
            <span>Chat</span>
          </NavLink>

          <NavLink to="/history" className={navClass} id="nav-history">
            <History size={18} />
            <span>Query History</span>
          </NavLink>

          <NavLink to="/saved-charts" className={navClass} id="nav-saved-charts">
            <Bookmark size={18} />
            <span>Saved Charts</span>
          </NavLink>

          <NavLink to="/admin/kpi-dashboard" className={navClass} id="nav-kpi-dashboard">
            <Sparkles size={18} />
            <span>KPI Dashboard</span>
          </NavLink>
        </div>

        {/* Recent Chats Section */}
        <div className="sidebar-collapsible-section">
          <button
            className="section-header-btn"
            onClick={() => setChatsOpen((v) => !v)}
            id="toggle-recent-chats-btn"
          >
            <span className="section-label">RECENT CHATS</span>
            <ChevronDown
              size={14}
              className={`chevron ${chatsOpen ? "open" : ""}`}
            />
          </button>

          {chatsOpen && (
            <div className="recent-chats-list">
              {loadingChats ? (
                <div className="sidebar-subtext">Loading…</div>
              ) : recentChats.length === 0 ? (
                <div className="sidebar-subtext">No chats yet</div>
              ) : (
                recentChats.map((c) => (
                  <button
                    key={c.id}
                    className="recent-chat-item"
                    onClick={() => handleRecentChatClick(c)}
                    title={c.question}
                    id={`recent-chat-${c.id}`}
                  >
                    <MessageSquare size={13} className="item-icon" />
                    <span className="item-title">{truncate(c.question)}</span>
                    <span className="item-time">{timeAgo(c.created_at)}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Database Tables Section */}
        <div className="sidebar-collapsible-section">
          <button
            className="section-header-btn"
            onClick={() => setTablesOpen((v) => !v)}
            id="toggle-db-tables-btn"
          >
            <span className="section-label">DATABASE TABLES</span>
            <ChevronDown
              size={14}
              className={`chevron ${tablesOpen ? "open" : ""}`}
            />
          </button>

          {tablesOpen && (
            <div className="db-tables-list">
              {loadingTables ? (
                <div className="sidebar-subtext">Loading tables…</div>
              ) : tables.length === 0 ? (
                <div className="sidebar-subtext">No tables found</div>
              ) : (
                tables.map((tbl) => (
                  <button
                    key={tbl.name}
                    className="db-table-item"
                    onClick={() => handleTableClick(tbl.name)}
                    title={`Click to query ${tbl.name}`}
                    id={`db-table-${tbl.name}`}
                  >
                    <Database size={13} className="item-icon" />
                    <span className="item-name">{tbl.name}</span>
                    {tbl.rows !== undefined && (
                      <span className="item-rows">{tbl.rows} rows</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Admin Navigation */}
        {user?.role === "admin" && (
          <div className="nav-section admin-section">
            <span className="section-label">ADMIN</span>

            <NavLink to="/admin/dashboard" className={navClass} id="nav-admin-dashboard">
              <Shield size={18} />
              <span>Admin Dashboard</span>
            </NavLink>

            <NavLink to="/admin/database" className={navClass} id="nav-admin-database">
              <Database size={18} />
              <span>Database</span>
            </NavLink>

            <NavLink to="/admin/workspace" className={navClass} id="nav-admin-workspace">
              <Code2 size={18} />
              <span>SQL Workspace</span>
            </NavLink>

            <NavLink to="/admin/employees" className={navClass} id="nav-admin-employees">
              <Users size={18} />
              <span>Employees</span>
              {user?.pending_count > 0 && (
                <span className="badge pending-badge">{user.pending_count}</span>
              )}
            </NavLink>

            <NavLink to="/admin/analytics" className={navClass} id="nav-admin-analytics">
              <LayoutDashboard size={18} />
              <span>Analytics</span>
            </NavLink>

            <NavLink to="/admin/audit-log" className={navClass} id="nav-admin-audit-log">
              <FileText size={18} />
              <span>Audit Log</span>
            </NavLink>
          </div>
        )}
      </nav>

      {/* User Footer Card */}
      <div className="sidebar-footer">
        <NavLink to="/profile" className="user-profile-card" id="sidebar-profile-link">
          <div className="user-avatar">{initials}</div>
          <div className="user-details">
            <span className="user-name">{user?.name || "User"}</span>
            <span className="user-subtext">
              {user?.role === "admin" ? "Admin" : "Employee"}
              {user?.organization_name ? ` · ${user.organization_name}` : ""}
            </span>
          </div>
        </NavLink>
        <button
          className="logout-btn"
          onClick={logout}
          title="Sign out"
          aria-label="Sign out"
          id="sidebar-logout-btn"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
