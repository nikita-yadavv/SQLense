/**
 * ChatWindow — fully functional chat interface.
 * - Controlled textarea with Enter-to-send (Shift+Enter for newline)
 * - Mock mode: returns realistic AI response without backend call
 * - Real mode: POST /chat integration with loading state
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

  const sendMessage = useCallback(async (question) => {
    const q = (question || input).trim();
    if (!q || loading) return;

    // Add user message immediately
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setInput("");
    setLoading(true);

    if (MOCK_MODE) {
      // Simulate AI response delay in mock mode
      await new Promise((r) => setTimeout(r, 1200));
      setMessages((prev) => [...prev, getMockAIResponse(q)]);
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
      setLoading(false);
    }
  }, [input, loading, setMessages, toast]);

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
              SQLense will generate SQL, run it, and explain the results.
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