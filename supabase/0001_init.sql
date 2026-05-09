-- Phase 2.A — schéma initial admin Mise en Mouvement
-- À exécuter dans le SQL Editor du dashboard Supabase.

-- 1. Table KV unique pour tous les contenus éditables
create table if not exists public.content (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.content enable row level security;

-- Lecture publique (le site lit les clés sans auth)
drop policy if exists "content_select_public" on public.content;
create policy "content_select_public"
  on public.content
  for select
  using (true);

-- Écriture réservée aux utilisateurs authentifiés (= admin)
drop policy if exists "content_modify_authenticated" on public.content;
create policy "content_modify_authenticated"
  on public.content
  for all
  to authenticated
  using (true)
  with check (true);

-- 2. Bucket storage pour images du site
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

-- Lecture publique des fichiers
drop policy if exists "site_assets_select_public" on storage.objects;
create policy "site_assets_select_public"
  on storage.objects
  for select
  using (bucket_id = 'site-assets');

-- Upload / update / delete réservés aux admins authentifiés
drop policy if exists "site_assets_insert_authenticated" on storage.objects;
create policy "site_assets_insert_authenticated"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'site-assets');

drop policy if exists "site_assets_update_authenticated" on storage.objects;
create policy "site_assets_update_authenticated"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'site-assets')
  with check (bucket_id = 'site-assets');

drop policy if exists "site_assets_delete_authenticated" on storage.objects;
create policy "site_assets_delete_authenticated"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'site-assets');
