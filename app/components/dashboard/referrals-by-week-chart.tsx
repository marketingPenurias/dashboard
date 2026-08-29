import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type WeekRow = { week: string; new_referrals: number };

export function ReferralsByWeekChart({ data }: { data: WeekRow[] }) {
  const chartData = data.map((r) => ({
    semana: new Date(r.week).toLocaleDateString("es", { day: "2-digit", month: "short" }),
    referidos: Number(r.new_referrals),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <XAxis dataKey="semana" tick={{ fontSize: 11, fill: "#6b5fa6" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#6b5fa6" }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "#0e0c14", border: "1px solid rgba(139, 92, 246, 0.3)", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#a78bfa" }}
          itemStyle={{ color: "#e9d5ff" }}
          formatter={(v) => [`${v} referidos nuevos`, ""]}
        />
        <Bar dataKey="referidos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
