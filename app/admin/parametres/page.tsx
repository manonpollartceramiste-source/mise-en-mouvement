import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { loadSettings } from "@/lib/content/settings.server";
import { AdminShell, FlashMessages } from "../_components/AdminShell";
import { Field, SubmitButton, Textarea } from "../_components/Fields";
import { saveSettings } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · Paramètres généraux",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/admin/login?error=supabase-missing");
  }
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const settings = await loadSettings();
  const params = await searchParams;

  return (
    <AdminShell
      title="Paramètres généraux"
      intro="Identité, contact, réseaux et éléments globaux du site. Ces informations alimentent le header, le footer, la page contact, les mentions légales et les boutons CTA."
    >
      <FlashMessages saved={params.saved} error={params.error} />

      <form
        action={saveSettings}
        className="space-y-8 rounded-2xl border border-taupe-300/40 bg-white p-6"
      >
        <Section title="Identité">
          <Field
            label="Nom de l'entreprise / cabinet"
            name="companyName"
            required
            defaultValue={settings.companyName}
          />
          <Field
            label="Slogan court"
            name="tagline"
            defaultValue={settings.tagline}
          />
        </Section>

        <Section title="Contact">
          <Field
            label="Email principal"
            name="email"
            type="email"
            required
            defaultValue={settings.email}
          />
          <Field
            label="Téléphone principal"
            name="phone"
            defaultValue={settings.phone}
          />
          <Textarea
            label="Adresse complète"
            name="address"
            rows={2}
            defaultValue={settings.address}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Code postal"
              name="postalCode"
              defaultValue={settings.postalCode}
            />
            <Field
              label="Ville"
              name="city"
              defaultValue={settings.city}
            />
          </div>
          <Field
            label="Lien Google Maps (optionnel)"
            name="googleMapsUrl"
            type="url"
            defaultValue={settings.googleMapsUrl}
            placeholder="https://maps.google.com/..."
          />
        </Section>

        <Section title="Réseaux sociaux (optionnel)">
          <Field
            label="Instagram"
            name="instagramUrl"
            type="url"
            defaultValue={settings.instagramUrl}
            placeholder="https://instagram.com/..."
          />
          <Field
            label="Facebook"
            name="facebookUrl"
            type="url"
            defaultValue={settings.facebookUrl}
            placeholder="https://facebook.com/..."
          />
        </Section>

        <Section title="Bouton d'appel principal (CTA)">
          <Field
            label="Texte du bouton CTA principal"
            name="ctaText"
            required
            defaultValue={settings.ctaText}
          />
          <Field
            label="Lien du bouton CTA principal"
            name="ctaUrl"
            required
            defaultValue={settings.ctaUrl}
            placeholder="/reservation"
          />
        </Section>

        <Section title="Footer">
          <Textarea
            label="Texte footer (sous le nom)"
            name="footerText"
            rows={2}
            defaultValue={settings.footerText}
          />
          <Field
            label="Copyright (utilisez {year} et {companyName})"
            name="copyright"
            defaultValue={settings.copyright}
          />
        </Section>

        <div className="flex justify-end">
          <SubmitButton>Enregistrer →</SubmitButton>
        </div>
      </form>
    </AdminShell>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl text-ink-900">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
