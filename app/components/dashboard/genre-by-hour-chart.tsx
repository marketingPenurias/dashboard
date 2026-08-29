import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

type Row = { hour: number; genre: string; vote_count: number };

const GENRE_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", "#a78bfa", "#6d28d9"];

export function GenreByHourChart({ data }: { data: Row[] }) {
  // Datos vienen "largos" (una fila por hora+género) — hay que pivotarlos a
  // "anchos" (una fila por hora, una columna por género) para las barras apiladas.
  const genres = Array.from(new Set(data.map((r) => r.genre)));
  const byHour = new Map<number, Record<string, number>>();
  for (const r of data) {
    const entry = byHour.get(r.hour) ?? {};
    entry[r.genre] = Number(r.vote_count);
    byHour.set(r.hour, entry);
  }
  const chartData = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${String(hour).padStart(2, "0")}h`,
    ...(byHour.get(hour) ?? {}),
  })).filter((row, i) => byHour.has(i) || Object.keys(row).length > 1);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#6b5fa6" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#6b5fa6" }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "#0e0c14", border: "1px solid rgba(139, 92, 246, 0.3)", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#a78bfa" }}
          itemStyle={{ color: "#e9d5ff" }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "#a78bfa" }} />
        {genres.map((genre, i) => (
          <Bar key={genre} dataKey={genre} stackId="genre" fill={GENRE_COLORS[i % GENRE_COLORS.length]} radius={i === genres.length - 1 ? [3, 3, 0, 0] : undefined} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
