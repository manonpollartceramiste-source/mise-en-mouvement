/**
 * apply-migration.mjs
 * Usage: node scripts/apply-migration.mjs <SUPABASE_PAT> [migration-file]
 *
 * Executes a SQL migration file against the Supabase project via the
 * Management API. Requires a Personal Access Token (PAT) from
 * https://supabase.com/dashboard/account/tokens
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_REF = "mgpzibtestbuwlmifbwz";
const BASE_URL = "https://api.supabase.com/v1";

const [, , token, migrationPath] = process.argv;

if (!token || token === "YOUR_TOKEN_HERE") {
  console.error(
    "\n❌  Token manquant.\n" +
      "    Usage : node scripts/apply-migration.mjs <SUPABASE_PAT> [fichier.sql]\n" +
      "    Obtenir un token : https://supabase.com/dashboard/account/tokens\n",
  );
  process.exit(1);
}

const sqlFile = migrationPath
  ? resolve(migrationPath)
  : resolve("supabase/0017_booking_system.sql");

console.log(`\n📂  Fichier  : ${sqlFile}`);
console.log(`🔗  Projet   : ${PROJECT_REF}`);
console.log("⏳  Exécution de la migration…\n");

const sql = readFileSync(sqlFile, "utf8");

// ── Helper: call Management API ──────────────────────────────────────────────

async function query(q) {
  const res = await fetch(`${BASE_URL}/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: q }),
  });
  return { status: res.status, body: await res.json() };
}

// ── Step 1: apply the migration ───────────────────────────────────────────────

const { status, body } = await query(sql);

// DDL returns 201 (no rows); SELECT returns 200
if (status !== 200 && status !== 201) {
  console.error(`❌  Migration échouée (HTTP ${status}):`);
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}

console.log("✅  Migration appliquée.\n");

// ── Step 2: verify tables exist ───────────────────────────────────────────────

const TABLES = [
  "booking_settings",
  "coach_availability_rules",
  "coach_unavailabilities",
  "bookings",
];

console.log("🔍  Vérification des tables…");

const { body: tablesBody } = await query(`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (${TABLES.map((t) => `'${t}'`).join(", ")})
  ORDER BY table_name;
`);

const foundTables = (tablesBody ?? []).map((r) => r.table_name);
let allTablesOk = true;

for (const t of TABLES) {
  const ok = foundTables.includes(t);
  console.log(`  ${ok ? "✅" : "❌"}  ${t}`);
  if (!ok) allTablesOk = false;
}

// ── Step 3: verify RLS ────────────────────────────────────────────────────────

console.log("\n🔐  Vérification RLS…");

const { body: rlsBody } = await query(`
  SELECT tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (${TABLES.map((t) => `'${t}'`).join(", ")})
  ORDER BY tablename;
`);

let allRlsOk = true;
for (const row of rlsBody ?? []) {
  const ok = row.rowsecurity === true;
  console.log(`  ${ok ? "✅" : "❌"}  ${row.tablename} — RLS ${ok ? "activé" : "DÉSACTIVÉ"}`);
  if (!ok) allRlsOk = false;
}

// ── Step 4: verify Realtime publication ──────────────────────────────────────

console.log("\n📡  Vérification Realtime…");

const { body: rtBody } = await query(`
  SELECT schemaname, tablename
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND tablename IN ('bookings', 'coach_unavailabilities')
  ORDER BY tablename;
`);

const rtTables = (rtBody ?? []).map((r) => r.tablename);
for (const t of ["bookings", "coach_unavailabilities"]) {
  const ok = rtTables.includes(t);
  console.log(`  ${ok ? "✅" : "❌"}  ${t} — Realtime ${ok ? "actif" : "INACTIF"}`);
}

// ── Step 5: count RLS policies ────────────────────────────────────────────────

console.log("\n📋  Politiques RLS créées…");

const { body: policiesBody } = await query(`
  SELECT tablename, COUNT(*) as count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (${TABLES.map((t) => `'${t}'`).join(", ")})
  GROUP BY tablename
  ORDER BY tablename;
`);

for (const row of policiesBody ?? []) {
  console.log(`  ✅  ${row.tablename} — ${row.count} politique(s)`);
}

// ── Final summary ─────────────────────────────────────────────────────────────

console.log("\n" + "─".repeat(50));
if (allTablesOk && allRlsOk) {
  console.log("🎉  Migration 0017 appliquée et vérifiée avec succès.");
  process.exit(0);
} else {
  console.log("⚠️   Certaines vérifications ont échoué. Voir les ❌ ci-dessus.");
  process.exit(1);
}
