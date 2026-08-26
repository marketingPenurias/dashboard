import type { Route } from "./+types/api.auth.exchange";
import { getSupabase, getServiceSupabase } from "@/lib/supabase.server";
import { ANALYTICS_COOKIE, signAnalyticsToken } from "@/lib/analytics-jwt.server";

/**
 * POST /api/auth/exchange
 *
 * Recibe el `access_token` de Supabase, resuelve el rol de staff del
 * usuario y emite un analytics JWT de corta duración (1h) en la cookie
 * `ng_analytics_token`.
 *
 * Fix del hallazgo GRAVE (login autorizaba contra `tenant_staff`, la tabla
 * del panel operativo del compañero, no del panel de dueños):
 *   1. Se busca PRIMERO en `platform_staff` (prioridad máxima) — si hay
 *      fila, el usuario es staff de plataforma, acceso a todos los
 *      tenants.
 *   2. Si no hay fila, se busca en `promoter_staff` — si hay fila, el
 *      usuario es dueño/manager de una promotora concreta.
 *   3. Si tampoco hay fila ahí, 403 — un `tenant_staff` (staff operativo)
 *      NO tiene acceso a este panel.
 *   Ambas búsquedas usan `.maybeSingle()`, NUNCA `.single()`: si un
 *   usuario tuviera más de una fila, `.single()` lanza una excepción sin
 *   capturar (500); `.maybeSingle()` devuelve `{ data: null, error }` de
 *   forma controlada, y el handler responde 403 en vez de explotar.
 */
export async function action({ request, context }: Route.ActionArgs) {
	if (request.method !== "POST") {
		return new Response("Method not allowed", { status: 405 });
	}

	const { access_token } = (await request.json()) as { access_token?: string };
	if (!access_token) {
		return Response.json({ error: "Token requerido" }, { status: 400 });
	}

	const supabaseAnon = getSupabase(context);
	const {
		data: { user },
		error: userError,
	} = await supabaseAnon.auth.getUser(access_token);

	if (userError || !user) {
		return Response.json(
			{ error: "Token inválido", detail: userError?.message },
			{ status: 401 },
		);
	}

	const supabase = getServiceSupabase(context);

	// 1. Staff de plataforma — prioridad máxima, acceso a todo.
	const { data: platformStaff, error: platformError } = await supabase
		.from("platform_staff")
		.select("role")
		.eq("user_id", user.id)
		.eq("is_active", true)
		.maybeSingle();

	const env = context.cloudflare.env as { ANALYTICS_JWT_SECRET?: string };
	const secret = env.ANALYTICS_JWT_SECRET;
	if (!secret) {
		return Response.json(
			{ error: "ANALYTICS_JWT_SECRET no configurado" },
			{ status: 503 },
		);
	}

	if (!platformError && platformStaff) {
		const token = await signAnalyticsToken(
			{
				kind: "platform",
				role: platformStaff.role,
				scope: "analytics:read",
				tenant_ids: "ALL",
			},
			secret,
		);
		return jsonWithCookie({ ok: true }, token, request);
	}

	// 2. Staff de promotora — dueño/manager de un grupo de salas.
	const { data: promoterStaff, error: promoterError } = await supabase
		.from("promoter_staff")
		.select("role, promoter_id")
		.eq("user_id", user.id)
		.eq("is_active", true)
		.maybeSingle();

	if (promoterError || !promoterStaff) {
		return Response.json(
			{
				error: "Usuario no autorizado como staff",
				user_id: user.id,
				detail: promoterError?.message,
			},
			{ status: 403 },
		);
	}

	const { data: tenants, error: tenantsError } = await supabase
		.from("tenants")
		.select("id")
		.eq("promoter_id", promoterStaff.promoter_id);

	if (tenantsError) {
		return Response.json(
			{ error: "No se pudieron resolver los tenants", detail: tenantsError.message },
			{ status: 500 },
		);
	}

	const token = await signAnalyticsToken(
		{
			kind: "owner",
			role: promoterStaff.role,
			scope: "analytics:read",
			promoter_id: promoterStaff.promoter_id,
			tenant_ids: (tenants ?? []).map((t) => t.id as string),
		},
		secret,
	);
	return jsonWithCookie({ ok: true }, token, request);
}

function jsonWithCookie(body: unknown, token: string, request: Request) {
	const isHttps = new URL(request.url).protocol === "https:";
	const cookie = [
		`${ANALYTICS_COOKIE}=${encodeURIComponent(token)}`,
		"Path=/",
		"HttpOnly",
		"SameSite=Lax",
		"Max-Age=3600",
		isHttps ? "Secure" : "",
	]
		.filter(Boolean)
		.join("; ");

	return Response.json(body, { headers: { "Set-Cookie": cookie } });
}
