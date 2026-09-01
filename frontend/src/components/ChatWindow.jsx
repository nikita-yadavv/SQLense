/**
 * ChatWindow — fully functional chat interface.
 * - Controlled textarea with Enter-to-send (Shift+Enter for newline)
 * - Chat state persisted to localStorage (survives navigation)
 * - Pending queries are re-fired if user navigates away mid-response
 * - Real mode: POST /api/chat integration with loading state
 * - Auto-scroll to latest message
 * - Welcome screen with example prompts
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles } from "lucide-react";
import Message       from "./Message";
import LoadingBubble from "./LoadingBubble";
import { chatAPI, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { getMockAIResponse, SUGGESTED_PROMPTS } from "../data/mockData";

const MOCK_MODE = import.meta.env.VITE_MOCK_AUTH === "true";
const PENDING_KEY = "sqlense_pending_query";

export default function ChatWindow({ messages, setMessages }) {
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const { toast }   = useToast();
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, [input]);

  // On mount: if there's a pending query (user navigated away mid-response), re-fire it
  useEffect(() => {
    const pending = localStorage.getItem(PENDING_KEY);
    if (pending && !loading) {
      localStorage.removeItem(PENDING_KEY);
      // Small delay to let component fully mount
      setTimeout(() => fireQuery(pending), 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fireQuery = useCallback(async (q) => {
    setLoading(true);
    // Store as pending in case user navigates away
    localStorage.setItem(PENDING_KEY, q);

    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 1200));
      setMessages((prev) => [...prev, getMockAIResponse(q)]);
      localStorage.removeItem(PENDING_KEY);
      setLoading(false);
      return;
    }

    try {
      const { data } = await chatAPI.ask(q);
      setMessages((prev) => [
        ...prev,
        {
          role:           "bot",
          text:           data.answer_text || "",
          answerText:     data.answer_text,
          sql:            data.sql_query,
          sqlExplanation: data.sql_explanation,
          chart:          data.chart,
          rows:           data.rows,
          columns:        data.columns,
        },
      ]);
    } catch (err) {
      const msg = getErrorMessage(err);
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: `⚠️ ${msg}` },
      ]);
      toast.error(msg);
    } finally {
      localStorage.removeItem(PENDING_KEY);
      setLoading(false);
    }
  }, [setMessages, toast]);

  const sendMessage = useCallback(async (question) => {
    const q = (question || input).trim();
    if (!q || loading) return;

    // Add user message immediately
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setInput("");

    await fireQuery(q);
  }, [input, loading, fireQuery, setMessages]);

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="chat-container">
      {/* Messages area */}
      <div className="messages">
        {messages.length === 0 ? (
          <div className="welcome">
            <div className="welcome-icon">🤖</div>
            <h1>Welcome to SQLense</h1>
            <p>
              Ask questions about your database in plain English.
              SQLense converts your question into SQL, runs it, and explains the results.
            </p>

            {/* Suggested Prompts Grid */}
            <div className="welcome-prompt-grid">
              {SUGGESTED_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  className="welcome-prompt-card"
                  onClick={() => sendMessage(p.text)}
                  disabled={loading}
                  id={`suggested-prompt-${i}`}
                >
                  <span className="welcome-prompt-icon">{p.icon}</span>
                  <span className="welcome-prompt-text">{p.text}</span>
                  <Sparkles size={12} className="welcome-prompt-sparkle" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <Message
              key={i}
              type={msg.role}
              text={msg.text}
              sql={msg.sql}
              sqlExplanation={msg.sqlExplanation}
              answerText={msg.answerText}
              chart={msg.chart}
              rows={msg.rows}
              columns={msg.columns}
              userQuestion={msg.role === "bot" ? messages[i - 1]?.text : ""}
            />
          ))
        )}

        {/* Loading bubble */}
        {loading && <LoadingBubble />}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="input-area">
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Ask anything about your database…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          aria-label="Chat input"
          id="chat-input"
        />
        <button
          className="send-btn"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          aria-label="Send message"
          id="chat-send-btn"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
