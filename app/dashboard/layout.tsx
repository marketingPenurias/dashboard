import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/dashboard/logout-button";

const navItems = [
  { href: "/dashboard/live-vibe", label: "Live Vibe", description: "Actividad en tiempo real" },
  { href: "/dashboard/graph", label: "Audiencia & Grafo", description: "Usuarios alfa y referidos" },
  { href: "/dashboard/retention", label: "Retención & LTV", description: "Cohortes y token economy" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">NightGraph</p>
          <p className="text-sm font-semibold mt-0.5">The Grid</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2.5 hover:bg-accent transition-colors group"
            >
              <p className="text-sm font-medium group-hover:text-accent-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          <Badge variant="outline" className="text-xs font-mono">v0.1</Badge>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
