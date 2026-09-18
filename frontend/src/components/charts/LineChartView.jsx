import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

function formatMetricName(name) {
  if (!name) return "";
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function LineChartView({ title, data, yKeys }) {
  return (
    <div className="chart-wrapper">
      {title && <div className="chart-title">{title}</div>}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 15, right: 25, left: 10, bottom: 55 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            angle={-25}
            textAnchor="end"
            interval={0}
            height={50}
          />
          <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "var(--surface-elevated, #1e293b)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
            formatter={(val, name) => [val, formatMetricName(name)]}
          />
          {yKeys && yKeys.length > 1 && (
            <Legend formatter={(val) => formatMetricName(val)} />
          )}
          {yKeys && yKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={formatMetricName(key)}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2.5}
              dot={{ r: 4, fill: COLORS[i % COLORS.length] }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
