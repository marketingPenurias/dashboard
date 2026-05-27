"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
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
