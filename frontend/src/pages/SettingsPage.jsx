/**
 * SettingsPage — user and admin application preferences.
 */
import { useState } from "react";
import Layout from "../components/Layout";
import { useToast } from "../context/ToastContext";
import {
  Bell, MessageSquare, Save
} from "lucide-react";

const DEFAULTS = {
  compactMode:        false,
  notifications:      true,
  queryAlerts:        true,
  showSuggestions:    true,
  autoScroll:         true,
  showSQLByDefault:   true,
  showTableByDefault: true,
  defaultChart:       "Auto-detect",
};

const CHART_TYPES = ["Auto-detect", "Bar Chart", "Line Chart", "Pie Chart"];

function ToggleSwitch({ id, checked, onChange, label, description }) {
  return (
    <div className="settings-field flex-row justify-between" style={{ padding: "12px 0", borderBottom: "1px solid var(--border-light)" }}>
      <div>
        <label htmlFor={id} className="form-label" style={{ marginBottom: 2, cursor: "pointer", fontWeight: 600 }}>
          {label}
        </label>
        {description && (
          <p className="card-subtitle" style={{ marginBottom: 0, fontSize: 12 }}>
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        className={`toggle-switch ${checked ? "toggle-on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle-thumb" />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("sqlense_settings");
    return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS;
  });

  const [hasChanges, setHasChanges] = useState(false);

  function update(key, val) {
    setSettings((prev) => {
      const next = { ...prev, [key]: val };
      setHasChanges(true);
      return next;
    });
  }

  function saveSettings() {
    localStorage.setItem("sqlense_settings", JSON.stringify(settings));
    setHasChanges(false);
    toast.success("Preferences saved!");
  }

  function resetSettings() {
    setSettings(DEFAULTS);
    localStorage.removeItem("sqlense_settings");
    setHasChanges(false);
    toast.info("Settings reset to default.");
  }

  return (
    <Layout>
      <div className="page">
        {/* Header */}
        <div className="page-header">
          <div>
            <h2 className="page-title">Settings</h2>
            <p className="page-subtitle">Customize your SQLense experience.</p>
          </div>
          {hasChanges && (
            <div className="flex-row" style={{ gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={resetSettings} id="settings-reset-btn">
                Reset
              </button>
              <button className="btn btn-primary btn-sm" onClick={saveSettings} id="settings-save-btn">
                <Save size={13} /> Save Changes
              </button>
            </div>
          )}
        </div>

        <div className="page-body">
          <div className="settings-layout" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* ── Notifications ── */}
            <div className="settings-section card">
              <div className="settings-section-header" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <Bell size={18} color="var(--primary)" />
                <div>
                  <h3 className="card-title">Notifications</h3>
                  <p className="card-subtitle" style={{ marginBottom: 0 }}>
                    Control what notifications you receive.
                  </p>
                </div>
              </div>

              <ToggleSwitch
                id="notif-general"
                checked={settings.notifications}
                onChange={(v) => update("notifications", v)}
                label="General Notifications"
                description="Receive toast notifications for actions like login and saves."
              />
              <ToggleSwitch
                id="notif-query-alerts"
                checked={settings.queryAlerts}
                onChange={(v) => update("queryAlerts", v)}
                label="Query Alerts"
                description="Get notified when a long-running query completes."
              />
            </div>

            {/* ── Chat Preferences ── */}
            <div className="settings-section card">
              <div className="settings-section-header" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <MessageSquare size={18} color="var(--primary)" />
                <div>
                  <h3 className="card-title">Chat Preferences</h3>
                  <p className="card-subtitle" style={{ marginBottom: 0 }}>
                    Configure the conversational AI chat experience.
                  </p>
                </div>
              </div>

              <ToggleSwitch
                id="show-suggestions"
                checked={settings.showSuggestions}
                onChange={(v) => update("showSuggestions", v)}
                label="Show Suggested Prompts"
                description="Display example prompts on the empty chat screen."
              />
              <ToggleSwitch
                id="auto-scroll"
                checked={settings.autoScroll}
                onChange={(v) => update("autoScroll", v)}
                label="Auto-Scroll"
                description="Automatically scroll to the latest message."
              />
              <ToggleSwitch
                id="show-sql"
                checked={settings.showSQLByDefault}
                onChange={(v) => update("showSQLByDefault", v)}
                label="Show SQL by Default"
                description="Expand the SQL query block in every response automatically."
              />
              <ToggleSwitch
                id="show-table"
                checked={settings.showTableByDefault}
                onChange={(v) => update("showTableByDefault", v)}
                label="Show Result Table by Default"
                description="Expand the data table in every response automatically."
              />

              <div className="settings-field" style={{ marginTop: 16 }}>
                <label className="form-label" htmlFor="default-chart">Default Chart Type</label>
                <select
                  id="default-chart"
                  className="form-input"
                  value={settings.defaultChart}
                  onChange={(e) => update("defaultChart", e.target.value)}
                  style={{ maxWidth: 260 }}
                >
                  {CHART_TYPES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Bottom save bar */}
          {hasChanges && (
            <div className="settings-save-bar" style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                You have unsaved changes.
              </span>
              <div className="flex-row" style={{ gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={resetSettings}>
                  Reset
                </button>
                <button className="btn btn-primary btn-sm" onClick={saveSettings}>
                  <Save size={13} /> Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
