import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RetentionChart } from "@/components/dashboard/retention-chart";
import { TokenEconomyChart } from "@/components/dashboard/token-economy-chart";
import { analyticsRpc } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant";

type RetentionRow = { cohort_week: string; cohort_size: number; retained_week_3: number; retention_pct_week_3: number };
type EconomyRow = { tokens_issued: number; tokens_burned: number; token_delta: number; revenue_eur: number; estimated_cost_eur: number };

async function getRetentionData(tenantId: string) {
  return analyticsRpc<RetentionRow>("ng_get_cohort_retention", { p_tenant_id: tenantId });
}

async function getTokenEconomyData(tenantId: string) {
  const rows = await analyticsRpc<EconomyRow>("ng_get_token_economy", { p_tenant_id: tenantId });
  return rows[0] ?? null;
}

export default async function RetentionPage() {
  const tenantId = await getTenantId();
  const [retentionRows, economy] = await Promise.all([
    getRetentionData(tenantId),
    getTokenEconomyData(tenantId),
  ]);

  const lastCohort = retentionRows.at(-1) as { retention_pct_week_3: number; cohort_size: number } | undefined;

  const kpis = [
    { label: "Retención semana 3", value: lastCohort ? `${lastCohort.retention_pct_week_3}%` : "—", sub: "última cohorte" },
    { label: "Tamaño cohorte", value: lastCohort ? String(lastCohort.cohort_size) : "—", sub: "usuarios" },
    { label: "Tokens emitidos", value: economy ? `${(Number(economy.tokens_issued) / 1000).toFixed(1)}k` : "—", sub: "total acumulado" },
    { label: "Tokens quemados", value: economy ? `${(Number(economy.tokens_burned) / 1000).toFixed(1)}k` : "—", sub: "total acumulado" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Retención & LTV</h1>
        <p className="text-sm text-muted-foreground">Cohortes semanales y economía de tokens</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-normal text-muted-foreground">{kpi.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-semibold">{kpi.value}</span>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Retención por cohorte semanal</CardTitle>
          </CardHeader>
          <CardContent>
            {retentionRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-16 text-center">Sin datos de cohortes</p>
            ) : (
              <RetentionChart data={retentionRows} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Token economy — emisión vs quema</CardTitle>
          </CardHeader>
          <CardContent>
            {!economy ? (
              <p className="text-sm text-muted-foreground py-16 text-center">Sin datos de tokens</p>
            ) : (
              <TokenEconomyChart data={economy} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
