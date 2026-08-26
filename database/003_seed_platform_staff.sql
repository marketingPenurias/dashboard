-- ─────────────────────────────────────────────────────────────────────────
-- NightGraph Dashboard · seed inicial de platform_staff
--
-- Siembra a la usuaria como `super_admin` de plataforma para que el primer
-- login funcione sin pasos manuales adicionales. Requiere que la cuenta ya
-- exista en `auth.users` (alta previa vía Supabase Auth) — el `select`
-- resuelve su id inline, no hace falta pegar el UUID a mano.
-- ─────────────────────────────────────────────────────────────────────────

insert into public.platform_staff (user_id, role, is_active)
select id, 'super_admin', true
from auth.users
where email = 'luciapintos1408@gmail.com'
on conflict (user_id) do nothing;
