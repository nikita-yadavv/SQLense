/**
 * ChatPage — wraps ChatWindow inside the shared Layout.
 * Manages active session vs historical recent chat views:
 * - Active session messages are saved in sessionStorage under sqlense_active_chat (session-scoped).
 * - Fresh application sessions always start completely clean/empty with the welcome screen.
 * - Clicking a Recent Chat displays the historical conversation (?chat_id=...) including table results.
 * - Clicking "Chat" in the sidebar switches back to whatever was used in the current tab session.
 * - Clicking "New Chat" clears the active session and starts fresh.
 */
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import ChatWindow from "../components/ChatWindow";
import { historyAPI } from "../services/api";

const ACTIVE_KEY  = "sqlense_active_chat";
const RESTORE_KEY = "sqlense_restore_chat";

// Purge any stale localStorage active chat or pending query from legacy runs
try {
  localStorage.removeItem(ACTIVE_KEY);
  localStorage.removeItem("sqlense_auto_query");
  localStorage.removeItem("sqlense_pending_query");
} catch {}

export default function ChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHistoricalRef = useRef(false);

  // Initialize messages based on route state or session storage
  const [messages, setMessages] = useState(() => {
    try {
      if (location.state?.restoreMessages) {
        isHistoricalRef.current = true;
        return location.state.restoreMessages;
      }
      const restoreRaw = localStorage.getItem(RESTORE_KEY);
      if (restoreRaw && location.search.includes("chat_id")) {
        isHistoricalRef.current = true;
        localStorage.removeItem(RESTORE_KEY);
        return JSON.parse(restoreRaw);
      }
      // If regular /chat without chat_id param, load current tab session chat if any
      const activeRaw = sessionStorage.getItem(ACTIVE_KEY);
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
    location.state?.restoreMessages
  );
  isHistoricalRef.current = isHistorical;

  // Persist messages to active session whenever messages change in active mode
  useEffect(() => {
    if (!isHistoricalRef.current && Array.isArray(messages)) {
      if (messages.length > 0) {
        sessionStorage.setItem(ACTIVE_KEY, JSON.stringify(messages));
      } else {
        sessionStorage.removeItem(ACTIVE_KEY);
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

    // 2. If recent chat requested via URL parameter ?chat_id=...
    const params = new URLSearchParams(location.search);
    const chatId = params.get("chat_id");
    if (chatId) {
      isHistoricalRef.current = true;
      historyAPI.getById(chatId)
        .then(({ data }) => {
          if (data) {
            const fullMessages = [
              {
                id: "hist-user-" + data.id,
                role: "user",
                text: data.question,
                userQuestion: data.question,
                timestamp: data.created_at,
              },
              {
                id: "hist-bot-" + data.id,
                role: "bot",
                text: data.answer_text || "Query executed.",
                answerText: data.answer_text || "",
                sql: data.sql_query || "",
                sqlExplanation: data.sql_explanation || "",
                chart: data.chart || (data.chart_type && data.chart_type !== "none" ? { type: data.chart_type } : null),
                columns: data.columns || [],
                rows: data.rows || [],
                timestamp: data.created_at,
              },
            ];
            setMessages(fullMessages);
          }
        })
        .catch(() => {});
      return;
    }

    // 3. If navigated back to main /chat (no chat_id in search query)
    if (!location.search || !location.search.includes("chat_id")) {
      isHistoricalRef.current = false;
      const activeRaw = sessionStorage.getItem(ACTIVE_KEY);
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
      const activeRaw = sessionStorage.getItem(ACTIVE_KEY);
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
      sessionStorage.removeItem(ACTIVE_KEY);
      localStorage.removeItem(ACTIVE_KEY);
      localStorage.removeItem(RESTORE_KEY);
      localStorage.removeItem("sqlense_auto_query");
      localStorage.removeItem("sqlense_pending_query");
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
    sessionStorage.removeItem(ACTIVE_KEY);
    localStorage.removeItem(ACTIVE_KEY);
    localStorage.removeItem(RESTORE_KEY);
    localStorage.removeItem("sqlense_auto_query");
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
