-- ─────────────────────────────────────────────────────────────
-- 0017 — Native booking system
-- Remplace l'intégration Cal.com par un système de réservation
-- natif : disponibilités, indisponibilités, créneaux, réservations.
-- ─────────────────────────────────────────────────────────────

-- ── 1. Enum booking_status ────────────────────────────────────────────────────

do $$ begin
  create type public.booking_status as enum (
    'pending',
    'confirmed',
    'cancelled_by_client',
    'cancelled_by_coach',
    'completed',
    'no_show'
  );
exception when duplicate_object then null;
end $$;

-- ── 2. Table booking_settings ─────────────────────────────────────────────────

create table if not exists public.booking_settings (
  coach_id          uuid      primary key references public.profiles(id) on delete cascade,
  min_notice_hours  smallint  not null default 24,
  max_advance_days  smallint  not null default 90,
  slot_duration_min smallint  not null default 60,
  buffer_after_min  smallint  not null default 0,
  auto_confirm      boolean   not null default true,
  timezone          text      not null default 'Europe/Paris',
  updated_at        timestamptz not null default now()
);

alter table public.booking_settings enable row level security;

create or replace trigger booking_settings_updated_at
  before update on public.booking_settings
  for each row execute function public.set_updated_at();

-- RLS : coach lit / modifie ses propres paramètres
drop policy if exists "booking_settings_select_coach" on public.booking_settings;
create policy "booking_settings_select_coach"
  on public.booking_settings for select
  using (coach_id = auth.uid());

drop policy if exists "booking_settings_modify_coach" on public.booking_settings;
create policy "booking_settings_modify_coach"
  on public.booking_settings for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- RLS : admin lit et modifie tout
drop policy if exists "booking_settings_select_admin" on public.booking_settings;
create policy "booking_settings_select_admin"
  on public.booking_settings for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "booking_settings_all_admin" on public.booking_settings;
create policy "booking_settings_all_admin"
  on public.booking_settings for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── 3. Table coach_availability_rules ────────────────────────────────────────

create table if not exists public.coach_availability_rules (
  id                uuid        primary key default gen_random_uuid(),
  coach_id          uuid        not null references public.profiles(id) on delete cascade,
  day_of_week       smallint    not null check (day_of_week between 0 and 6),
  start_time        time        not null,
  end_time          time        not null,
  slot_duration_min smallint    not null default 60,
  is_active         boolean     not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint valid_time_range check (end_time > start_time)
);

alter table public.coach_availability_rules enable row level security;

create or replace trigger coach_availability_rules_updated_at
  before update on public.coach_availability_rules
  for each row execute function public.set_updated_at();

-- RLS : coach
drop policy if exists "availability_rules_select_coach" on public.coach_availability_rules;
create policy "availability_rules_select_coach"
  on public.coach_availability_rules for select
  using (coach_id = auth.uid());

drop policy if exists "availability_rules_modify_coach" on public.coach_availability_rules;
create policy "availability_rules_modify_coach"
  on public.coach_availability_rules for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- RLS : admin
drop policy if exists "availability_rules_select_admin" on public.coach_availability_rules;
create policy "availability_rules_select_admin"
  on public.coach_availability_rules for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "availability_rules_all_admin" on public.coach_availability_rules;
create policy "availability_rules_all_admin"
  on public.coach_availability_rules for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Index
create index if not exists availability_rules_coach_dow_idx
  on public.coach_availability_rules (coach_id, day_of_week);

-- ── 4. Table coach_unavailabilities ──────────────────────────────────────────

create table if not exists public.coach_unavailabilities (
  id         uuid        primary key default gen_random_uuid(),
  coach_id   uuid        not null references public.profiles(id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  label      text,
  is_all_day boolean     not null default false,
  created_at timestamptz not null default now(),
  constraint valid_range check (ends_at > starts_at)
);

alter table public.coach_unavailabilities enable row level security;

-- RLS : coach
drop policy if exists "unavailabilities_select_coach" on public.coach_unavailabilities;
create policy "unavailabilities_select_coach"
  on public.coach_unavailabilities for select
  using (coach_id = auth.uid());

drop policy if exists "unavailabilities_modify_coach" on public.coach_unavailabilities;
create policy "unavailabilities_modify_coach"
  on public.coach_unavailabilities for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- RLS : admin
drop policy if exists "unavailabilities_select_admin" on public.coach_unavailabilities;
create policy "unavailabilities_select_admin"
  on public.coach_unavailabilities for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "unavailabilities_all_admin" on public.coach_unavailabilities;
create policy "unavailabilities_all_admin"
  on public.coach_unavailabilities for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Index
create index if not exists unavailabilities_coach_range_idx
  on public.coach_unavailabilities (coach_id, starts_at, ends_at);

-- ── 5. Table bookings ─────────────────────────────────────────────────────────

create table if not exists public.bookings (
  id                  uuid           primary key default gen_random_uuid(),
  coach_id            uuid           not null references public.profiles(id),
  offer_id            text           not null,
  client_name         text           not null,
  client_email        text           not null,
  client_phone        text,
  client_profile_id   uuid           references public.profiles(id),
  starts_at           timestamptz    not null,
  ends_at             timestamptz    not null,
  duration_min        smallint       not null,
  status              public.booking_status not null default 'confirmed',
  payment_method      text           check (payment_method in ('online', 'cabinet')),
  payment_status      text           check (payment_status in ('pending', 'paid', 'refunded')),
  client_notes        text,
  coach_notes         text,
  cancelled_at        timestamptz,
  cancellation_reason text,
  calcom_uid          text           unique,
  created_at          timestamptz    not null default now(),
  updated_at          timestamptz    not null default now(),
  constraint valid_slot check (ends_at > starts_at)
);

alter table public.bookings enable row level security;

create or replace trigger bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- RLS : coach
drop policy if exists "bookings_select_coach" on public.bookings;
create policy "bookings_select_coach"
  on public.bookings for select
  using (coach_id = auth.uid());

drop policy if exists "bookings_modify_coach" on public.bookings;
create policy "bookings_modify_coach"
  on public.bookings for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- RLS : admin
drop policy if exists "bookings_select_admin" on public.bookings;
create policy "bookings_select_admin"
  on public.bookings for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "bookings_all_admin" on public.bookings;
create policy "bookings_all_admin"
  on public.bookings for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Index
create index if not exists bookings_coach_id_idx
  on public.bookings (coach_id);

create index if not exists bookings_starts_at_idx
  on public.bookings (starts_at);

create index if not exists bookings_status_idx
  on public.bookings (status);

create index if not exists bookings_coach_starts_at_idx
  on public.bookings (coach_id, starts_at);

-- ── 6. Conflict prevention trigger ───────────────────────────────────────────

create or replace function public.check_booking_no_overlap()
returns trigger language plpgsql as $$
begin
  -- Only check against active (non-cancelled) bookings
  if exists (
    select 1
    from public.bookings b
    where b.coach_id = new.coach_id
      and b.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and b.status not in ('cancelled_by_client', 'cancelled_by_coach')
      and b.starts_at < new.ends_at
      and b.ends_at   > new.starts_at
  ) then
    raise exception 'Créneau déjà réservé : chevauchement avec une réservation existante.';
  end if;
  return new;
end $$;

drop trigger if exists bookings_no_overlap on public.bookings;
create trigger bookings_no_overlap
  before insert or update on public.bookings
  for each row execute function public.check_booking_no_overlap();

-- ── 7. Supabase Realtime ──────────────────────────────────────────────────────

alter table public.bookings replica identity full;
alter table public.coach_unavailabilities replica identity full;

alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.coach_unavailabilities;
