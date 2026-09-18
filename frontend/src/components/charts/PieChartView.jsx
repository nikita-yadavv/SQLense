import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { PieChart as PieIcon } from "lucide-react";

const COLORS = [
  "#6366f1", "#06b6d4", "#10b981", "#f59e0b",
  "#ec4899", "#8b5cf6", "#3b82f6", "#14b8a6",
];

function formatMetricName(name) {
  if (!name) return "";
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PieChartView({ title, data, yKeys }) {
  const valueKey = yKeys?.[0] || "value";
  const total = data?.reduce((sum, item) => sum + (Number(item[valueKey]) || 0), 0) || 0;

  return (
    <div className="chart-wrapper">
      <div className="chart-header-row">
        <div className="chart-header-left">
          <div className="chart-icon-box">
            <PieIcon size={16} />
          </div>
          <div>
            <h4 className="chart-title">{title || "Distribution Breakdown"}</h4>
            <p className="chart-subtitle">
              Total volume: <span className="chart-highlight">{total.toLocaleString()}</span> across {data?.length || 0} segments
            </p>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={105}
            paddingAngle={4}
            label={({ name, percent }) =>
              `${name} (${(percent * 100).toFixed(0)}%)`
            }
            labelLine={false}
          >
            {data && data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="var(--surface)" strokeWidth={2} />
            ))}
          </Pie>
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
              `${Number(val).toLocaleString()} (${total > 0 ? ((Number(val) / total) * 100).toFixed(1) : 0}%)`,
              formatMetricName(name),
            ]}
          />
          <Legend
            formatter={(val) => <span style={{ color: "var(--text-primary)", fontSize: 12 }}>{val}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
