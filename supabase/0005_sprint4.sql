-- ─────────────────────────────────────────────────────────────
-- Sprint 4 — Suivi client premium
-- ─────────────────────────────────────────────────────────────

-- 1. Étendre la table measures
alter table public.measures
  add column if not exists muscle_mass_kg     numeric(5,2),
  add column if not exists fat_mass_kg        numeric(5,2),
  add column if not exists metabolic_age      smallint,
  add column if not exists resting_heart_rate smallint,
  add column if not exists segmental_data     jsonb;

-- 2. Tests de mouvement
create table if not exists public.movement_tests (
  id          uuid        primary key default gen_random_uuid(),
  client_id   uuid        not null references public.profiles(id) on delete cascade,
  coach_id    uuid        not null references public.profiles(id),
  tested_at   date        not null default current_date,
  test_name   text        not null,
  test_type   text        not null default 'autre',
  result      text        not null,
  unit        text,
  notes       text,
  created_at  timestamptz not null default now()
);

alter table public.movement_tests enable row level security;

drop policy if exists "coach_rw_movement_tests" on public.movement_tests;
create policy "coach_rw_movement_tests" on public.movement_tests
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists "client_r_movement_tests" on public.movement_tests;
create policy "client_r_movement_tests" on public.movement_tests
  for select using (client_id = auth.uid());

-- 3. Objectifs client
create table if not exists public.client_goals (
  id           uuid        primary key default gen_random_uuid(),
  client_id    uuid        not null references public.profiles(id) on delete cascade,
  coach_id     uuid        not null references public.profiles(id),
  title        text        not null,
  description  text,
  status       text        not null default 'actif',
  target_date  date,
  achieved_at  date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.client_goals enable row level security;

drop policy if exists "coach_rw_goals" on public.client_goals;
create policy "coach_rw_goals" on public.client_goals
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists "client_r_goals" on public.client_goals;
create policy "client_r_goals" on public.client_goals
  for select using (client_id = auth.uid());
