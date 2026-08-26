-- ─────────────────────────────────────────────────────────────────────────
-- NightGraph Dashboard · promoter_staff
--
-- Staff con acceso a nivel de PROMOTORA (todas las salas / tenants que
-- cuelgan de un `promoter_id` — ver `public.promoters` y
-- `public.tenants.promoter_id`, definidos en `web-juegos/database/
-- 05_scalability_ready.sql`). Es el rol "dueño de discoteca / grupo" del
-- panel de analytics.
--
-- Un mismo `user_id` puede tener más de una fila (staff de más de una
-- promotora) — por eso el login usa `.maybeSingle()` y nunca `.single()`
-- al consultar por `user_id`: si hay 2+ filas, PostgREST devuelve un error
-- controlado (no una excepción sin capturar), y el handler responde 403 en
-- vez de explotar en un 500. Elegir ENTRE varias promotoras para un mismo
-- usuario es selector multi-sala — Fase 2.
--
-- RLS: activo, SIN políticas (mismo criterio que `platform_staff`).
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.promoter_staff (
	id            uuid primary key default gen_random_uuid(),
	promoter_id   uuid not null references public.promoters(id) on delete cascade,
	user_id       uuid not null references auth.users(id) on delete cascade,
	role          text not null check (role in ('owner', 'finance', 'viewer')),
	is_active     boolean not null default true,
	created_at    timestamptz not null default now(),
	unique (promoter_id, user_id)
);

create index if not exists promoter_staff_promoter_idx
	on public.promoter_staff (promoter_id);
create index if not exists promoter_staff_user_idx
	on public.promoter_staff (user_id);

alter table public.promoter_staff enable row level security;
