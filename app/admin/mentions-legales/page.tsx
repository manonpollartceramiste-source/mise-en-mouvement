import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { loadLegal } from "@/lib/content/legal.server";
import { AdminShell, FlashMessages } from "../_components/AdminShell";
import { Field, SubmitButton, Textarea } from "../_components/Fields";
import { saveLegal } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · Mentions légales",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function AdminLegalPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/admin/login?error=supabase-missing");
  }
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const legal = await loadLegal();
  const params = await searchParams;
  const coachCount = legal.coaches.length;

  return (
    <AdminShell
      title="Mentions légales & confidentialité"
      intro="Tous les éléments éditables affichés sur les pages /mentions-legales et /confidentialite. La page /contact utilise aussi l'email de contact."
    >
      <FlashMessages saved={params.saved} error={params.error} />

      <form
        action={saveLegal}
        className="space-y-8 rounded-2xl border border-taupe-300/40 bg-white p-6"
      >
        <input type="hidden" name="coachCount" value={coachCount} />

        <Section title="Identité du cabinet">
          <Field
            label="Nom du cabinet"
            name="cabinetName"
            required
            defaultValue={legal.cabinetName}
          />
          <Field
            label="Email de contact"
            name="contactEmail"
            type="email"
            required
            defaultValue={legal.contactEmail}
          />
          <Textarea
            label="Introduction de l'éditeur"
            name="editorIntro"
            rows={3}
            defaultValue={legal.editorIntro}
          />
        </Section>

        <Section title="Coachs">
          {legal.coaches.map((c, i) => (
            <div key={i} className="rounded-xl bg-sand-100/50 p-4">
              <p className="mb-3 text-xs uppercase tracking-wider text-taupe-500">
                Coach {i + 1}
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <Field
                  label="Nom"
                  name={`coach_${i}_name`}
                  defaultValue={c.name}
                />
                <Field
                  label="Rôle"
                  name={`coach_${i}_role`}
                  defaultValue={c.role}
                />
                <Field
                  label="SIRET"
                  name={`coach_${i}_siret`}
                  defaultValue={c.siret}
                />
              </div>
            </div>
          ))}
          <p className="text-xs text-taupe-500">
            Pour ajouter / supprimer des coachs ici, utilise d’abord la
            section <a href="/admin/coachs" className="underline">Coachs</a>.
          </p>
        </Section>

        <Section title="Hébergeur">
          <Field
            label="Nom de l'hébergeur"
            name="hostingName"
            defaultValue={legal.hostingName}
          />
          <Textarea
            label="Adresse / coordonnées"
            name="hostingAddress"
            rows={2}
            defaultValue={legal.hostingAddress}
          />
        </Section>

        <Section title="Notes additionnelles (facultatif)">
          <Textarea
            label="Texte ajouté en bas des mentions légales"
            name="additionalNotes"
            rows={3}
            defaultValue={legal.additionalNotes}
          />
        </Section>

        <Section title="Politique de confidentialité">
          <Textarea
            label="Données collectées"
            name="privacyDataCollected"
            rows={3}
            defaultValue={legal.privacyDataCollected}
          />
          <Textarea
            label="Finalités du traitement"
            name="privacyPurposes"
            rows={3}
            defaultValue={legal.privacyPurposes}
          />
          <Textarea
            label="Sous-traitants"
            name="privacySubprocessors"
            rows={3}
            defaultValue={legal.privacySubprocessors}
          />
          <Textarea
            label="Durée de conservation"
            name="privacyRetention"
            rows={2}
            defaultValue={legal.privacyRetention}
          />
          <Textarea
            label="Droits des personnes"
            name="privacyRights"
            rows={3}
            defaultValue={legal.privacyRights}
          />
          <Textarea
            label="Cookies"
            name="privacyCookies"
            rows={3}
            defaultValue={legal.privacyCookies}
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
