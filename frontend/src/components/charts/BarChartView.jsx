import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = ["#06b6d4", "#0891b2", "#67e8f9", "#155e75", "#a5f3fc"];

export default function BarChartView({ title, data, yKeys }) {
  return (
    <div className="chart-wrapper">
      {title && <div className="chart-title">{title}</div>}
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
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
            <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[3,3,0,0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
