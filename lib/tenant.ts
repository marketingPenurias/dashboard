import { headers } from "next/headers";

export async function getTenantId(): Promise<string> {
  const h = await headers();
  const tenantId = h.get("x-tenant-id");
  if (!tenantId) throw new Error("tenant_id no disponible — acceso no autorizado");
  return tenantId;
}
