import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveVibeChart } from "@/components/dashboard/live-vibe-chart";
import { analyticsRpc } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant";

type LiveVibeRow = {
  tenant_id: string; day: string; hour: number; minute: number;
  location_name: string | null; tokens_spent: number;
  tokens_awarded: number; tokens_flow: number; events_count: number;
};

async function getLiveVibeData(tenantId: string) {
  return analyticsRpc<LiveVibeRow>("ng_get_live_vibe", { p_tenant_id: tenantId });
}

export default async function LiveVibePage() {
  const tenantId = await getTenantId();
  const rows = await getLiveVibeData(tenantId);

  const totalFlow = rows.reduce((s: number, r: { tokens_flow: number }) => s + Number(r.tokens_flow), 0);
  const totalEvents = rows.reduce((s: number, r: { events_count: number }) => s + Number(r.events_count), 0);
  const tokensPerMinute = rows.length > 0 ? (totalFlow / rows.length).toFixed(1) : "—";

  const zoneMap: Record<string, number> = {};
  for (const r of rows as { location_name: string | null; tokens_flow: number }[]) {
    const zone = r.location_name ?? "Sin zona";
    zoneMap[zone] = (zoneMap[zone] ?? 0) + Number(r.tokens_flow);
  }
  const zones = Object.entries(zoneMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxZone = zones[0]?.[1] ?? 1;

  const kpis = [
    { label: "Tokens / minuto", value: tokensPerMinute },
    { label: "Usuarios activos", value: totalEvents > 0 ? String(totalEvents) : "—" },
    { label: "Zona más activa", value: zones[0]?.[0] ?? "—" },
    { label: "Transacciones (1h)", value: totalEvents > 0 ? String(totalEvents) : "—" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Live Vibe</h1>
          <p className="text-sm text-muted-foreground">Actividad de la última hora</p>
        </div>
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
          En directo
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-normal text-muted-foreground">{kpi.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-semibold">{kpi.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Tokens por minuto (última hora)</CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-16 text-center">Sin datos para este período</p>
            ) : (
              <LiveVibeChart data={rows} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Actividad por zona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {zones.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
            ) : zones.map(([zone, flow]) => (
              <div key={zone}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{zone}</span>
                  <span className="font-mono">{flow} tk</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(flow / maxZone) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
