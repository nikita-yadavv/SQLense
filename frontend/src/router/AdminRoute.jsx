/**
 * AdminRoute — redirects non-admin users to /chat.
 * Must be nested inside <ProtectedRoute>.
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/chat" replace />;
  }

  return children;
}
