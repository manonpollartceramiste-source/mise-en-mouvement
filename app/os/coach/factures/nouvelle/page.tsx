import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getQuoteById, getPrestations } from "@/lib/billing/server";
import { OsShell } from "@/app/os/_components/OsShell";
import { BillingForm } from "@/app/os/coach/_components/BillingForm";
import { createInvoiceAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Nouvelle facture · Coach",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ from_quote?: string }>;

export default async function NouvelleFacturePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const { from_quote } = await searchParams;

  // Pré-remplir depuis un devis accepté
  let defaultValues: Record<string, unknown> = {};
  if (from_quote) {
    const quote = await getQuoteById(from_quote);
    if (quote && ((profile.roles ?? []).includes("admin") || quote.coach_id === profile.id)) {
      defaultValues = {
        client_name: quote.client_name,
        client_email: quote.client_email,
        client_phone: quote.client_phone,
        client_address: quote.client_address,
        line_items: quote.line_items,
        discount_pct: quote.discount_pct,
        discount_amount: quote.discount_amount,
        notes: quote.notes,
        quote_id: quote.id,
      };
    }
  }

  const prestations = await getPrestations(profile.id);

  return (
    <OsShell profile={profile} title="Nouvelle facture">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-taupe-400">
          Factures
        </p>
        <h2 className="mt-1 font-serif text-3xl text-ink-900">
          Nouvelle facture
        </h2>
        {from_quote && (
          <p className="mt-1 text-sm text-taupe-500">
            Pré-remplie depuis le devis associé.
          </p>
        )}
      </div>

      <div className="max-w-3xl">
        <BillingForm
          mode="invoice"
          action={createInvoiceAction}
          submitLabel="Créer la facture"
          defaultValues={defaultValues as Parameters<typeof BillingForm>[0]["defaultValues"]}
          prestations={prestations}
        />
      </div>
    </OsShell>
  );
}
