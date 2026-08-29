import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

type Row = {
  cohort_week: string;
  cohort_size: number;
  retention_pct_week_1: number;
  retention_pct_week_2: number;
  retention_pct_week_3: number;
  retention_pct_week_4: number;
};

const WEEK_LINES = [
  { key: "semana1", label: "Semana 1", color: "#06b6d4" },
  { key: "semana2", label: "Semana 2", color: "#10b981" },
  { key: "semana3", label: "Semana 3", color: "#8b5cf6" },
  { key: "semana4", label: "Semana 4", color: "#f43f5e" },
];

export function RetentionChart({ data }: { data: Row[] }) {
  const chartData = data.map((r) => ({
    semana: new Date(r.cohort_week).toLocaleDateString("es", { day: "2-digit", month: "short" }),
    semana1: Number(r.retention_pct_week_1),
    semana2: Number(r.retention_pct_week_2),
    semana3: Number(r.retention_pct_week_3),
    semana4: Number(r.retention_pct_week_4),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <XAxis dataKey="semana" tick={{ fontSize: 11, fill: "#6b5fa6" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#6b5fa6" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={40} />
        <Tooltip
          contentStyle={{ background: "#0e0c14", border: "1px solid rgba(139, 92, 246, 0.3)", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#a78bfa" }}
          itemStyle={{ color: "#e9d5ff" }}
          formatter={(v) => [v != null ? `${v}%` : "—"]}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "#a78bfa" }} />
        {WEEK_LINES.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.label}
            stroke={line.color}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
