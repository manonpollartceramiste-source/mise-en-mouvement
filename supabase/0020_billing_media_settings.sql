-- ─────────────────────────────────────────────────────────────
-- 0020 — Devis, Factures, Paramètres site, Médiathèque
-- ─────────────────────────────────────────────────────────────

-- ── 1. Enums ─────────────────────────────────────────────────

do $$ begin
  create type public.quote_status as enum (
    'brouillon', 'envoyé', 'accepté', 'refusé', 'expiré'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.invoice_status as enum (
    'brouillon', 'envoyée', 'payée', 'en_retard', 'annulée'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.media_category as enum (
    'hero', 'cabinet', 'coach', 'seance', 'temoignage', 'exercices', 'ambiance'
  );
exception when duplicate_object then null;
end $$;

-- ── 2. Table quotes (devis) ───────────────────────────────────

create table if not exists public.quotes (
  id              uuid          primary key default gen_random_uuid(),
  coach_id        uuid          not null references public.profiles(id) on delete cascade,
  number          text          not null,
  client_name     text          not null default '',
  client_email    text          not null default '',
  client_phone    text          not null default '',
  client_address  text          not null default '',
  title           text          not null default '',
  description     text          not null default '',
  line_items      jsonb         not null default '[]'::jsonb,
  discount_pct    numeric(5,2)  not null default 0,
  discount_amount numeric(10,2) not null default 0,
  notes           text          not null default '',
  conditions      text          not null default '',
  validity_days   smallint      not null default 30,
  status          public.quote_status not null default 'brouillon',
  issued_at       date          not null default current_date,
  expires_at      date          not null default (current_date + interval '30 days'),
  subtotal_ht     numeric(10,2) not null default 0,
  total_tva       numeric(10,2) not null default 0,
  total_ttc       numeric(10,2) not null default 0,
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

alter table public.quotes enable row level security;

create or replace trigger quotes_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();

drop policy if exists "quotes_coach_all" on public.quotes;
create policy "quotes_coach_all"
  on public.quotes for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists "quotes_admin_all" on public.quotes;
create policy "quotes_admin_all"
  on public.quotes for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── 3. Table invoices (factures) ─────────────────────────────

create table if not exists public.invoices (
  id              uuid          primary key default gen_random_uuid(),
  coach_id        uuid          not null references public.profiles(id) on delete cascade,
  quote_id        uuid          references public.quotes(id) on delete set null,
  number          text          not null,
  client_name     text          not null default '',
  client_email    text          not null default '',
  client_phone    text          not null default '',
  client_address  text          not null default '',
  line_items      jsonb         not null default '[]'::jsonb,
  discount_pct    numeric(5,2)  not null default 0,
  discount_amount numeric(10,2) not null default 0,
  payment_method  text          not null default '',
  legal_mentions  text          not null default '',
  notes           text          not null default '',
  status          public.invoice_status not null default 'brouillon',
  issued_at       date          not null default current_date,
  due_at          date          not null default (current_date + interval '30 days'),
  subtotal_ht     numeric(10,2) not null default 0,
  total_tva       numeric(10,2) not null default 0,
  total_ttc       numeric(10,2) not null default 0,
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

alter table public.invoices enable row level security;

create or replace trigger invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

drop policy if exists "invoices_coach_all" on public.invoices;
create policy "invoices_coach_all"
  on public.invoices for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists "invoices_admin_all" on public.invoices;
create policy "invoices_admin_all"
  on public.invoices for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── 4. Table site_settings (personnalisation PDF & branding) ─

create table if not exists public.site_settings (
  id                    integer       primary key default 1 check (id = 1),
  company_name          text          not null default 'Mise en Mouvement',
  siret                 text          not null default '',
  address               text          not null default '',
  city                  text          not null default '',
  postal_code           text          not null default '',
  email                 text          not null default '',
  phone                 text          not null default '',
  website               text          not null default '',
  logo_url              text          not null default '',
  primary_color         text          not null default '#4f463b',
  secondary_color       text          not null default '#a89a89',
  pdf_footer_text       text          not null default '',
  pdf_quote_conditions  text          not null default 'Devis valable 30 jours à compter de sa date d''émission.',
  pdf_invoice_mentions  text          not null default 'TVA non applicable, art. 293B du CGI.',
  updated_at            timestamptz   not null default now()
);

alter table public.site_settings enable row level security;

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

drop policy if exists "site_settings_read_all" on public.site_settings;
create policy "site_settings_read_all"
  on public.site_settings for select
  using (true);

drop policy if exists "site_settings_write_admin" on public.site_settings;
create policy "site_settings_write_admin"
  on public.site_settings for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── 5. Table discovery_session_settings ──────────────────────

create table if not exists public.discovery_session_settings (
  id              integer     primary key default 1 check (id = 1),
  title           text        not null default 'Séance Découverte',
  subtitle        text        not null default 'Votre premier pas vers une vie plus libre',
  price           numeric(8,2) not null default 25,
  duration_min    smallint    not null default 60,
  description     text        not null default '',
  session_steps   jsonb       not null default '[]'::jsonb,
  benefits        jsonb       not null default '[]'::jsonb,
  cta_label       text        not null default 'Réserver ma séance découverte',
  image_url       text        not null default '',
  video_url       text        not null default '',
  updated_at      timestamptz not null default now()
);

alter table public.discovery_session_settings enable row level security;

insert into public.discovery_session_settings (id) values (1) on conflict (id) do nothing;

drop policy if exists "discovery_session_read_all" on public.discovery_session_settings;
create policy "discovery_session_read_all"
  on public.discovery_session_settings for select
  using (true);

drop policy if exists "discovery_session_write_admin" on public.discovery_session_settings;
create policy "discovery_session_write_admin"
  on public.discovery_session_settings for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── 6. Table media_library (médiathèque) ─────────────────────

create table if not exists public.media_library (
  id          uuid                  primary key default gen_random_uuid(),
  title       text                  not null default '',
  description text                  not null default '',
  file_url    text                  not null,
  file_type   text                  not null default 'image',
  category    public.media_category not null default 'ambiance',
  is_active   boolean               not null default true,
  sort_order  integer               not null default 0,
  created_at  timestamptz           not null default now(),
  updated_at  timestamptz           not null default now()
);

alter table public.media_library enable row level security;

drop policy if exists "media_library_read_all" on public.media_library;
create policy "media_library_read_all"
  on public.media_library for select
  using (true);

drop policy if exists "media_library_write_admin" on public.media_library;
create policy "media_library_write_admin"
  on public.media_library for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── 7. Index de performances ─────────────────────────────────

-- quotes : requêtes fréquentes par coach + numéro
create index if not exists idx_quotes_coach_id     on public.quotes(coach_id);
create index if not exists idx_quotes_created_at   on public.quotes(created_at desc);
create index if not exists idx_quotes_status       on public.quotes(status);
create index if not exists idx_quotes_number       on public.quotes(number);

-- invoices
create index if not exists idx_invoices_coach_id   on public.invoices(coach_id);
create index if not exists idx_invoices_created_at on public.invoices(created_at desc);
create index if not exists idx_invoices_status     on public.invoices(status);
create index if not exists idx_invoices_quote_id   on public.invoices(quote_id);

-- media_library
create index if not exists idx_media_category      on public.media_library(category);
create index if not exists idx_media_sort_order    on public.media_library(sort_order, created_at desc);
create index if not exists idx_media_is_active     on public.media_library(is_active);

-- ── 8. Contrainte unicité numéro par coach ────────────────────

alter table public.quotes
  add constraint if not exists uq_quotes_number_coach unique (coach_id, number);

alter table public.invoices
  add constraint if not exists uq_invoices_number_coach unique (coach_id, number);

-- ── 9. Trigger updated_at pour media_library ─────────────────

create or replace trigger media_library_updated_at
  before update on public.media_library
  for each row execute function public.set_updated_at();

-- ── 10. Storage bucket site-media ────────────────────────────
-- À exécuter via le dashboard Supabase si non créé :
-- insert into storage.buckets (id, name, public) values ('site-media', 'site-media', true)
-- on conflict (id) do nothing;

-- RLS storage : public en lecture, admin en écriture
-- drop policy if exists "site_media_public_read" on storage.objects;
-- create policy "site_media_public_read" on storage.objects for select
--   using (bucket_id = 'site-media');
-- drop policy if exists "site_media_admin_write" on storage.objects;
-- create policy "site_media_admin_write" on storage.objects for all
--   using (bucket_id = 'site-media' and exists (
--     select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
--   ));
