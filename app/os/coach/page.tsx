import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOsProfileWithRole, getCoachClients } from "@/lib/supabase/os-server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { OsShell } from "@/app/os/_components/OsShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Tableau de bord · Coach",
  robots: { index: false, follow: false },
};

// ── Server action : marquer une séance réalisée depuis le dashboard ───────

async function markSessionDoneAction(formData: FormData) {
  "use server";
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");
  const sessionId = String(formData.get("session_id") ?? "");
  if (!sessionId) redirect("/os/coach");
  const supabase = await getSupabaseServer();
  await supabase
    .from("sessions")
    .update({ status: "réalisée" })
    .eq("id", sessionId)
    .eq("coach_id", profile.id);
  redirect("/os/coach");
}

// ── Helpers ───────────────────────────────────────────────────────────────

const fmtTime = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});
const fmtDay = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const fmtShort = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

function timeState(
  scheduledAt: string,
  durationMin: number,
): "future" | "current" | "past" {
  const now = Date.now();
  const start = new Date(scheduledAt).getTime();
  const end = start + durationMin * 60_000;
  if (now < start) return "future";
  if (now >= start && now <= end) return "current";
  return "past";
}

const STATUS_CFG: Record<
  string,
  { dot: string; badge: string; label: string }
> = {
  planifiée: { dot: "bg-blue-400", badge: "bg-blue-50 text-blue-700", label: "Planifiée" },
  réalisée: { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-800", label: "Réalisée" },
  annulée: { dot: "bg-red-400", badge: "bg-red-50 text-red-700", label: "Annulée" },
  no_show: { dot: "bg-taupe-400", badge: "bg-taupe-100 text-taupe-600", label: "No show" },
};

// ── Page ──────────────────────────────────────────────────────────────────

export default async function CoachDashboard() {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const coachId = profile.id;
  const supabase = await getSupabaseServer();
  const now = new Date();

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const next7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    clients,
    todayRes,
    urgentPacksRes,
    noShowsRes,
    upcomingRes,
    monthCountRes,
    presenceRes,
    activeGoalsRes,
    recentDoneRes,
  ] = await Promise.all([
    getCoachClients(coachId),
    supabase
      .from("sessions")
      .select("*, profiles!sessions_client_id_fkey(display_name)")
      .eq("coach_id", coachId)
      .gte("scheduled_at", todayStart.toISOString())
      .lt("scheduled_at", todayEnd.toISOString())
      .order("scheduled_at"),
    supabase
      .from("session_packs")
      .select("client_id, remaining, total, offer_label")
      .eq("coach_id", coachId)
      .lte("remaining", 2)
      .gt("remaining", 0)
      .order("remaining")
      .limit(6),
    supabase
      .from("sessions")
      .select("id, client_id, scheduled_at, duration_min, location")
      .eq("coach_id", coachId)
      .eq("status", "no_show")
      .gte("scheduled_at", sevenAgo.toISOString())
      .order("scheduled_at", { ascending: false })
      .limit(5),
    supabase
      .from("sessions")
      .select("id, client_id, scheduled_at, duration_min")
      .eq("coach_id", coachId)
      .eq("status", "planifiée")
      .gt("scheduled_at", todayEnd.toISOString())
      .lte("scheduled_at", next7.toISOString())
      .order("scheduled_at"),
    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", coachId)
      .gte("scheduled_at", monthStart.toISOString())
      .lt("scheduled_at", nextMonth.toISOString()),
    supabase
      .from("sessions")
      .select("status")
      .eq("coach_id", coachId)
      .in("status", ["réalisée", "annulée", "no_show"])
      .gte("scheduled_at", thirtyAgo.toISOString()),
    supabase
      .from("client_goals")
      .select("client_id")
      .eq("coach_id", coachId)
      .eq("status", "actif"),
    supabase
      .from("sessions")
      .select("client_id")
      .eq("coach_id", coachId)
      .eq("status", "réalisée")
      .gte("scheduled_at", thirtyAgo.toISOString()),
  ]);

  // ── Data processing ────────────────────────────────────────────────────

  const clientMap = new Map(clients.map((c) => [c.id, c.display_name]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const todaySessions = (todayRes.data ?? []).map((row: any) => ({
    id: row.id as string,
    client_id: row.client_id as string,
    scheduled_at: row.scheduled_at as string,
    duration_min: row.duration_min as number,
    location: row.location as string | null,
    status: row.status as string,
    summary: row.summary as string | null,
    client_name:
      (row.profiles as { display_name: string } | null)?.display_name ??
      "Client",
  }));

  const urgentPacks = (urgentPacksRes.data ?? []).map((p) => ({
    client_id: p.client_id,
    client_name: clientMap.get(p.client_id) ?? "Client",
    remaining: p.remaining,
    total: p.total,
    offer_label: p.offer_label,
  }));

  const noShows = (noShowsRes.data ?? []).map((s) => ({
    id: s.id,
    client_id: s.client_id,
    client_name: clientMap.get(s.client_id) ?? "Client",
    scheduled_at: s.scheduled_at as string,
  }));

  // Presence rate last 30 days
  const presenceData = presenceRes.data ?? [];
  const done30 = presenceData.filter((s) => s.status === "réalisée").length;
  const missed30 = presenceData.filter((s) => s.status !== "réalisée").length;
  const presenceTotal = done30 + missed30;
  const presenceRate =
    presenceTotal > 0 ? Math.round((done30 / presenceTotal) * 100) : null;

  // Clients with active goals but no session in 30 days
  const recentClientIds = new Set(
    (recentDoneRes.data ?? []).map((s) => s.client_id),
  );
  const clientsWithGoals = [
    ...new Set((activeGoalsRes.data ?? []).map((g) => g.client_id)),
  ];
  const staleClients = clientsWithGoals
    .filter((id) => !recentClientIds.has(id))
    .slice(0, 5)
    .map((id) => ({ client_id: id, name: clientMap.get(id) ?? "Client" }));

  // Conflicts in next 7 days
  const upcoming = upcomingRes.data ?? [];
  const sortedUpcoming = [...upcoming].sort(
    (a, b) =>
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  );
  const conflicts: Array<{
    aName: string;
    bName: string;
    aId: string;
    bId: string;
    at: string;
  }> = [];
  for (let i = 0; i < sortedUpcoming.length - 1; i++) {
    const a = sortedUpcoming[i];
    const aEnd =
      new Date(a.scheduled_at).getTime() + a.duration_min * 60_000;
    if (new Date(sortedUpcoming[i + 1].scheduled_at).getTime() < aEnd) {
      conflicts.push({
        aName: clientMap.get(a.client_id) ?? "Client",
        bName: clientMap.get(sortedUpcoming[i + 1].client_id) ?? "Client",
        aId: a.client_id,
        bId: sortedUpcoming[i + 1].client_id,
        at: a.scheduled_at,
      });
    }
  }

  const monthCount = monthCountRes.count ?? 0;
  const firstName = profile.display_name.split(" ")[0];
  const isAdmin = profile.roles.includes("admin");

  const alertCount =
    (conflicts.length > 0 ? 1 : 0) +
    (noShows.length > 0 ? 1 : 0) +
    (urgentPacks.length > 0 ? 1 : 0) +
    (staleClients.length > 0 ? 1 : 0);

  return (
    <OsShell profile={profile} title="Tableau de bord">
      {/* ── En-tête ── */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-taupe-400 capitalize">
          {fmtDay.format(now)}
        </p>
        <h2 className="mt-2 font-serif text-4xl text-ink-900">
          Bonjour, {firstName}
        </h2>
        <p className="mt-1.5 text-sm text-taupe-500">
          {todaySessions.length === 0
            ? "Aucune séance aujourd'hui"
            : `${todaySessions.length} séance${todaySessions.length > 1 ? "s" : ""} aujourd'hui`}
          {alertCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
              {alertCount} alerte{alertCount > 1 ? "s" : ""}
            </span>
          )}
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Séances aujourd'hui"
          value={todaySessions.length}
          sub={
            todaySessions.filter((s) => s.status === "planifiée").length > 0
              ? `${todaySessions.filter((s) => s.status === "planifiée").length} à venir`
              : undefined
          }
          href={null}
        />
        <StatCard
          label="Clients actifs"
          value={clients.length}
          href="/os/coach/clients"
        />
        <StatCard
          label="Présence 30 j"
          value={presenceRate !== null ? `${presenceRate}%` : "—"}
          sub={presenceTotal > 0 ? `${done30}/${presenceTotal} séances` : undefined}
          href={null}
        />
        <StatCard
          label="Ce mois"
          value={monthCount}
          sub="séances réalisées"
          href={null}
        />
      </div>

      {/* ── Layout 2 colonnes ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ── LEFT : séances du jour ── */}
        <div className="overflow-hidden rounded-2xl border border-taupe-300/40 bg-white">
          <div className="flex items-center justify-between border-b border-taupe-200/60 px-6 py-4">
            <div>
              <h3 className="font-serif text-xl text-ink-900">
                Séances du jour
              </h3>
              {todaySessions.length > 0 && (
                <p className="mt-0.5 text-xs text-taupe-400">
                  {fmtShort.format(now)}
                </p>
              )}
            </div>
            <Link
              href="/os/coach/calendar"
              className="text-sm text-taupe-400 transition-colors hover:text-ink-900"
            >
              Calendrier →
            </Link>
          </div>

          {todaySessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sand-100">
                <span className="text-2xl text-taupe-400">○</span>
              </div>
              <p className="font-serif text-lg text-ink-900">
                Journée libre
              </p>
              <p className="mt-1 text-sm text-taupe-500">
                Aucune séance planifiée aujourd&apos;hui.
              </p>
              <Link
                href="/os/coach/calendar"
                className="mt-4 rounded-xl border border-taupe-300/50 px-4 py-2 text-sm text-taupe-600 transition-colors hover:bg-sand-50 hover:text-ink-900"
              >
                Planifier une séance →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-taupe-200/40">
              {todaySessions.map((s) => {
                const cfg = STATUS_CFG[s.status] ?? STATUS_CFG.planifiée;
                const ts = timeState(s.scheduled_at, s.duration_min);
                const isCurrent = ts === "current" && s.status === "planifiée";
                const isLate =
                  ts === "past" && s.status === "planifiée";

                return (
                  <li
                    key={s.id}
                    className={`flex items-start gap-4 px-6 py-4 transition-colors ${isCurrent ? "bg-amber-50/40" : "hover:bg-sand-50/40"}`}
                  >
                    {/* Heure */}
                    <div className="w-12 shrink-0 pt-0.5 text-right">
                      <p className="text-sm font-semibold text-ink-900">
                        {fmtTime.format(new Date(s.scheduled_at))}
                      </p>
                      <p className="text-[10px] text-taupe-400">
                        {s.duration_min} min
                      </p>
                    </div>

                    {/* Indicateur */}
                    <div className="mt-2 shrink-0">
                      <div
                        className={`h-2 w-2 rounded-full ${isCurrent ? "bg-amber-400 ring-4 ring-amber-100" : cfg.dot}`}
                      />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink-900">
                        {s.client_name}
                      </p>
                      {s.location && (
                        <p className="text-xs text-taupe-400">{s.location}</p>
                      )}
                      {s.summary && (
                        <p className="mt-0.5 truncate text-xs italic text-taupe-500">
                          &ldquo;{s.summary}&rdquo;
                        </p>
                      )}
                      {isCurrent && (
                        <p className="mt-0.5 text-xs font-medium text-amber-700">
                          En cours maintenant
                        </p>
                      )}
                      {isLate && (
                        <p className="mt-0.5 text-xs text-orange-500">
                          Heure dépassée
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.badge}`}
                      >
                        {cfg.label}
                      </span>
                      <div className="flex items-center gap-2">
                        {s.status === "planifiée" && (
                          <form action={markSessionDoneAction}>
                            <input
                              type="hidden"
                              name="session_id"
                              value={s.id}
                            />
                            <button
                              type="submit"
                              className="rounded-full bg-emerald-800 px-2 py-0.5 text-[10px] font-medium text-white transition-colors hover:bg-emerald-700"
                            >
                              ✓ Réalisée
                            </button>
                          </form>
                        )}
                        <Link
                          href={`/os/coach/clients/${s.client_id}`}
                          className="text-xs text-taupe-400 transition-colors hover:text-ink-900"
                        >
                          Fiche →
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── RIGHT : alertes + actions ── */}
        <div className="space-y-4">
          {/* Alertes */}
          <AlertsPanel
            conflicts={conflicts}
            noShows={noShows}
            urgentPacks={urgentPacks}
            staleClients={staleClients}
          />

          {/* Actions rapides */}
          <div className="overflow-hidden rounded-2xl border border-taupe-300/40 bg-white">
            <div className="border-b border-taupe-200/60 px-5 py-3">
              <h3 className="text-sm font-medium text-ink-900">
                Accès rapides
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              {[
                {
                  label: "Calendrier",
                  href: "/os/coach/calendar",
                  sub: "Créer · Planifier",
                },
                {
                  label: "Mes clients",
                  href: "/os/coach/clients",
                  sub: `${clients.length} actif${clients.length !== 1 ? "s" : ""}`,
                },
                {
                  label: "Bilan mouvement",
                  href: "/os/coach/bilan-mouvement",
                  sub: "Évaluation · Rapport",
                },
                ...(isAdmin
                  ? [
                      {
                        label: "Espace admin",
                        href: "/admin",
                        sub: "Gestion globale",
                      },
                    ]
                  : [
                      {
                        label: "Mon profil",
                        href: "/os/client/profil",
                        sub: "Mes infos",
                      },
                    ]),
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className={`group flex flex-col rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-sm ${
                    "alert" in a && a.alert
                      ? "border-amber-200 bg-amber-50/60 hover:border-amber-300"
                      : "border-taupe-300/40 bg-white hover:border-taupe-400/60"
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${"alert" in a && a.alert ? "text-amber-900" : "text-ink-900"}`}
                  >
                    {a.label}
                  </p>
                  <p
                    className={`mt-0.5 text-xs ${"alert" in a && a.alert ? "text-amber-700" : "text-taupe-400"}`}
                  >
                    {a.sub}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* Sessions semaine à venir (mini) */}
          {upcoming.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-taupe-300/40 bg-white">
              <div className="border-b border-taupe-200/60 px-5 py-3">
                <h3 className="text-sm font-medium text-ink-900">
                  Cette semaine
                  <span className="ml-2 text-xs font-normal text-taupe-400">
                    {upcoming.length} à venir
                  </span>
                </h3>
              </div>
              <ul className="divide-y divide-taupe-200/30">
                {upcoming.slice(0, 5).map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-sand-50/50"
                  >
                    <Link
                      href={`/os/coach/clients/${s.client_id}`}
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate text-sm text-ink-900">
                        {clientMap.get(s.client_id) ?? "Client"}
                      </p>
                      <p className="text-xs text-taupe-400">
                        {new Intl.DateTimeFormat("fr-FR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(s.scheduled_at))}
                      </p>
                    </Link>
                    <span className="shrink-0 text-[10px] text-taupe-300">
                      {s.duration_min} min
                    </span>
                  </li>
                ))}
              </ul>
              {upcoming.length > 5 && (
                <div className="border-t border-taupe-200/40 px-5 py-2.5">
                  <Link
                    href="/os/coach/calendar"
                    className="text-xs text-taupe-400 hover:text-ink-900"
                  >
                    +{upcoming.length - 5} autres → Calendrier
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </OsShell>
  );
}

// ── Alertes ───────────────────────────────────────────────────────────────

type AlertsProps = {
  conflicts: { aName: string; bName: string; aId: string; at: string }[];
  noShows: { id: string; client_id: string; client_name: string; scheduled_at: string }[];
  urgentPacks: {
    client_id: string;
    client_name: string;
    remaining: number;
    total: number;
    offer_label: string;
  }[];
  staleClients: { client_id: string; name: string }[];
};

function AlertsPanel({
  conflicts,
  noShows,
  urgentPacks,
  staleClients,
}: AlertsProps) {
  const hasAlerts =
    conflicts.length ||
    noShows.length ||
    urgentPacks.length ||
    staleClients.length;

  return (
    <div className="overflow-hidden rounded-2xl border border-taupe-300/40 bg-white">
      <div className="border-b border-taupe-200/60 px-5 py-3">
        <h3 className="text-sm font-medium text-ink-900">
          Alertes
          {hasAlerts ? (
            <span className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-white">
              {conflicts.length +
                noShows.length +
                urgentPacks.length +
                staleClients.length}
            </span>
          ) : null}
        </h3>
      </div>

      {!hasAlerts ? (
        <div className="px-5 py-6 text-center">
          <p className="text-sm font-medium text-emerald-700">Tout est en ordre</p>
          <p className="mt-0.5 text-xs text-taupe-400">
            Aucune alerte pour le moment.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-taupe-200/30">
          {conflicts.map((c, i) => (
            <AlertRow
              key={`conflict-${i}`}
              color="border-red-400"
              textColor="text-red-700"
              label="Conflit"
              text={`${c.aName} & ${c.bName}`}
              sub={new Intl.DateTimeFormat("fr-FR", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(c.at))}
              href="/os/coach/calendar"
            />
          ))}
          {noShows.map((s) => (
            <AlertRow
              key={s.id}
              color="border-orange-400"
              textColor="text-orange-700"
              label="No-show"
              text={s.client_name}
              sub={fmtShort.format(new Date(s.scheduled_at))}
              href={`/os/coach/clients/${s.client_id}`}
            />
          ))}
          {urgentPacks.map((p, i) => (
            <AlertRow
              key={`pack-${i}`}
              color="border-amber-400"
              textColor="text-amber-700"
              label="Pack vide"
              text={p.client_name}
              sub={`${p.remaining}/${p.total} séance${p.remaining > 1 ? "s" : ""} restante${p.remaining > 1 ? "s" : ""}`}
              href={`/os/coach/clients/${p.client_id}`}
            />
          ))}
          {staleClients.map((c) => (
            <AlertRow
              key={c.client_id}
              color="border-taupe-400"
              textColor="text-taupe-600"
              label="Suivi"
              text={c.name}
              sub="Aucune séance depuis 30 jours"
              href={`/os/coach/clients/${c.client_id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertRow({
  color,
  textColor,
  label,
  text,
  sub,
  href,
}: {
  color: string;
  textColor: string;
  label: string;
  text: string;
  sub: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-start gap-3 border-l-[3px] py-3 pl-4 pr-5 transition-colors hover:bg-sand-50/60 ${color}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink-900">
          <span className={`mr-1.5 text-xs font-semibold ${textColor}`}>
            {label}
          </span>
          {text}
        </p>
        <p className="text-xs text-taupe-400">{sub}</p>
      </div>
      <span className="mt-0.5 shrink-0 text-xs text-taupe-300">→</span>
    </Link>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  href: string | null;
}) {
  const inner = (
    <div
      className={`rounded-2xl border border-taupe-300/40 bg-white p-5 transition-all ${href ? "hover:-translate-y-0.5 hover:shadow-sm" : ""}`}
    >
      <p className="text-xs uppercase tracking-wider text-taupe-400">{label}</p>
      <p className="mt-2 font-serif text-4xl text-ink-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-taupe-400">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>;
}
