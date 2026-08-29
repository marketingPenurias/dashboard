# NightGraph Dashboard

Panel analítico de plataforma (`dashboard.nightgraph.io`) — React Router 7 + Cloudflare Workers.

Ver [DOCU.md](./DOCU.md) para la arquitectura completa (auth, rutas, base de datos, cómo añadir una vista).

## Arrancar en local

```bash
npm install
cp .dev.vars.example .dev.vars   # rellenar SUPABASE_SECRET_KEY / ANALYTICS_JWT_SECRET
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173).

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (Vite + plugin de Cloudflare) |
| `npm run build` | Build de producción (`react-router build`) |
| `npm run deploy` | `wrangler deploy` manual (normalmente el deploy va por Cloudflare Workers Builds en push a `main`) |
| `npm run cf-typegen` | Regenera `worker-configuration.d.ts` (tipos de `Env`) y los tipos de rutas — correr tras tocar `wrangler.json` o `app/routes.ts` |
| `npm run check` | `tsc` + build + `wrangler deploy --dry-run`, verificación completa antes de desplegar |

## Stack

React Router 7 · Cloudflare Workers · Tailwind 4 · shadcn (Base UI) · Supabase (mismo proyecto que `web-juegos`) · recharts · react-force-graph-2d.

Este repo es independiente de `web-juegos` (repo de otro compañero) — nunca se toca desde aquí, solo se usa como referencia de patrones ya probados en producción.
