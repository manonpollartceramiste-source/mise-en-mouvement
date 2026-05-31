-- ─────────────────────────────────────────────────────────────
-- Fix auth Cabinet OS
-- Corriger le trigger handle_new_user pour lire le rôle depuis
-- user_metadata (passé par inviteOsUser depuis l'admin UI).
-- ─────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_role public.user_role := 'client';
begin
  -- Lire le rôle depuis user_metadata si présent et valide
  begin
    if new.raw_user_meta_data->>'role' in ('admin', 'coach', 'client') then
      v_role := (new.raw_user_meta_data->>'role')::public.user_role;
    end if;
  exception when others then
    v_role := 'client';
  end;

  insert into public.profiles (id, email, display_name, role, active)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    ),
    v_role,
    true
  )
  on conflict (id) do nothing;

  return new;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Diagnostic + fix manuel pour les users sans profil
-- ou avec un mauvais rôle.
--
-- ÉTAPE 1 — Voir l'état actuel :
-- ─────────────────────────────────────────────────────────────

-- select
--   u.id,
--   u.email,
--   u.created_at as auth_created,
--   p.id as profile_id,
--   p.role,
--   p.active,
--   p.display_name
-- from auth.users u
-- left join public.profiles p on p.id = u.id
-- order by u.created_at desc;

-- ─────────────────────────────────────────────────────────────
-- ÉTAPE 2 — Créer le profil manuellement pour un user sans profil
-- (remplacer les valeurs)
-- ─────────────────────────────────────────────────────────────

-- insert into public.profiles (id, email, display_name, role, active)
-- select
--   u.id,
--   u.email,
--   coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
--   'coach',   -- mettre 'coach' ou 'client'
--   true
-- from auth.users u
-- where u.email = 'email@exemple.com'  -- remplacer par l'email
--   and not exists (select 1 from public.profiles p where p.id = u.id);

-- ─────────────────────────────────────────────────────────────
-- ÉTAPE 3 — Corriger le rôle d'un profil existant
-- ─────────────────────────────────────────────────────────────

-- update public.profiles
-- set role = 'coach', active = true, updated_at = now()
-- where email = 'email@exemple.com';  -- remplacer par l'email
