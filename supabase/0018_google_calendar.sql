-- 0018 — Google Calendar OAuth tokens
-- Stocke les credentials OAuth par coach pour l'intégration Google Agenda.
-- À exécuter une seule fois dans le SQL Editor Supabase.

create table if not exists public.coach_google_tokens (
  coach_id       uuid        primary key references public.profiles(id) on delete cascade,
  access_token   text        not null,
  refresh_token  text,
  token_expiry   timestamptz,
  calendar_id    text        not null default 'primary',
  scope          text,
  connected_at   timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.coach_google_tokens enable row level security;

-- Le coach peut lire son propre statut de connexion
create policy "coach can read own google token"
  on public.coach_google_tokens for select
  using (coach_id = auth.uid());

-- Le coach peut se déconnecter (supprimer son propre token)
create policy "coach can delete own google token"
  on public.coach_google_tokens for delete
  using (coach_id = auth.uid());

-- INSERT et UPDATE réservés au service role (callback OAuth côté serveur)
