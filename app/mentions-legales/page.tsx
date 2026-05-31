import type { Metadata } from "next";
import { LegalLayout } from "@/app/components/ui/LegalLayout";
import { loadLegal } from "@/lib/content/legal.server";
import { loadSettings } from "@/lib/content/settings.server";
import { loadActiveCoaches } from "@/lib/content/coaches.server";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales du cabinet.",
};

export const dynamic = "force-dynamic";

export default async function MentionsLegalesPage() {
  const [legal, settings, coaches] = await Promise.all([
    loadLegal(),
    loadSettings(),
    loadActiveCoaches(),
  ]);

  const cabinetName = settings.companyName || legal.cabinetName;
  const contactEmail = settings.email || legal.contactEmail;

  const legalCoaches = coaches.filter(
    (c) => (c.siret ?? "").trim().length > 0 || (c.legalRole ?? "").trim().length > 0,
  );
  const coachesToRender = legalCoaches.length > 0 ? legalCoaches : null;

  return (
    <LegalLayout eyebrow="Informations légales" title="Mentions légales">
      <p>
        Les présentes mentions légales ont vocation à informer les utilisateurs
        du site {cabinetName} sur l’identité de l’éditeur, de l’hébergeur
        et sur les conditions d’utilisation du site.
      </p>

      <h2>Éditeur du site</h2>
      <p className="whitespace-pre-line">{legal.editorIntro}</p>
      {coachesToRender
        ? coachesToRender.map((c) => {
            const role = (c.legalRole ?? "").trim() || c.role;
            const siret = (c.siret ?? "").trim();
            const proEmail = (c.proEmail ?? "").trim();
            return (
              <p key={c.id}>
                <strong>{c.name}</strong>
                {role ? <> — {role}</> : null}.
                {siret ? (
                  <>
                    <br />
                    SIRET : {siret}.
                  </>
                ) : null}
                {proEmail ? (
                  <>
                    <br />
                    Contact : <a href={`mailto:${proEmail}`}>{proEmail}</a>.
                  </>
                ) : null}
              </p>
            );
          })
        : legal.coaches.map((c, i) => (
            <p key={i}>
              <strong>{c.name}</strong>
              {c.role ? <> — {c.role}</> : null}.
              {c.siret ? (
                <>
                  <br />
                  SIRET : {c.siret}.
                </>
              ) : null}
            </p>
          ))}
      <p>
        Contact : <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
      </p>

      {(settings.address.trim().length > 0 ||
        settings.postalCode.trim().length > 0 ||
        settings.city.trim().length > 0 ||
        settings.phone.trim().length > 0) && (
        <>
          <h2>Coordonnées</h2>
          {settings.address.trim().length > 0 && (
            <p style={{ whiteSpace: "pre-line" }}>{settings.address}</p>
          )}
          {(settings.postalCode.trim().length > 0 ||
            settings.city.trim().length > 0) && (
            <p>
              {[settings.postalCode, settings.city].filter(Boolean).join(" ")}
            </p>
          )}
          {settings.phone.trim().length > 0 && (
            <p>Téléphone : {settings.phone}</p>
          )}
        </>
      )}

      <h2>Hébergeur</h2>
      <p>
        Le site est hébergé par {legal.hostingName}. {legal.hostingAddress}
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L’ensemble des contenus présents sur le site (textes, photos, logos)
        est protégé par le droit d’auteur. Toute reproduction sans autorisation
        écrite préalable est interdite.
      </p>

      <h2>Responsabilité</h2>
      <p>
        L’éditeur s’efforce d’assurer l’exactitude des informations diffusées
        sur le site. Toutefois, il ne saurait être tenu responsable des erreurs
        ou omissions, ni de l’usage qui pourrait en être fait par un tiers.
      </p>

      <h2>Droit applicable</h2>
      <p>
        Les présentes mentions sont soumises au droit français. Tout litige
        relatif au site relève de la compétence des tribunaux français.
      </p>

      {legal.additionalNotes.trim().length > 0 && (
        <>
          <h2>Informations complémentaires</h2>
          <p style={{ whiteSpace: "pre-line" }}>{legal.additionalNotes}</p>
        </>
      )}
    </LegalLayout>
  );
}
