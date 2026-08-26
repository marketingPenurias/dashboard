# NightGraph — The Grid Dashboard

Dashboard analítico para dueños de discoteca y equipo de plataforma. Permite ver métricas en tiempo real:
actividad de tokens, red de referidos y retención de usuarios.

> Reescrito de Next.js a **React Router 7 + Cloudflare Workers** el 2026-08-26 (Fase 1 del roadmap de
> `ajustes.nightgraph.io`), corrigiendo dos hallazgos de seguridad de la versión anterior. **Desplegado y
> funcionando en `https://ajustes.nightgraph.io` desde ese mismo día.** Ver "Historial" al final.

---

## Estructura del proyecto

```
dashboard/
├── wrangler.json                     # Config del Worker (vars públicas; secrets van aparte)
├── vite.config.ts                    # Plugin de Cloudflare + Tailwind + React Router
├── react-router.config.ts
├── workers/app.ts                    # Entry point del Worker (fetch handler)
├── database/                         # SQL versionado — NO existe en web-juegos, es propio de este repo
│   ├── 001_platform_staff.sql        # Staff de plataforma (equipo Nightgraph)
│   ├── 002_promoter_staff.sql        # Staff de promotora (dueños de discoteca)
│   └── 003_seed_platform_staff.sql   # Siembra el primer super_admin
├── app/
│   ├── root.tsx                      # Layout raíz (html/head/body, sin lógica de auth)
│   ├── routes.ts                     # Declaración de rutas RR7
│   ├── routes/
│   │   ├── home.tsx                  # `/` → redirect a /dashboard
│   │   ├── login.tsx                 # `/login` — botón "Entrar con Google"
│   │   ├── auth.callback.tsx         # `/auth/callback` — handshake PKCE (ver sección Auth)
│   │   ├── api.auth.exchange.ts      # POST — Supabase JWT → analytics JWT
│   │   ├── api.auth.logout.ts        # POST — borra cookie
│   │   ├── dashboard.tsx             # Layout: sidebar + <Outlet/>, llama resolveAccess()
│   │   ├── dashboard._index.tsx      # `/dashboard` → redirect a live-vibe
│   │   ├── dashboard.live-vibe.tsx
│   │   ├── dashboard.graph.tsx
│   │   └── dashboard.retention.tsx
│   ├── lib/
│   │   ├── access.server.ts          # resolveAccess() — el fix de seguridad, ver abajo
│   │   ├── analytics-jwt.server.ts   # firma/verifica el JWT (jose, HS256)
│   │   ├── supabase.server.ts        # getSupabase / getServiceSupabase / analyticsRpc
│   │   └── supabase.client.ts        # cliente browser (PKCE)
│   └── components/
│       ├── ui/                       # button, card, badge, chart (shadcn, Base UI)
│       └── dashboard/                # nav-link, logout-button, social-graph, 3 charts
├── .env / .env.production            # VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY (públicas, commiteadas)
└── .dev.vars                         # SUPABASE_SECRET_KEY / ANALYTICS_JWT_SECRET (secretas, gitignored)
```

---

## Autenticación y autorización

### Por qué NO es como en `web-juegos`

`web-juegos` tiene `tenant_staff`: autoriza el panel **operativo** (`/admin` — DJ, barra, puerta). Este
dashboard es un producto distinto para una audiencia distinta (dueños de discoteca + equipo Nightgraph), así
que usa **tablas propias**:

| Tabla | Para quién | Migración |
|---|---|---|
| `platform_staff` | Equipo Nightgraph — ve todas las discotecas | `database/001_platform_staff.sql` |
| `promoter_staff` | Dueño de una promotora — ve solo sus salas | `database/002_promoter_staff.sql` |

`tenant_staff` **nunca** se consulta desde este repo. Las tres tablas son conjuntos disjuntos — el equipo
Nightgraph no está en `promoter_staff`, un dueño no está en `platform_staff`.

### Login (Google OAuth, PKCE)

1. El usuario pulsa "Entrar con Google" en `/login` → `supabase.auth.signInWithOAuth({ provider: "google", redirectTo: ".../auth/callback" })`.
2. Google → Supabase → `/auth/callback`, que hace `exchangeCodeForSession(code)` para obtener la sesión de
   Supabase (patrón PKCE idéntico al de `web-juegos/app/routes/auth.callback.tsx` — ver ese archivo si hay
   dudas sobre el handshake).
3. Con el `access_token` ya en mano, `/auth/callback` hace `POST /api/auth/exchange`, que:
   - Verifica el token con el cliente **anon**.
   - Busca PRIMERO en `platform_staff` (prioridad máxima, acceso total).
   - Si no hay fila, busca en `promoter_staff` con **`.maybeSingle()`** (nunca `.single()`).
   - Si tampoco hay fila → 403. Un usuario que solo esté en `tenant_staff` (staff operativo) no tiene acceso.
   - Firma un JWT (HS256, 1h) y lo pone en una cookie `httpOnly` (`ng_analytics_token`).
4. Redirect a `/dashboard`.

**Requisito para dar de alta a alguien nuevo:** insertar su fila a mano en `platform_staff` o
`promoter_staff` en Supabase — no hay UI para esto todavía (Fase 4 del roadmap: `/staff`).

### Cómo se resuelve el tenant en cada request (`app/lib/access.server.ts`)

```ts
export async function resolveAccess(request: Request, context: AppLoadContext): Promise<AccessScope> {
  const token = readCookie(request, ANALYTICS_COOKIE);
  if (!token) throw redirect("/login");
  const payload = await verifyAnalyticsToken(token, secret); // firma verificada, HS256
  // payload.kind === "platform" → { tenantIds: "ALL" }
  // payload.kind === "owner"    → { tenantIds: [...] } (todas las salas de su promotora)
}
```

**Regla no negociable:** el tenant SIEMPRE sale de este JWT verificado. Nunca de un header, query param o
body. La versión Next.js anterior tenía aquí el hallazgo de seguridad CRÍTICO — leía `x-tenant-id` de un
header que el cliente podía fabricar. Ese patrón no existe en absoluto en este código; no hay ningún sitio
donde un header determine el tenant.

Cada loader de página vuelve a llamar `resolveAccess()` (barato, defensa en profundidad). Si
`scope.tenantIds === "ALL"` (staff de plataforma), la página muestra "selecciona una sala" — el selector
multi-sala real es Fase 2, todavía no construido.

---

## Conexión a Supabase (`app/lib/supabase.server.ts`)

A diferencia de Next.js, en un Worker de Cloudflare **no hay `process.env`** persistente — las credenciales
llegan por request vía `context.cloudflare.env`:

```ts
export function getSupabase(context)        // cliente anon — solo para verificar access_token en login
export function getServiceSupabase(context) // cliente SECRET (service_role) — bypassea RLS
export async function analyticsRpc<T>(context, fnName, params) // wrapper sobre .rpc(), usa service_role
```

### Funciones RPC disponibles (schema `analytics`, expuestas como `public.ng_get_*`)

| Función | Parámetro (Fase 1) | Qué devuelve |
|---|---|---|
| `ng_get_live_vibe` | `p_tenant_id uuid` | Actividad por minuto y zona (última hora) |
| `ng_get_cohort_retention` | `p_tenant_id uuid` | Retención semanal por cohorte |
| `ng_get_token_economy` | `p_tenant_id uuid` | Tokens emitidos, quemados, revenue EUR |
| `ng_get_graph_penetration` | `p_tenant_id uuid` | Usuarios alfa, tier, referidos |

Todavía reciben `p_tenant_id` singular (no `p_tenant_ids uuid[]` + filtros de fecha/fiesta) — ese cambio de
firma es Fase 2. Existe una quinta función, `ng_get_event_cohort_retention`, que este dashboard no consume.

**Importante:** el DDL real de estas funciones y de las tablas `dim_*`/`fact_*` del schema `analytics` **no
está versionado en ningún repo** — vive solo dentro de Supabase (nunca se hizo `pg_dump`). Si hace falta
tocarlas, hay que exportar el DDL real desde el SQL Editor de Supabase primero.

---

## Base de datos — lo que SÍ está versionado aquí

`database/001_platform_staff.sql` y `002_promoter_staff.sql` — ambas con RLS activo y **sin políticas**
(solo el Worker con `service_role` accede; RLS es defensa en profundidad, no el mecanismo primario).
`003_seed_platform_staff.sql` siembra el primer `super_admin` buscando su cuenta por email en `auth.users`
— si esa cuenta no existe todavía (nunca inició sesión), el `insert` no falla, simplemente no inserta nada;
hay que re-ejecutarlo después de que la cuenta exista.

Numeración propia de este repo (empieza en 001) — no tiene relación con la numeración de
`web-juegos/database/`.

---

## Variables de entorno

| Variable | Dónde vive | Pública/secreta |
|---|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env` (dev) / `.env.production` (build) | Pública, commiteada |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | `wrangler.json` → `vars` | Pública, commiteada |
| `SUPABASE_SECRET_KEY` | `.dev.vars` (local) / `wrangler secret put` (prod) | **Secreta, nunca commitear** |
| `ANALYTICS_JWT_SECRET` | `.dev.vars` (local) / `wrangler secret put` (prod) | **Secreta, nunca commitear** — generar una distinta para prod, no reusar la de dev |

Si cambias `wrangler.json`, corre `npm run cf-typegen` para regenerar `worker-configuration.d.ts`.

---

## Añadir una nueva página al dashboard

1. Crear `app/routes/dashboard.<nombre>.tsx`:

```tsx
import type { Route } from "./+types/dashboard.<nombre>";
import { analyticsRpc } from "@/lib/supabase.server";
import { resolveAccess } from "@/lib/access.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const scope = await resolveAccess(request, context);
  if (scope.tenantIds === "ALL") return { needsTenantSelection: true as const };
  const rows = await analyticsRpc(context, "ng_get_mi_funcion", { p_tenant_id: scope.tenantIds[0] });
  return { needsTenantSelection: false as const, rows };
}

export default function MiPagina({ loaderData }: Route.ComponentProps) {
  // ...
}
```

2. Añadirla a `app/routes.ts` (dentro del array hijo de la ruta `dashboard`).
3. Añadir el link en el sidebar (`app/routes/dashboard.tsx`).
4. Si hace falta una RPC nueva: crearla en el schema `analytics` + su wrapper `ng_*` en `public`, con
   `revoke`/`grant` a `service_role` únicamente — hacerlo en el SQL Editor de Supabase y, si el cambio es
   significativo, documentarlo aquí.

   ⚠️ **Esto no es opcional.** El 2026-08-26, ya en producción, se comprobó con `curl` que las 5 RPC
   existentes eran invocables directamente con la clave `publishable` (pública, la misma que hay en el
   navegador), saltándose el Worker y el login entero. Cualquier RPC nueva que no lleve su `revoke`/`grant`
   tiene el mismo problema desde el minuto uno. Verificar así tras crear una:
   ```bash
   curl -X POST "https://cfxpwsexxwcxogwuykue.supabase.co/rest/v1/rpc/<nombre>" \
     -H "apikey: <SUPABASE_PUBLISHABLE_KEY>" -H "Content-Type: application/json" -d '{"p_tenant_id":"..."}'
   ```
   Debe devolver `401 permission denied` — si devuelve `200`, falta el `revoke`.

---

## Arrancar en local

```powershell
npm install
Copy-Item .dev.vars.example .dev.vars   # rellenar los dos secrets
npm run dev
```

`http://localhost:5173`. Si al abrir una ruta nueva por primera vez sale un error de React tipo
`Cannot read properties of null (reading 'useContext')`, es la caché de dependencias de Vite
desincronizada — borrar `node_modules/.vite` y reiniciar `npm run dev` lo arregla.

---

## Desplegar

No hay pipeline propio en este repo — el deploy va por **Cloudflare Workers Builds** (Git integration
configurada desde el Cloudflare Dashboard, apuntando a este repo, Worker independiente del de `web-juegos`).

### Cuenta de Cloudflare — importante

El Worker vive en **la cuenta del compañero** (`Alvarocdiez@gmail.com's Account`,
`account_id: 05395d36fbdf2ce550ba8808d4d4f4ff`, ya fijado en `wrangler.json`), **no** en una cuenta propia —
porque la zona DNS `nightgraph.io` está dada de alta ahí, y Cloudflare exige que el Worker y la zona vivan
en la misma cuenta para poder atarle un dominio personalizado. La usuaria fue invitada como miembro de esa
cuenta. Si `wrangler` (CLI) da error `"More than one account available but unable to select one in
non-interactive mode"`, es por esto — el `account_id` en `wrangler.json` ya lo resuelve para comandos
futuros.

El nombre real del Worker desplegado es **`dashboard`** (no `nightgraph-dashboard` como dice `wrangler.json`
— el flujo "Import a repository" del dashboard de Cloudflare no leyó el campo `name` del archivo, usó el
nombre del repo). Tenerlo en cuenta al buscar logs o si algún día se vuelve a usar la CLI.

### Checklist (ya completado el 2026-08-26, dejar como referencia)

- [x] Worker creado vía **Workers & Pages → Create Application → Workers → Import a repository** (no vía
      `wrangler login`/`wrangler deploy` — el login OAuth de la CLI daba timeout en este entorno; todo se
      hizo desde el dashboard web).
- [x] `SUPABASE_SECRET_KEY` y `ANALYTICS_JWT_SECRET` puestos en **Runtime Variables and Secrets** — ⚠️ NO en
      la sección "Variables and Secrets" a secas, esa es solo de build-time y no llega al Worker en
      ejecución (ver "Problemas conocidos" más abajo).
- [x] `database/001` a `003` ejecutados en el SQL Editor de Supabase.
- [x] `https://ajustes.nightgraph.io/auth/callback` cubierto por el Redirect URL comodín
      `https://*.nightgraph.io/auth/callback` ya existente en Supabase (no hizo falta añadir uno nuevo).
- [x] Route específica `ajustes.nightgraph.io/*` → Worker `dashboard` añadida en la zona (ver "Problemas
      conocidos" — había un wildcard `*.nightgraph.io/*` que la interceptaba antes).
- [x] `revoke`/`grant` aplicado a las 5 RPC `ng_get_*` — ver sección de arriba, era un hallazgo de seguridad
      real encontrado ya con el dashboard en producción.
- [x] Dominio atado: **Worker → Settings → Domains & Routes → Add Custom Domain** → `ajustes.nightgraph.io`.

Para el próximo deploy (cualquier push a `main` ya dispara uno automático vía Workers Builds): si tras
guardar Runtime Variables/Secrets nuevas el cambio no parece aplicarse, comprobar en la pestaña
**Deployments** si la versión activa (punto azul) es la más reciente — añadir una variable NO redespliega
sola, hay que forzarlo (un `git commit --allow-empty && git push` funciona).

---

## Problemas conocidos

| Problema | Causa | Solución |
|---|---|---|
| `Cannot read properties of null (reading 'useContext')` al visitar una ruta por primera vez en dev | Caché de Vite (`node_modules/.vite`) desincronizada tras cambiar dependencias | `rm -rf node_modules/.vite`, reiniciar `npm run dev` |
| "Invalid API key" al intentar loguear | `SUPABASE_PUBLISHABLE_KEY` mal transcrita en algún `.env`/`wrangler.json` | Verificar con `curl .../auth/v1/settings -H "apikey: <key>"` — debe devolver 200, no 401 |
| "PKCE code verifier not found in storage" | Localstorage con un `code_verifier` de un intento de login anterior sin completar | Limpiar Local Storage del dominio en DevTools, reintentar en pestaña nueva |
| Redirect a `/login` sin motivo aparente tras "Entrar con Google" | La URL de callback exacta (`.../auth/callback`) no está en la lista de Redirect URLs de Supabase | Añadirla en Authentication → URL Configuration |
| "Usuarios activos" y "Transacciones (1h)" muestran el mismo valor en Live Vibe | Bug conocido en el contrato de `ng_get_live_vibe` (usa `totalEvents` para ambos) | Pendiente para Fase 2, junto al cambio de firma del RPC — ver `// TODO(fase-2)` en `dashboard.live-vibe.tsx` |
| `tokensPerMinute` da una cifra rara con varias zonas | Divide entre `rows.length` (filas minuto×zona) en vez de minutos reales | Igual, Fase 2 |
| `ajustes.nightgraph.io` sirve la app de `web-juegos` (404 raro) en vez del dashboard | Ya había una Workers Route `*.nightgraph.io/*` → `web-juegos` en la zona, que capturaba `ajustes` antes que el Custom Domain nuevo | Añadir una Route específica `ajustes.nightgraph.io/*` → Worker `dashboard` en esa misma zona — más específica gana sobre el comodín, no afecta a `lapocha` ni al resto |
| 503 / "Sin acceso al dashboard" genérico en producción pese a tener los secrets puestos | Los secrets se metieron en "Variables and Secrets" (build-time) en vez de "**Runtime** Variables and Secrets" (lo único que llega a `context.cloudflare.env`) | Moverlos/añadirlos a la sección Runtime específicamente |
| Runtime Variable/Secret añadida pero el error sigue igual | Cloudflare crea una versión nueva en Deployments pero no la activa sola | Forzar redeploy: `git commit --allow-empty -m "..." && git push`, o buscar "Retry deployment" en la pestaña Deployments |
| `wrangler login` da timeout esperando el código de autorización | El flujo OAuth de la CLI no completa bien en este entorno (Git Bash no abre navegador; PowerShell a veces sí pero expira) | Hacer todo desde el dashboard web de Cloudflare en su lugar — no hace falta la CLI para nada de esto |
| Cualquier RPC responde `200` con la clave `publishable` sin pasar por el Worker | Falta `revoke execute ... from public, anon, authenticated; grant ... to service_role;` sobre esa función | Ver el aviso ⚠️ en "Añadir una nueva página al dashboard" — comprobar SIEMPRE con `curl` tras crear una RPC nueva |

---

## Historial

- **2026-08-26** — Reescrito de Next.js 16 a React Router 7 + Cloudflare Workers (Fase 1 del roadmap de
  seguridad). Corregidos: suplantación de tenant vía header `x-tenant-id` (CRÍTICO) y autorización contra
  tabla equivocada `tenant_staff` (GRAVE). Login cambiado de email/contraseña a Google OAuth (PKCE).
- **2026-08-26 (mismo día, más tarde)** — Desplegado en `https://ajustes.nightgraph.io` (cuenta de
  Cloudflare del compañero, ver sección "Desplegar"). Auditoría de seguridad post-deploy encontró y cerró
  una vulnerabilidad real: las 5 RPC `ng_get_*` eran invocables directamente con la clave pública,
  saltándose el Worker — arreglado con `revoke`/`grant` a `service_role`.

## Próximo paso — Fase 2 (todavía no empezada)

Selector de sala y de fiesta en la UI, nuevas firmas de RPC (`p_tenant_ids uuid[]` + filtros `p_from`/`p_to`/
`p_event_id`), corrección de los bugs de KPI de Live Vibe (ver tabla de arriba). Requiere primero
reconstruir/versionar el DDL real del schema `analytics` (dim_*/fact_*/las funciones en sí) exportándolo
desde el SQL Editor de Supabase — hoy no está en ningún repo, ver sección "Conexión a Supabase" más arriba.
