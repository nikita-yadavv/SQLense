import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#514354", "#86728B", "#BAA7BF", "#D7C9DB",
  "#2d1f33", "#a07ead", "#6e5673", "#c4b2ca",
];

export default function PieChartView({ title, data, yKeys }) {
  // For pie charts, each row becomes a slice.
  // The numeric key is taken from yKeys[0].
  const valueKey = yKeys?.[0] || "value";

  return (
    <div className="chart-wrapper">
      {title && <div className="chart-title">{title}</div>}
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }) =>
              `${name} (${(percent * 100).toFixed(1)}%)`
            }
            labelLine={true}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "13px",
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
