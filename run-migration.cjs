#!/usr/bin/env node
// Usage: node run-migration.cjs postgresql://postgres:PASSWORD@db.mgpzibtestbuwlmifbwz.supabase.co:5432/postgres

const { Client } = require('pg');

const MIGRATIONS = [
  {
    name: '0018_google_calendar',
    sql: `
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

      do $$ begin
        if not exists (select 1 from pg_policies where tablename='coach_google_tokens' and policyname='coach can read own google token') then
          create policy "coach can read own google token"
            on public.coach_google_tokens for select
            using (coach_id = auth.uid());
        end if;
      end $$;

      do $$ begin
        if not exists (select 1 from pg_policies where tablename='coach_google_tokens' and policyname='coach can delete own google token') then
          create policy "coach can delete own google token"
            on public.coach_google_tokens for delete
            using (coach_id = auth.uid());
        end if;
      end $$;
    `,
    check: `SELECT to_regclass('public.coach_google_tokens') IS NOT NULL AS exists`,
  },
  {
    name: '0019_booking_google_event',
    sql: `ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS google_event_id text;`,
    check: `SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='bookings' AND column_name='google_event_id'
    ) AS exists`,
  },
];

async function run() {
  const dbUrl = process.argv[2] || process.env.DB_URL;
  if (!dbUrl) {
    console.error('\nUsage: node run-migration.cjs postgresql://postgres:MOT_DE_PASSE@db.mgpzibtestbuwlmifbwz.supabase.co:5432/postgres\n');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✓ Connecté à Supabase\n');

    for (const m of MIGRATIONS) {
      process.stdout.write(`Migration ${m.name} ... `);
      try {
        await client.query(m.sql);
        const res = await client.query(m.check);
        const ok = res.rows[0]?.exists === true;
        console.log(ok ? '✅ OK' : '⚠️  Exécutée mais vérification échouée');
      } catch (err) {
        console.log('❌ Erreur :', err.message);
      }
    }

    console.log('\nVérification finale :');
    const r1 = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='bookings' AND column_name='google_event_id'`);
    console.log('  bookings.google_event_id :', r1.rows.length > 0 ? '✅ présent' : '❌ absent');
    const r2 = await client.query(`SELECT to_regclass('public.coach_google_tokens') as t`);
    console.log('  coach_google_tokens      :', r2.rows[0]?.t ? '✅ présente' : '❌ absente');

  } catch (err) {
    console.error('❌ Erreur connexion :', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
