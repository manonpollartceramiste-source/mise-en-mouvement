import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { OsShell } from "@/app/os/_components/OsShell";
import { NewClientModal } from "./NewClientModal";
import type { Profile } from "@/lib/os/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mes clients · Coach",
  robots: { index: false, follow: false },
};

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type SearchParams = Promise<{ q?: string; debug?: string }>;

export default async function CoachClientsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const { q = "", debug } = await searchParams;
  const showDebug = debug === "1";
  const isAdmin = Array.isArray(profile.roles)
    ? profile.roles.includes("admin")
    : profile.role === "admin";

  const supabase = await getSupabaseServer();

  // ── Auth user brut ──────────────────────────────────────────
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // ── Requête clients via client anon (sujet à RLS) ───────────
  const clientsFilter = isAdmin
    ? supabase
        .from("profiles")
        .select("id, display_name, email, role, coach_id, active")
        .eq("role", "client")
        .eq("active", true)
        .order("display_name")
    : supabase
        .from("profiles")
        .select("id, display_name, email, role, coach_id, active")
        .eq("coach_id", profile.id)
        .eq("role", "client")
        .eq("active", true)
        .order("display_name");

  const { data: rawClients, error: clientsError } = await clientsFilter;

  // ── Requête sans filtre active (diagnostic) ─────────────────
  const { data: rawClientsNoActive, error: noActiveError } = isAdmin
    ? await supabase
        .from("profiles")
        .select("id, display_name, email, role, coach_id, active")
        .eq("role", "client")
        .limit(20)
    : await supabase
        .from("profiles")
        .select("id, display_name, email, role, coach_id, active")
        .eq("coach_id", profile.id)
        .limit(20);

  // ── Logs serveur ─────────────────────────────────────────────
  console.log("[CLIENT_LIST_QUERY] isAdmin:", isAdmin, "| coach_id filter:", isAdmin ? "none (admin voit tout)" : profile.id);
  if (clientsError) {
    console.error("[CLIENT_LIST_ERROR]", clientsError.message, clientsError.code);
  }
  console.log("[CLIENT_LIST_RESULT] count:", rawClients?.length ?? 0, "| error:", clientsError?.message ?? "none");

  const allClients = (rawClients ?? []) as Profile[];

  // Filtre recherche
  const query = q.trim().toLowerCase();
  const clients = query
    ? allClients.filter(
        (c) =>
          c.display_name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query),
      )
    : allClients;

  // Pack + dernière séance
  const packByClient: Record<
    string,
    { remaining: number; total: number; offer_label: string }
  > = {};
  const lastSessionByClient: Record<string, string> = {};

  if (allClients.length > 0) {
    const clientIds = allClients.map((c) => c.id);
    const [packsRes, sessionsRes] = await Promise.all([
      supabase
        .from("session_packs")
        .select("client_id, remaining, total, offer_label")
        .in("client_id", clientIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("sessions")
        .select("client_id, scheduled_at")
        .in("client_id", clientIds)
        .eq("status", "réalisée")
        .order("scheduled_at", { ascending: false }),
    ]);
    for (const p of packsRes.data ?? []) {
      if (!packByClient[p.client_id]) packByClient[p.client_id] = p;
    }
    for (const s of sessionsRes.data ?? []) {
      if (!lastSessionByClient[s.client_id])
        lastSessionByClient[s.client_id] = s.scheduled_at;
    }
  }

  return (
    <OsShell profile={profile} title="Mes clients">

      {/* ── DEBUG PANEL (activer avec ?debug=1) ─────────────── */}
      {showDebug && (
        <div className="mb-6 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-xs font-mono">
          <p className="mb-2 font-bold text-amber-800">🔍 DEBUG PANEL — /os/coach/clients?debug=1</p>

          <div className="mb-2">
            <p className="font-semibold text-amber-700">AUTH USER (session)</p>
            <p>id: {authUser?.id ?? "null"}</p>
            <p>email: {authUser?.email ?? "null"}</p>
          </div>

          <div className="mb-2">
            <p className="font-semibold text-amber-700">PROFILE (from getOsProfileWithRole)</p>
            <p>id: {profile.id}</p>
            <p>email: {profile.email}</p>
            <p>role (DB): {profile.role}</p>
            <p>roles (array): {JSON.stringify(profile.roles)}</p>
            <p>active: {String(profile.active)}</p>
            <p>isAdmin (computed): {String(isAdmin)}</p>
          </div>

          <div className="mb-2">
            <p className="font-semibold text-amber-700">CLIENTS QUERY (RLS anon client)</p>
            <p>
              Filtre:{" "}
              {isAdmin
                ? "role=client & active=true (admin: pas de filtre coach_id)"
                : `coach_id=${profile.id} & role=client & active=true`}
            </p>
            <p>Résultat: {rawClients?.length ?? 0} client(s)</p>
            <p>Erreur: {clientsError ? `${clientsError.code} — ${clientsError.message}` : "aucune"}</p>
          </div>

          <div className="mb-2">
            <p className="font-semibold text-amber-700">CLIENTS SANS FILTRE active (diagnostic)</p>
            <p>
              Filtre:{" "}
              {isAdmin ? "role=client (sans filtre active)" : `coach_id=${profile.id} (sans filtre active)`}
            </p>
            <p>Résultat: {rawClientsNoActive?.length ?? 0} entrée(s)</p>
            <p>Erreur: {noActiveError ? `${noActiveError.code} — ${noActiveError.message}` : "aucune"}</p>
            {rawClientsNoActive && rawClientsNoActive.length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer text-amber-600">Voir données brutes</summary>
                <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-amber-100 p-2 text-[10px]">
                  {JSON.stringify(rawClientsNoActive, null, 2)}
                </pre>
              </details>
            )}
          </div>

          {rawClients && rawClients.length > 0 && (
            <div>
              <p className="font-semibold text-amber-700">CLIENTS DATA (filtrés)</p>
              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-amber-100 p-2 text-[10px]">
                {JSON.stringify(rawClients, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ── Lien debug ─────────────────────────────────────── */}
      {!showDebug && (
        <p className="mb-4 text-right text-[10px] text-taupe-300">
          <Link href="/os/coach/clients?debug=1" className="hover:text-taupe-500">
            [debug]
          </Link>
        </p>
      )}

      {/* ── En-tête + compteur ─────────────────────────────── */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
            Cabinet OS
          </p>
          <h2 className="mt-1 font-serif text-2xl text-ink-900">
            {isAdmin ? "Tous les clients" : "Mes clients"}
            <span className="ml-3 font-sans text-base font-normal text-taupe-500">
              {clients.length}
              {allClients.length !== clients.length
                ? ` / ${allClients.length}`
                : ""}
            </span>
          </h2>
        </div>
        <NewClientModal />
      </div>

      {/* ── Barre de recherche ─────────────────────────────── */}
      <form method="GET" className="mb-6">
        <input type="hidden" name="debug" value={showDebug ? "1" : ""} />
        <div className="flex gap-3">
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Rechercher par nom ou email…"
            className="flex-1 rounded-full border border-taupe-300/50 bg-white px-5 py-2.5 text-sm text-ink-900 placeholder:text-taupe-400 focus:border-taupe-600 focus:outline-none focus:ring-2 focus:ring-taupe-500/20"
          />
          <button
            type="submit"
            className="rounded-full bg-taupe-700 px-5 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-800"
          >
            Rechercher
          </button>
          {q && (
            <Link
              href={showDebug ? "/os/coach/clients?debug=1" : "/os/coach/clients"}
              className="flex items-center rounded-full border border-taupe-300/50 px-4 py-2.5 text-sm text-taupe-600 transition-colors hover:bg-sand-100"
            >
              ✕
            </Link>
          )}
        </div>
      </form>

      {/* ── Erreur Supabase visible ─────────────────────────── */}
      {clientsError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Erreur Supabase : {clientsError.code} — {clientsError.message}
        </div>
      )}

      {/* ── Résultats ──────────────────────────────────────── */}
      {clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-12 text-center">
          {query ? (
            <>
              <p className="font-serif text-xl text-ink-900">
                Aucun résultat pour &ldquo;{q}&rdquo;
              </p>
              <Link
                href={showDebug ? "/os/coach/clients?debug=1" : "/os/coach/clients"}
                className="mt-3 inline-block text-sm text-taupe-600 hover:text-ink-900"
              >
                ← Voir tous les clients
              </Link>
            </>
          ) : (
            <>
              <p className="font-serif text-xl text-ink-900">Aucun client</p>
              <p className="mt-2 text-sm text-taupe-600">
                {clientsError
                  ? `Erreur Supabase : ${clientsError.message}`
                  : isAdmin
                    ? "Aucun client actif dans la base."
                    : "Aucun client lié à votre compte. Vérifiez que coach_id est renseigné sur les profils clients."}
              </p>
              {!showDebug && (
                <Link
                  href="/os/coach/clients?debug=1"
                  className="mt-3 inline-block text-xs text-taupe-400 hover:text-taupe-600"
                >
                  Activer le diagnostic →
                </Link>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              pack={packByClient[client.id]}
              lastSession={lastSessionByClient[client.id]}
            />
          ))}
        </div>
      )}
    </OsShell>
  );
}

function ClientCard({
  client,
  pack,
  lastSession,
}: {
  client: Profile;
  pack?: { remaining: number; total: number; offer_label: string };
  lastSession?: string;
}) {
  const packAlert = pack && pack.remaining <= 2 && pack.remaining > 0;
  const packEmpty = pack && pack.remaining === 0;

  return (
    <Link
      href={`/os/coach/clients/${client.id}`}
      className="group flex flex-col rounded-2xl border border-taupe-300/40 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-taupe-400/60 hover:shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-taupe-100 text-sm font-medium text-taupe-700">
          {initials(client.display_name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink-900">
            {client.display_name}
          </p>
          <p className="truncate text-xs text-taupe-500">{client.email}</p>
          {client.phone && (
            <p className="text-xs text-taupe-400">{client.phone}</p>
          )}
        </div>
        {!client.active && (
          <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] text-red-700">
            Inactif
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-taupe-300/20 pt-3">
        <div>
          {pack ? (
            <p
              className={`text-xs ${
                packEmpty
                  ? "text-taupe-400"
                  : packAlert
                    ? "font-medium text-amber-700"
                    : "text-taupe-600"
              }`}
            >
              <span
                className={`font-semibold ${
                  packEmpty
                    ? "text-taupe-400"
                    : packAlert
                      ? "text-amber-700"
                      : "text-ink-900"
                }`}
              >
                {pack.remaining}/{pack.total}
              </span>{" "}
              séances
              {packAlert && " ⚠"}
              {packEmpty && " · épuisé"}
            </p>
          ) : (
            <p className="text-xs text-taupe-400">Pas de pack</p>
          )}
        </div>
        <div className="text-right">
          {lastSession ? (
            <p className="text-xs text-taupe-400">
              Suivi :{" "}
              {new Intl.DateTimeFormat("fr-FR", {
                day: "numeric",
                month: "short",
              }).format(new Date(lastSession))}
            </p>
          ) : (
            <p className="text-xs text-taupe-400">Aucune séance</p>
          )}
        </div>
      </div>

      <span className="mt-3 self-end text-xs font-medium text-taupe-600 transition-colors group-hover:text-ink-900">
        Voir la fiche →
      </span>
    </Link>
  );
}
