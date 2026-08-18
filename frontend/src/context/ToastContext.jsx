/**
 * ToastContext — global notification system.
 * Usage: const { toast } = useToast();
 *        toast.success("Saved!") / toast.error("Failed") / toast.info(...)
 */

/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // Declare removeToast first so addToast can safely reference it
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = "info", title, message, duration = 4000 }) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => removeToast(id), duration);
      return id;
    },
    [removeToast]
  );

  const toast = {
    success: (msg, title = "Success") => addToast({ type: "success", title, message: msg }),
    error:   (msg, title = "Error")   => addToast({ type: "error",   title, message: msg }),
    info:    (msg, title = "Info")    => addToast({ type: "info",    title, message: msg }),
    warning: (msg, title = "Warning") => addToast({ type: "warning", title, message: msg }),
  };

  return (
    <ToastContext.Provider value={{ toast, toasts, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
