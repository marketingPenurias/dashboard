import { useNavigate } from "react-router";

export function LogoutButton() {
	const navigate = useNavigate();

	async function handleLogout() {
		await fetch("/api/auth/logout", { method: "POST" });
		navigate("/login");
	}

	return (
		<button
			onClick={handleLogout}
			className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5"
		>
			Cerrar sesión
		</button>
	);
}
