import type { Route } from "./+types/dashboard.live-vibe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveVibeChart } from "@/components/dashboard/live-vibe-chart";
import { InfoHint } from "@/components/dashboard/info-hint";
import { analyticsRpc } from "@/lib/supabase.server";
import { resolveAccess } from "@/lib/access.server";
import { resolveDateRange, resolveTenantFilter } from "@/lib/filters.server";
import { Zap, Users, MapPin, ArrowLeftRight, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

type LiveVibeRow = {
	tenant_id: string; day: string; hour: number; minute: number;
	location_name: string | null; tokens_spent: number;
	tokens_awarded: number; tokens_flow: number; events_count: number;
	active_users: number; new_visitors: number; returning_visitors: number;
};

export async function loader({ request, context }: Route.LoaderArgs) {
	const scope = await resolveAccess(request, context);
	const url = new URL(request.url);
	const tenantIds = resolveTenantFilter(scope, url.searchParams);
	const { from, to } = resolveDateRange(url.searchParams);
	const eventId = url.searchParams.get("event");

	if (tenantIds.length === 0) {
		return { needsTenantSelection: true as const, rows: [] as LiveVibeRow[] };
	}

	const rows = await analyticsRpc<LiveVibeRow>(context, "ng_get_live_vibe", {
		p_tenant_ids: tenantIds,
		p_from: from,
		p_to: to,
		p_event_id: eventId || null,
	});
	return { needsTenantSelection: false as const, rows };
}

export default function LiveVibePage({ loaderData }: Route.ComponentProps) {
	if (loaderData.needsTenantSelection) {
		return (
			<div className="p-6">
				<Card>
					<CardContent className="py-16 text-center text-sm text-muted-foreground">
						Selecciona una sala para ver su actividad de tokens.
					</CardContent>
				</Card>
			</div>
		);
	}

	const rows = loaderData.rows;

	const totalFlow = rows.reduce((s: number, r: { tokens_flow: number }) => s + Number(r.tokens_flow), 0);
	const totalEvents = rows.reduce((s: number, r: { events_count: number }) => s + Number(r.events_count), 0);
	const totalSpent = rows.reduce((s: number, r: { tokens_spent: number }) => s + Number(r.tokens_spent), 0);
	// active_users viene ya calculado sobre todo el período (no por minuto)
	// y repetido igual en cada fila — con tomar la primera fila alcanza,
	// nunca hay que sumarlo entre filas (sumar usuarios únicos de minutos
	// distintos cuenta de más a quien estuvo activo en varios).
	const activeUsers = Number(rows[0]?.active_users ?? 0);
	const tokensPerMinute = rows.length > 0 ? (totalFlow / rows.length).toFixed(1) : "—";
	const ticketMedio = activeUsers > 0 ? (totalSpent / activeUsers).toFixed(1) : "—";
	// new_visitors/returning_visitors siguen viniendo de la RPC (no se quitó
	// de ahí, solo de esta UI) — se retiró la tarjeta "Nuevos/recurrentes"
	// hasta aclarar por qué fact_visits tiene tan pocos check-ins reales
	// para La Pocha (ver memoria del proyecto).

	const zoneMap: Record<string, number> = {};
	for (const r of rows as { location_name: string | null; tokens_flow: number }[]) {
		const zone = r.location_name ?? "Sin zona";
		zoneMap[zone] = (zoneMap[zone] ?? 0) + Number(r.tokens_flow);
	}
	const zones = Object.entries(zoneMap)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5);
	const maxZone = zones[0]?.[1] ?? 1;

	const kpis = [
		{
			label: "Tokens / minuto",
			hint: "Ritmo medio de movimiento de tokens (gastados + repartidos) por cada minuto del período que estás mirando.",
			value: tokensPerMinute,
			Icon: Zap,
			iconClass: "text-violet-400",
			accentClass: "border-l-violet-500/60",
		},
		{
			label: "Usuarios activos",
			hint: "Cuánta gente distinta hizo algún movimiento de tokens — cada persona cuenta una sola vez, aunque haya gastado varias veces.",
			value: activeUsers > 0 ? String(activeUsers) : "—",
			Icon: Users,
			iconClass: "text-emerald-400",
			accentClass: "border-l-emerald-500/60",
		},
		{
			label: "Zona más activa",
			hint: "Todavía no disponible — falta que la app capture en qué zona de la sala ocurre cada movimiento de tokens.",
			value: zones[0]?.[0] ?? "—",
			Icon: MapPin,
			iconClass: "text-amber-400",
			accentClass: "border-l-amber-500/60",
		},
		{
			label: "Transacciones",
			hint: "Cuántos movimientos de tokens hubo en total — si una persona gastó 3 veces, cuenta como 3 (a diferencia de 'Usuarios activos').",
			value: totalEvents > 0 ? String(totalEvents) : "—",
			Icon: ArrowLeftRight,
			iconClass: "text-cyan-400",
			accentClass: "border-l-cyan-500/60",
		},
		{
			label: "Ticket medio",
			hint: "De media, cuántos tokens gasta cada usuario activo (tokens gastados ÷ usuarios activos) — cuánto 'vale' cada persona que entra a gastar.",
			value: ticketMedio,
			Icon: Wallet,
			iconClass: "text-lime-400",
			accentClass: "border-l-lime-500/60",
		},
	];

	return (
		<div className="p-6 space-y-6">
			<div>
				<h1 className="text-xl font-semibold tracking-tight">Live Vibe</h1>
				<p className="text-sm text-muted-foreground">Actividad de tokens de la sala</p>
			</div>

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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

			<div className="grid grid-cols-3 gap-4">
				<Card className="col-span-2">
					<CardHeader>
						<CardTitle className="text-sm font-medium">Tokens por minuto</CardTitle>
					</CardHeader>
					<CardContent>
						{rows.length === 0 ? (
							<p className="text-sm text-muted-foreground py-16 text-center">Sin datos para este período</p>
						) : (
							<LiveVibeChart data={rows} />
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium">Actividad por zona</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{zones.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
						) : zones.map(([zone, flow], i) => (
							<div key={zone}>
								<div className="flex justify-between text-xs mb-1.5">
									<span className="text-muted-foreground">{zone}</span>
									<span className="font-mono text-foreground">{flow} tk</span>
								</div>
								<div className="h-1.5 bg-muted rounded-full overflow-hidden">
									<div
										className="h-full rounded-full"
										style={{
											width: `${(flow / maxZone) * 100}%`,
											background: i === 0
												? "linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)"
												: "linear-gradient(90deg, #6d28d9 0%, #7c3aed 100%)",
											opacity: 1 - i * 0.15,
										}}
									/>
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
