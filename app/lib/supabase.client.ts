import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente browser de Supabase, puro `@supabase/supabase-js` (no
 * `@supabase/ssr` — el dashboard gestiona su propia cookie de sesión vía
 * `ng_analytics_token`, no necesita el helper de cookies SSR de Supabase).
 *
 * SSR-safe: devuelve `null` durante el render del servidor; el login solo
 * lo usa dentro de un handler de submit, que corre en el cliente.
 */
const VITE_URL = import.meta.env.VITE_SUPABASE_URL;
const VITE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let _client: SupabaseClient | null = null;

function buildClient(): SupabaseClient | null {
	if (typeof window === "undefined") return null;
	if (!VITE_URL || !VITE_KEY) {
		console.warn(
			"[supabase.client] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY missing; auth disabled.",
		);
		return null;
	}
	return createClient(VITE_URL, VITE_KEY, {
		auth: {
			persistSession: true,
			autoRefreshToken: true,
			// `/auth/callback` orquesta el exchange PKCE a mano (patrón ya
			// probado en web-juegos) — `detectSessionInUrl: false` evita que
			// la lib intente procesar el `?code=…` por su cuenta y consuma
			// el `code_verifier` antes de tiempo.
			detectSessionInUrl: false,
			flowType: "pkce",
			storage: window.localStorage,
		},
		global: { headers: { "X-Client-Info": "nightgraph-dashboard-web" } },
	});
}

export function getBrowserSupabase(): SupabaseClient | null {
	if (_client) return _client;
	_client = buildClient();
	return _client;
}
