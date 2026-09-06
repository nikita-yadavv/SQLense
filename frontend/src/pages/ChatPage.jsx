/**
 * ChatPage — wraps ChatWindow inside the shared Layout.
 * Listens to location changes and custom events to seamlessly switch between recent chats,
 * database table queries, and new chat sessions without requiring page unmount.
 */
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Layout from "../components/Layout";
import ChatWindow from "../components/ChatWindow";

const RESTORE_KEY = "sqlense_restore_chat";
const AUTO_KEY    = "sqlense_auto_query";

export default function ChatPage() {
  const location = useLocation();

  const [messages, setMessages] = useState(() => {
    try {
      if (location.state?.restoreMessages) {
        return location.state.restoreMessages;
      }
      const restoreRaw = localStorage.getItem(RESTORE_KEY);
      if (restoreRaw) {
        localStorage.removeItem(RESTORE_KEY);
        return JSON.parse(restoreRaw);
      }
      return [];
    } catch {
      return [];
    }
  });

  // Handle URL changes or route state updates (e.g. clicking another recent chat in the sidebar)
  useEffect(() => {
    if (location.state?.restoreMessages) {
      setMessages(location.state.restoreMessages);
      return;
    }
    const restoreRaw = localStorage.getItem(RESTORE_KEY);
    if (restoreRaw) {
      localStorage.removeItem(RESTORE_KEY);
      try {
        setMessages(JSON.parse(restoreRaw));
      } catch {}
    }
  }, [location.state, location.search, location.key]);

  // Handle direct custom events dispatched from Sidebar
  useEffect(() => {
    function handleRestore(e) {
      if (e.detail) {
        setMessages(e.detail);
      }
    }
    function handleNew() {
      setMessages([]);
    }
    window.addEventListener("sqlense:restore_chat", handleRestore);
    window.addEventListener("sqlense:new_chat", handleNew);
    return () => {
      window.removeEventListener("sqlense:restore_chat", handleRestore);
      window.removeEventListener("sqlense:new_chat", handleNew);
    };
  }, []);

  function startNewChat() {
    localStorage.removeItem(RESTORE_KEY);
    localStorage.removeItem(AUTO_KEY);
    localStorage.removeItem("sqlense_pending_query");
    setMessages([]);
  }

  return (
    <Layout onNewChat={startNewChat}>
      <ChatWindow messages={messages} setMessages={setMessages} />
    </Layout>
  );
}
