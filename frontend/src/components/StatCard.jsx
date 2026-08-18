/**
 * StatCard — metric card for dashboard.
 * Displays an icon, label, value, and trend indicator.
 */
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function StatCard({ icon, label, value, change, changeLabel, accent }) {
  const isPositive = change > 0;
  const isNegative = change < 0;
  const isNeutral  = change === 0 || change == null;

  return (
    <div className={`stat-card ${accent ? `stat-card--${accent}` : ""}`}>
      <div className="stat-card-header">
        <div className="stat-card-icon">{icon}</div>
        {change != null && (
          <div className={`stat-trend ${isPositive ? "trend-up" : isNegative ? "trend-down" : "trend-neutral"}`}>
            {isPositive && <TrendingUp size={13} />}
            {isNegative && <TrendingDown size={13} />}
            {isNeutral  && <Minus size={13} />}
            <span>
              {isPositive ? "+" : ""}{typeof change === "number" ? change.toFixed(1) : change}
              {typeof change === "number" && "%"}
            </span>
          </div>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {changeLabel && <div className="stat-card-sublabel">{changeLabel}</div>}
    </div>
  );
}
