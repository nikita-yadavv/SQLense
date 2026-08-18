/**
 * ChatPage — wraps ChatWindow inside the shared Layout.
 * Manages the messages state and passes "New Chat" reset
 * both to the Layout (sidebar button) and down to ChatWindow.
 */
import { useState } from "react";
import Layout     from "../components/Layout";
import ChatWindow from "../components/ChatWindow";

export default function ChatPage() {
  const [messages, setMessages] = useState([]);

  function startNewChat() {
    setMessages([]);
  }

  return (
    <Layout onNewChat={startNewChat}>
      <ChatWindow messages={messages} setMessages={setMessages} />
    </Layout>
  );
}
