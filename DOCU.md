# NightGraph — The Grid Dashboard

Dashboard analítico B2B para nightclubs. Permite al staff del tenant ver métricas en tiempo real: actividad de tokens, red de referidos y retención de usuarios.

---

## Estructura del proyecto

```
nightgraph/
├── proxy.ts                          # Interceptor de rutas (Next.js 16, antes middleware.ts)
├── app/
│   ├── page.tsx                      # Redirige a /dashboard/live-vibe
│   ├── login/page.tsx                # Pantalla de login (client component)
│   ├── dashboard/
│   │   ├── layout.tsx                # Sidebar de navegación + botón logout
│   │   ├── live-vibe/page.tsx        # Actividad última hora
│   │   ├── retention/page.tsx        # Cohortes y token economy
│   │   └── graph/page.tsx            # Red de referidos
│   └── api/auth/
│       ├── exchange/route.ts         # Supabase JWT → analytics JWT
│       └── logout/route.ts           # Borra cookie y redirige a /login
├── components/dashboard/
│   ├── live-vibe-chart.tsx           # Gráfico de área (tokens/minuto)
│   ├── retention-chart.tsx           # Gráfico de barras (cohortes)
│   ├── token-economy-chart.tsx       # Gráfico emisión vs quema
│   ├── social-graph.tsx              # Grafo de fuerza (react-force-graph-2d)
│   └── logout-button.tsx             # Botón de cerrar sesión (client component)
└── lib/
    ├── analytics-jwt.ts              # Firma y verificación de analytics JWT
    ├── tenant.ts                     # Lee tenant_id del header x-tenant-id
    └── supabase/
        ├── server.ts                 # Cliente service_role + analyticsRpc()
        └── client.ts                 # Cliente anon para el browser
```

---

## Variables de entorno

Archivo: `nightgraph/.env.local` (en `.gitignore`, nunca commitear)

| Variable | Dónde se usa | Descripción |
|----------|-------------|-------------|
| `SUPABASE_URL` | Servidor | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor | Clave service_role — bypassea RLS. **Nunca exponer al cliente.** |
| `ANALYTICS_JWT_SECRET` | Solo servidor | Secret para firmar los analytics JWT. String aleatorio largo. |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente y servidor | Igual que SUPABASE_URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente | Clave anon pública — segura en el navegador |

---

## Flujo de autenticación

### Login

1. El usuario entra email y contraseña en `/login`
2. El cliente llama a `supabase.auth.signInWithPassword()` → recibe `access_token` de Supabase
3. El cliente hace `POST /api/auth/exchange` con el `access_token`
4. El servidor (exchange):
   - Verifica el token con el **cliente anon** (`supabaseAnon.auth.getUser(token)`)
   - Busca al usuario en `public.tenant_staff` con el **cliente service_role** (bypassea RLS)
   - Si el usuario es staff activo → crea un analytics JWT con `{ tenant_id, role, scope: "analytics:read" }`
   - Guarda el JWT en una cookie `httpOnly` llamada `ng_analytics_token` (dura 1 hora)
5. El cliente es redirigido a `/dashboard`

### Protección de rutas

`proxy.ts` intercepta todas las peticiones a `/dashboard/*`:
- Si no hay cookie `ng_analytics_token` → redirige a `/login`
- Si el JWT no es válido o ha expirado → borra la cookie y redirige a `/login`
- Si el JWT es válido → extrae `tenant_id` del payload y lo añade como header `x-tenant-id` a la request

### En las páginas

Las páginas del dashboard son **Server Components** (se ejecutan en el servidor, no en el navegador). Leen `x-tenant-id` via `getTenantId()` y llaman a Supabase.

```typescript
// Patrón estándar en todas las páginas
const tenantId = await getTenantId();           // lee x-tenant-id del header
const rows = await analyticsRpc("ng_get_...", { p_tenant_id: tenantId });
```

### Logout

El botón de logout (`components/dashboard/logout-button.tsx`) hace `POST /api/auth/logout`, que borra la cookie y redirige a `/login`. El botón está en la parte inferior del sidebar.

---

## Conexión a Supabase

### `analyticsRpc<T>(fnName, params)`

Función central en `lib/supabase/server.ts`. Llama a una función RPC de Supabase con el cliente service_role y devuelve los resultados tipados.

```typescript
const rows = await analyticsRpc<MiTipo>("ng_get_live_vibe", { p_tenant_id: tenantId });
```

Lanza error si Supabase responde con error (la página mostrará error 500 en dev, error genérico en prod).

### Funciones RPC disponibles en Supabase

Las funciones viven en el schema `public` con prefijo `ng_` (PostgREST solo expone `public`). Internamente llaman a funciones SECURITY DEFINER del schema `analytics`.

| Función Supabase | Parámetro | Qué devuelve |
|-----------------|-----------|-------------|
| `ng_get_live_vibe` | `p_tenant_id uuid` | Actividad por minuto y zona (última hora) |
| `ng_get_cohort_retention` | `p_tenant_id uuid` | Retención semanal por cohorte |
| `ng_get_token_economy` | `p_tenant_id uuid` | Tokens emitidos, quemados, revenue EUR |
| `ng_get_graph_penetration` | `p_tenant_id uuid` | Usuarios alfa, tier, referidos |

---

## Añadir una nueva página al dashboard

1. Crear `app/dashboard/<nombre>/page.tsx` como Server Component:

```typescript
import { analyticsRpc } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant";

type MiRow = { campo: string; valor: number };

export default async function MiPagina() {
  const tenantId = await getTenantId();
  const rows = await analyticsRpc<MiRow>("ng_get_mi_funcion", { p_tenant_id: tenantId });

  return <div>...</div>;
}
```

2. Añadir el enlace en `app/dashboard/layout.tsx` (array `navItems`)

3. Si necesita una función RPC nueva:
   - Crear la función en `analytics` schema (SQL 006)
   - Crear el wrapper `ng_*` en `public` schema (SQL 007)
   - Ejecutar ambas en Supabase SQL Editor

---

## Arrancar el servidor de desarrollo

En Windows con PowerShell (desde la carpeta `nightgraph/`):

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED=0; npx next dev
```

El flag `NODE_TLS_REJECT_UNAUTHORIZED=0` es necesario en Windows con certificados corporativos. Solo para desarrollo local.

El dashboard está en `http://localhost:3000`. El login en `http://localhost:3000/login`.

---

## Base de datos — modelo analítico

El schema `analytics` (separado de `public`) tiene modelo estrella:

**Dimensiones:** `dim_tenants`, `dim_users`, `dim_time`, `dim_locations`, `dim_events`

**Hechos:** `fact_transactions`, `fact_visits`, `fact_rewards`

**Grafo:** `social_graph_referrals`, `mat_view_super_nodes` (vista materializada)

### Multi-tenancy

Todas las tablas tienen `tenant_id` y políticas RLS que aíslan los datos por tenant. La función `analytics.current_tenant_id()` lee la variable de sesión `app.current_tenant_id`.

Las funciones RPC usan `SECURITY DEFINER` + `WHERE tenant_id = p_tenant_id` explícito para aislar datos sin depender del contexto de sesión (necesario con connection pooling).

### ETL

El ETL (`005_etl_public_to_analytics.sql`) mueve datos de `public` a `analytics`:
- Dimensiones: UPSERT (actualizan si ya existen)
- Hechos: FULL REFRESH (TRUNCATE + INSERT)

Se ejecuta manualmente desde Supabase SQL Editor. En producción debería programarse con `pg_cron` o una Edge Function.

---

## Datos de prueba

El archivo `sql/000_seed_test_data.sql` inserta datos de prueba en el schema `public` con `tenant_id = 'a0000000-0000-0000-0000-000000000001'`.

Después hay que correr `005_etl_public_to_analytics.sql` para que los datos lleguen a `analytics`.

Para que el dashboard muestre los datos del seed, el registro de `public.tenant_staff` del usuario que hace login debe apuntar a `tenant_id = 'a0000000-0000-0000-0000-000000000001'`.

**Limpiar datos de prueba** (sin borrar acceso real):
```sql
DELETE FROM analytics.fact_transactions      WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM analytics.fact_visits            WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM analytics.fact_rewards           WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM analytics.dim_users              WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM analytics.dim_events             WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM analytics.dim_tenants            WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001';
REFRESH MATERIALIZED VIEW analytics.mat_view_super_nodes;
DELETE FROM public.wallet_ledger  WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM public.user_profiles  WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM public.tenant_events  WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM public.tenants        WHERE id         = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM auth.users WHERE id::text LIKE 'f0000000%';
```

---

## Problemas conocidos y soluciones

| Problema | Causa | Solución |
|----------|-------|----------|
| Dashboard muestra "Sin datos" | `tenant_id` del JWT no coincide con el de los datos en analytics | Actualizar `tenant_staff.tenant_id` al tenant que tiene datos; cerrar sesión y volver a entrar |
| "Could not find function public.ng_get_*" | Las funciones wrapper no están creadas | Ejecutar `007_public_rpc_wrappers.sql` en Supabase SQL Editor |
| "Invalid schema: analytics" | PostgREST no expone schema analytics | No intentar usar analytics directamente; usar los wrappers `ng_*` en public |
| "permission denied for table tenant_staff" | service_role no tiene GRANT en la tabla | Ejecutar: `GRANT SELECT ON public.tenant_staff TO service_role;` |
| "Usuario no autorizado como staff" | getUser() con service_role no funciona bien | Usar cliente anon (no service_role) para `auth.getUser()` |
| Error SSL en npm (Windows) | Certificado corporativo | Anteponer `$env:NODE_TLS_REJECT_UNAUTHORIZED=0` al comando |
| `aframe is not defined` en build | react-force-graph importa aframe para VR | Usar `react-force-graph-2d` en su lugar |
