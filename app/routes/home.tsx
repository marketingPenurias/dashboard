import { redirect } from "react-router";
import type { Route } from "./+types/home";

export async function loader(_args: Route.LoaderArgs) {
	throw redirect("/dashboard");
}
