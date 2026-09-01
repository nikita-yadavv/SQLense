import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// Distinct, high-contrast color palette — each series is clearly distinguishable
const COLORS = ["#514354", "#86728B", "#BAA7BF", "#2d7a56", "#a0650f", "#b03050"];

export default function LineChartView({ title, data, yKeys }) {
  return (
    <div className="chart-wrapper">
      {title && <div className="chart-title">{title}</div>}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: "var(--text-muted)" }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
          <Tooltip
            contentStyle={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "13px",
            }}
          />
          {yKeys.length > 1 && <Legend />}
          {yKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 4, fill: COLORS[i % COLORS.length] }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
