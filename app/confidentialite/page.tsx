import type { Metadata } from "next";
import { LegalLayout } from "@/app/components/ui/LegalLayout";
import { loadLegal } from "@/lib/content/legal.server";
import { loadSettings } from "@/lib/content/settings.server";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité et traitement des données du cabinet.",
};

export const dynamic = "force-dynamic";

export default async function ConfidentialitePage() {
  const [legal, settings] = await Promise.all([loadLegal(), loadSettings()]);
  const cabinetName = settings.companyName || legal.cabinetName;
  const contactEmail = settings.email || legal.contactEmail;
  return (
    <LegalLayout
      eyebrow="Vie privée"
      title="Politique de confidentialité"
    >
      <p>
        {cabinetName} accorde une grande importance à la protection de
        vos données personnelles. Cette politique précise les données que nous
        collectons, leur usage et vos droits.
      </p>

      <h2>Données collectées</h2>
      <p className="whitespace-pre-line">{legal.privacyDataCollected}</p>

      <h2>Finalités</h2>
      <p className="whitespace-pre-line">{legal.privacyPurposes}</p>

      <h2>Sous-traitants</h2>
      <p className="whitespace-pre-line">{legal.privacySubprocessors}</p>

      <h2>Durée de conservation</h2>
      <p className="whitespace-pre-line">{legal.privacyRetention}</p>

      <h2>Vos droits</h2>
      <p className="whitespace-pre-line">
        {legal.privacyRights}{" "}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
      </p>

      <h2>Cookies</h2>
      <p className="whitespace-pre-line">{legal.privacyCookies}</p>
    </LegalLayout>
  );
}
