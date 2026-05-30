import { Activity, Network, TrendingUp } from "lucide-react";
import { NavLink } from "@/components/dashboard/nav-link";
import { LogoutButton } from "@/components/dashboard/logout-button";

const navItems = [
  {
    href: "/dashboard/live-vibe",
    label: "Live Vibe",
    description: "Actividad en tiempo real",
    icon: <Activity size={15} />,
  },
  {
    href: "/dashboard/graph",
    label: "Audiencia & Grafo",
    description: "Usuarios alfa y referidos",
    icon: <Network size={15} />,
  },
  {
    href: "/dashboard/retention",
    label: "Retención & LTV",
    description: "Cohortes y token economy",
    icon: <TrendingUp size={15} />,
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-60 shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="px-4 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-md bg-primary/20 ring-1 ring-primary/30 flex items-center justify-center shrink-0">
              <span className="text-primary text-xs font-bold font-mono">NG</span>
            </div>
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest leading-none">NightGraph</p>
              <p className="text-sm font-semibold mt-0.5 text-foreground tracking-tight">The Grid</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
