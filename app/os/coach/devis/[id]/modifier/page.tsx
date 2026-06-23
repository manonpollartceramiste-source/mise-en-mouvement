import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getQuoteById } from "@/lib/billing/server";
import { OsShell } from "@/app/os/_components/OsShell";
import { BillingForm } from "@/app/os/coach/_components/BillingForm";
import { updateQuoteAction } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Modifier devis · Coach",
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

export default async function ModifierDevisPage({ params }: { params: Params }) {
  const { id } = await params;

  let profile;
  try {
    profile = await getOsProfileWithRole("coach");
  } catch (err) {
    console.error("[QUOTE_DETAIL_ERROR] modifier getOsProfileWithRole", err);
    redirect("/os/login");
  }
  if (!profile) redirect("/os/login");

  let quote;
  try {
    quote = await getQuoteById(id);
  } catch (err) {
    console.error("[QUOTE_DETAIL_ERROR] modifier getQuoteById", err);
    redirect("/os/coach/devis");
  }
  if (!quote) notFound();

  const isAdmin = (profile.roles ?? []).includes("admin");
  if (!isAdmin && quote.coach_id !== profile.id) notFound();

  return (
    <OsShell profile={profile} title={`Modifier ${quote.number ?? ""}`}>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-taupe-400">
          Devis / Modifier
        </p>
        <h2 className="mt-1 font-serif text-3xl text-ink-900">
          Modifier le devis {quote.number ?? ""}
        </h2>
      </div>

      <div className="max-w-3xl">
        <BillingForm
          mode="quote"
          editId={quote.id}
          action={updateQuoteAction}
          submitLabel="Enregistrer les modifications"
          defaultValues={{
            client_name: quote.client_name ?? "",
            client_email: quote.client_email ?? "",
            client_phone: quote.client_phone ?? "",
            client_address: quote.client_address ?? "",
            title: quote.title ?? "",
            description: quote.description ?? "",
            line_items: Array.isArray(quote.line_items) ? quote.line_items : [],
            discount_pct: quote.discount_pct ?? 0,
            discount_amount: quote.discount_amount ?? 0,
            notes: quote.notes ?? "",
            conditions: quote.conditions ?? "",
            validity_days: quote.validity_days ?? 30,
          }}
        />
      </div>
    </OsShell>
  );
}
