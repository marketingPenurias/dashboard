import type { AppLoadContext } from "react-router";
import { redirect } from "react-router";
import { ANALYTICS_COOKIE, verifyAnalyticsToken } from "./analytics-jwt.server";

/**
 * Scope de acceso resuelto para el staff autenticado en esta request.
 *
 *   - `platform` → super_admin / analyst de plataforma, ve todos los
 *     tenants (`tenantIds: "ALL"`). Las páginas muestran un placeholder
 *     "selecciona una sala" en vez de intentar `tenantIds[0]` — el
 *     selector multi-sala real es Fase 2.
 *   - `owner`    → dueño/manager de una promotora, ve los tenants de esa
 *     promotora (`tenantIds` es una lista, fiel al modelo final; las
 *     páginas de esta fase usan `tenantIds[0]` porque los RPC todavía
 *     reciben `p_tenant_id` singular).
 */
export type AccessScope =
	| { kind: "platform"; role: string; tenantIds: "ALL" }
	| { kind: "owner"; role: string; promoterId: string; tenantIds: string[] };

type ServerEnv = Env & { ANALYTICS_JWT_SECRET?: string };

function readCookie(request: Request, name: string): string | null {
	const header = request.headers.get("cookie");
	if (!header) return null;
	for (const piece of header.split(";")) {
		const eq = piece.indexOf("=");
		if (eq < 0) continue;
		const key = piece.slice(0, eq).trim();
		if (key !== name) continue;
		const value = piece.slice(eq + 1).trim();
		try {
			return decodeURIComponent(value);
		} catch {
			return value;
		}
	}
	return null;
}

/**
 * Resuelve el `AccessScope` del staff autenticado leyendo y verificando la
 * cookie `ng_analytics_token`.
 *
 * Fix del hallazgo CRÍTICO (`x-tenant-id` falsificable): esta función
 * **nunca** lee `x-tenant-id` ni ningún otro header controlado por el
 * cliente. El tenant sale exclusivamente del JWT firmado por el servidor
 * en el login — no existe ningún camino de código en `resolveAccess()`
 * donde un header de la petición determine el tenant. Sin cookie o con
 * firma inválida/expirada → redirect a `/login`, nunca un 200 con datos.
 */
export async function resolveAccess(
	request: Request,
	context: AppLoadContext,
): Promise<AccessScope> {
	const token = readCookie(request, ANALYTICS_COOKIE);
	if (!token) throw redirect("/login");

	const env = context.cloudflare.env as ServerEnv;
	const secret = env.ANALYTICS_JWT_SECRET;
	if (!secret) {
		throw new Response("ANALYTICS_JWT_SECRET no configurado", {
			status: 503,
		});
	}

	try {
		const payload = await verifyAnalyticsToken(token, secret);

		if (payload.kind === "platform") {
			return { kind: "platform", role: payload.role, tenantIds: "ALL" };
		}

		return {
			kind: "owner",
			role: payload.role,
			promoterId: payload.promoter_id,
			tenantIds: payload.tenant_ids,
		};
	} catch {
		// Firma inválida o token expirado (1h) → volver al login.
		throw redirect("/login");
	}
}
