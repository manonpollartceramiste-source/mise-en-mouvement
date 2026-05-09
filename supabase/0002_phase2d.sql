-- Phase 2.D — pop-ups + base clients
-- À exécuter dans le SQL Editor du dashboard Supabase, après 0001_init.sql.

-- 1. Pop-ups
create table if not exists public.popups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  cta_label text,
  cta_href text,
  scope text not null default 'home' check (scope in ('home', 'offres', 'both')),
  active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.popups enable row level security;

drop policy if exists "popups_select_public" on public.popups;
create policy "popups_select_public"
  on public.popups for select
  using (true);

drop policy if exists "popups_modify_authenticated" on public.popups;
create policy "popups_modify_authenticated"
  on public.popups for all
  to authenticated
  using (true)
  with check (true);

-- 2. Base clients (formulaires de contact + futures réservations)
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text,
  offer_id text,
  coach_id text,
  subject text,
  source text not null default 'contact' check (source in ('contact', 'reservation')),
  status text not null default 'nouveau' check (status in ('nouveau', 'contacté', 'payé', 'annulé')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients enable row level security;

-- Le formulaire contact insère côté serveur en utilisant la clé anon : on autorise
-- les inserts publics, mais lecture/modification réservées aux admins authentifiés.
drop policy if exists "clients_insert_public" on public.clients;
create policy "clients_insert_public"
  on public.clients for insert
  with check (true);

drop policy if exists "clients_select_authenticated" on public.clients;
create policy "clients_select_authenticated"
  on public.clients for select
  to authenticated
  using (true);

drop policy if exists "clients_update_authenticated" on public.clients;
create policy "clients_update_authenticated"
  on public.clients for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "clients_delete_authenticated" on public.clients;
create policy "clients_delete_authenticated"
  on public.clients for delete
  to authenticated
  using (true);

-- Index utiles
create index if not exists clients_status_idx on public.clients (status);
create index if not exists clients_created_at_idx on public.clients (created_at desc);
create index if not exists popups_active_idx on public.popups (active, starts_at, ends_at);
