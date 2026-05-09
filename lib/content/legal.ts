import { z } from "zod";

export type LegalCoach = {
  name: string;
  role: string;
  siret: string;
};

export type LegalContent = {
  cabinetName: string;
  contactEmail: string;
  editorIntro: string;
  coaches: LegalCoach[];
  hostingName: string;
  hostingAddress: string;
  additionalNotes: string;
  privacyDataCollected: string;
  privacyPurposes: string;
  privacySubprocessors: string;
  privacyRetention: string;
  privacyRights: string;
  privacyCookies: string;
};

export const legalCoachSchema = z.object({
  name: z.string(),
  role: z.string(),
  siret: z.string(),
});

export const legalSchema = z.object({
  cabinetName: z.string().min(1),
  contactEmail: z.string().min(1),
  editorIntro: z.string(),
  coaches: z.array(legalCoachSchema),
  hostingName: z.string(),
  hostingAddress: z.string(),
  additionalNotes: z.string(),
  privacyDataCollected: z.string(),
  privacyPurposes: z.string(),
  privacySubprocessors: z.string(),
  privacyRetention: z.string(),
  privacyRights: z.string(),
  privacyCookies: z.string(),
}) satisfies z.ZodType<LegalContent>;

export const defaultLegal: LegalContent = {
  cabinetName: "Mise en Mouvement",
  contactEmail: "contact@miseenmouvement.example",
  editorIntro:
    "Le site Mise en Mouvement est édité conjointement par les deux coachs du cabinet, exerçant en entreprises individuelles indépendantes.",
  coaches: [
    {
      name: "Dorian Hébert",
      role: "Coach sportif & entraîneur de handball",
      siret: "945 354 355 00014",
    },
    {
      name: "Grégory Nadal",
      role: "Expert en réathlétisation & pilates",
      siret: "882 404 726 00029",
    },
  ],
  hostingName: "Vercel Inc.",
  hostingAddress:
    "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis · vercel.com",
  additionalNotes: "",
  privacyDataCollected:
    "Nous collectons les données nécessaires à la prise de rendez-vous et au paiement : nom, prénom, email, téléphone, formule choisie. Les paiements sont traités par SumUp ; nous ne stockons jamais vos coordonnées bancaires.",
  privacyPurposes:
    "Vos données sont utilisées pour : confirmer votre réservation, vous envoyer les informations relatives à votre séance, répondre à vos demandes via le formulaire de contact.",
  privacySubprocessors:
    "Nous faisons appel à : SumUp (paiement), Cal.com (gestion du planning), Vercel (hébergement). Chacun applique ses propres engagements RGPD.",
  privacyRetention:
    "Les données de réservation sont conservées 3 ans à compter de la dernière séance, conformément aux obligations comptables.",
  privacyRights:
    "Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation et d'opposition. Pour les exercer, écrivez-nous à l'email indiqué dans les mentions légales.",
  privacyCookies:
    "Le site utilise uniquement les cookies strictement nécessaires à son fonctionnement. Aucun cookie publicitaire ou tiers n'est déposé sans votre consentement.",
};
