import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getInvoiceById, getPrestations } from "@/lib/billing/server";
import { OsShell } from "@/app/os/_components/OsShell";
import { BillingForm } from "@/app/os/coach/_components/BillingForm";
import { updateInvoiceAction } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Modifier facture · Coach",
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

export default async function ModifierFacturePage({ params }: { params: Params }) {
  const { id } = await params;

  let profile;
  try {
    profile = await getOsProfileWithRole("coach");
  } catch (err) {
    console.error("[FACTURE_DETAIL_ERROR] modifier getOsProfileWithRole", err);
    redirect("/os/login");
  }
  if (!profile) redirect("/os/login");

  let invoice;
  try {
    invoice = await getInvoiceById(id);
  } catch (err) {
    console.error("[FACTURE_DETAIL_ERROR] modifier getInvoiceById", err);
    redirect("/os/coach/factures");
  }
  if (!invoice) notFound();

  const isAdmin = (profile.roles ?? []).includes("admin");
  if (!isAdmin && invoice.coach_id !== profile.id) notFound();

  const prestations = await getPrestations(profile.id);

  return (
    <OsShell profile={profile} title={`Modifier ${invoice.number ?? ""}`}>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-taupe-400">
          Factures / Modifier
        </p>
        <h2 className="mt-1 font-serif text-3xl text-ink-900">
          Modifier la facture {invoice.number ?? ""}
        </h2>
      </div>

      <div className="max-w-3xl">
        <BillingForm
          mode="invoice"
          editId={invoice.id}
          action={updateInvoiceAction}
          submitLabel="Enregistrer les modifications"
          defaultValues={{
            client_name: invoice.client_name ?? "",
            client_email: invoice.client_email ?? "",
            client_phone: invoice.client_phone ?? "",
            client_address: invoice.client_address ?? "",
            line_items: Array.isArray(invoice.line_items) ? invoice.line_items : [],
            discount_pct: invoice.discount_pct ?? 0,
            discount_amount: invoice.discount_amount ?? 0,
            payment_method: invoice.payment_method ?? "",
            legal_mentions: invoice.legal_mentions ?? "",
            notes: invoice.notes ?? "",
            due_at: invoice.due_at ?? "",
          }}
          prestations={prestations}
        />
      </div>
    </OsShell>
  );
}
