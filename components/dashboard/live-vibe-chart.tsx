"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Row = { hour: number; minute: number; tokens_flow: number };

export function LiveVibeChart({ data }: { data: Row[] }) {
  const chartData = data.map((r) => ({
    time: `${String(r.hour).padStart(2, "0")}:${String(r.minute).padStart(2, "0")}`,
    tokens: Number(r.tokens_flow),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="tokensGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#e2e8f0" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#e2e8f0" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: "#94a3b8" }}
          itemStyle={{ color: "#e2e8f0" }}
        />
        <Area type="monotone" dataKey="tokens" stroke="#e2e8f0" strokeWidth={2} fill="url(#tokensGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
