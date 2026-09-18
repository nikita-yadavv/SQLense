import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";

const COLORS = [
  { stroke: "#6366f1", fill: "rgba(99, 102, 241, 0.15)" },
  { stroke: "#06b6d4", fill: "rgba(6, 182, 212, 0.15)" },
  { stroke: "#10b981", fill: "rgba(16, 185, 129, 0.15)" },
];

function formatMetricName(name) {
  if (!name) return "";
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function LineChartView({ title, data, yKeys }) {
  const metricName = yKeys && yKeys.length === 1 ? formatMetricName(yKeys[0]) : "Metrics";

  return (
    <div className="chart-wrapper">
      <div className="chart-header-row">
        <div className="chart-header-left">
          <div className="chart-icon-box">
            <TrendingUp size={16} />
          </div>
          <div>
            <h4 className="chart-title">{title || "Trend Analysis"}</h4>
            <p className="chart-subtitle">
              Tracking <span className="chart-highlight">{metricName}</span> progression over {data?.length || 0} periods
            </p>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} margin={{ top: 20, right: 25, left: 10, bottom: 50 }}>
          <defs>
            {COLORS.map((c, i) => (
              <linearGradient key={i} id={`areaGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={c.stroke} stopOpacity={0.4} />
                <stop offset="95%" stopColor={c.stroke} stopOpacity={0.0} />
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
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              name={formatMetricName(key)}
              stroke={COLORS[i % COLORS.length].stroke}
              strokeWidth={2.5}
              fill={`url(#areaGrad${i % COLORS.length})`}
              dot={{ r: 4, fill: COLORS[i % COLORS.length].stroke, strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
