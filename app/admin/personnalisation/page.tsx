import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getSiteSettings, getDiscoverySessionSettings } from "@/lib/billing/server";
import { saveSiteSettingsAction, saveDiscoverySettingsAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Personnalisation · Admin",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ saved?: string; tab?: string }>;

export default async function PersonnalisationPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const { saved, tab } = await searchParams;
  const activeTab = tab ?? "branding";

  const [settings, discovery] = await Promise.all([
    getSiteSettings(),
    getDiscoverySessionSettings(),
  ]);

  return (
    <main className="min-h-screen bg-sand-50">
      <header className="border-b border-taupe-300/30 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <div>
            <Link
              href="/admin"
              className="text-xs text-taupe-500 hover:text-ink-900"
            >
              ← Admin
            </Link>
            <h1 className="mt-1 font-serif text-2xl text-ink-900">
              Personnalisation
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        {saved && (
          <div className="mb-6 rounded-xl bg-green-50 px-5 py-3 text-sm font-medium text-green-700">
            Modifications enregistrées avec succès.
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8 flex gap-2">
          <Link
            href="/admin/personnalisation?tab=branding"
            className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "branding"
                ? "bg-ink-900 text-sand-50"
                : "border border-taupe-300/50 text-taupe-700 hover:bg-sand-100"
            }`}
          >
            Branding PDF
          </Link>
          <Link
            href="/admin/personnalisation?tab=decouverte"
            className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "decouverte"
                ? "bg-ink-900 text-sand-50"
                : "border border-taupe-300/50 text-taupe-700 hover:bg-sand-100"
            }`}
          >
            Séance découverte
          </Link>
        </div>

        {/* Tab: Branding */}
        {activeTab === "branding" && (
          <form action={saveSiteSettingsAction} className="space-y-6">
            <section className="rounded-2xl border border-taupe-300/40 bg-white p-7">
              <h2 className="mb-6 font-serif text-xl text-ink-900">Identité entreprise</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nom entreprise" name="company_name" defaultValue={settings.company_name} />
                <Field label="SIRET" name="siret" defaultValue={settings.siret} />
                <Field label="Adresse" name="address" defaultValue={settings.address} className="sm:col-span-2" />
                <Field label="Ville" name="city" defaultValue={settings.city} />
                <Field label="Code postal" name="postal_code" defaultValue={settings.postal_code} />
                <Field label="Email" name="email" type="email" defaultValue={settings.email} />
                <Field label="Téléphone" name="phone" defaultValue={settings.phone} />
                <Field label="Site web" name="website" defaultValue={settings.website} className="sm:col-span-2" />
              </div>
            </section>

            <section className="rounded-2xl border border-taupe-300/40 bg-white p-7">
              <h2 className="mb-6 font-serif text-xl text-ink-900">Apparence PDF</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="URL du logo (pour les PDFs)" name="logo_url" defaultValue={settings.logo_url} className="sm:col-span-2" placeholder="https://..." />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-taupe-600">Couleur principale</label>
                  <div className="flex items-center gap-3">
                    <input type="color" name="primary_color" defaultValue={settings.primary_color} className="h-10 w-14 cursor-pointer rounded-lg border border-taupe-300/50" />
                    <span className="text-sm text-taupe-600">{settings.primary_color}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-taupe-600">Couleur secondaire</label>
                  <div className="flex items-center gap-3">
                    <input type="color" name="secondary_color" defaultValue={settings.secondary_color} className="h-10 w-14 cursor-pointer rounded-lg border border-taupe-300/50" />
                    <span className="text-sm text-taupe-600">{settings.secondary_color}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-taupe-300/40 bg-white p-7">
              <h2 className="mb-6 font-serif text-xl text-ink-900">Textes PDF</h2>
              <div className="space-y-5">
                <Textarea label="Texte footer PDF" name="pdf_footer_text" defaultValue={settings.pdf_footer_text} rows={2} />
                <Textarea label="Conditions devis (texte par défaut)" name="pdf_quote_conditions" defaultValue={settings.pdf_quote_conditions} rows={3} />
                <Textarea label="Mentions légales factures (texte par défaut)" name="pdf_invoice_mentions" defaultValue={settings.pdf_invoice_mentions} rows={3} />
              </div>
            </section>

            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-ink-900 px-6 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-700"
              >
                Enregistrer le branding
              </button>
            </div>
          </form>
        )}

        {/* Tab: Séance découverte */}
        {activeTab === "decouverte" && (
          <form action={saveDiscoverySettingsAction} className="space-y-6">
            <section className="rounded-2xl border border-taupe-300/40 bg-white p-7">
              <h2 className="mb-6 font-serif text-xl text-ink-900">Présentation</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Titre" name="title" defaultValue={discovery.title} className="sm:col-span-2" />
                <Field label="Sous-titre" name="subtitle" defaultValue={discovery.subtitle} className="sm:col-span-2" />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-taupe-600">Prix (€)</label>
                  <input
                    type="number"
                    name="price"
                    defaultValue={discovery.price}
                    min={0}
                    step={0.01}
                    className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 focus:border-taupe-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-taupe-600">Durée (minutes)</label>
                  <input
                    type="number"
                    name="duration_min"
                    defaultValue={discovery.duration_min}
                    min={1}
                    step={1}
                    className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 focus:border-taupe-500 focus:outline-none"
                  />
                </div>
                <Textarea
                  label="Description"
                  name="description"
                  defaultValue={discovery.description}
                  rows={4}
                  className="sm:col-span-2"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-taupe-300/40 bg-white p-7">
              <h2 className="mb-6 font-serif text-xl text-ink-900">Contenu</h2>
              <div className="space-y-5">
                <Textarea
                  label="Étapes de la séance (une par ligne)"
                  name="session_steps"
                  defaultValue={discovery.session_steps.join("\n")}
                  rows={5}
                  placeholder={"Échange sur votre quotidien\nObservation et analyse…"}
                />
                <Textarea
                  label="Bénéfices (un par ligne)"
                  name="benefits"
                  defaultValue={discovery.benefits.join("\n")}
                  rows={5}
                  placeholder={"Vous comprenez pourquoi vous avez mal\nVous repartez avec un plan concret…"}
                />
                <Field label="Texte du bouton CTA" name="cta_label" defaultValue={discovery.cta_label} />
              </div>
            </section>

            <section className="rounded-2xl border border-taupe-300/40 bg-white p-7">
              <h2 className="mb-6 font-serif text-xl text-ink-900">Médias</h2>
              <div className="space-y-5">
                <Field label="URL image principale" name="image_url" defaultValue={discovery.image_url} placeholder="https://..." />
                <Field label="URL vidéo (optionnel)" name="video_url" defaultValue={discovery.video_url} placeholder="https://..." />
              </div>
            </section>

            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-ink-900 px-6 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-700"
              >
                Enregistrer la séance découverte
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-xs font-medium text-taupe-600">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 placeholder-taupe-400 focus:border-taupe-500 focus:outline-none"
      />
    </div>
  );
}

function Textarea({
  label,
  name,
  defaultValue,
  placeholder,
  rows = 3,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-xs font-medium text-taupe-600">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={rows}
        className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 placeholder-taupe-400 focus:border-taupe-500 focus:outline-none"
      />
    </div>
  );
}
