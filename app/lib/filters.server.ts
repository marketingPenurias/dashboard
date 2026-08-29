import type { AppLoadContext } from "react-router";
import type { AccessScope } from "./access.server";
import { getServiceSupabase } from "./supabase.server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TenantOption = { id: string; name: string };
export type EventOption = { id: string; name: string };

/**
 * Resuelve qué tenant(s) aplicar a las RPC de analytics a partir de
 * `?tenant=` en la URL, validado contra el `AccessScope` del staff — nunca
 * se confía en el query param a ciegas (mismo principio que ya aplica
 * `resolveAccess()` con el JWT).
 *
 *   - `owner`: si `?tenant=` es uno de sus `tenantIds`, se acota a ese. Si
 *     no hay `tenant` válido, por defecto ve TODAS sus salas combinadas.
 *   - `platform`: si `?tenant=` tiene forma de UUID, se usa tal cual (el
 *     staff de plataforma puede ver cualquier sala, no hay whitelist).
 *     Sin `tenant` válido → `[]`, lo que fuerza a elegir una sala en el
 *     selector (Fase 4 — vista `/tenants` — es la única que podrá mostrar
 *     "todas" para plataforma).
 */
export function resolveTenantFilter(
	scope: AccessScope,
	searchParams: URLSearchParams,
): string[] {
	const requested = searchParams.get("tenant");
	const isValidUuid = requested !== null && UUID_RE.test(requested);

	if (scope.kind === "platform") {
		return isValidUuid ? [requested as string] : [];
	}

	if (isValidUuid && scope.tenantIds.includes(requested as string)) {
		return [requested as string];
	}
	return scope.tenantIds;
}

/**
 * Lee `?from=`/`?to=` de la URL. Son solo filtros de fecha (no de
 * autorización, a diferencia del tenant) — la única validación es que sean
 * fechas parseables, para no reenviar basura a la RPC. `<input
 * type="date">` produce `YYYY-MM-DD`, que Postgres castea a medianoche UTC.
 * Para `from` eso es lo correcto ("desde el inicio de ese día"), pero para
 * `to` dejarlo tal cual excluiría TODO el día seleccionado (las RPC filtran
 * con `created_at <= p_to`, y medianoche es el primer instante del día, no
 * el último) — por eso `to` se normaliza al final del día
 * (`T23:59:59.999`) antes de mandarlo a la RPC.
 */
export function resolveDateRange(searchParams: URLSearchParams): {
	from: string | null;
	to: string | null;
} {
	const from = searchParams.get("from");
	const to = searchParams.get("to");
	return {
		from: from && !Number.isNaN(Date.parse(from)) ? from : null,
		to: to && !Number.isNaN(Date.parse(to)) ? `${to}T23:59:59.999` : null,
	};
}

/**
 * Opciones para el selector de sala.
 *   - `owner`: solo las salas de su promotora (`scope.tenantIds`).
 *   - `platform`: todas las salas del sistema.
 */
export async function fetchTenantOptions(
	context: AppLoadContext,
	scope: AccessScope,
): Promise<TenantOption[]> {
	const supabase = getServiceSupabase(context);

	if (scope.kind === "owner") {
		if (scope.tenantIds.length === 0) return [];
		const { data, error } = await supabase
			.from("tenants")
			.select("id, name")
			.in("id", scope.tenantIds)
			.order("name");
		if (error) throw new Error(error.message);
		return data ?? [];
	}

	const { data, error } = await supabase.from("tenants").select("id, name").order("name");
	if (error) throw new Error(error.message);
	return data ?? [];
}

/**
 * Opciones para el selector de fiesta — solo se llama cuando hay
 * exactamente una sala resuelta (un evento pertenece a una sala).
 */
export async function fetchEventOptions(
	context: AppLoadContext,
	tenantId: string,
): Promise<EventOption[]> {
	const supabase = getServiceSupabase(context);
	const { data, error } = await supabase
		.from("tenant_events")
		.select("id, name")
		.eq("tenant_id", tenantId)
		.order("start_time", { ascending: false });
	if (error) throw new Error(error.message);
	return data ?? [];
}
