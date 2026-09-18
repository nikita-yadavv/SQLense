import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { BarChart2 } from "lucide-react";

const GRADIENTS = [
  { id: "barGrad0", start: "#6366f1", end: "#4338ca" },
  { id: "barGrad1", start: "#06b6d4", end: "#0e7490" },
  { id: "barGrad2", start: "#10b981", end: "#047857" },
  { id: "barGrad3", start: "#f59e0b", end: "#b45309" },
  { id: "barGrad4", start: "#ec4899", end: "#be185d" },
];

function formatMetricName(name) {
  if (!name) return "";
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function BarChartView({ title, data, yKeys }) {
  const metricName = yKeys && yKeys.length === 1 ? formatMetricName(yKeys[0]) : "Metrics";

  return (
    <div className="chart-wrapper">
      <div className="chart-header-row">
        <div className="chart-header-left">
          <div className="chart-icon-box">
            <BarChart2 size={16} />
          </div>
          <div>
            <h4 className="chart-title">{title || "Data Visualization"}</h4>
            <p className="chart-subtitle">
              Visualizing <span className="chart-highlight">{metricName}</span> across {data?.length || 0} categories
            </p>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 20, right: 25, left: 10, bottom: 50 }}>
          <defs>
            {GRADIENTS.map((g) => (
              <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={g.start} stopOpacity={0.95} />
                <stop offset="100%" stopColor={g.end} stopOpacity={0.8} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            angle={-25}
            textAnchor="end"
            interval={0}
            height={50}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            allowDecimals={false}
            tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-elevated, #1e293b)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              fontSize: "12px",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
              padding: "10px 14px",
            }}
            formatter={(val, name) => [
              typeof val === "number" ? val.toLocaleString() : val,
              formatMetricName(name),
            ]}
          />
          {yKeys && yKeys.length > 1 && (
            <Legend
              wrapperStyle={{ paddingTop: 10 }}
              formatter={(val) => <span style={{ color: "var(--text-primary)", fontSize: 12 }}>{formatMetricName(val)}</span>}
            />
          )}
          {yKeys && yKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              name={formatMetricName(key)}
              fill={`url(#${GRADIENTS[i % GRADIENTS.length].id})`}
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
