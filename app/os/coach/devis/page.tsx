import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getQuotes, getAllQuotes } from "@/lib/billing/server";
import { OsShell } from "@/app/os/_components/OsShell";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_COLORS,
  fmtEur,
} from "@/lib/billing/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Devis · Coach",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ deleted?: string; error?: string }>;

export default async function DevisPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const { deleted, error } = await searchParams;
  const isAdmin = profile.roles.includes("admin");
  const quotes = isAdmin
    ? await getAllQuotes()
    : await getQuotes(profile.id);

  return (
    <OsShell profile={profile} title="Devis">
      {deleted && (
        <div className="mb-5 rounded-xl bg-sand-100 px-5 py-3 text-sm text-taupe-700">
          Devis supprimé.
        </div>
      )}
      {error === "creation" && (
        <div className="mb-5 rounded-xl bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
          Erreur lors de la création du devis. Réessayez.
        </div>
      )}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-taupe-400">
            Cabinet OS
          </p>
          <h2 className="mt-1 font-serif text-3xl text-ink-900">Devis</h2>
          <p className="mt-1 text-sm text-taupe-500">
            {quotes.length} devis
          </p>
        </div>
        <Link
          href="/os/coach/devis/nouveau"
          className="inline-flex items-center gap-2 rounded-xl bg-ink-900 px-5 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-700"
        >
          + Nouveau devis
        </Link>
      </div>

      {quotes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-16 text-center">
          <p className="font-serif text-2xl text-ink-900">Aucun devis</p>
          <p className="mt-3 text-sm text-taupe-500">
            Créez votre premier devis premium en quelques secondes.
          </p>
          <Link
            href="/os/coach/devis/nouveau"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink-900 px-5 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-700"
          >
            + Créer un devis
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-taupe-300/40 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-taupe-300/30 bg-sand-50">
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-taupe-500">
                  Numéro
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-taupe-500">
                  Client
                </th>
                <th className="hidden px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-taupe-500 md:table-cell">
                  Date
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-taupe-500">
                  Montant TTC
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-taupe-500">
                  Statut
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-taupe-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-taupe-300/20">
              {quotes.map((q) => (
                <tr key={q.id} className="transition-colors hover:bg-sand-50/50">
                  <td className="px-5 py-4 font-mono text-xs text-taupe-600">
                    {q.number}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-ink-900">{q.client_name || "—"}</p>
                    {q.title && (
                      <p className="mt-0.5 text-xs text-taupe-500 truncate max-w-[180px]">
                        {q.title}
                      </p>
                    )}
                  </td>
                  <td className="hidden px-5 py-4 text-taupe-600 md:table-cell">
                    {new Date(q.issued_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-5 py-4 text-right font-medium text-ink-900">
                    {fmtEur(q.total_ttc)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${QUOTE_STATUS_COLORS[q.status]}`}
                    >
                      {QUOTE_STATUS_LABELS[q.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/os/coach/devis/${q.id}`}
                        className="text-xs font-medium text-taupe-600 hover:text-ink-900"
                      >
                        Voir
                      </Link>
                      <Link
                        href={`/api/pdf/devis/${q.id}?preview=1`}
                        target="_blank"
                        className="text-xs font-medium text-taupe-600 hover:text-ink-900"
                      >
                        PDF
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </OsShell>
  );
}
