import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getOsProfileWithRole,
  getProfileById,
} from "@/lib/supabase/os-server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { OsShell } from "@/app/os/_components/OsShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Tableau de bord · Client",
  robots: { index: false, follow: false },
};

const fmtDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const fmtSession = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function ClientDashboard() {
  const profile = await getOsProfileWithRole("client");
  if (!profile) redirect("/os/login");

  const supabase = await getSupabaseServer();

  const [packRes, nextSessionRes, qRes, coach, goalsRes, lastMeasureRes] =
    await Promise.all([
      supabase
        .from("session_packs")
        .select("*")
        .eq("client_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("sessions")
        .select("*")
        .eq("client_id", profile.id)
        .eq("status", "planifiée")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("questionnaires")
        .select("id, status")
        .eq("client_id", profile.id)
        .maybeSingle(),
      profile.coach_id ? getProfileById(profile.coach_id) : null,
      supabase
        .from("client_goals")
        .select("id, title, status, target_date")
        .eq("client_id", profile.id)
        .eq("status", "actif")
        .order("created_at", { ascending: false }),
      supabase
        .from("measures")
        .select("measured_at, weight_kg, fat_pct, muscle_pct, bmi")
        .eq("client_id", profile.id)
        .order("measured_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const pack = packRes.data;
  const nextSession = nextSessionRes.data;
  const questionnaire = qRes.data;
  const activeGoals = goalsRes.data ?? [];
  const lastMeasure = lastMeasureRes.data;
  const firstName = profile.display_name.split(" ")[0];

  return (
    <OsShell profile={profile} title="Tableau de bord">
      {/* En-tête */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-taupe-400 capitalize">
          {fmtDate.format(new Date())}
        </p>
        <h2 className="mt-2 font-serif text-4xl text-ink-900">
          Bonjour, {firstName}
        </h2>
        {coach && (
          <p className="mt-2 text-sm text-taupe-500">
            Suivi par{" "}
            <span className="font-medium text-taupe-800">{coach.display_name}</span>
          </p>
        )}
      </div>

      {/* Alerte questionnaire */}
      {questionnaire?.status === "en_attente" && (
        <Link
          href="/os/client/questionnaire"
          className="mb-6 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4 transition-all hover:bg-amber-50"
        >
          <div>
            <p className="font-medium text-amber-900">
              Questionnaire à compléter
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              Votre coach attend vos réponses pour personnaliser votre programme.
            </p>
          </div>
          <span className="ml-4 shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            Remplir →
          </span>
        </Link>
      )}

      {/* Prochaine séance — carte principale */}
      <div className="mb-6 rounded-2xl bg-ink-900 p-6 text-sand-50">
        <p className="text-xs uppercase tracking-[0.3em] text-sand-400">
          Prochaine séance
        </p>
        {nextSession ? (
          <>
            <p className="mt-3 font-serif text-2xl capitalize text-sand-50">
              {fmtSession.format(new Date(nextSession.scheduled_at))}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-sand-400">
              <span>{nextSession.duration_min} min</span>
              {nextSession.location && <span>{nextSession.location}</span>}
            </div>
            <Link
              href="/os/client/seances"
              className="mt-5 inline-block text-xs text-sand-500 transition-colors hover:text-sand-300"
            >
              Voir toutes mes séances →
            </Link>
          </>
        ) : (
          <>
            <p className="mt-3 text-sand-400">Aucune séance planifiée.</p>
            {coach?.calcom_url && (
              <a
                href={coach.calcom_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block text-xs text-sand-400 transition-colors hover:text-sand-200"
              >
                Réserver une séance →
              </a>
            )}
          </>
        )}
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-taupe-300/40 bg-white p-5">
          <p className="text-xs uppercase tracking-wider text-taupe-400">
            Séances
          </p>
          {pack ? (
            <>
              <p className="mt-2 font-serif text-3xl text-ink-900">
                {pack.remaining}
                <span className="font-sans text-base font-normal text-taupe-400">
                  /{pack.total}
                </span>
              </p>
              <p className="mt-1 truncate text-xs text-taupe-500">
                {pack.offer_label}
              </p>
            </>
          ) : (
            <p className="mt-2 font-serif text-3xl text-taupe-300">—</p>
          )}
        </div>

        <div className="rounded-2xl border border-taupe-300/40 bg-white p-5">
          <p className="text-xs uppercase tracking-wider text-taupe-400">
            Objectifs
          </p>
          <p className="mt-2 font-serif text-3xl text-ink-900">
            {activeGoals.length}
          </p>
          <p className="mt-1 text-xs text-taupe-500">
            {activeGoals.length === 1 ? "actif" : "actifs"}
          </p>
        </div>

        <div className="col-span-2 rounded-2xl border border-taupe-300/40 bg-white p-5 sm:col-span-1">
          <p className="text-xs uppercase tracking-wider text-taupe-400">
            Dernier relevé
          </p>
          {lastMeasure ? (
            <>
              <p className="mt-2 font-serif text-3xl text-ink-900">
                {lastMeasure.weight_kg ?? "—"}
                {lastMeasure.weight_kg && (
                  <span className="font-sans text-base font-normal text-taupe-400">
                    {" "}
                    kg
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-taupe-500">
                {new Intl.DateTimeFormat("fr-FR", {
                  day: "numeric",
                  month: "long",
                }).format(new Date(lastMeasure.measured_at))}
              </p>
            </>
          ) : (
            <p className="mt-2 font-serif text-3xl text-taupe-300">—</p>
          )}
        </div>
      </div>

      {/* Objectifs actifs */}
      {activeGoals.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
              Mes objectifs
            </p>
            <Link
              href="/os/client/objectifs"
              className="text-xs text-taupe-400 hover:text-ink-900"
            >
              Voir tout →
            </Link>
          </div>
          <div className="space-y-2">
            {activeGoals.slice(0, 3).map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-xl border border-taupe-300/40 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-taupe-600" />
                  <p className="text-sm font-medium text-ink-900">{g.title}</p>
                </div>
                {g.target_date && (
                  <p className="shrink-0 text-xs text-taupe-400">
                    {new Intl.DateTimeFormat("fr-FR", {
                      day: "numeric",
                      month: "short",
                    }).format(new Date(g.target_date))}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions coach */}
      {coach && (coach.calcom_url || coach.sumup_url) && (
        <div className="mb-6 flex flex-wrap gap-3">
          {coach.calcom_url && (
            <a
              href={coach.calcom_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-taupe-300/40 bg-white px-4 py-3 text-sm font-medium text-taupe-700 transition-all hover:-translate-y-0.5 hover:shadow-sm"
            >
              Réserver une séance →
            </a>
          )}
          {coach.sumup_url && (
            <a
              href={coach.sumup_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-taupe-300/40 bg-white px-4 py-3 text-sm font-medium text-taupe-700 transition-all hover:-translate-y-0.5 hover:shadow-sm"
            >
              Payer en ligne →
            </a>
          )}
        </div>
      )}

      {/* Navigation rapide */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Mes séances", href: "/os/client/seances" },
          { label: "Mes mesures", href: "/os/client/mesures" },
          { label: "Questionnaire", href: "/os/client/questionnaire" },
          { label: "Mon profil", href: "/os/client/profil" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-2xl border border-taupe-300/40 bg-white px-4 py-3 text-center text-sm font-medium text-taupe-700 transition-all hover:-translate-y-0.5 hover:border-taupe-400/60 hover:text-ink-900 hover:shadow-sm"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </OsShell>
  );
}
