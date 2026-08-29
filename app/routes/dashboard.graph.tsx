import type { Route } from "./+types/dashboard.graph";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SocialGraph } from "@/components/dashboard/social-graph";
import { ReferralsByWeekChart } from "@/components/dashboard/referrals-by-week-chart";
import { InfoHint } from "@/components/dashboard/info-hint";
import { analyticsRpc } from "@/lib/supabase.server";
import { resolveAccess } from "@/lib/access.server";
import { resolveDateRange, resolveTenantFilter } from "@/lib/filters.server";

type GraphRow = {
	user_id: string;
	user_name: string;
	referral_count: number;
	direct_referrals_count: number;
	referred_returned_independently: number;
	total_ltv: number;
	user_tier: string;
};

type WeekRow = { week: string; new_referrals: number };

export async function loader({ request, context }: Route.LoaderArgs) {
	const scope = await resolveAccess(request, context);
	const url = new URL(request.url);
	const tenantIds = resolveTenantFilter(scope, url.searchParams);
	const { from, to } = resolveDateRange(url.searchParams);
	const eventId = url.searchParams.get("event");

	if (tenantIds.length === 0) {
		return { needsTenantSelection: true as const, rows: [] as GraphRow[], weeklyReferrals: [] as WeekRow[] };
	}

	const [rows, weeklyReferrals] = await Promise.all([
		analyticsRpc<GraphRow>(context, "ng_get_graph_penetration", {
			p_tenant_ids: tenantIds,
			p_from: from,
			p_to: to,
			p_event_id: eventId || null,
		}),
		analyticsRpc<WeekRow>(context, "ng_get_referrals_by_week", {
			p_tenant_ids: tenantIds,
			p_from: from,
			p_to: to,
		}),
	]);
	return { needsTenantSelection: false as const, rows, weeklyReferrals };
}

const tierColors: Record<string, string> = {
	alpha: "bg-amber-500/20 text-amber-400 border-amber-500/30",
	influencer: "bg-violet-500/20 text-violet-400 border-violet-500/30",
	standard: "bg-muted/50 text-muted-foreground",
};

// "alpha"/"standard" son los valores en crudo que devuelve la base de
// datos (10+ / 5-9 / <5 referidos traídos) — se traducen para la UI.
const tierLabels: Record<string, string> = {
	alpha: "Top referidor",
	influencer: "Influencer",
	standard: "Habitual",
};

export default function GraphPage({ loaderData }: Route.ComponentProps) {
	if (loaderData.needsTenantSelection) {
		return (
			<div className="p-6">
				<Card>
					<CardContent className="py-16 text-center text-sm text-muted-foreground">
						Selecciona una sala para ver su grafo de audiencia.
					</CardContent>
				</Card>
			</div>
		);
	}

	const { rows, weeklyReferrals } = loaderData;

	const alphas = rows.filter((r) => r.user_tier !== "standard").slice(0, 6);
	const totalViaReferral = rows.length;
	const activeAlphas = rows.filter((r) => r.user_tier === "alpha").length;
	const avgDepth = rows.length > 0
		? (rows.reduce((s, r) => s + r.referral_count, 0) / rows.length).toFixed(1)
		: "—";

	return (
		<div className="p-6 space-y-6">
			<div>
				<h1 className="text-xl font-semibold">Audiencia & Grafo</h1>
				<p className="text-sm text-muted-foreground">Red de referidos y usuarios con más influencia</p>
			</div>

			<div className="grid grid-cols-3 gap-4">
				<Card className="col-span-2">
					<CardHeader>
						<div className="flex items-center gap-1.5">
							<CardTitle className="text-sm">Red de referidos</CardTitle>
							<InfoHint text="Cada punto es un cliente. Las líneas muestran quién invitó a quién a probar tu sala." />
						</div>
					</CardHeader>
					<CardContent className="h-96">
						<SocialGraph rows={rows} />
					</CardContent>
				</Card>

				<div className="space-y-4">
					<Card>
						<CardHeader>
							<div className="flex items-center gap-1.5">
								<CardTitle className="text-sm">Tus mejores referidores</CardTitle>
								<InfoHint text="Los clientes que más gente nueva han traído a tu sala. Top referidor: 10+ personas traídas. Influencer: 5-9. Habitual: menos de 5." />
							</div>
						</CardHeader>
						<CardContent className="space-y-3">
							{alphas.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
							) : alphas.map((u) => (
								<div key={u.user_id} className="flex items-center justify-between">
									<div>
										<p className="text-sm font-mono truncate max-w-[120px]">{u.user_name ?? u.user_id}</p>
										<p className="text-xs text-muted-foreground">{u.referral_count} referidos</p>
									</div>
									<Badge className={tierColors[u.user_tier] ?? tierColors.standard}>
										{tierLabels[u.user_tier] ?? u.user_tier}
									</Badge>
								</div>
							))}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Resumen de la red</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground flex items-center gap-1">
									Clientes que llegaron invitados
									<InfoHint text="Personas que probaron tu sala porque otro cliente les invitó, en vez de llegar por su cuenta." />
								</span>
								<span className="font-semibold">{totalViaReferral > 0 ? totalViaReferral : "—"}</span>
							</div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground flex items-center gap-1">
									Referidores destacados
									<InfoHint text="Cuántos de tus clientes están en el nivel 'Top referidor' o 'Influencer' (han traído 5 o más personas)." />
								</span>
								<span className="font-semibold">{activeAlphas > 0 ? activeAlphas : "—"}</span>
							</div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground flex items-center gap-1">
									Referidos por persona (media)
									<InfoHint text="De media, a cuánta gente ha traído cada cliente que ha traído al menos a alguien." />
								</span>
								<span className="font-semibold">{avgDepth}</span>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center gap-1.5">
						<CardTitle className="text-sm">Referidos nuevos por semana</CardTitle>
						<InfoHint text="Cuánta gente nueva llegó invitada por otro cliente, semana a semana — si sube, el boca a boca está funcionando cada vez mejor." />
					</div>
				</CardHeader>
				<CardContent>
					{weeklyReferrals.length === 0 ? (
						<p className="text-sm text-muted-foreground py-16 text-center">Sin datos de referidos por semana</p>
					) : (
						<ReferralsByWeekChart data={weeklyReferrals} />
					)}
				</CardContent>
			</Card>
		</div>
	);
}
