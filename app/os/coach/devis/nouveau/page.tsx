import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { OsShell } from "@/app/os/_components/OsShell";
import { BillingForm } from "@/app/os/coach/_components/BillingForm";
import { createQuoteAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Nouveau devis · Coach",
  robots: { index: false, follow: false },
};

export default async function NouveauDevisPage() {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  return (
    <OsShell profile={profile} title="Nouveau devis">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-taupe-400">
          Devis
        </p>
        <h2 className="mt-1 font-serif text-3xl text-ink-900">
          Nouveau devis
        </h2>
        <p className="mt-1 text-sm text-taupe-500">
          Créez un devis premium pour votre client.
        </p>
      </div>

      <div className="max-w-3xl">
        <BillingForm
          mode="quote"
          action={createQuoteAction}
          submitLabel="Créer le devis"
        />
      </div>
    </OsShell>
  );
}
