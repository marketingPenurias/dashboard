"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

type Row = { cohort_week: string; cohort_size: number; retention_pct_week_3: number };

export function RetentionChart({ data }: { data: Row[] }) {
  const chartData = data.map((r) => ({
    semana: new Date(r.cohort_week).toLocaleDateString("es", { day: "2-digit", month: "short" }),
    tamaño: Number(r.cohort_size),
    retención: Number(r.retention_pct_week_3),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <XAxis dataKey="semana" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
        <Tooltip
          contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: "#94a3b8" }}
          formatter={(v: number) => [`${v}%`]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="retención" name="Retención W3" stroke="#e2e8f0" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
