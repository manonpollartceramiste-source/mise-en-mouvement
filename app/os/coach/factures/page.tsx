import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getInvoices, getAllInvoices } from "@/lib/billing/server";
import { OsShell } from "@/app/os/_components/OsShell";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  fmtEur,
} from "@/lib/billing/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Factures · Coach",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ deleted?: string; saved?: string; error?: string }>;

export default async function FacturesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const { deleted, saved, error } = await searchParams;
  const isAdmin = (profile.roles ?? []).includes("admin");
  const invoices = isAdmin ? await getAllInvoices() : await getInvoices(profile.id);

  return (
    <OsShell profile={profile} title="Factures">
      {deleted && (
        <div className="mb-5 rounded-xl bg-sand-100 px-5 py-3 text-sm text-taupe-700">
          Facture supprimée.
        </div>
      )}
      {saved && (
        <div className="mb-5 rounded-xl bg-green-50 px-5 py-3 text-sm text-green-700">
          Facture enregistrée.
        </div>
      )}
      {error === "creation" && (
        <div className="mb-5 rounded-xl bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
          Erreur lors de la création de la facture. Réessayez.
        </div>
      )}

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-taupe-400">Cabinet OS</p>
          <h2 className="mt-1 font-serif text-3xl text-ink-900">Factures</h2>
          <p className="mt-1 text-sm text-taupe-500">
            {invoices.length} facture{invoices.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/os/coach/factures/nouvelle"
          className="inline-flex items-center gap-2 rounded-xl bg-ink-900 px-5 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-700"
        >
          + Nouvelle facture
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-16 text-center">
          <p className="font-serif text-2xl text-ink-900">Aucune facture</p>
          <p className="mt-3 text-sm text-taupe-500">
            Créez votre première facture ou convertissez un devis accepté.
          </p>
          <Link
            href="/os/coach/factures/nouvelle"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink-900 px-5 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-700"
          >
            + Créer une facture
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-taupe-300/40 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-taupe-300/30 bg-sand-50">
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-taupe-500">Numéro</th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-taupe-500">Client</th>
                <th className="hidden px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-taupe-500 md:table-cell">Date</th>
                <th className="hidden px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-taupe-500 sm:table-cell">Échéance</th>
                <th className="px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-taupe-500">TTC</th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-taupe-500">Statut</th>
                <th className="px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-taupe-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-taupe-300/20">
              {invoices.map((inv) => {
                const href = `/os/coach/factures/${inv.id}`;
                const status = inv.status ?? "brouillon";
                const statusColor = INVOICE_STATUS_COLORS[status] ?? "bg-sand-200 text-taupe-700";
                const statusLabel = INVOICE_STATUS_LABELS[status] ?? status;
                const issuedStr = inv.issued_at
                  ? new Date(inv.issued_at).toLocaleDateString("fr-FR")
                  : "—";
                const dueStr = inv.due_at
                  ? new Date(inv.due_at).toLocaleDateString("fr-FR")
                  : "—";

                return (
                  <tr key={inv.id} className="group transition-colors hover:bg-sand-50/60">
                    <td className="p-0">
                      <Link href={href} className="block px-5 py-4 font-mono text-xs text-taupe-600">
                        {inv.number ?? "—"}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={href} className="block px-5 py-4">
                        <p className="font-medium text-ink-900">{inv.client_name || "—"}</p>
                      </Link>
                    </td>
                    <td className="hidden p-0 md:table-cell">
                      <Link href={href} className="block px-5 py-4 text-taupe-600">
                        {issuedStr}
                      </Link>
                    </td>
                    <td className="hidden p-0 sm:table-cell">
                      <Link href={href} className="block px-5 py-4 text-taupe-600">
                        {dueStr}
                      </Link>
                    </td>
                    <td className="p-0 text-right">
                      <Link href={href} className="block px-5 py-4 font-medium text-ink-900">
                        {fmtEur(inv.total_ttc)}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={href} className="block px-5 py-4">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={href}
                          className="text-xs font-medium text-taupe-600 hover:text-ink-900"
                        >
                          Voir
                        </Link>
                        <Link
                          href={`/os/coach/factures/${inv.id}/modifier`}
                          className="text-xs font-medium text-taupe-600 hover:text-ink-900"
                        >
                          Modifier
                        </Link>
                        <a
                          href={`/api/pdf/facture/${inv.id}?preview=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-taupe-600 hover:text-ink-900"
                        >
                          PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </OsShell>
  );
}
