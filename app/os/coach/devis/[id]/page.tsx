import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getQuoteById } from "@/lib/billing/server";
import { OsShell } from "@/app/os/_components/OsShell";
import { DeleteButton } from "@/app/os/coach/_components/DeleteButton";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_COLORS,
  fmtEur,
} from "@/lib/billing/types";
import {
  updateQuoteStatusAction,
  deleteQuoteAction,
  createInvoiceFromQuoteAction,
} from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Devis · Coach",
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

export default async function DevisDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  let profile;
  try {
    profile = await getOsProfileWithRole("coach");
  } catch (err) {
    console.error("[QUOTE_DETAIL_ERROR] getOsProfileWithRole", err);
    return <ErrorPage />;
  }
  if (!profile) redirect("/os/login");

  let quote;
  try {
    quote = await getQuoteById(id);
  } catch (err) {
    console.error("[QUOTE_DETAIL_ERROR] getQuoteById", err);
    return (
      <OsShell profile={profile} title="Erreur">
        <ErrorPage />
      </OsShell>
    );
  }

  if (!quote) notFound();

  const isAdmin = (profile.roles ?? []).includes("admin");
  if (!isAdmin && quote.coach_id !== profile.id) notFound();

  const status = quote.status ?? "brouillon";
  const statusColor = QUOTE_STATUS_COLORS[status] ?? "bg-sand-200 text-taupe-700";
  const statusLabel = QUOTE_STATUS_LABELS[status] ?? status;

  const issuedDate = quote.issued_at
    ? new Date(quote.issued_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "—";
  const expiresDate = quote.expires_at
    ? new Date(quote.expires_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  const lineItems = Array.isArray(quote.line_items) ? quote.line_items : [];

  return (
    <OsShell profile={profile} title={`Devis ${quote.number ?? ""}`}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/os/coach/devis"
              className="text-xs text-taupe-500 hover:text-ink-900"
            >
              ← Devis
            </Link>
            <span className="font-mono text-sm text-taupe-600">{quote.number ?? "—"}</span>
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <h2 className="mt-2 font-serif text-3xl text-ink-900">
            {quote.title || quote.client_name || "Devis sans titre"}
          </h2>
          <p className="mt-1 text-sm text-taupe-500">
            Émis le {issuedDate} · Expire le {expiresDate}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/api/pdf/devis/${quote.id}?preview=1`}
            target="_blank"
            className="rounded-xl border border-taupe-300/50 px-4 py-2 text-sm font-medium text-ink-900 transition-colors hover:bg-sand-100"
          >
            Prévisualiser PDF
          </Link>
          <a
            href={`/api/pdf/devis/${quote.id}`}
            className="rounded-xl border border-taupe-300/50 px-4 py-2 text-sm font-medium text-ink-900 transition-colors hover:bg-sand-100"
          >
            Télécharger PDF
          </a>
          <Link
            href={`/os/coach/devis/${quote.id}/modifier`}
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
              <Row label="Nom" value={quote.client_name} />
              <Row label="Email" value={quote.client_email} />
              <Row label="Téléphone" value={quote.client_phone} />
              <Row label="Adresse" value={quote.client_address} />
            </dl>
          </div>

          {/* Lignes de prestation */}
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

            {/* Totaux */}
            <div className="mt-6 rounded-xl bg-ink-900 px-5 py-4 text-sand-50">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-sand-300">Total HT</span>
                  <span>{fmtEur(quote.subtotal_ht)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sand-300">TVA</span>
                  <span>{fmtEur(quote.total_tva)}</span>
                </div>
                <div className="flex justify-between border-t border-sand-50/20 pt-2 text-base font-semibold">
                  <span>Total TTC</span>
                  <span>{fmtEur(quote.total_ttc)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes & conditions */}
          {(quote.notes || quote.conditions) && (
            <div className="rounded-2xl border border-taupe-300/40 bg-white p-6">
              {quote.conditions && (
                <div className="mb-4">
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-taupe-500">
                    Conditions
                  </h4>
                  <p className="text-sm text-taupe-700">{quote.conditions}</p>
                </div>
              )}
              {quote.notes && (
                <div>
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-taupe-500">
                    Notes
                  </h4>
                  <p className="text-sm text-taupe-700">{quote.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Colonne droite — Actions */}
        <div className="space-y-4">
          {/* Changer le statut */}
          <div className="rounded-2xl border border-taupe-300/40 bg-white p-5">
            <h3 className="mb-4 text-sm font-medium text-ink-900">Statut du devis</h3>
            <div className="space-y-2">
              {(["brouillon", "envoyé", "accepté", "refusé", "expiré"] as const).map((s) => (
                <form key={s} action={updateQuoteStatusAction}>
                  <input type="hidden" name="id" value={quote.id} />
                  <input type="hidden" name="status" value={s} />
                  <button
                    type="submit"
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                      status === s
                        ? "border-ink-900 bg-ink-900 text-sand-50"
                        : "border-taupe-300/40 text-taupe-700 hover:border-taupe-400 hover:text-ink-900"
                    }`}
                  >
                    {QUOTE_STATUS_LABELS[s]}
                  </button>
                </form>
              ))}
            </div>
          </div>

          {/* Créer une facture depuis ce devis */}
          {status === "accepté" && (
            <div className="rounded-2xl border border-taupe-300/40 bg-white p-5">
              <h3 className="mb-2 text-sm font-medium text-ink-900">Convertir en facture</h3>
              <p className="mb-4 text-xs text-taupe-500">
                Les lignes du devis seront reprises automatiquement.
              </p>
              <form action={createInvoiceFromQuoteAction}>
                <input type="hidden" name="quote_id" value={quote.id} />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-taupe-700 px-4 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-ink-900"
                >
                  Créer la facture
                </button>
              </form>
            </div>
          )}

          {/* Supprimer */}
          <div className="rounded-2xl border border-red-100 bg-white p-5">
            <h3 className="mb-2 text-sm font-medium text-ink-900">Supprimer</h3>
            <p className="mb-4 text-xs text-taupe-500">Cette action est irréversible.</p>
            <form action={deleteQuoteAction}>
              <input type="hidden" name="id" value={quote.id} />
              <DeleteButton
                confirmMessage="Supprimer ce devis ?"
                className="w-full rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
              >
                Supprimer le devis
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
          Impossible de charger ce devis. Réessayez ou contactez le support.
        </p>
        <a href="/os/coach/devis" className="text-sm text-taupe-600 hover:text-ink-900">
          ← Retour aux devis
        </a>
      </div>
    </div>
  );
}
