import { redirect } from "react-router";
import type { Route } from "./+types/dashboard._index";

export async function loader(_args: Route.LoaderArgs) {
	throw redirect("/dashboard/live-vibe");
}
