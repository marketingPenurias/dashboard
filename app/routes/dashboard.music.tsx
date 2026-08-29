import type { Route } from "./+types/dashboard.music";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TopTracksChart } from "@/components/dashboard/top-tracks-chart";
import { GenreBreakdownChart } from "@/components/dashboard/genre-breakdown-chart";
import { GenreByHourChart } from "@/components/dashboard/genre-by-hour-chart";
import { InfoHint } from "@/components/dashboard/info-hint";
import { analyticsRpc } from "@/lib/supabase.server";
import { resolveAccess } from "@/lib/access.server";
import { resolveDateRange, resolveTenantFilter } from "@/lib/filters.server";
import { Music2, Coins, Disc3, Flame, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type TrackRow = {
	track_id: string; title: string | null; artist: string | null; genre: string | null;
	vote_count: number; tokens_spent: number; boost_count: number; boost_pct: number;
};
type GenreRow = { genre: string; vote_count: number; tokens_spent: number; pct_of_total: number; boost_pct: number };
type HourRow = { hour: number; genre: string; vote_count: number };

export async function loader({ request, context }: Route.LoaderArgs) {
	const scope = await resolveAccess(request, context);
	const url = new URL(request.url);
	const tenantIds = resolveTenantFilter(scope, url.searchParams);
	const { from, to } = resolveDateRange(url.searchParams);
	const eventId = url.searchParams.get("event");

	if (tenantIds.length === 0) {
		return {
			needsTenantSelection: true as const,
			topTracks: [] as TrackRow[],
			genreBreakdown: [] as GenreRow[],
			genreByHour: [] as HourRow[],
		};
	}

	const params = { p_tenant_ids: tenantIds, p_from: from, p_to: to, p_event_id: eventId || null };

	const [topTracks, genreBreakdown, genreByHour] = await Promise.all([
		analyticsRpc<TrackRow>(context, "ng_get_top_tracks", { ...params, p_limit: 10 }),
		analyticsRpc<GenreRow>(context, "ng_get_genre_breakdown", params),
		analyticsRpc<HourRow>(context, "ng_get_genre_by_hour", params),
	]);

	return { needsTenantSelection: false as const, topTracks, genreBreakdown, genreByHour };
}

export default function MusicPage({ loaderData }: Route.ComponentProps) {
	if (loaderData.needsTenantSelection) {
		return (
			<div className="p-6">
				<Card>
					<CardContent className="py-16 text-center text-sm text-muted-foreground">
						Selecciona una sala para ver sus canciones y géneros más pedidos.
					</CardContent>
				</Card>
			</div>
		);
	}

	const { topTracks, genreBreakdown, genreByHour } = loaderData;

	const totalVotes = genreBreakdown.reduce((s, r) => s + Number(r.vote_count), 0);
	const totalTokens = genreBreakdown.reduce((s, r) => s + Number(r.tokens_spent), 0);
	const topGenre = genreBreakdown[0]?.genre ?? "—";
	const topTrack = topTracks[0]
		? `${topTracks[0].title ?? "Desconocida"}${topTracks[0].artist ? ` — ${topTracks[0].artist}` : ""}`
		: "—";
	// boost_pct viene por género — se pondera por vote_count para sacar una
	// tasa global aproximada (no hay un total de boosts crudo en esta RPC).
	const totalBoostVotes = genreBreakdown.reduce(
		(s, r) => s + (Number(r.vote_count) * Number(r.boost_pct)) / 100,
		0,
	);
	const boostRate = totalVotes > 0 ? `${((totalBoostVotes / totalVotes) * 100).toFixed(1)}%` : "—";

	const kpis = [
		{
			label: "Votos totales",
			hint: "Cuántas veces se ha votado una canción en el período seleccionado — cada voto cuenta, sea gratis o con boost.",
			value: totalVotes > 0 ? String(totalVotes) : "—",
			Icon: Music2,
			iconClass: "text-violet-400",
			accentClass: "border-l-violet-500/60",
		},
		{
			label: "Tokens en música",
			hint: "Tokens gastados en votos con 'boost' (pago extra para subir una canción en la cola).",
			value: totalTokens > 0 ? String(totalTokens) : "—",
			Icon: Coins,
			iconClass: "text-emerald-400",
			accentClass: "border-l-emerald-500/60",
		},
		{
			label: "Género más pedido",
			hint: "El género musical con más votos en el período seleccionado.",
			value: topGenre,
			Icon: Disc3,
			iconClass: "text-amber-400",
			accentClass: "border-l-amber-500/60",
		},
		{
			label: "Canción más pedida",
			hint: "La canción con más votos en el período seleccionado.",
			value: topTrack,
			Icon: Flame,
			iconClass: "text-rose-400",
			accentClass: "border-l-rose-500/60",
		},
		{
			label: "Tasa de boost",
			hint: "Qué porcentaje de los votos son de pago ('boost', para subir una canción en la cola) en vez de gratis — indica qué música vale la pena promocionar porque la gente paga tokens extra por ella.",
			value: boostRate,
			Icon: Zap,
			iconClass: "text-fuchsia-400",
			accentClass: "border-l-fuchsia-500/60",
		},
	];

	return (
		<div className="p-6 space-y-6">
			<div>
				<h1 className="text-xl font-semibold tracking-tight">Música</h1>
				<p className="text-sm text-muted-foreground">Qué pide tu gente, y cuándo lo pide</p>
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
							<span className="text-lg font-semibold truncate block" title={kpi.value}>
								{kpi.value}
							</span>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="grid grid-cols-2 gap-4">
				<Card>
					<CardHeader>
						<div className="flex items-center gap-1.5">
							<CardTitle className="text-sm font-medium">Top 10 canciones</CardTitle>
							<InfoHint text="Las canciones más votadas en el período seleccionado." />
						</div>
					</CardHeader>
					<CardContent>
						{topTracks.length === 0 ? (
							<p className="text-sm text-muted-foreground py-16 text-center">Sin datos de canciones</p>
						) : (
							<TopTracksChart data={topTracks} />
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center gap-1.5">
							<CardTitle className="text-sm font-medium">Reparto por género</CardTitle>
							<InfoHint text="Qué porcentaje de los votos se lleva cada género musical." />
						</div>
					</CardHeader>
					<CardContent>
						{genreBreakdown.length === 0 ? (
							<p className="text-sm text-muted-foreground py-16 text-center">Sin datos de género</p>
						) : (
							<GenreBreakdownChart data={genreBreakdown} />
						)}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center gap-1.5">
						<CardTitle className="text-sm font-medium">Género predominante por hora</CardTitle>
						<InfoHint text="A qué hora de la noche se pide más cada género, sumando todas las noches del período seleccionado — útil para programar al DJ." />
					</div>
				</CardHeader>
				<CardContent>
					{genreByHour.length === 0 ? (
						<p className="text-sm text-muted-foreground py-16 text-center">Sin datos por hora</p>
					) : (
						<GenreByHourChart data={genreByHour} />
					)}
				</CardContent>
			</Card>
		</div>
	);
}
