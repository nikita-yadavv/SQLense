/**
 * ChatPage — wraps ChatWindow inside the shared Layout.
 * Manages active session vs historical recent chat views:
 * - Active session messages are saved in localStorage under sqlense_active_chat.
 * - Clicking a Recent Chat displays the historical conversation (?chat_id=...).
 * - Clicking "Chat" in the sidebar switches back to the active session.
 * - Clicking "New Chat" clears the active session and starts fresh.
 */
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import ChatWindow from "../components/ChatWindow";

const ACTIVE_KEY  = "sqlense_active_chat";
const RESTORE_KEY = "sqlense_restore_chat";
const AUTO_KEY    = "sqlense_auto_query";

export default function ChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHistoricalRef = useRef(false);

  // Initialize messages based on route state or storage
  const [messages, setMessages] = useState(() => {
    try {
      if (location.state?.restoreMessages) {
        isHistoricalRef.current = true;
        return location.state.restoreMessages;
      }
      const restoreRaw = localStorage.getItem(RESTORE_KEY);
      if (restoreRaw && (location.search.includes("chat_id") || location.state?.restoreMessages)) {
        isHistoricalRef.current = true;
        localStorage.removeItem(RESTORE_KEY);
        return JSON.parse(restoreRaw);
      }
      // If regular /chat without chat_id param, load active session
      const activeRaw = localStorage.getItem(ACTIVE_KEY);
      if (activeRaw) {
        return JSON.parse(activeRaw);
      }
      return [];
    } catch {
      return [];
    }
  });

  // Track if current view is a historical recent chat
  const isHistorical = Boolean(
    location.search.includes("chat_id") ||
    location.search.includes("table") ||
    location.state?.restoreMessages
  );
  isHistoricalRef.current = isHistorical;

  // Persist messages to active session whenever messages change in active mode
  useEffect(() => {
    if (!isHistoricalRef.current && Array.isArray(messages)) {
      if (messages.length > 0) {
        localStorage.setItem(ACTIVE_KEY, JSON.stringify(messages));
      } else {
        localStorage.removeItem(ACTIVE_KEY);
      }
    }
  }, [messages]);

  // Handle URL changes or route state updates
  useEffect(() => {
    // 1. If explicit restore payload in route state
    if (location.state?.restoreMessages) {
      isHistoricalRef.current = true;
      setMessages(location.state.restoreMessages);
      return;
    }

    // 2. If recent chat requested via restore key
    const restoreRaw = localStorage.getItem(RESTORE_KEY);
    if (restoreRaw && location.search.includes("chat_id")) {
      isHistoricalRef.current = true;
      localStorage.removeItem(RESTORE_KEY);
      try {
        setMessages(JSON.parse(restoreRaw));
        return;
      } catch {}
    }

    // 3. If navigated back to main /chat (no chat_id / table in search query)
    if (!location.search || (!location.search.includes("chat_id") && !location.search.includes("table"))) {
      isHistoricalRef.current = false;
      const activeRaw = localStorage.getItem(ACTIVE_KEY);
      if (activeRaw) {
        try {
          setMessages(JSON.parse(activeRaw));
        } catch {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    }
  }, [location.state, location.search, location.key]);

  // Handle direct custom events dispatched from Sidebar
  useEffect(() => {
    function handleRestore(e) {
      if (e.detail) {
        isHistoricalRef.current = true;
        setMessages(e.detail);
      }
    }

    function handleActiveChat() {
      isHistoricalRef.current = false;
      const activeRaw = localStorage.getItem(ACTIVE_KEY);
      if (activeRaw) {
        try {
          setMessages(JSON.parse(activeRaw));
        } catch {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    }

    function handleNew() {
      isHistoricalRef.current = false;
      localStorage.removeItem(ACTIVE_KEY);
      localStorage.removeItem(RESTORE_KEY);
      localStorage.removeItem(AUTO_KEY);
      setMessages([]);
    }

    window.addEventListener("sqlense:restore_chat", handleRestore);
    window.addEventListener("sqlense:active_chat", handleActiveChat);
    window.addEventListener("sqlense:new_chat", handleNew);

    return () => {
      window.removeEventListener("sqlense:restore_chat", handleRestore);
      window.removeEventListener("sqlense:active_chat", handleActiveChat);
      window.removeEventListener("sqlense:new_chat", handleNew);
    };
  }, []);

  function startNewChat() {
    isHistoricalRef.current = false;
    localStorage.removeItem(ACTIVE_KEY);
    localStorage.removeItem(RESTORE_KEY);
    localStorage.removeItem(AUTO_KEY);
    localStorage.removeItem("sqlense_pending_query");
    setMessages([]);
    navigate("/chat");
  }

  return (
    <Layout onNewChat={startNewChat}>
      <ChatWindow messages={messages} setMessages={setMessages} />
    </Layout>
  );
}
