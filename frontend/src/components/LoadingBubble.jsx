/** Animated typing-indicator loading bubble for bot messages. */
export default function LoadingBubble() {
  return (
    <div className="message-wrapper bot">
      <div className="loading-bubble">
        <div className="loading-dots">
          <span />
          <span />
          <span />
        </div>
        <span className="loading-text">SQLense is thinking…</span>
      </div>
    </div>
  );
}
