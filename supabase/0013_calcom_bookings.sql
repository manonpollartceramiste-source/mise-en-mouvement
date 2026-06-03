-- ─────────────────────────────────────────────────────────────
-- 0013 — calcom_bookings
-- Stocke les réservations reçues via webhook Cal.com.
-- Séparé de `sessions` car client_id n'est pas un profil OS.
-- Les écritures se font uniquement via le service role (webhook).
-- ─────────────────────────────────────────────────────────────

create table if not exists public.calcom_bookings (
  id                uuid        primary key default gen_random_uuid(),
  calcom_uid        text        unique not null,
  calcom_booking_id integer,
  coach_id          uuid        not null references public.profiles(id) on delete cascade,
  client_name       text        not null default '',
  client_email      text        not null default '',
  title             text,
  scheduled_at      timestamptz not null,
  duration_min      integer     not null default 60,
  status            text        not null default 'planifiée',
  location          text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.calcom_bookings enable row level security;

create or replace trigger calcom_bookings_updated_at
  before update on public.calcom_bookings
  for each row execute function public.set_updated_at();

-- Le coach lit uniquement ses propres réservations
drop policy if exists "calcom_bookings_select_coach" on public.calcom_bookings;
create policy "calcom_bookings_select_coach"
  on public.calcom_bookings for select
  using (coach_id = auth.uid());

-- L'admin lit tout
drop policy if exists "calcom_bookings_select_admin" on public.calcom_bookings;
create policy "calcom_bookings_select_admin"
  on public.calcom_bookings for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Les INSERT/UPDATE/DELETE se font via service role uniquement (webhook)
-- Pas de policy utilisateur pour ces opérations.

create index if not exists calcom_bookings_coach_id_idx
  on public.calcom_bookings (coach_id);

create index if not exists calcom_bookings_scheduled_at_idx
  on public.calcom_bookings (scheduled_at desc);

create index if not exists calcom_bookings_calcom_uid_idx
  on public.calcom_bookings (calcom_uid);
