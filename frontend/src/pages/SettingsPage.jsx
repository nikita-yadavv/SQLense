/**
 * SettingsPage — application preferences and display settings.
 * All settings stored in localStorage only. No API calls.
 */
import { useState, useEffect } from "react";
import { Sun, Moon, Monitor, Bell, MessageSquare, Globe, Palette, Save } from "lucide-react";
import Layout       from "../components/Layout";
import ToggleSwitch from "../components/ToggleSwitch";
import { useToast } from "../context/ToastContext";

const THEMES      = ["system", "light", "dark"];
const LANGUAGES   = ["English (US)", "English (UK)", "Spanish", "French", "German", "Hindi"];
const CHART_TYPES = ["Bar Chart", "Line Chart", "Pie Chart", "Auto-detect"];

function loadSettings() {
  try {
    const saved = localStorage.getItem("sqlense_settings");
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return {
    theme:              "system",
    language:           "English (US)",
    defaultChart:       "Auto-detect",
    notifications:      true,
    queryAlerts:        true,
    showSuggestions:    true,
    autoScroll:         true,
    compactMode:        false,
    showSQLByDefault:   true,
    showTableByDefault: true,
  };
}

function ThemeIcon({ theme }) {
  if (theme === "light")  return <Sun size={16} />;
  if (theme === "dark")   return <Moon size={16} />;
  return <Monitor size={16} />;
}

export default function SettingsPage() {
  const { toast }        = useToast();
  const [settings, setSettings] = useState(loadSettings);
  const [hasChanges, setHasChanges] = useState(false);

  function update(key, val) {
    setSettings((p) => ({ ...p, [key]: val }));
    setHasChanges(true);
  }

  function saveSettings() {
    localStorage.setItem("sqlense_settings", JSON.stringify(settings));
    setHasChanges(false);
    toast.success("Settings saved successfully!");
  }

  function resetSettings() {
    const defaults = loadSettings();
    localStorage.removeItem("sqlense_settings");
    setSettings(defaults);
    setHasChanges(false);
    toast.info("Settings reset to defaults.");
  }

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else if (settings.theme === "light") {
      root.setAttribute("data-theme", "light");
    } else {
      root.removeAttribute("data-theme");
    }
  }, [settings.theme]);

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
          <div className="settings-layout">

            {/* ── Appearance ── */}
            <div className="settings-section card">
              <div className="settings-section-header">
                <Palette size={18} className="settings-section-icon" />
                <div>
                  <h3 className="card-title">Appearance</h3>
                  <p className="card-subtitle" style={{ marginBottom: 0 }}>
                    Customize how SQLense looks.
                  </p>
                </div>
              </div>

              <div className="settings-field">
                <label className="form-label">Theme</label>
                <div className="theme-selector">
                  {THEMES.map((t) => (
                    <button
                      key={t}
                      id={`theme-${t}`}
                      className={`theme-option ${settings.theme === t ? "theme-selected" : ""}`}
                      onClick={() => update("theme", t)}
                      type="button"
                    >
                      <ThemeIcon theme={t} />
                      <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <ToggleSwitch
                id="compact-mode"
                checked={settings.compactMode}
                onChange={(v) => update("compactMode", v)}
                label="Compact Mode"
                description="Reduce padding and spacing for a denser layout."
              />
            </div>

            {/* ── Notifications ── */}
            <div className="settings-section card">
              <div className="settings-section-header">
                <Bell size={18} className="settings-section-icon" />
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
              <div className="settings-section-header">
                <MessageSquare size={18} className="settings-section-icon" />
                <div>
                  <h3 className="card-title">Chat Preferences</h3>
                  <p className="card-subtitle" style={{ marginBottom: 0 }}>
                    Configure the chat experience.
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

            {/* ── Language ── */}
            <div className="settings-section card">
              <div className="settings-section-header">
                <Globe size={18} className="settings-section-icon" />
                <div>
                  <h3 className="card-title">Language & Region</h3>
                  <p className="card-subtitle" style={{ marginBottom: 0 }}>
                    Set your preferred language.
                  </p>
                </div>
              </div>
              <div className="settings-field">
                <label className="form-label" htmlFor="language-select">Language</label>
                <select
                  id="language-select"
                  className="form-input"
                  value={settings.language}
                  onChange={(e) => update("language", e.target.value)}
                  style={{ maxWidth: 260 }}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Bottom save bar */}
          {hasChanges && (
            <div className="settings-save-bar">
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
