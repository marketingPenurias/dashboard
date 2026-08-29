import { Activity, Network, TrendingUp, Music, UserRound } from "lucide-react";
import { Form, Outlet, useLocation, useSubmit } from "react-router";
import type { Route } from "./+types/dashboard";
import { resolveAccess } from "@/lib/access.server";
import {
	fetchEventOptions,
	fetchTenantOptions,
	resolveDateRange,
	resolveTenantFilter,
} from "@/lib/filters.server";
import { NavLink } from "@/components/dashboard/nav-link";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { Select } from "@/components/ui/select";

const navItems = [
	{
		href: "/dashboard/live-vibe",
		label: "Live Vibe",
		description: "Actividad en tiempo real",
		icon: <Activity size={15} />,
	},
	{
		href: "/dashboard/graph",
		label: "Audiencia & Grafo",
		description: "Usuarios alfa y referidos",
		icon: <Network size={15} />,
	},
	{
		href: "/dashboard/retention",
		label: "Retención & LTV",
		description: "Cohortes y token economy",
		icon: <TrendingUp size={15} />,
	},
	{
		href: "/dashboard/music",
		label: "Música",
		description: "Canciones y géneros más pedidos",
		icon: <Music size={15} />,
	},
	{
		href: "/dashboard/perfil",
		label: "Perfil de asistentes",
		description: "Edad de la audiencia",
		icon: <UserRound size={15} />,
	},
];

export async function loader({ request, context }: Route.LoaderArgs) {
	// Defensa en profundidad: aunque cada sub-ruta vuelve a llamar
	// resolveAccess() en su propio loader, el layout también valida la
	// sesión antes de renderizar el sidebar.
	const scope = await resolveAccess(request, context);

	const url = new URL(request.url);
	const tenantIds = resolveTenantFilter(scope, url.searchParams);
	const { from, to } = resolveDateRange(url.searchParams);

	const tenantOptions = await fetchTenantOptions(context, scope);
	const eventOptions =
		tenantIds.length === 1 ? await fetchEventOptions(context, tenantIds[0]) : [];

	return {
		scopeKind: scope.kind,
		tenantOptions,
		eventOptions,
		selectedTenant: tenantIds.length === 1 ? tenantIds[0] : "",
		selectedFrom: from ?? "",
		selectedTo: to ?? "",
		selectedEvent: url.searchParams.get("event") ?? "",
	};
}

export default function DashboardLayout({ loaderData }: Route.ComponentProps) {
	const submit = useSubmit();
	// `action="."` en <Form> no resolvía a la ruta hija actual (se quedaba en
	// la propia ruta del layout, "/dashboard", que redirige siempre a
	// /dashboard/live-vibe perdiendo los query params) — usamos el pathname
	// real del navegador en su lugar, sin ambigüedad de resolución relativa.
	const location = useLocation();
	const {
		scopeKind,
		tenantOptions,
		eventOptions,
		selectedTenant,
		selectedFrom,
		selectedTo,
		selectedEvent,
	} = loaderData;

	const dateInputClass =
		"rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";
	const filterLabelClass =
		"text-[10px] font-mono uppercase tracking-widest text-muted-foreground";

	return (
		<div className="flex h-screen overflow-hidden bg-background">
			<aside className="w-60 shrink-0 border-r border-border bg-sidebar flex flex-col">
				<div className="px-4 pt-5 pb-4 border-b border-border">
					<div className="flex items-center gap-2.5">
						<div className="size-7 rounded-md bg-primary/20 ring-1 ring-primary/30 flex items-center justify-center shrink-0">
							<span className="text-primary text-xs font-bold font-mono">NG</span>
						</div>
						<div>
							<p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest leading-none">NightGraph</p>
							<p className="text-sm font-semibold mt-0.5 text-foreground tracking-tight">The Grid</p>
						</div>
					</div>
				</div>
				<nav className="flex-1 p-2 space-y-0.5">
					{navItems.map((item) => (
						// Se arrastra location.search para que sala/fecha/fiesta se
						// mantengan al cambiar de pestaña — sin esto cada link llevaba
						// a una URL "limpia" y los filtros se perdían al navegar.
						<NavLink key={item.href} {...item} href={`${item.href}${location.search}`} />
					))}
				</nav>
				<div className="p-3 border-t border-border">
					<LogoutButton />
				</div>
			</aside>
			<main className="flex-1 overflow-auto">
				<div className="border-b border-border bg-sidebar/50 px-6 py-3">
					{/*
						`key` fuerza el remount del <Form> cuando cambian los filtros
						resueltos por el loader (por ejemplo, navegación con
						atrás/adelante del navegador, o un bookmark con otros query
						params). Los <input>/<select> de abajo son no controlados
						(`defaultValue`), así que sin este remount no se
						resincronizarían con la URL salvo que el cambio viniera del
						propio formulario.
					*/}
					<Form
						key={`${selectedTenant}|${selectedFrom}|${selectedTo}|${selectedEvent}`}
						method="get"
						action={location.pathname}
						className="flex flex-wrap items-end gap-3"
					>
						<div className="flex flex-col gap-1">
							<label htmlFor="tenant-filter" className={filterLabelClass}>
								Sala
							</label>
							<Select
								id="tenant-filter"
								name="tenant"
								defaultValue={selectedTenant}
								className="min-w-48"
								onChange={(e) => submit(e.currentTarget.form)}
							>
								{scopeKind === "owner" && (
									<option value="">
										Todas mis salas{tenantOptions.length > 0 ? ` (${tenantOptions.length})` : ""}
									</option>
								)}
								{scopeKind === "platform" && selectedTenant === "" && (
									<option value="" disabled>
										Selecciona una sala…
									</option>
								)}
								{tenantOptions.map((tenant) => (
									<option key={tenant.id} value={tenant.id}>
										{tenant.name}
									</option>
								))}
							</Select>
						</div>

						<div className="flex flex-col gap-1">
							<label htmlFor="from-filter" className={filterLabelClass}>
								Desde
							</label>
							<input
								id="from-filter"
								type="date"
								name="from"
								defaultValue={selectedFrom}
								className={dateInputClass}
								// onBlur, no onChange: un input de fecha nativo dispara
								// onChange por cada dígito que escribes (año incluido) —
								// con onChange, el remount del <Form> (ver `key` arriba)
								// cortaba la escritura a mitad. onBlur envía solo al
								// terminar de editar el campo.
								onBlur={(e) => submit(e.currentTarget.form)}
							/>
						</div>

						<div className="flex flex-col gap-1">
							<label htmlFor="to-filter" className={filterLabelClass}>
								Hasta
							</label>
							<input
								id="to-filter"
								type="date"
								name="to"
								defaultValue={selectedTo}
								className={dateInputClass}
								onBlur={(e) => submit(e.currentTarget.form)}
							/>
						</div>

						{eventOptions.length > 0 && (
							<div className="flex flex-col gap-1">
								<label htmlFor="event-filter" className={filterLabelClass}>
									Fiesta
								</label>
								<Select
									id="event-filter"
									name="event"
									defaultValue={selectedEvent}
									className="min-w-48"
									onChange={(e) => submit(e.currentTarget.form)}
								>
									<option value="">Todas las fiestas</option>
									{eventOptions.map((eventOption) => (
										<option key={eventOption.id} value={eventOption.id}>
											{eventOption.name}
										</option>
									))}
								</Select>
							</div>
						)}
					</Form>
				</div>
				<Outlet />
			</main>
		</div>
	);
}
