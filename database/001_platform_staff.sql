-- ─────────────────────────────────────────────────────────────────────────
-- NightGraph Dashboard · platform_staff
--
-- Staff con acceso de PLATAFORMA completo (todas las promotoras / tenants).
-- Es la tabla que autoriza el login del panel de dueños de discoteca
-- (`ajustes.nightgraph.io`). NO confundir con `public.tenant_staff`, que es
-- la tabla del panel operativo interno (`/admin` en `web-juegos`) — son
-- dos sistemas de acceso independientes sobre la misma base.
--
-- RLS: activo, SIN políticas. Solo el Worker con `SUPABASE_SECRET_KEY`
-- (service_role, bypassea RLS) puede leer/escribir esta tabla — RLS queda
-- como defensa en profundidad, no como mecanismo primario de autorización.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.platform_staff (
	id          uuid primary key default gen_random_uuid(),
	user_id     uuid not null references auth.users(id) on delete cascade,
	role        text not null check (role in ('super_admin', 'support')),
	is_active   boolean not null default true,
	created_at  timestamptz not null default now(),
	unique (user_id)
);

create index if not exists platform_staff_user_idx
	on public.platform_staff (user_id);

alter table public.platform_staff enable row level security;
