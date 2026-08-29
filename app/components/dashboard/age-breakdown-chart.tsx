import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type AgeRow = { age_range: string; user_count: number };

const BUCKET_ORDER = ["Menor de 18", "18-24", "25-34", "35-44", "45-54", "55+", "Sin dato"];
const BUCKET_COLORS: Record<string, string> = {
	"Menor de 18": "#f43f5e",
	"18-24": "#8b5cf6",
	"25-34": "#7c3aed",
	"35-44": "#6d28d9",
	"45-54": "#5b21b6",
	"55+": "#4c1d95",
	"Sin dato": "#3f3a52",
};

export function AgeBreakdownChart({ data }: { data: AgeRow[] }) {
	const chartData = [...data]
		.sort((a, b) => BUCKET_ORDER.indexOf(a.age_range) - BUCKET_ORDER.indexOf(b.age_range))
		.map((r) => ({ rango: r.age_range, usuarios: Number(r.user_count) }));

	return (
		<ResponsiveContainer width="100%" height={240}>
			<BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
				<XAxis dataKey="rango" tick={{ fontSize: 11, fill: "#6b5fa6" }} tickLine={false} axisLine={false} />
				<YAxis tick={{ fontSize: 11, fill: "#6b5fa6" }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
				<Tooltip
					contentStyle={{ background: "#0e0c14", border: "1px solid rgba(139, 92, 246, 0.3)", borderRadius: 8, fontSize: 12 }}
					labelStyle={{ color: "#a78bfa" }}
					itemStyle={{ color: "#e9d5ff" }}
					formatter={(v) => [`${v} usuarios`, ""]}
				/>
				<Bar dataKey="usuarios" radius={[4, 4, 0, 0]}>
					{chartData.map((r) => (
						<Cell key={r.rango} fill={BUCKET_COLORS[r.rango] ?? "#8b5cf6"} />
					))}
				</Bar>
			</BarChart>
		</ResponsiveContainer>
	);
}
