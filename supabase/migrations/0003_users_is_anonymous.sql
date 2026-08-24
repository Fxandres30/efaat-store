-- =====================================================================
-- Migración 0003 — Auth anónimo: public.users.is_anonymous + email nullable
-- =====================================================================
-- Aislada y aditiva a las TABLAS: no crea tablas nuevas, no toca RLS.
-- Sí relaja una constraint existente (email) — documentado abajo, es
-- estrictamente necesario para que el Auth anónimo no rompa el
-- trigger que ya existe.
--
-- Por qué hace falta: la Fase 1 del informe de arquitectura activa
-- Supabase Auth anónimo para TODO visitante (para que carrito/
-- favoritos, con RLS por dueño, funcionen sin exigir login). El
-- trigger handle_new_auth_user (migración 0001) inserta una fila en
-- public.users por CADA alta en auth.users, incluida una sesión
-- anónima — y una sesión anónima de Supabase Auth tiene
-- `auth.users.email = NULL` (no es un descuido nuestro, es cómo
-- Supabase modela "anónimo"). El schema original definía
-- `public.users.email text not null unique` asumiendo que todo
-- usuario siempre tiene correo — cierto para clientes/admin
-- registrados, falso para un visitante anónimo. Sin este ajuste, el
-- INSERT del trigger fallaría con "null value in column email
-- violates not-null constraint" en cuanto alguien entrara al sitio
-- sin loguearse, y signInAnonymously() nunca resolvería.
--
-- 1) `is_anonymous`: para que /admin/customers pueda distinguir un
--    cliente real de una sesión anónima de un visitante que nunca se
--    registró.
-- 2) `email` pasa a nullable: `unique` se mantiene intacto (Postgres
--    no compara NULLs entre sí en una constraint unique, así que
--    múltiples usuarios anónimos con email NULL conviven sin
--    conflicto). Clientes/admin reales siguen exigiendo email al
--    registrarse — eso lo sigue validando Supabase Auth (signUp
--    requiere email), no esta tabla.
--
-- Cómo aplicar: Supabase CLI (`supabase db push`) o pegar este
-- archivo completo en el SQL Editor del dashboard de Supabase.
-- =====================================================================

alter table public.users
  add column if not exists is_anonymous boolean not null default false;

alter table public.users
  alter column email drop not null;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.users (id, name, email, phone, is_anonymous)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Invitado'),
    new.email,
    new.raw_user_meta_data->>'phone',
    coalesce(new.is_anonymous, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
