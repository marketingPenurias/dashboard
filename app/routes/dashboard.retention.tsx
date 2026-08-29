import type { Route } from "./+types/dashboard.retention";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RetentionChart } from "@/components/dashboard/retention-chart";
import { TokenEconomyChart } from "@/components/dashboard/token-economy-chart";
import { analyticsRpc } from "@/lib/supabase.server";
import { resolveAccess } from "@/lib/access.server";
import { resolveDateRange, resolveTenantFilter } from "@/lib/filters.server";
import { TrendingUp, Users, Wallet, Flame, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoHint } from "@/components/dashboard/info-hint";

type RetentionRow = {
	cohort_week: string; cohort_size: number;
	retained_week_1: number; retained_week_2: number; retained_week_3: number; retained_week_4: number;
	retention_pct_week_1: number; retention_pct_week_2: number; retention_pct_week_3: number; retention_pct_week_4: number;
};
type EconomyRow = { tokens_issued: number; tokens_burned: number; token_delta: number; revenue_eur: number; estimated_cost_eur: number };

export async function loader({ request, context }: Route.LoaderArgs) {
	const scope = await resolveAccess(request, context);
	const url = new URL(request.url);
	const tenantIds = resolveTenantFilter(scope, url.searchParams);
	const { from, to } = resolveDateRange(url.searchParams);
	const eventId = url.searchParams.get("event");

	if (tenantIds.length === 0) {
		return {
			needsTenantSelection: true as const,
			retentionRows: [] as RetentionRow[],
			economy: null as EconomyRow | null,
		};
	}

	const [retentionRows, economyRows] = await Promise.all([
		analyticsRpc<RetentionRow>(context, "ng_get_cohort_retention", {
			p_tenant_ids: tenantIds,
			p_from: from,
			p_to: to,
			p_event_id: eventId || null,
		}),
		analyticsRpc<EconomyRow>(context, "ng_get_token_economy", {
			p_tenant_ids: tenantIds,
			p_from: from,
			p_to: to,
			p_event_id: eventId || null,
		}),
	]);

	return {
		needsTenantSelection: false as const,
		retentionRows,
		economy: economyRows[0] ?? null,
	};
}

export default function RetentionPage({ loaderData }: Route.ComponentProps) {
	if (loaderData.needsTenantSelection) {
		return (
			<div className="p-6">
				<Card>
					<CardContent className="py-16 text-center text-sm text-muted-foreground">
						Selecciona una sala para ver su retención y economía de tokens.
					</CardContent>
				</Card>
			</div>
		);
	}

	const { retentionRows, economy } = loaderData;
	const lastCohort = retentionRows.at(-1) as { retention_pct_week_3: number; cohort_size: number } | undefined;

	const kpis = [
		{
			label: "Retención semana 3",
			hint: "De la gente que vino por primera vez en una semana dada, qué porcentaje volvió entre el día 7 y el día 21 después. Mide si tus clientes nuevos repiten.",
			value: lastCohort ? `${lastCohort.retention_pct_week_3}%` : "—",
			sub: "de la última cohorte",
			Icon: TrendingUp,
			iconClass: "text-violet-400",
			accentClass: "border-l-violet-500/60",
		},
		{
			label: "Tamaño cohorte",
			hint: "Una 'cohorte' es el grupo de gente que vino por primera vez la misma semana. Este número es cuánta gente probó tu sala por primera vez en la última semana registrada.",
			value: lastCohort ? String(lastCohort.cohort_size) : "—",
			sub: "clientes nuevos, última semana",
			Icon: Users,
			iconClass: "text-cyan-400",
			accentClass: "border-l-cyan-500/60",
		},
		{
			label: "Tokens emitidos",
			hint: "Tokens que has repartido a tus clientes (por compra, recompensa, promo...) en el período seleccionado.",
			value: economy ? `${(Number(economy.tokens_issued) / 1000).toFixed(1)}k` : "—",
			sub: "total del período",
			Icon: Wallet,
			iconClass: "text-emerald-400",
			accentClass: "border-l-emerald-500/60",
		},
		{
			label: "Tokens quemados",
			hint: "Tokens que tus clientes han gastado de verdad (canjeados por algo) en el período seleccionado — la diferencia con 'emitidos' es tu pasivo pendiente.",
			value: economy ? `${(Number(economy.tokens_burned) / 1000).toFixed(1)}k` : "—",
			sub: "total del período",
			Icon: Flame,
			iconClass: "text-rose-400",
			accentClass: "border-l-rose-500/60",
		},
		{
			label: "Float de tokens",
			hint: "Tokens emitidos menos tokens quemados — es el 'pasivo pendiente' que le debes a tus clientes: tokens que ya diste pero todavía no han canjeado por nada.",
			value: economy ? `${(Number(economy.token_delta) / 1000).toFixed(1)}k` : "—",
			sub: "pendiente de canjear",
			Icon: Gauge,
			iconClass: "text-orange-400",
			accentClass: "border-l-orange-500/60",
		},
	];

	return (
		<div className="p-6 space-y-6">
			<div>
				<h1 className="text-xl font-semibold tracking-tight">Retención & LTV</h1>
				<p className="text-sm text-muted-foreground">
					¿Vuelve tu gente? Y si vuelve, ¿cuánto gasta? ("LTV" = valor total que deja un cliente a lo largo del tiempo)
				</p>
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
							<p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="grid grid-cols-2 gap-4">
				<Card>
					<CardHeader>
						<div className="flex items-center gap-1.5">
							<CardTitle className="text-sm font-medium">Retención por cohorte semanal</CardTitle>
							<InfoHint text="Agrupa a tus clientes por la semana de su primera visita y muestra qué porcentaje de cada grupo volvió." />
						</div>
					</CardHeader>
					<CardContent>
						{retentionRows.length === 0 ? (
							<p className="text-sm text-muted-foreground py-16 text-center">Sin datos de cohortes</p>
						) : (
							<RetentionChart data={retentionRows} />
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center gap-1.5">
							<CardTitle className="text-sm font-medium">Tokens emitidos vs. quemados</CardTitle>
							<InfoHint text="Emitidos = los que has repartido. Quemados = los que tus clientes han gastado de verdad. Si emitidos supera mucho a quemados, tienes tokens 'flotando' sin canjear." />
						</div>
					</CardHeader>
					<CardContent>
						{!economy ? (
							<p className="text-sm text-muted-foreground py-16 text-center">Sin datos de tokens</p>
						) : (
							<TokenEconomyChart data={economy} />
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
