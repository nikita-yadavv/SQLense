/**
 * Sidebar — role-aware navigation with enhanced sections.
 * Includes: dashboard, recent chats, database tables, saved charts.
 * Shows admin-only menu items only when role === "admin".
 */
import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Plus, MessageSquare, History, Database,
  Terminal, Users, User, LogOut, Settings,
  LayoutDashboard, BarChart2, ChevronDown, ChevronRight,
  Table2, Shield, TrendingUp, Star, FileText,
} from "lucide-react";
import { useAuth }  from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { authAPI }  from "../services/api";
import { mockRecentChats, mockDatabaseTables } from "../data/mockData";

export default function Sidebar({ onNewChat }) {
  const { user, logout, isAdmin } = useAuth();
  const { toast }   = useToast();
  const navigate    = useNavigate();
  const profileRef  = useRef(null);

  const [showMenu,     setShowMenu]     = useState(false);
  const [showChats,    setShowChats]    = useState(true);
  const [showTables,   setShowTables]   = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

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


  function handleLogout() {
    logout();
    toast.info("You have been signed out.");
    navigate("/login", { replace: true });
  }

  const navClass = ({ isActive }) =>
    `menu-item ${isActive ? "active" : ""}`;

  // User initials for avatar
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="sidebar">
      {/* Logo */}
      <h2 className="logo">
        <span style={{ fontSize: 20 }}>🤖</span> SQLense
      </h2>

      {/* New Chat button */}
      <button
        className="new-chat-btn"
        onClick={onNewChat || (() => navigate("/chat"))}
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
      </div>

      {/* Recent Chats */}
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
            {mockRecentChats.map((chat) => (
              <button
                key={chat.id}
                className="recent-chat-item"
                onClick={() => navigate("/chat")}
                title={chat.title}
                id={`recent-chat-${chat.id}`}
              >
                <MessageSquare size={12} className="recent-chat-icon" />
                <span className="recent-chat-title">{chat.title}</span>
                <span className="recent-chat-time">{chat.time}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Database Tables */}
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
            {mockDatabaseTables.map((table) => (
              <div key={table.name} className="db-table-item" id={`db-table-${table.name}`}>
                <span className="db-table-icon">{table.icon}</span>
                <div className="db-table-info">
                  <span className="db-table-name">{table.name}</span>
                  <span className="db-table-rows">{table.rows.toLocaleString()} rows</span>
                </div>
                <Table2 size={11} className="db-table-schema-icon" />
              </div>
            ))}
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

          <NavLink to="/admin/kpi-dashboard" className={navClass} id="nav-admin-kpi">
            <Star size={17} />
            <span>KPI Dashboard</span>
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