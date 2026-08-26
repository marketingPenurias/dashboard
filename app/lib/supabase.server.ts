import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AppLoadContext } from "react-router";

/**
 * Server-side Supabase clients for the Cloudflare Worker.
 *
 * Uses the new Supabase API key naming (no "anon" / "service_role" labels
 * in code):
 *   - SUPABASE_PUBLISHABLE_KEY  → browser-safe, RLS-bound
 *   - SUPABASE_SECRET_KEY       → server-only, bypasses RLS
 */

type ServerEnv = Env & {
	SUPABASE_URL?: string;
	SUPABASE_PUBLISHABLE_KEY?: string;
	SUPABASE_SECRET_KEY?: string;
};

function readEnv(context: AppLoadContext): ServerEnv {
	return context.cloudflare.env as ServerEnv;
}

/**
 * Cliente anon — solo para verificar el `access_token` de un usuario ya
 * autenticado en Supabase Auth (`supabase.auth.getUser(access_token)`,
 * patrón recomendado por Supabase: nunca confiar en un JWT de cliente sin
 * verificarlo contra el proyecto). Usado exclusivamente por el login.
 */
export function getSupabase(context: AppLoadContext): SupabaseClient {
	const env = readEnv(context);
	const url = env.SUPABASE_URL;
	const key = env.SUPABASE_PUBLISHABLE_KEY;

	if (!url || !key) {
		throw new Response("Supabase not configured", { status: 503 });
	}

	return createClient(url, key, {
		auth: { persistSession: false, autoRefreshToken: false },
		global: {
			headers: { "X-Client-Info": "nightgraph-dashboard-worker" },
		},
	});
}

/**
 * Cliente SECRET (service_role) — bypassea RLS. Requerido para leer
 * `platform_staff` / `promoter_staff` (RLS sin políticas: nadie más puede
 * leerlas) y para invocar las RPC de `analytics`. Lanza un 503 explícito
 * si el secreto no está provisionado, en vez de fallar en silencio.
 */
export function getServiceSupabase(context: AppLoadContext): SupabaseClient {
	const env = readEnv(context);
	const url = env.SUPABASE_URL;
	const key = env.SUPABASE_SECRET_KEY;

	if (!url || !key) {
		throw new Response("Supabase secret key not configured", {
			status: 503,
		});
	}

	return createClient(url, key, {
		auth: { persistSession: false, autoRefreshToken: false },
		global: {
			headers: { "X-Client-Info": "nightgraph-dashboard-worker-srv" },
		},
	});
}

/**
 * Invoca una RPC de analytics con el cliente service_role. Recibe
 * `context` como primer argumento (ya no hay singleton de módulo — cada
 * request de Worker resuelve sus propios bindings).
 */
export async function analyticsRpc<T>(
	context: AppLoadContext,
	fnName: string,
	params: Record<string, unknown>,
): Promise<T[]> {
	const supabase = getServiceSupabase(context);
	const { data, error } = await supabase.rpc(fnName, params);
	if (error) throw new Error(error.message);
	return data ?? [];
}
