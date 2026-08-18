/**
 * NotFoundPage — friendly 404 page with animated robot.
 */
import { useNavigate } from "react-router-dom";
import { Home, MessageSquare } from "lucide-react";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <div className="not-found-content">
        {/* Animated Robot */}
        <div className="not-found-robot" aria-hidden="true">
          <div className="robot-head">
            <div className="robot-eyes">
              <div className="robot-eye" />
              <div className="robot-eye" />
            </div>
            <div className="robot-mouth" />
          </div>
          <div className="robot-body">🤖</div>
        </div>

        <div className="not-found-code">404</div>
        <h1 className="not-found-title">Oops! Page not found</h1>
        <p className="not-found-subtitle">
          I searched my entire database and couldn't find this page. It might have been
          moved, deleted, or never existed in the first place.
        </p>

        <div className="not-found-actions">
          <button
            className="btn btn-primary btn-lg"
            onClick={() => navigate("/dashboard")}
            id="notfound-home-btn"
          >
            <Home size={18} /> Go to Dashboard
          </button>
          <button
            className="btn btn-secondary btn-lg"
            onClick={() => navigate("/chat")}
            id="notfound-chat-btn"
          >
            <MessageSquare size={18} /> Open Chat
          </button>
        </div>
      </div>
    </div>
  );
}
