-- ─────────────────────────────────────────────────────────────
-- Multi-rôles Cabinet OS
-- Un même compte peut avoir plusieurs rôles (ex: admin + coach).
-- Stratégie : colonne roles text[] pour le contrôle d'accès.
--             role reste le rôle primaire (affichage, profil).
-- ─────────────────────────────────────────────────────────────

-- 1. Ajouter la colonne roles
alter table public.profiles
  add column if not exists roles text[] not null default '{}';

-- 2. Peupler roles depuis role pour tous les profils existants
update public.profiles
  set roles = array[role::text]
  where array_length(roles, 1) is null or array_length(roles, 1) = 0;

-- 3. Trigger handle_new_user : lire role ET roles depuis metadata
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_role  public.user_role := 'client';
  v_roles text[];
begin
  -- Lire le rôle primaire depuis metadata
  begin
    if new.raw_user_meta_data->>'role' in ('admin', 'coach', 'client') then
      v_role := (new.raw_user_meta_data->>'role')::public.user_role;
    end if;
  exception when others then
    v_role := 'client';
  end;

  v_roles := array[v_role::text];

  insert into public.profiles (id, email, display_name, role, roles, active)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    ),
    v_role,
    v_roles,
    true
  )
  on conflict (id) do nothing;

  return new;
end $$;

-- 4. Réécrire les politiques RLS qui testent le rôle
--    Toutes les vérifications passent de role='x' à 'x' = ANY(roles).

-- profiles : update own (empêche l'auto-promotion de roles)
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and roles = (select roles from public.profiles where id = auth.uid())
  );

-- profiles : admin lit tout
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and 'admin' = any(p.roles)
    )
  );

-- profiles : admin modifie tout (y compris les rôles)
drop policy if exists "profiles_all_admin" on public.profiles;
create policy "profiles_all_admin"
  on public.profiles for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and 'admin' = any(p.roles)
    )
  );

-- profiles : coach voit ses clients
drop policy if exists "profiles_select_coach_clients" on public.profiles;
create policy "profiles_select_coach_clients"
  on public.profiles for select
  using (
    coach_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and 'coach' = any(p.roles)
    )
  );

-- session_packs : insert coach
drop policy if exists "packs_insert_coach" on public.session_packs;
create policy "packs_insert_coach"
  on public.session_packs for insert
  with check (
    coach_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and ('coach' = any(p.roles) or 'admin' = any(p.roles))
    )
  );

-- session_packs : admin
drop policy if exists "packs_all_admin" on public.session_packs;
create policy "packs_all_admin"
  on public.session_packs for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and 'admin' = any(p.roles)
    )
  );

-- sessions : insert coach
drop policy if exists "sessions_insert_coach" on public.sessions;
create policy "sessions_insert_coach"
  on public.sessions for insert
  with check (
    coach_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and ('coach' = any(p.roles) or 'admin' = any(p.roles))
    )
  );

-- sessions : admin
drop policy if exists "sessions_all_admin" on public.sessions;
create policy "sessions_all_admin"
  on public.sessions for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and 'admin' = any(p.roles)
    )
  );

-- measures : insert coach
drop policy if exists "measures_insert_coach" on public.measures;
create policy "measures_insert_coach"
  on public.measures for insert
  with check (
    coach_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and ('coach' = any(p.roles) or 'admin' = any(p.roles))
    )
  );

-- measures : admin
drop policy if exists "measures_all_admin" on public.measures;
create policy "measures_all_admin"
  on public.measures for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and 'admin' = any(p.roles)
    )
  );

-- coach_notes : insert coach
drop policy if exists "notes_insert_coach" on public.coach_notes;
create policy "notes_insert_coach"
  on public.coach_notes for insert
  with check (
    coach_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and ('coach' = any(p.roles) or 'admin' = any(p.roles))
    )
  );

-- coach_notes : admin
drop policy if exists "notes_all_admin" on public.coach_notes;
create policy "notes_all_admin"
  on public.coach_notes for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and 'admin' = any(p.roles)
    )
  );

-- questionnaires : insert coach
drop policy if exists "questionnaires_insert_coach" on public.questionnaires;
create policy "questionnaires_insert_coach"
  on public.questionnaires for insert
  with check (
    coach_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and ('coach' = any(p.roles) or 'admin' = any(p.roles))
    )
  );

-- questionnaires : admin
drop policy if exists "questionnaires_all_admin" on public.questionnaires;
create policy "questionnaires_all_admin"
  on public.questionnaires for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and 'admin' = any(p.roles)
    )
  );

-- storage : coach/admin peut uploader
drop policy if exists "os_pdfs_insert_coach" on storage.objects;
create policy "os_pdfs_insert_coach"
  on storage.objects for insert
  with check (
    bucket_id = 'os-pdfs'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and ('coach' = any(p.roles) or 'admin' = any(p.roles))
    )
  );

drop policy if exists "os_pdfs_select_coach" on storage.objects;
create policy "os_pdfs_select_coach"
  on storage.objects for select
  using (
    bucket_id = 'os-pdfs'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and ('coach' = any(p.roles) or 'admin' = any(p.roles))
    )
  );

drop policy if exists "os_pdfs_delete_coach" on storage.objects;
create policy "os_pdfs_delete_coach"
  on storage.objects for delete
  using (
    bucket_id = 'os-pdfs'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and ('coach' = any(p.roles) or 'admin' = any(p.roles))
    )
  );

-- movement_tests (sprint 4)
drop policy if exists "coach_rw_movement_tests" on public.movement_tests;
create policy "coach_rw_movement_tests"
  on public.movement_tests
  using (
    coach_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and 'admin' = any(p.roles)
    )
  )
  with check (
    coach_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and 'admin' = any(p.roles)
    )
  );

-- client_goals (sprint 4)
drop policy if exists "coach_rw_goals" on public.client_goals;
create policy "coach_rw_goals"
  on public.client_goals
  using (
    coach_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and 'admin' = any(p.roles)
    )
  )
  with check (
    coach_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and 'admin' = any(p.roles)
    )
  );

-- 5. Cas Dorian : admin + coach
--    Adapter l'email selon ce qui existe dans auth.users.
--    Décommentez et adaptez le bloc correspondant à votre cas.

-- -- Cas A : profil absent → créer
-- insert into public.profiles (id, email, display_name, role, roles, active)
-- select u.id, u.email, 'Dorian Hébert', 'coach', array['admin','coach'], true
-- from auth.users u
-- where u.email = 'dorian34.hebert@gmail.com'
--   and not exists (select 1 from public.profiles p where p.id = u.id);

-- -- Cas B : profil présent → corriger
-- update public.profiles
-- set role = 'coach', roles = array['admin','coach'], active = true, updated_at = now()
-- where email = 'dorian34.hebert@gmail.com';

-- 6. Vérification finale
-- select id, email, role, roles, active from public.profiles order by role;
