import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

type GenreRow = { genre: string; vote_count: number; pct_of_total: number; boost_pct: number };

const SLICE_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", "#a78bfa", "#6d28d9"];

export function GenreBreakdownChart({ data }: { data: GenreRow[] }) {
  const chartData = data.map((r) => ({
    name: r.genre,
    value: Number(r.vote_count),
    pct: Number(r.pct_of_total),
    boostPct: Number(r.boost_pct),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} stroke="none" />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "#0e0c14", border: "1px solid rgba(139, 92, 246, 0.3)", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#a78bfa" }}
          itemStyle={{ color: "#e9d5ff" }}
          formatter={(_v, _n, item) => {
            const payload = item?.payload as { pct?: number; boostPct?: number } | undefined;
            return [`${payload?.pct ?? 0}% de los votos · ${payload?.boostPct ?? 0}% con boost`, ""];
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: "#a78bfa" }}
          formatter={(value: string) => <span style={{ color: "#a78bfa" }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
