import { SignJWT, jwtVerify } from "jose";

/**
 * Payload del analytics JWT (`ng_analytics_token`).
 *
 *   - `kind: "platform"`  → staff de plataforma (`platform_staff`), acceso
 *     a TODOS los tenants. `tenant_ids` es literalmente `"ALL"` — no se
 *     enumera la lista completa en el token.
 *   - `kind: "owner"`     → staff de una promotora (`promoter_staff`).
 *     `tenant_ids` es la lista de tenants de esa promotora en el momento
 *     del login (snapshot de 1h — el token expira y se re-emite).
 */
export type AnalyticsPayload =
	| {
			kind: "platform";
			role: string;
			scope: "analytics:read";
			tenant_ids: "ALL";
	  }
	| {
			kind: "owner";
			role: string;
			scope: "analytics:read";
			promoter_id: string;
			tenant_ids: string[];
	  };

/**
 * El secreto llega como parámetro explícito (no como constante de módulo):
 * en Cloudflare Workers no hay `process.env` — el binding solo existe
 * dentro de cada request, vía `context.cloudflare.env`.
 */
export async function signAnalyticsToken(
	payload: AnalyticsPayload,
	secret: string,
): Promise<string> {
	const key = new TextEncoder().encode(secret);
	return new SignJWT({ ...payload })
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime("1h")
		.sign(key);
}

export async function verifyAnalyticsToken(
	token: string,
	secret: string,
): Promise<AnalyticsPayload> {
	const key = new TextEncoder().encode(secret);
	const { payload } = await jwtVerify(token, key);
	return payload as unknown as AnalyticsPayload;
}

export const ANALYTICS_COOKIE = "ng_analytics_token";
