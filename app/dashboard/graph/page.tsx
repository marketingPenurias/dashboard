import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SocialGraph } from "@/components/dashboard/social-graph";
import { analyticsRpc } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant";

type GraphRow = {
  user_id: string;
  user_name: string;
  referral_count: number;
  direct_referrals_count: number;
  referred_returned_independently: number;
  total_ltv: number;
  user_tier: string;
};

async function getGraphData(tenantId: string): Promise<GraphRow[]> {
  return analyticsRpc<GraphRow>("ng_get_graph_penetration", { p_tenant_id: tenantId });
}

const tierColors: Record<string, string> = {
  alpha: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  influencer: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  standard: "bg-muted text-muted-foreground",
};

export default async function GraphPage() {
  const tenantId = await getTenantId();
  const rows: GraphRow[] = await getGraphData(tenantId);

  const alphas = rows.filter((r) => r.user_tier !== "standard").slice(0, 6);
  const totalViaReferral = rows.length;
  const activeAlphas = rows.filter((r) => r.user_tier === "alpha").length;
  const avgDepth = rows.length > 0
    ? (rows.reduce((s, r) => s + r.referral_count, 0) / rows.length).toFixed(1)
    : "—";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Audiencia & Grafo</h1>
        <p className="text-sm text-muted-foreground">Red de referidos y usuarios con más influencia</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Red de referidos</CardTitle>
          </CardHeader>
          <CardContent className="h-96">
            <SocialGraph rows={rows} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Usuarios alfa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alphas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
              ) : alphas.map((u) => (
                <div key={u.user_id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-mono truncate max-w-[120px]">{u.user_name ?? u.user_id}</p>
                    <p className="text-xs text-muted-foreground">{u.referral_count} referidos</p>
                  </div>
                  <Badge className={tierColors[u.user_tier] ?? tierColors.standard}>{u.user_tier}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Penetración del grafo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Usuarios via referido</span>
                <span className="font-semibold">{totalViaReferral > 0 ? totalViaReferral : "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Nodos alfa activos</span>
                <span className="font-semibold">{activeAlphas > 0 ? activeAlphas : "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Referidos medios</span>
                <span className="font-semibold">{avgDepth}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
