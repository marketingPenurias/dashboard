import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Loader2 } from "lucide-react";
import type { Route } from "./+types/auth.callback";
import { getBrowserSupabase } from "@/lib/supabase.client";

/**
 * /auth/callback — handshake explícito PKCE, mismo patrón probado en
 * web-juegos (`app/routes/auth.callback.tsx`).
 *
 *   Google → Supabase → este endpoint con `?code=…`.
 *   1. `exchangeCodeForSession(code)` — Supabase recupera el
 *      `code_verifier` del localStorage.
 *   2. A diferencia de web-juegos (que solo necesita la sesión de
 *      Supabase), el dashboard además necesita el `ng_analytics_token`:
 *      con el `access_token` ya en mano, se repite el mismo POST a
 *      `/api/auth/exchange` que hace el login por contraseña, para que
 *      el servidor resuelva `platform_staff`/`promoter_staff` y ponga la
 *      cookie httpOnly.
 *   3. Redirige a `/dashboard` (o a `/login` con el error si algo falla).
 */
export function meta(_: Route.MetaArgs) {
	return [
		{ title: "Conectando… · NightGraph" },
		{ name: "robots", content: "noindex,nofollow" },
	];
}

export default function AuthCallback() {
	const navigate = useNavigate();
	const [params] = useSearchParams();
	const [error, setError] = useState<string | null>(null);
	const exchangedRef = useRef(false);

	useEffect(() => {
		// React Strict Mode dispara useEffect dos veces en dev — sin esta
		// guarda, el segundo intento falla con "code verifier mismatch"
		// porque el primero ya consumió el code.
		if (exchangedRef.current) return;
		exchangedRef.current = true;

		const supabase = getBrowserSupabase();
		if (!supabase) {
			navigate("/login", { replace: true });
			return;
		}

		const oauthError = params.get("error_description") || params.get("error");
		if (oauthError) {
			setError(oauthError);
			return;
		}

		const code = params.get("code");
		if (!code) {
			navigate("/login", { replace: true });
			return;
		}

		void (async () => {
			const { data, error: exchangeError } =
				await supabase.auth.exchangeCodeForSession(code);
			if (exchangeError || !data.session) {
				setError(exchangeError?.message ?? "No se pudo iniciar sesión con Google");
				return;
			}

			const res = await fetch("/api/auth/exchange", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ access_token: data.session.access_token }),
			});

			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as { error?: string };
				setError(body.error ?? "Sin acceso al dashboard");
				return;
			}

			navigate("/dashboard", { replace: true });
		})();
	}, [navigate, params]);

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="text-center max-w-sm">
				{error ? (
					<>
						<h1 className="text-lg font-semibold mb-2">No pudimos completar tu inicio de sesión</h1>
						<p className="text-sm text-muted-foreground mb-6 wrap-break-word">{error}</p>
						<button
							type="button"
							onClick={() => navigate("/login", { replace: true })}
							className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium"
						>
							Volver al login
						</button>
					</>
				) : (
					<>
						<Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" aria-hidden="true" />
						<p className="text-sm text-muted-foreground">Conectando con Google…</p>
					</>
				)}
			</div>
		</div>
	);
}
