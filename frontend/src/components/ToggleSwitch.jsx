/**
 * ToggleSwitch — accessible toggle switch for settings pages.
 */
export default function ToggleSwitch({ id, checked, onChange, label, description }) {
  return (
    <div className="toggle-row">
      <div className="toggle-info">
        <label className="toggle-label" htmlFor={id}>{label}</label>
        {description && <p className="toggle-description">{description}</p>}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        className={`toggle-switch ${checked ? "toggle-on" : "toggle-off"}`}
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span className="toggle-thumb" />
      </button>
    </div>
  );
}
