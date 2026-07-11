import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isSupabaseConfigured } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/content/settings.server";
import { loadHours } from "@/lib/content/hours.server";
import { dayLabels, type DaySchedule } from "@/lib/content/hours";
import { AdminShell, FlashMessages } from "../_components/AdminShell";
import { Checkbox, Field, SubmitButton, Textarea } from "../_components/Fields";
import {
  saveSettings,
  uploadLogoAction,
  uploadBackgroundAction,
  clearIdentityAction,
} from "./actions";
import { saveHours } from "../horaires/actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · Paramètres généraux",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ saved?: string; error?: string; tab?: string }>;

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-ink-900 text-sand-50"
          : "text-taupe-600 hover:bg-sand-50 hover:text-ink-900"
      }`}
    >
      {children}
    </Link>
  );
}

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

  const params = await searchParams;
  const activeTab = params.tab ?? "identite";

  const settings = await loadSettings();
  const hours =
    activeTab === "horaires" ? await loadHours() : null;

  return (
    <AdminShell
      title="Paramètres généraux"
      intro="Identité, contact, réseaux, horaires et éléments globaux du site."
    >
      {/* Onglets */}
      <div className="mb-8 flex gap-1 rounded-2xl border border-taupe-200/50 bg-white p-1.5 w-fit">
        <TabLink href="/admin/parametres" active={activeTab === "identite"}>
          Identité & Contact
        </TabLink>
        <TabLink href="/admin/parametres?tab=reseaux" active={activeTab === "reseaux"}>
          Réseaux & CTA
        </TabLink>
        <TabLink href="/admin/parametres?tab=horaires" active={activeTab === "horaires"}>
          Horaires
        </TabLink>
      </div>

      <FlashMessages saved={params.saved} error={params.error} />

      {/* ─── Tab : Identité & Contact ─────────────────────────── */}
      {activeTab === "identite" && (
        <>
          {/* Identité visuelle */}
          <div className="mb-8 space-y-6 rounded-2xl border border-taupe-300/40 bg-white p-6">
            <h2 className="font-serif text-xl text-ink-900">Identité visuelle</h2>

            {/* Logo */}
            <div className="rounded-xl border border-taupe-200/60 p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-ink-900">Logo du site</h3>
                  <p className="text-xs text-taupe-500">
                    Affiché dans le header et le footer. PNG ou SVG recommandé.
                  </p>
                </div>
                {settings.logoUrl && (
                  <form action={clearIdentityAction}>
                    <input type="hidden" name="slot" value="logo" />
                    <button
                      type="submit"
                      className="text-xs text-red-700 hover:text-red-900"
                    >
                      Retirer
                    </button>
                  </form>
                )}
              </div>
              <div className="flex items-center gap-6">
                <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-xl border border-taupe-200/40 bg-sand-100/50">
                  {settings.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={settings.logoUrl}
                      alt="Logo actuel"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-center text-xs text-taupe-400">
                      Aucun logo
                    </span>
                  )}
                </div>
                <form action={uploadLogoAction}>
                  <label className="block space-y-1.5">
                    <span className="text-xs text-taupe-500">Remplacer</span>
                    <input
                      type="file"
                      name="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="block text-sm text-ink-900 file:mr-3 file:rounded-full file:border-0 file:bg-taupe-700 file:px-4 file:py-1.5 file:text-xs file:font-medium file:text-sand-50 hover:file:bg-taupe-800"
                    />
                  </label>
                  <button
                    type="submit"
                    className="mt-3 rounded-full bg-taupe-700 px-4 py-1.5 text-xs font-medium text-sand-50 hover:bg-taupe-800"
                  >
                    Uploader →
                  </button>
                </form>
              </div>
            </div>

            {/* Arrière-plan premium */}
            <div className="rounded-xl border border-taupe-200/60 p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-ink-900">Arrière-plan premium</h3>
                  <p className="text-xs text-taupe-500">
                    Photo de fond affichée discrètement derrière toutes les sections.
                    1920×1080 px minimum.
                  </p>
                </div>
                {settings.backgroundUrl && (
                  <form action={clearIdentityAction}>
                    <input type="hidden" name="slot" value="background" />
                    <button
                      type="submit"
                      className="text-xs text-red-700 hover:text-red-900"
                    >
                      Retirer
                    </button>
                  </form>
                )}
              </div>
              <div className="flex items-center gap-6">
                <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-xl border border-taupe-200/40 bg-sand-100/50">
                  {settings.backgroundUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={settings.backgroundUrl}
                      alt="Arrière-plan actuel"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-center text-xs text-taupe-400">
                      Aucun fond
                    </span>
                  )}
                </div>
                <form action={uploadBackgroundAction}>
                  <label className="block space-y-1.5">
                    <span className="text-xs text-taupe-500">Remplacer</span>
                    <input
                      type="file"
                      name="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="block text-sm text-ink-900 file:mr-3 file:rounded-full file:border-0 file:bg-taupe-700 file:px-4 file:py-1.5 file:text-xs file:font-medium file:text-sand-50 hover:file:bg-taupe-800"
                    />
                  </label>
                  <button
                    type="submit"
                    className="mt-3 rounded-full bg-taupe-700 px-4 py-1.5 text-xs font-medium text-sand-50 hover:bg-taupe-800"
                  >
                    Uploader →
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Form identité + contact */}
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
                <Field label="Ville" name="city" defaultValue={settings.city} />
              </div>
              <Field
                label="Lien Google Maps (optionnel)"
                name="googleMapsUrl"
                type="url"
                defaultValue={settings.googleMapsUrl}
                placeholder="https://maps.google.com/..."
              />
            </Section>

            {/* Hidden fields for other tabs */}
            <input type="hidden" name="instagramUrl" value={settings.instagramUrl ?? ""} />
            <input type="hidden" name="facebookUrl" value={settings.facebookUrl ?? ""} />
            <input type="hidden" name="ctaText" value={settings.ctaText ?? ""} />
            <input type="hidden" name="ctaUrl" value={settings.ctaUrl ?? ""} />
            <input type="hidden" name="footerText" value={settings.footerText ?? ""} />
            <input type="hidden" name="copyright" value={settings.copyright ?? ""} />

            <div className="flex justify-end">
              <SubmitButton>Enregistrer →</SubmitButton>
            </div>
          </form>
        </>
      )}

      {/* ─── Tab : Réseaux & CTA ──────────────────────────────── */}
      {activeTab === "reseaux" && (
        <form
          action={saveSettings}
          className="space-y-8 rounded-2xl border border-taupe-300/40 bg-white p-6"
        >
          {/* Hidden fields for identite tab */}
          <input type="hidden" name="companyName" value={settings.companyName ?? ""} />
          <input type="hidden" name="tagline" value={settings.tagline ?? ""} />
          <input type="hidden" name="email" value={settings.email ?? ""} />
          <input type="hidden" name="phone" value={settings.phone ?? ""} />
          <input type="hidden" name="address" value={settings.address ?? ""} />
          <input type="hidden" name="postalCode" value={settings.postalCode ?? ""} />
          <input type="hidden" name="city" value={settings.city ?? ""} />
          <input type="hidden" name="googleMapsUrl" value={settings.googleMapsUrl ?? ""} />

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
      )}

      {/* ─── Tab : Horaires ───────────────────────────────────── */}
      {activeTab === "horaires" && hours && (
        <form
          action={saveHours}
          className="rounded-2xl border border-taupe-300/40 bg-white p-6"
        >
          <div className="space-y-4">
            {hours.map((schedule) => (
              <DayRow key={schedule.day} schedule={schedule} />
            ))}
          </div>
          <div className="mt-8 flex justify-end">
            <SubmitButton>Enregistrer les horaires →</SubmitButton>
          </div>
        </form>
      )}
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

function DayRow({ schedule }: { schedule: DaySchedule }) {
  const inputCls =
    "rounded-xl border border-taupe-300/50 bg-white px-3 py-2 text-sm text-ink-900 focus:border-taupe-600 focus:outline-none focus:ring-2 focus:ring-taupe-500/30";
  return (
    <div className="grid grid-cols-1 gap-3 border-b border-taupe-300/30 py-3 last:border-b-0 sm:grid-cols-[120px_auto_1fr_1fr]">
      <span className="font-serif text-base text-ink-900">
        {dayLabels[schedule.day]}
      </span>
      <Checkbox
        name={`${schedule.day}_closed`}
        label="Fermé"
        defaultChecked={schedule.closed}
      />
      <label className="flex items-center gap-3 text-sm text-taupe-600">
        Ouverture
        <input
          type="time"
          name={`${schedule.day}_open`}
          defaultValue={schedule.open}
          className={inputCls}
        />
      </label>
      <label className="flex items-center gap-3 text-sm text-taupe-600">
        Fermeture
        <input
          type="time"
          name={`${schedule.day}_close`}
          defaultValue={schedule.close}
          className={inputCls}
        />
      </label>
    </div>
  );
}
