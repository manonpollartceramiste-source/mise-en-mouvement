import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getOsProfileWithRole,
  getCoachClients,
  getAllActiveClients,
  getCoachAssessments,
  getAllAssessments,
} from "@/lib/supabase/os-server";
import { OsShell } from "@/app/os/_components/OsShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Bilan Mouvement · Coach",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ client?: string }>;

export default async function BilanMouvementPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const { client: clientFilter } = await searchParams;
  const isAdmin = profile.roles.includes("admin");

  const [clients, assessments] = await Promise.all([
    isAdmin ? getAllActiveClients() : getCoachClients(profile.id),
    isAdmin
      ? getAllAssessments(clientFilter)
      : getCoachAssessments(profile.id, clientFilter),
  ]);

  const selectedClient = clientFilter
    ? clients.find((c) => c.id === clientFilter)
    : null;

  return (
    <OsShell profile={profile} title="Bilan Mouvement">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-taupe-400">
            Cabinet OS
          </p>
          <h2 className="mt-1 font-serif text-3xl text-ink-900">
            Bilan Mouvement
          </h2>
          <p className="mt-1 text-sm text-taupe-500">
            {assessments.length} bilan{assessments.length !== 1 ? "s" : ""}
            {selectedClient ? ` — ${selectedClient.display_name}` : ""}
          </p>
        </div>
        <Link
          href={
            clientFilter
              ? `/os/coach/bilan-mouvement/nouveau?client=${clientFilter}`
              : `/os/coach/bilan-mouvement/nouveau`
          }
          className="inline-flex items-center gap-2 rounded-xl bg-ink-900 px-5 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-700"
        >
          + Nouveau bilan
        </Link>
      </div>

      {/* Filtre client */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/os/coach/bilan-mouvement"
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            !clientFilter
              ? "border-ink-900 bg-ink-900 text-sand-50"
              : "border-taupe-300 text-taupe-600 hover:border-ink-900 hover:text-ink-900"
          }`}
        >
          Tous les clients
        </Link>
        {clients.map((c) => (
          <Link
            key={c.id}
            href={`/os/coach/bilan-mouvement?client=${c.id}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              clientFilter === c.id
                ? "border-ink-900 bg-ink-900 text-sand-50"
                : "border-taupe-300 text-taupe-600 hover:border-ink-900 hover:text-ink-900"
            }`}
          >
            {c.display_name}
          </Link>
        ))}
      </div>

      {assessments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-16 text-center">
          <p className="font-serif text-2xl text-ink-900">Aucun bilan</p>
          <p className="mt-3 text-sm text-taupe-500">
            {selectedClient
              ? `Aucun bilan pour ${selectedClient.display_name}.`
              : "Aucun bilan mouvement enregistré."}
          </p>
          <Link
            href={
              clientFilter
                ? `/os/coach/bilan-mouvement/nouveau?client=${clientFilter}`
                : `/os/coach/bilan-mouvement/nouveau`
            }
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink-900 px-5 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-700"
          >
            + Créer le premier bilan
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assessments.map((a) => {
            const total =
              (a.mobility_score ?? 0) +
              (a.stability_score ?? 0) +
              (a.strength_score ?? 0) +
              (a.posture_score ?? 0) +
              (a.coordination_score ?? 0);
            const hasScores =
              a.mobility_score !== null ||
              a.stability_score !== null ||
              a.strength_score !== null ||
              a.posture_score !== null ||
              a.coordination_score !== null;
            const date = new Date(a.assessed_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });

            return (
              <Link
                key={a.id}
                href={`/os/coach/bilan-mouvement/${a.id}`}
                className="group rounded-2xl border border-taupe-300/40 bg-white p-5 transition-all hover:border-taupe-400/60 hover:shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink-900">
                      {a.client_display_name}
                    </p>
                    <p className="mt-0.5 text-xs text-taupe-500">{date}</p>
                  </div>
                  {hasScores && (
                    <div className="shrink-0 rounded-xl bg-ink-900 px-3 py-1.5 text-center">
                      <p className="text-lg font-semibold leading-none text-sand-50">
                        {total}
                      </p>
                      <p className="text-[9px] uppercase tracking-wider text-sand-300">
                        /100
                      </p>
                    </div>
                  )}
                </div>

                {hasScores && (
                  <div className="mb-3 grid grid-cols-5 gap-1">
                    {[
                      { label: "Mob", value: a.mobility_score },
                      { label: "Stab", value: a.stability_score },
                      { label: "Force", value: a.strength_score },
                      { label: "Post", value: a.posture_score },
                      { label: "Coord", value: a.coordination_score },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center">
                        <div className="h-1.5 rounded-full bg-sand-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-taupe-600"
                            style={{ width: `${((value ?? 0) / 20) * 100}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[9px] text-taupe-400">
                          {label}
                        </p>
                        <p className="text-[10px] font-medium text-taupe-600">
                          {value ?? "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {a.main_goal && (
                  <p className="line-clamp-2 text-xs text-taupe-600">
                    {a.main_goal}
                  </p>
                )}

                <p className="mt-3 text-xs font-medium text-taupe-400 transition-colors group-hover:text-taupe-600">
                  Voir le bilan →
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </OsShell>
  );
}
