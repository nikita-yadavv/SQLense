/**
 * ChatPage — wraps ChatWindow inside the shared Layout.
 * Manages persistent messages state across page navigation and reloads.
 */
import { useState, useEffect } from "react";
import Layout     from "../components/Layout";
import ChatWindow from "../components/ChatWindow";

export default function ChatPage() {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("sqlense_active_chat");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem("sqlense_active_chat", JSON.stringify(messages));
      }
    } catch (e) {
      console.error("Error persisting chat messages:", e);
    }
  }, [messages]);

  function startNewChat() {
    localStorage.removeItem("sqlense_active_chat");
    setMessages([]);
  }

  return (
    <Layout onNewChat={startNewChat}>
      <ChatWindow messages={messages} setMessages={setMessages} />
    </Layout>
  );
}
