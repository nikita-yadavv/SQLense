/** Renders active toast notifications from ToastContext. */
import { useToast } from "../context/ToastContext";

const ICONS = {
  success: "✅",
  error:   "❌",
  info:    "ℹ️",
  warning: "⚠️",
};

export default function Toast() {
  const { toasts, removeToast } = useToast();

  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.type}`}
          onClick={() => removeToast(t.id)}
          role="alert"
        >
          <span className="toast-icon">{ICONS[t.type]}</span>
          <div className="toast-body">
            <div className="toast-title">{t.title}</div>
            {t.message && <div className="toast-message">{t.message}</div>}
          </div>
          <button className="toast-close" aria-label="Dismiss">×</button>
        </div>
      ))}
    </div>
  );
}
