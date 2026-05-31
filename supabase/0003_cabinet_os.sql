-- ============================================================
-- Cabinet OS — Phase Sprint 1
-- Migration : 0003_cabinet_os.sql
-- À exécuter APRÈS 0001_init.sql et 0002_phase2d.sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. Types enum
-- ────────────────────────────────────────────────────────────

do $$ begin
  create type public.user_role as enum ('admin', 'coach', 'client');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.session_status as enum (
    'planifiée', 'réalisée', 'annulée', 'no_show'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.questionnaire_status as enum (
    'en_attente', 'soumis', 'relu'
  );
exception when duplicate_object then null;
end $$;

-- ────────────────────────────────────────────────────────────
-- 1. Profiles
--    Étend auth.users — 1 ligne par utilisateur Cabinet OS.
--    coach_id : pour un client, pointe vers son coach référent.
-- ────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          public.user_role not null default 'client',
  coach_id      uuid references public.profiles(id) on delete set null,
  display_name  text not null,
  email         text not null,
  phone         text,
  avatar_url    text,
  bio           text,           -- utilisé pour les coachs uniquement
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS policies profiles
-- Chaque utilisateur lit son propre profil
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

-- Un coach lit les profils de ses clients
drop policy if exists "profiles_select_coach_clients" on public.profiles;
create policy "profiles_select_coach_clients"
  on public.profiles for select
  using (
    coach_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'coach'
    )
  );

-- L'admin lit tout
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Chaque utilisateur modifie uniquement son propre profil (champs non-sensibles)
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- empêche l'auto-promotion de rôle
    and role = (select role from public.profiles where id = auth.uid())
  );

-- L'admin peut tout modifier (y compris les rôles)
drop policy if exists "profiles_all_admin" on public.profiles;
create policy "profiles_all_admin"
  on public.profiles for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Index
create index if not exists profiles_role_idx    on public.profiles (role);
create index if not exists profiles_coach_id_idx on public.profiles (coach_id);
create index if not exists profiles_email_idx    on public.profiles (email);

-- ────────────────────────────────────────────────────────────
-- 2. Session packs
--    Carnet de séances acheté par un client (lié à une offre).
-- ────────────────────────────────────────────────────────────

create table if not exists public.session_packs (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.profiles(id) on delete cascade,
  coach_id      uuid not null references public.profiles(id) on delete restrict,
  offer_id      text not null,          -- référence à lib/content/offers.ts
  offer_label   text not null,          -- copie dénormalisée du nom de l'offre
  total         int  not null check (total > 0),
  remaining     int  not null check (remaining >= 0),
  purchased_at  timestamptz not null default now(),
  expires_at    timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint remaining_lte_total check (remaining <= total)
);

alter table public.session_packs enable row level security;

create or replace trigger session_packs_updated_at
  before update on public.session_packs
  for each row execute function public.set_updated_at();

-- RLS session_packs
drop policy if exists "packs_select_client" on public.session_packs;
create policy "packs_select_client"
  on public.session_packs for select
  using (client_id = auth.uid());

drop policy if exists "packs_select_coach" on public.session_packs;
create policy "packs_select_coach"
  on public.session_packs for select
  using (coach_id = auth.uid());

drop policy if exists "packs_all_admin" on public.session_packs;
create policy "packs_all_admin"
  on public.session_packs for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "packs_insert_coach" on public.session_packs;
create policy "packs_insert_coach"
  on public.session_packs for insert
  with check (
    coach_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach','admin'))
  );

drop policy if exists "packs_update_coach" on public.session_packs;
create policy "packs_update_coach"
  on public.session_packs for update
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create index if not exists packs_client_id_idx on public.session_packs (client_id);
create index if not exists packs_coach_id_idx  on public.session_packs (coach_id);

-- ────────────────────────────────────────────────────────────
-- 3. Sessions (séances)
-- ────────────────────────────────────────────────────────────

create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.profiles(id) on delete cascade,
  coach_id      uuid not null references public.profiles(id) on delete restrict,
  pack_id       uuid references public.session_packs(id) on delete set null,
  offer_id      text,
  status        public.session_status not null default 'planifiée',
  scheduled_at  timestamptz not null,
  duration_min  int not null default 60 check (duration_min > 0),
  location      text,
  summary       text,          -- résumé visible par le client
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.sessions enable row level security;

create or replace trigger sessions_updated_at
  before update on public.sessions
  for each row execute function public.set_updated_at();

-- Trigger : décrémenter remaining quand une séance passe à 'réalisée'
create or replace function public.decrement_pack_on_session_done()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'réalisée' and old.status <> 'réalisée' and new.pack_id is not null then
    update public.session_packs
    set remaining = greatest(remaining - 1, 0)
    where id = new.pack_id;
  end if;
  -- ré-incrémenter si on repasse d'une séance réalisée à autre chose
  if old.status = 'réalisée' and new.status <> 'réalisée' and new.pack_id is not null then
    update public.session_packs
    set remaining = least(remaining + 1, total)
    where id = new.pack_id;
  end if;
  return new;
end $$;

create or replace trigger sessions_update_pack
  after update of status on public.sessions
  for each row execute function public.decrement_pack_on_session_done();

-- RLS sessions
drop policy if exists "sessions_select_client" on public.sessions;
create policy "sessions_select_client"
  on public.sessions for select
  using (client_id = auth.uid());

drop policy if exists "sessions_select_coach" on public.sessions;
create policy "sessions_select_coach"
  on public.sessions for select
  using (coach_id = auth.uid());

drop policy if exists "sessions_all_admin" on public.sessions;
create policy "sessions_all_admin"
  on public.sessions for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "sessions_insert_coach" on public.sessions;
create policy "sessions_insert_coach"
  on public.sessions for insert
  with check (
    coach_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach','admin'))
  );

drop policy if exists "sessions_update_coach" on public.sessions;
create policy "sessions_update_coach"
  on public.sessions for update
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create index if not exists sessions_client_id_idx   on public.sessions (client_id);
create index if not exists sessions_coach_id_idx    on public.sessions (coach_id);
create index if not exists sessions_scheduled_at_idx on public.sessions (scheduled_at desc);
create index if not exists sessions_status_idx       on public.sessions (status);

-- ────────────────────────────────────────────────────────────
-- 4. Measures (impédancemétrie)
-- ────────────────────────────────────────────────────────────

create table if not exists public.measures (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.profiles(id) on delete cascade,
  coach_id      uuid not null references public.profiles(id) on delete restrict,
  session_id    uuid references public.sessions(id) on delete set null,
  measured_at   timestamptz not null default now(),
  -- Métriques corps
  weight_kg     numeric(5,2),
  fat_pct       numeric(5,2),
  muscle_pct    numeric(5,2),
  water_pct     numeric(5,2),
  bone_mass_kg  numeric(5,2),
  visceral_fat  int,
  bmi           numeric(5,2),
  -- Métabolisme
  bmr_kcal      int,           -- Métabolisme de base (kcal)
  -- Mensurations optionnelles
  waist_cm      numeric(5,1),
  hip_cm        numeric(5,1),
  chest_cm      numeric(5,1),
  thigh_cm      numeric(5,1),
  arm_cm        numeric(5,1),
  -- Remarques
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.measures enable row level security;

create or replace trigger measures_updated_at
  before update on public.measures
  for each row execute function public.set_updated_at();

-- RLS measures
drop policy if exists "measures_select_client" on public.measures;
create policy "measures_select_client"
  on public.measures for select
  using (client_id = auth.uid());

drop policy if exists "measures_select_coach" on public.measures;
create policy "measures_select_coach"
  on public.measures for select
  using (coach_id = auth.uid());

drop policy if exists "measures_all_admin" on public.measures;
create policy "measures_all_admin"
  on public.measures for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "measures_insert_coach" on public.measures;
create policy "measures_insert_coach"
  on public.measures for insert
  with check (
    coach_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach','admin'))
  );

drop policy if exists "measures_update_coach" on public.measures;
create policy "measures_update_coach"
  on public.measures for update
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists "measures_delete_coach" on public.measures;
create policy "measures_delete_coach"
  on public.measures for delete
  using (coach_id = auth.uid());

create index if not exists measures_client_id_idx  on public.measures (client_id);
create index if not exists measures_coach_id_idx   on public.measures (coach_id);
create index if not exists measures_measured_at_idx on public.measures (measured_at desc);

-- ────────────────────────────────────────────────────────────
-- 5. Coach notes (privées — jamais visibles par le client)
-- ────────────────────────────────────────────────────────────

create table if not exists public.coach_notes (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.profiles(id) on delete cascade,
  coach_id    uuid not null references public.profiles(id) on delete restrict,
  session_id  uuid references public.sessions(id) on delete set null,
  body        text not null,
  pinned      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.coach_notes enable row level security;

create or replace trigger coach_notes_updated_at
  before update on public.coach_notes
  for each row execute function public.set_updated_at();

-- RLS coach_notes — le client NE VOIT PAS ses notes
drop policy if exists "notes_select_coach" on public.coach_notes;
create policy "notes_select_coach"
  on public.coach_notes for select
  using (coach_id = auth.uid());

drop policy if exists "notes_all_admin" on public.coach_notes;
create policy "notes_all_admin"
  on public.coach_notes for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "notes_insert_coach" on public.coach_notes;
create policy "notes_insert_coach"
  on public.coach_notes for insert
  with check (
    coach_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach','admin'))
  );

drop policy if exists "notes_update_coach" on public.coach_notes;
create policy "notes_update_coach"
  on public.coach_notes for update
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists "notes_delete_coach" on public.coach_notes;
create policy "notes_delete_coach"
  on public.coach_notes for delete
  using (coach_id = auth.uid());

create index if not exists notes_client_id_idx on public.coach_notes (client_id);
create index if not exists notes_coach_id_idx  on public.coach_notes (coach_id);
create index if not exists notes_pinned_idx    on public.coach_notes (pinned, created_at desc);

-- ────────────────────────────────────────────────────────────
-- 6. Questionnaires découverte
-- ────────────────────────────────────────────────────────────

create table if not exists public.questionnaires (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.profiles(id) on delete cascade,
  coach_id      uuid not null references public.profiles(id) on delete restrict,
  status        public.questionnaire_status not null default 'en_attente',
  answers       jsonb,          -- réponses structurées (voir lib/os/questionnaire.ts)
  submitted_at  timestamptz,
  reviewed_at   timestamptz,
  coach_comment text,           -- commentaire coach post-lecture
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.questionnaires enable row level security;

create or replace trigger questionnaires_updated_at
  before update on public.questionnaires
  for each row execute function public.set_updated_at();

-- RLS questionnaires
drop policy if exists "questionnaires_select_client" on public.questionnaires;
create policy "questionnaires_select_client"
  on public.questionnaires for select
  using (client_id = auth.uid());

drop policy if exists "questionnaires_update_client" on public.questionnaires;
create policy "questionnaires_update_client"
  on public.questionnaires for update
  using (client_id = auth.uid())
  with check (
    client_id = auth.uid()
    -- le client ne peut soumettre qu'une fois (on_attente -> soumis)
    and status in ('en_attente', 'soumis')
  );

drop policy if exists "questionnaires_select_coach" on public.questionnaires;
create policy "questionnaires_select_coach"
  on public.questionnaires for select
  using (coach_id = auth.uid());

drop policy if exists "questionnaires_update_coach" on public.questionnaires;
create policy "questionnaires_update_coach"
  on public.questionnaires for update
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists "questionnaires_all_admin" on public.questionnaires;
create policy "questionnaires_all_admin"
  on public.questionnaires for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "questionnaires_insert_coach" on public.questionnaires;
create policy "questionnaires_insert_coach"
  on public.questionnaires for insert
  with check (
    coach_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach','admin'))
  );

create index if not exists questionnaires_client_id_idx on public.questionnaires (client_id);
create index if not exists questionnaires_coach_id_idx  on public.questionnaires (coach_id);
create index if not exists questionnaires_status_idx    on public.questionnaires (status);

-- ────────────────────────────────────────────────────────────
-- 7. Storage bucket pour les PDFs générés
-- ────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('os-pdfs', 'os-pdfs', false)
on conflict (id) do nothing;

-- Le coach lit les PDFs de ses clients
drop policy if exists "os_pdfs_select_coach" on storage.objects;
create policy "os_pdfs_select_coach"
  on storage.objects for select
  using (
    bucket_id = 'os-pdfs'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach','admin'))
  );

-- Le client lit uniquement ses propres PDFs (chemin = client_id/*)
drop policy if exists "os_pdfs_select_client" on storage.objects;
create policy "os_pdfs_select_client"
  on storage.objects for select
  using (
    bucket_id = 'os-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Seuls coach et admin peuvent uploader
drop policy if exists "os_pdfs_insert_coach" on storage.objects;
create policy "os_pdfs_insert_coach"
  on storage.objects for insert
  with check (
    bucket_id = 'os-pdfs'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach','admin'))
  );

drop policy if exists "os_pdfs_delete_coach" on storage.objects;
create policy "os_pdfs_delete_coach"
  on storage.objects for delete
  using (
    bucket_id = 'os-pdfs'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach','admin'))
  );

-- ────────────────────────────────────────────────────────────
-- 8. Fonction helper : profil courant avec son rôle
--    Utilisée dans les Server Actions et le middleware.
-- ────────────────────────────────────────────────────────────

create or replace function public.get_my_profile()
returns public.profiles
language sql security definer stable
as $$
  select * from public.profiles where id = auth.uid();
$$;

-- ────────────────────────────────────────────────────────────
-- 9. Trigger auto-création profil à l'inscription
--    Dès qu'un utilisateur est créé dans auth.users,
--    un profil 'client' est automatiquement inséré.
--    L'admin devra ensuite modifier le rôle si nécessaire.
-- ────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'client'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
