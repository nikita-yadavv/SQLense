/**
 * AuthContext — global authentication state.
 *
 * Persists the JWT token and decoded user info in localStorage.
 * Exposes: { user, token, login, logout, updateUser, isAdmin, isEmployee }
 *
 * After login the context calls GET /auth/me to fetch name + email,
 * then stores the full profile so every component can read user.name etc.
 */

/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useMemo } from "react";

const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function loadPersistedAuth() {
  const token = localStorage.getItem("sqlense_token");
  const raw   = localStorage.getItem("sqlense_user");
  if (!token || !raw) return { token: null, user: null };
  try {
    const user = JSON.parse(raw);
    const payload = decodeToken(token);
    if (payload?.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem("sqlense_token");
      localStorage.removeItem("sqlense_user");
      return { token: null, user: null };
    }
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const persisted = useMemo(() => loadPersistedAuth(), []);
  const [token, setToken] = useState(persisted.token);
  const [user,  setUser]  = useState(persisted.user);

  /** Call after a successful /auth/login or /auth/signup.
   *  Also fetches the full profile (name, email, org name) from /auth/me. */
  const login = useCallback(async (accessToken, role) => {
    const payload  = decodeToken(accessToken);
    const baseUser = {
      id:     payload?.sub    || null,
      role:   role            || payload?.role || "employee",
      org_id: payload?.org_id || null,
      name:   null,
      email:  null,
      organization_name: null,
      created_at: null,
    };

    localStorage.setItem("sqlense_token", accessToken);
    localStorage.setItem("sqlense_user",  JSON.stringify(baseUser));
    setToken(accessToken);
    setUser(baseUser);

    // Fetch full profile in background so name/email appear in sidebar/profile
    try {
      const resp = await fetch("/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (resp.ok) {
        const profile = await resp.json();
        const full = { ...baseUser, ...profile };
        localStorage.setItem("sqlense_user", JSON.stringify(full));
        setUser(full);
      }
    } catch {
      // Non-fatal — app still works, just shows fallback display name
    }
  }, []);

  /** Update user fields locally (e.g. after PUT /auth/me succeeds) */
  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      localStorage.setItem("sqlense_user", JSON.stringify(next));
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("sqlense_token");
    localStorage.removeItem("sqlense_user");
    setToken(null);
    setUser(null);
  }, []);

  const isAdmin    = user?.role === "admin";
  const isEmployee = user?.role === "employee";

  const value = { user, token, login, logout, updateUser, isAdmin, isEmployee };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
