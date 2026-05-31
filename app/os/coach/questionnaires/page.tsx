import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { OsShell } from "@/app/os/_components/OsShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Questionnaires · Coach",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<string, string> = {
  soumis: "Soumis",
  en_attente: "En attente",
  relu: "Lu",
};
const STATUS_CLS: Record<string, string> = {
  soumis: "bg-emerald-50 text-emerald-800",
  en_attente: "bg-sand-100 text-taupe-600",
  relu: "bg-taupe-100 text-taupe-500",
};
const STATUS_ORDER: Record<string, number> = {
  soumis: 0,
  en_attente: 1,
  relu: 2,
};

export default async function CoachQuestionnairesPage() {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("questionnaires")
    .select("*, profiles!questionnaires_client_id_fkey(display_name)")
    .eq("coach_id", profile.id)
    .order("submitted_at", { ascending: false, nullsFirst: false });

  type QRow = {
    id: string;
    client_id: string;
    status: string;
    submitted_at: string | null;
    profiles: { display_name: string } | null;
  };

  const rows = ((data ?? []) as QRow[]).sort(
    (a, b) =>
      (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9),
  );

  return (
    <OsShell profile={profile} title="Questionnaires">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
          Cabinet OS
        </p>
        <h2 className="mt-1 font-serif text-2xl text-ink-900">
          Questionnaires
        </h2>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-12 text-center">
          <p className="text-sm text-taupe-500">
            Aucun questionnaire pour l&apos;instant.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-taupe-300/40 bg-white">
          <ul className="divide-y divide-taupe-300/20">
            {rows.map((q) => (
              <li
                key={q.id}
                className="flex items-center justify-between gap-4 px-6 py-4"
              >
                <div>
                  <p className="font-medium text-ink-900">
                    {q.profiles?.display_name ?? "Client"}
                  </p>
                  {q.submitted_at && (
                    <p className="text-xs text-taupe-500">
                      Soumis le{" "}
                      {new Intl.DateTimeFormat("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }).format(new Date(q.submitted_at))}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLS[q.status] ?? "bg-sand-100 text-taupe-600"}`}
                  >
                    {STATUS_LABEL[q.status] ?? q.status}
                  </span>
                  <Link
                    href={`/os/coach/clients/${q.client_id}?tab=questionnaire`}
                    className="text-xs text-taupe-600 transition-colors hover:text-ink-900"
                  >
                    Voir →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </OsShell>
  );
}
