/**
 * verify-migration.mjs — vérification des tables 0017 (lecture seule)
 * Usage: node scripts/verify-migration.mjs <SUPABASE_PAT>
 */

import { readFileSync as _unused } from "node:fs";

const PROJECT_REF = "mgpzibtestbuwlmifbwz";
const [, , token] = process.argv;

if (!token) { console.error("Token manquant."); process.exitCode = 1; }

async function q(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: sql }),
    }
  );
  return { status: res.status, rows: await res.json() };
}

const TABLES = ["booking_settings","coach_availability_rules","coach_unavailabilities","bookings"];

// Tables
const { rows: tRows } = await q(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND table_name IN (${TABLES.map(t=>`'${t}'`).join(",")})
  ORDER BY table_name;
`);
const found = (tRows||[]).map(r=>r.table_name);
console.log("\n── Tables ───────────────────────────────────");
let ok = true;
for (const t of TABLES) {
  const x = found.includes(t);
  console.log(`  ${x?"✅":"❌"}  ${t}`);
  if (!x) ok = false;
}

// RLS
const { rows: rls } = await q(`
  SELECT tablename, rowsecurity FROM pg_tables
  WHERE schemaname='public' AND tablename IN (${TABLES.map(t=>`'${t}'`).join(",")})
  ORDER BY tablename;
`);
console.log("\n── RLS ──────────────────────────────────────");
for (const r of rls||[]) {
  const x = r.rowsecurity === true;
  console.log(`  ${x?"✅":"❌"}  ${r.tablename} — RLS ${x?"ON":"OFF"}`);
  if (!x) ok = false;
}

// Policies count
const { rows: pol } = await q(`
  SELECT tablename, count(*) as n FROM pg_policies
  WHERE schemaname='public' AND tablename IN (${TABLES.map(t=>`'${t}'`).join(",")})
  GROUP BY tablename ORDER BY tablename;
`);
console.log("\n── Policies RLS ─────────────────────────────");
for (const r of pol||[]) console.log(`  ✅  ${r.tablename} — ${r.n} policy(s)`);

// Realtime
const { rows: rt } = await q(`
  SELECT tablename FROM pg_publication_tables
  WHERE pubname='supabase_realtime' AND tablename IN ('bookings','coach_unavailabilities')
  ORDER BY tablename;
`);
const rtFound = (rt||[]).map(r=>r.tablename);
console.log("\n── Realtime ─────────────────────────────────");
for (const t of ["bookings","coach_unavailabilities"]) {
  const x = rtFound.includes(t);
  console.log(`  ${x?"✅":"❌"}  ${t}`);
  if (!x) ok = false;
}

// Trigger conflict
const { rows: trg } = await q(`
  SELECT trigger_name FROM information_schema.triggers
  WHERE event_object_schema='public' AND event_object_table='bookings'
  AND trigger_name='bookings_no_overlap';
`);
console.log("\n── Trigger anti-conflit ─────────────────────");
const hasTrg = (trg||[]).length > 0;
console.log(`  ${hasTrg?"✅":"❌"}  bookings_no_overlap`);
if (!hasTrg) ok = false;

console.log("\n" + "─".repeat(46));
console.log(ok ? "🎉  0017 : tout est en ordre." : "⚠️   Des éléments sont manquants.");
process.exitCode = ok ? 0 : 1;
