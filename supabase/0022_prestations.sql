-- Bibliothèque de prestations (modèles réutilisables dans devis/factures)
create table if not exists public.prestations (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  unit_price numeric(10,2) not null default 0,
  tva_pct numeric(5,2) not null default 0,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prestations enable row level security;

create policy "coach own prestations"
  on public.prestations for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
