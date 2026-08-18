/**
 * ActivityFeed — recent activity timeline component.
 */
export default function ActivityFeed({ items }) {
  if (!items || items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📭</div>
        <h3>No activity yet</h3>
        <p>Activity will appear here as your team uses SQLense.</p>
      </div>
    );
  }

  return (
    <ul className="activity-feed" aria-label="Recent activity">
      {items.map((item) => (
        <li key={item.id} className="activity-item">
          <div className="activity-icon-wrap">
            <span className="activity-icon">{item.icon}</span>
          </div>
          <div className="activity-content">
            <p className="activity-text">
              <strong>{item.user}</strong>{" "}
              <span>{item.action}</span>
              {item.detail && (
                <span className="activity-detail"> — {item.detail}</span>
              )}
            </p>
            <span className="activity-time">{item.time}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
