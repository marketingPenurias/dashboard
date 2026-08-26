import type { Route } from "./+types/api.auth.logout";
import { ANALYTICS_COOKIE } from "@/lib/analytics-jwt.server";

/** POST /api/auth/logout — borra la cookie de sesión y vuelve a /login. */
export async function action({ request }: Route.ActionArgs) {
	if (request.method !== "POST") {
		return new Response("Method not allowed", { status: 405 });
	}

	const url = new URL("/login", request.url);
	const cookie = [
		`${ANALYTICS_COOKIE}=`,
		"Path=/",
		"HttpOnly",
		"SameSite=Lax",
		"Max-Age=0",
	].join("; ");

	return new Response(null, {
		status: 303,
		headers: { Location: url.toString(), "Set-Cookie": cookie },
	});
}
