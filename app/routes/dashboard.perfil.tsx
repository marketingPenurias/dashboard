import type { Route } from "./+types/dashboard.perfil";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgeBreakdownChart } from "@/components/dashboard/age-breakdown-chart";
import { InfoHint } from "@/components/dashboard/info-hint";
import { analyticsRpc } from "@/lib/supabase.server";
import { resolveAccess } from "@/lib/access.server";
import { resolveDateRange, resolveTenantFilter } from "@/lib/filters.server";
import { Users, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

type AgeRow = { age_range: string; user_count: number };

export async function loader({ request, context }: Route.LoaderArgs) {
	const scope = await resolveAccess(request, context);
	const url = new URL(request.url);
	const tenantIds = resolveTenantFilter(scope, url.searchParams);
	const { from, to } = resolveDateRange(url.searchParams);
	const eventId = url.searchParams.get("event");

	if (tenantIds.length === 0) {
		return { needsTenantSelection: true as const, rows: [] as AgeRow[] };
	}

	const rows = await analyticsRpc<AgeRow>(context, "ng_get_age_breakdown", {
		p_tenant_ids: tenantIds,
		p_from: from,
		p_to: to,
		p_event_id: eventId || null,
	});
	return { needsTenantSelection: false as const, rows };
}

export default function PerfilPage({ loaderData }: Route.ComponentProps) {
	if (loaderData.needsTenantSelection) {
		return (
			<div className="p-6">
				<Card>
					<CardContent className="py-16 text-center text-sm text-muted-foreground">
						Selecciona una sala para ver el perfil de sus asistentes.
					</CardContent>
				</Card>
			</div>
		);
	}

	const rows = loaderData.rows;

	const total = rows.reduce((s, r) => s + Number(r.user_count), 0);
	const sinDato = Number(rows.find((r) => r.age_range === "Sin dato")?.user_count ?? 0);
	const conDato = total - sinDato;

	const rangoTop = [...rows]
		.filter((r) => r.age_range !== "Sin dato")
		.sort((a, b) => Number(b.user_count) - Number(a.user_count))[0];

	const kpis = [
		{
			label: "Usuarios con edad conocida",
			hint: "Asistentes activos en el período seleccionado de los que tenemos fecha de nacimiento registrada.",
			value: total > 0 ? String(conDato) : "—",
			Icon: Users,
			iconClass: "text-emerald-400",
			accentClass: "border-l-emerald-500/60",
		},
		{
			label: "Rango de edad más común",
			hint: "El grupo de edad con más asistentes activos entre los que sí tienen fecha de nacimiento registrada.",
			value: rangoTop && Number(rangoTop.user_count) > 0 ? rangoTop.age_range : "—",
			Icon: PieChart,
			iconClass: "text-violet-400",
			accentClass: "border-l-violet-500/60",
		},
	];

	return (
		<div className="p-6 space-y-6">
			<div>
				<h1 className="text-xl font-semibold tracking-tight">Perfil de asistentes</h1>
				<p className="text-sm text-muted-foreground">
					Distribución de edad de la audiencia — de momento el único dato demográfico disponible
				</p>
			</div>

			<div className="grid grid-cols-2 gap-3">
				{kpis.map((kpi) => (
					<Card key={kpi.label} className={cn("border-l-2", kpi.accentClass)}>
						<CardHeader className="pb-1">
							<div className="flex items-center gap-1.5">
								<kpi.Icon size={13} className={kpi.iconClass} />
								<CardTitle className="text-xs font-normal text-muted-foreground">{kpi.label}</CardTitle>
								<InfoHint text={kpi.hint} />
							</div>
						</CardHeader>
						<CardContent>
							<span className="text-2xl font-semibold tabular-nums">{kpi.value}</span>
						</CardContent>
					</Card>
				))}
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center gap-1.5">
						<CardTitle className="text-sm font-medium">Distribución por edad</CardTitle>
						<InfoHint text="Asistentes activos en el período seleccionado, agrupados por rango de edad." />
					</div>
				</CardHeader>
				<CardContent>
					{rows.length === 0 || total === 0 ? (
						<p className="text-sm text-muted-foreground py-16 text-center">Sin datos para este período</p>
					) : (
						<AgeBreakdownChart data={rows} />
					)}
				</CardContent>
			</Card>
		</div>
	);
}
