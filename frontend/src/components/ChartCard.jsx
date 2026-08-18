/**
 * ChartCard — saved chart preview card.
 * Shows a mini chart preview using Recharts with title, date, and actions.
 */
import { Trash2, Eye, BarChart2, TrendingUp, PieChart } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  PieChart as RPieChart, Pie, Cell,
  Tooltip,
} from "recharts";

const COLORS = ["#06b6d4", "#0891b2", "#67e8f9", "#a5f3fc", "#cffafe"];

function MiniChart({ type, data }) {
  if (!data || data.length === 0) return null;

  if (type === "bar") {
    return (
      <ResponsiveContainer width="100%" height={90}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <Bar dataKey="value" fill="#06b6d4" radius={[3, 3, 0, 0]} />
          <Tooltip
            contentStyle={{ fontSize: 11, padding: "4px 8px" }}
            formatter={(v) => [typeof v === "number" && v > 10000 ? `$${(v / 1000).toFixed(0)}k` : v, ""]}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height={90}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke="#06b6d4"
            strokeWidth={2}
            dot={false}
          />
          <Tooltip contentStyle={{ fontSize: 11, padding: "4px 8px" }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === "pie") {
    return (
      <ResponsiveContainer width="100%" height={90}>
        <RPieChart>
          <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius={38} strokeWidth={0}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 11, padding: "4px 8px" }} />
        </RPieChart>
      </ResponsiveContainer>
    );
  }

  return null;
}

function ChartTypeIcon({ type }) {
  if (type === "bar")  return <BarChart2 size={13} />;
  if (type === "line") return <TrendingUp size={13} />;
  if (type === "pie")  return <PieChart size={13} />;
  return null;
}

function formatSavedDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function ChartCard({ chart, onView, onDelete }) {
  return (
    <div className="chart-card">
      <div className="chart-card-preview">
        <MiniChart type={chart.type} data={chart.data} />
      </div>
      <div className="chart-card-body">
        <div className="chart-card-title">{chart.title}</div>
        <div className="chart-card-meta">
          <span className="chart-type-badge">
            <ChartTypeIcon type={chart.type} />
            {chart.type}
          </span>
          <span className="chart-card-date">{formatSavedDate(chart.saved_at)}</span>
        </div>
        <div className="chart-card-query" title={chart.query}>{chart.query}</div>
        <div className="chart-card-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onView && onView(chart)}
            aria-label={`View chart: ${chart.title}`}
          >
            <Eye size={13} /> View
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => onDelete && onDelete(chart.id)}
            aria-label={`Delete chart: ${chart.title}`}
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
