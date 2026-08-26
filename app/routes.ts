import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("login", "routes/login.tsx"),
	route("auth/callback", "routes/auth.callback.tsx"),
	route("api/auth/exchange", "routes/api.auth.exchange.ts"),
	route("api/auth/logout", "routes/api.auth.logout.ts"),
	route("dashboard", "routes/dashboard.tsx", [
		index("routes/dashboard._index.tsx"),
		route("live-vibe", "routes/dashboard.live-vibe.tsx"),
		route("graph", "routes/dashboard.graph.tsx"),
		route("retention", "routes/dashboard.retention.tsx"),
	]),
] satisfies RouteConfig;
