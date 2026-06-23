import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getInvoiceById } from "@/lib/billing/server";
import { OsShell } from "@/app/os/_components/OsShell";
import { DeleteButton } from "@/app/os/coach/_components/DeleteButton";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  fmtEur,
} from "@/lib/billing/types";
import { updateInvoiceStatusAction, deleteInvoiceAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Facture · Coach",
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

export default async function FactureDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  let profile;
  try {
    profile = await getOsProfileWithRole("coach");
  } catch (err) {
    console.error("[FACTURE_DETAIL_ERROR] getOsProfileWithRole", err);
    return <ErrorPage />;
  }
  if (!profile) redirect("/os/login");

  let invoice;
  try {
    invoice = await getInvoiceById(id);
  } catch (err) {
    console.error("[FACTURE_DETAIL_ERROR] getInvoiceById", err);
    return (
      <OsShell profile={profile} title="Erreur">
        <ErrorPage />
      </OsShell>
    );
  }

  if (!invoice) notFound();

  const isAdmin = (profile.roles ?? []).includes("admin");
  if (!isAdmin && invoice.coach_id !== profile.id) notFound();

  const status = invoice.status ?? "brouillon";
  const statusColor = INVOICE_STATUS_COLORS[status] ?? "bg-sand-200 text-taupe-700";
  const statusLabel = INVOICE_STATUS_LABELS[status] ?? status;

  const issuedDate = invoice.issued_at
    ? new Date(invoice.issued_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "—";
  const dueDate = invoice.due_at
    ? new Date(invoice.due_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  const lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : [];

  return (
    <OsShell profile={profile} title={`Facture ${invoice.number ?? ""}`}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/os/coach/factures"
              className="text-xs text-taupe-500 hover:text-ink-900"
            >
              ← Factures
            </Link>
            <span className="font-mono text-sm text-taupe-600">{invoice.number ?? "—"}</span>
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <h2 className="mt-2 font-serif text-3xl text-ink-900">
            {invoice.client_name || "Facture"}
          </h2>
          <p className="mt-1 text-sm text-taupe-500">
            Émise le {issuedDate} · Échéance le {dueDate}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/api/pdf/facture/${invoice.id}?preview=1`}
            target="_blank"
            className="rounded-xl border border-taupe-300/50 px-4 py-2 text-sm font-medium text-ink-900 transition-colors hover:bg-sand-100"
          >
            Prévisualiser PDF
          </Link>
          <a
            href={`/api/pdf/facture/${invoice.id}`}
            className="rounded-xl border border-taupe-300/50 px-4 py-2 text-sm font-medium text-ink-900 transition-colors hover:bg-sand-100"
          >
            Télécharger PDF
          </a>
          <Link
            href={`/os/coach/factures/${invoice.id}/modifier`}
            className="rounded-xl bg-ink-900 px-4 py-2 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-700"
          >
            Modifier
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          {/* Info client */}
          <div className="rounded-2xl border border-taupe-300/40 bg-white p-6">
            <h3 className="mb-4 font-serif text-lg text-ink-900">Client</h3>
            <dl className="space-y-2 text-sm">
              <Row label="Nom" value={invoice.client_name} />
              <Row label="Email" value={invoice.client_email} />
              <Row label="Téléphone" value={invoice.client_phone} />
              <Row label="Adresse" value={invoice.client_address} />
              {invoice.payment_method && (
                <Row label="Paiement" value={invoice.payment_method} />
              )}
            </dl>
          </div>

          {/* Lignes */}
          <div className="rounded-2xl border border-taupe-300/40 bg-white p-6">
            <h3 className="mb-4 font-serif text-lg text-ink-900">Prestations</h3>

            {lineItems.length === 0 ? (
              <p className="py-4 text-center text-sm text-taupe-400">Aucune prestation ajoutée</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-taupe-300/30 text-left text-xs text-taupe-500">
                      <th className="pb-2.5 font-medium">Prestation</th>
                      <th className="pb-2.5 text-right font-medium">Qté</th>
                      <th className="pb-2.5 text-right font-medium">PU HT</th>
                      <th className="pb-2.5 text-right font-medium">TVA</th>
                      <th className="pb-2.5 text-right font-medium">Total HT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-taupe-300/20">
                    {lineItems.map((item, i) => (
                      <tr key={item.id ?? i}>
                        <td className="py-3">
                          <p className="font-medium text-ink-900">{item.name || "—"}</p>
                          {item.description && (
                            <p className="mt-0.5 text-xs text-taupe-500">{item.description}</p>
                          )}
                        </td>
                        <td className="py-3 text-right text-taupe-600">{item.quantity ?? 0}</td>
                        <td className="py-3 text-right text-taupe-600">{fmtEur(item.unit_price)}</td>
                        <td className="py-3 text-right text-taupe-600">{item.tva_pct ?? 0}%</td>
                        <td className="py-3 text-right font-medium text-ink-900">{fmtEur(item.total_ht)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 rounded-xl bg-ink-900 px-5 py-4 text-sand-50">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-sand-300">Total HT</span>
                  <span>{fmtEur(invoice.subtotal_ht)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sand-300">TVA</span>
                  <span>{fmtEur(invoice.total_tva)}</span>
                </div>
                <div className="flex justify-between border-t border-sand-50/20 pt-2 text-base font-semibold">
                  <span>Total TTC</span>
                  <span>{fmtEur(invoice.total_ttc)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes + mentions */}
          {(invoice.notes || invoice.legal_mentions) && (
            <div className="rounded-2xl border border-taupe-300/40 bg-white p-6 space-y-4">
              {invoice.legal_mentions && (
                <div>
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-taupe-500">
                    Mentions légales
                  </h4>
                  <p className="text-sm text-taupe-700">{invoice.legal_mentions}</p>
                </div>
              )}
              {invoice.notes && (
                <div>
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-taupe-500">
                    Notes
                  </h4>
                  <p className="text-sm text-taupe-700">{invoice.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div className="space-y-4">
          {/* Statut */}
          <div className="rounded-2xl border border-taupe-300/40 bg-white p-5">
            <h3 className="mb-4 text-sm font-medium text-ink-900">Statut de la facture</h3>
            <div className="space-y-2">
              {(["brouillon", "envoyée", "payée", "en_retard", "annulée"] as const).map((s) => (
                <form key={s} action={updateInvoiceStatusAction}>
                  <input type="hidden" name="id" value={invoice.id} />
                  <input type="hidden" name="status" value={s} />
                  <button
                    type="submit"
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                      status === s
                        ? "border-ink-900 bg-ink-900 text-sand-50"
                        : "border-taupe-300/40 text-taupe-700 hover:border-taupe-400 hover:text-ink-900"
                    }`}
                  >
                    {INVOICE_STATUS_LABELS[s]}
                  </button>
                </form>
              ))}
            </div>
          </div>

          {/* Devis associé */}
          {invoice.quote_id && (
            <div className="rounded-2xl border border-taupe-300/40 bg-white p-5">
              <h3 className="mb-2 text-sm font-medium text-ink-900">Devis associé</h3>
              <Link
                href={`/os/coach/devis/${invoice.quote_id}`}
                className="text-sm text-taupe-600 hover:text-ink-900"
              >
                Voir le devis →
              </Link>
            </div>
          )}

          {/* Supprimer */}
          <div className="rounded-2xl border border-red-100 bg-white p-5">
            <h3 className="mb-2 text-sm font-medium text-ink-900">Supprimer</h3>
            <p className="mb-4 text-xs text-taupe-500">Cette action est irréversible.</p>
            <form action={deleteInvoiceAction}>
              <input type="hidden" name="id" value={invoice.id} />
              <DeleteButton
                confirmMessage="Supprimer cette facture ?"
                className="w-full rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
              >
                Supprimer la facture
              </DeleteButton>
            </form>
          </div>
        </div>
      </div>
    </OsShell>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-taupe-500">{label}</dt>
      <dd className="text-ink-900">{value || "Non renseigné"}</dd>
    </div>
  );
}

function ErrorPage() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="mb-3 font-serif text-2xl text-ink-900">Une erreur est survenue</h1>
        <p className="mb-6 text-sm text-taupe-600">
          Impossible de charger cette facture. Réessayez ou contactez le support.
        </p>
        <a href="/os/coach/factures" className="text-sm text-taupe-600 hover:text-ink-900">
          ← Retour aux factures
        </a>
      </div>
    </div>
  );
}
