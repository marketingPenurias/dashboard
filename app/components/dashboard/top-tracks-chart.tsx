import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type TrackRow = { track_id: string; title: string | null; artist: string | null; genre: string | null; vote_count: number };

const BAR_COLORS = ["#8b5cf6", "#7c3aed", "#6d28d9", "#5b21b6", "#4c1d95"];

export function TopTracksChart({ data }: { data: TrackRow[] }) {
  const chartData = data.map((r) => ({
    name: r.title ? `${r.title}${r.artist ? ` — ${r.artist}` : ""}` : "Desconocida",
    votes: Number(r.vote_count),
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 32)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
        <XAxis type="number" tick={{ fontSize: 11, fill: "#6b5fa6" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: "#a78bfa" }}
          tickLine={false}
          axisLine={false}
          width={160}
          tickFormatter={(v: string) => (v.length > 24 ? `${v.slice(0, 24)}…` : v)}
        />
        <Tooltip
          contentStyle={{ background: "#0e0c14", border: "1px solid rgba(139, 92, 246, 0.3)", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#a78bfa" }}
          itemStyle={{ color: "#e9d5ff" }}
          formatter={(v) => [`${v} votos`, ""]}
        />
        <Bar dataKey="votes" radius={[0, 4, 4, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
