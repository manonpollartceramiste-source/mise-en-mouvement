import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { loadTexts } from "@/lib/content/texts.server";
import { textFieldLabels, type SiteTexts } from "@/lib/content/texts";
import { AdminShell, FlashMessages } from "../_components/AdminShell";
import { Field, SubmitButton, Textarea } from "../_components/Fields";
import { saveTexts } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · Textes",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ saved?: string; error?: string }>;

const longFields: (keyof SiteTexts)[] = [
  "heroSubtitle",
  "approcheBody",
  "pilier1Body",
  "pilier2Body",
  "pilier3Body",
  "ctaFinalBody",
  "contactIntro",
  "contactBookingText",
  "reservationIntro",
];

export default async function AdminContenusPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/admin/login?error=supabase-missing");
  }
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const texts = await loadTexts();
  const params = await searchParams;
  const keys = Object.keys(textFieldLabels) as (keyof SiteTexts)[];

  return (
    <AdminShell
      title="Textes du site"
      intro="Modifie les textes de la page d’accueil. Le titre du hero est découpé en 3 morceaux pour respecter la mise en italique."
    >
      <FlashMessages saved={params.saved} error={params.error} />

      <form
        action={saveTexts}
        className="space-y-5 rounded-2xl border border-taupe-300/40 bg-white p-6"
      >
        {keys.map((k) =>
          longFields.includes(k) ? (
            <Textarea
              key={k}
              label={textFieldLabels[k]}
              name={k}
              defaultValue={texts[k]}
              rows={4}
            />
          ) : (
            <Field
              key={k}
              label={textFieldLabels[k]}
              name={k}
              defaultValue={texts[k]}
            />
          ),
        )}
        <div className="flex justify-end pt-2">
          <SubmitButton>Enregistrer les textes →</SubmitButton>
        </div>
      </form>
    </AdminShell>
  );
}
