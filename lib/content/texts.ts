import { z } from "zod";

export type SiteTexts = {
  // Identité globale
  siteName: string;

  // Hero (accueil)
  heroEyebrow: string;
  heroTitleLead: string;
  heroTitleAccent: string;
  heroTitleTrail: string;
  heroSubtitle: string;
  heroMeta1: string;
  heroMeta2: string;
  heroMeta3: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;

  // Approche (accueil)
  approcheEyebrow: string;
  approcheTitle: string;
  approcheBody: string;

  // Bloc "Vos coachs" (accueil)
  coachsPreviewEyebrow: string;
  coachsPreviewTitle: string;
  coachsPreviewCta: string;

  // Bloc Piliers / valeurs (accueil)
  piliersEyebrow: string;
  piliersTitle: string;
  pilier1Title: string;
  pilier1Body: string;
  pilier2Title: string;
  pilier2Body: string;
  pilier3Title: string;
  pilier3Body: string;

  // Bloc Avis (accueil)
  avisPreviewEyebrow: string;
  avisPreviewTitle: string;
  avisPreviewCta: string;

  // CTA final (accueil)
  ctaFinalTitle: string;
  ctaFinalBody: string;
  ctaFinalButton: string;

  // Page Contact
  contactEyebrow: string;
  contactTitle1: string;
  contactTitle2: string;
  contactIntro: string;
  contactDelayLabel: string;
  contactDelayValue: string;
  contactHoursLabel: string;
  contactBookingLabel: string;
  contactBookingText: string;

  // Page Réservation
  reservationEyebrow: string;
  reservationTitle1: string;
  reservationTitle2: string;
  reservationIntro: string;
};

export const siteTextsSchema = z.object({
  siteName: z.string(),

  heroEyebrow: z.string(),
  heroTitleLead: z.string(),
  heroTitleAccent: z.string(),
  heroTitleTrail: z.string(),
  heroSubtitle: z.string(),
  heroMeta1: z.string(),
  heroMeta2: z.string(),
  heroMeta3: z.string(),
  heroCtaPrimary: z.string(),
  heroCtaSecondary: z.string(),

  approcheEyebrow: z.string(),
  approcheTitle: z.string(),
  approcheBody: z.string(),

  coachsPreviewEyebrow: z.string(),
  coachsPreviewTitle: z.string(),
  coachsPreviewCta: z.string(),

  piliersEyebrow: z.string(),
  piliersTitle: z.string(),
  pilier1Title: z.string(),
  pilier1Body: z.string(),
  pilier2Title: z.string(),
  pilier2Body: z.string(),
  pilier3Title: z.string(),
  pilier3Body: z.string(),

  avisPreviewEyebrow: z.string(),
  avisPreviewTitle: z.string(),
  avisPreviewCta: z.string(),

  ctaFinalTitle: z.string(),
  ctaFinalBody: z.string(),
  ctaFinalButton: z.string(),

  contactEyebrow: z.string(),
  contactTitle1: z.string(),
  contactTitle2: z.string(),
  contactIntro: z.string(),
  contactDelayLabel: z.string(),
  contactDelayValue: z.string(),
  contactHoursLabel: z.string(),
  contactBookingLabel: z.string(),
  contactBookingText: z.string(),

  reservationEyebrow: z.string(),
  reservationTitle1: z.string(),
  reservationTitle2: z.string(),
  reservationIntro: z.string(),
}) satisfies z.ZodType<SiteTexts>;

export const defaultTexts: SiteTexts = {
  siteName: "Mise en Mouvement",

  heroEyebrow: "Cabinet Mise en Mouvement",
  heroTitleLead: "Reprenez le sport,",
  heroTitleAccent: "sans douleur",
  heroTitleTrail: ", à votre rythme.",
  heroSubtitle:
    "Coaching sportif premium à deux voix : réathlétisation, pilates, préparation handball. Un accompagnement individuel, exigeant et rassurant.",
  heroMeta1: "Bilan découverte 25 €",
  heroMeta2: "Paiement en 3 fois",
  heroMeta3: "Sans engagement",
  heroCtaPrimary: "Réserver une séance",
  heroCtaSecondary: "Découvrir les offres",

  approcheEyebrow: "Notre approche",
  approcheTitle: "Une autre manière de bouger : lente, précise, durable.",
  approcheBody:
    "Pas de salle bondée, pas d’intensité aveugle. Chez Mise en Mouvement, chaque séance est pensée pour reconstruire — la posture, la confiance, le plaisir de bouger. Que vous repreniez après une longue pause ou cherchiez un suivi exigeant, vous êtes au bon endroit.",

  coachsPreviewEyebrow: "Vos coachs",
  coachsPreviewTitle: "Deux expertises complémentaires.",
  coachsPreviewCta: "Voir leurs parcours →",

  piliersEyebrow: "Ce qui nous distingue",
  piliersTitle: "Trois principes, tenus à chaque séance.",
  pilier1Title: "Reprise sans douleur",
  pilier1Body:
    "Une approche progressive, sans impact, pour reconstruire la mobilité et la force en profondeur.",
  pilier2Title: "Suivi personnalisé",
  pilier2Body:
    "Un programme conçu pour vous, ajusté à votre niveau, votre histoire et vos objectifs.",
  pilier3Title: "Cadre premium et calme",
  pilier3Body:
    "Un espace haut de gamme, jamais intimidant, où chacun trouve sa place dès la première séance.",

  avisPreviewEyebrow: "Ils nous ont fait confiance",
  avisPreviewTitle: "Quelques retours.",
  avisPreviewCta: "Tous les avis →",

  ctaFinalTitle: "Prêt à reprendre ? Réservez votre première séance.",
  ctaFinalBody:
    "Bilan mouvement à 25 € — offre de lancement, deux premiers mois d’ouverture.",
  ctaFinalButton: "Réserver une séance",

  contactEyebrow: "Contact",
  contactTitle1: "Une question,",
  contactTitle2: "un projet sur mesure ?",
  contactIntro:
    "Écrivez-nous : nous vous répondons sous 24 h ouvrées. Pour les programmes 4/8/12 semaines ou Premium, indiquez vos objectifs et vos disponibilités.",
  contactDelayLabel: "Délai de réponse",
  contactDelayValue: "Sous 24 h ouvrées",
  contactHoursLabel: "Horaires d’ouverture",
  contactBookingLabel: "Réservation directe",
  contactBookingText:
    "Pour les séances et cartes, vous pouvez réserver en ligne sans passer par ce formulaire.",

  reservationEyebrow: "Réservation",
  reservationTitle1: "Réservez votre",
  reservationTitle2: "première séance.",
  reservationIntro:
    "Trois étapes : choisissez votre coach, votre formule, votre créneau. Le paiement se fait après confirmation.",
};

export const textFieldLabels: Record<keyof SiteTexts, string> = {
  siteName: "Nom du site (header, footer, titre des onglets)",

  heroEyebrow: "Hero — sur-titre",
  heroTitleLead: "Hero — titre (début)",
  heroTitleAccent: "Hero — titre (italique)",
  heroTitleTrail: "Hero — titre (fin)",
  heroSubtitle: "Hero — sous-titre",
  heroMeta1: "Hero — meta 1",
  heroMeta2: "Hero — meta 2",
  heroMeta3: "Hero — meta 3",
  heroCtaPrimary: "Hero — bouton principal",
  heroCtaSecondary: "Hero — bouton secondaire",

  approcheEyebrow: "Approche — sur-titre",
  approcheTitle: "Approche — titre",
  approcheBody: "Approche — paragraphe",

  coachsPreviewEyebrow: "Bloc coachs — sur-titre",
  coachsPreviewTitle: "Bloc coachs — titre",
  coachsPreviewCta: "Bloc coachs — bouton",

  piliersEyebrow: "Piliers — sur-titre",
  piliersTitle: "Piliers — titre",
  pilier1Title: "Pilier 1 — titre",
  pilier1Body: "Pilier 1 — paragraphe",
  pilier2Title: "Pilier 2 — titre",
  pilier2Body: "Pilier 2 — paragraphe",
  pilier3Title: "Pilier 3 — titre",
  pilier3Body: "Pilier 3 — paragraphe",

  avisPreviewEyebrow: "Bloc avis — sur-titre",
  avisPreviewTitle: "Bloc avis — titre",
  avisPreviewCta: "Bloc avis — bouton",

  ctaFinalTitle: "CTA finale — titre",
  ctaFinalBody: "CTA finale — paragraphe",
  ctaFinalButton: "CTA finale — bouton",

  contactEyebrow: "Contact — sur-titre",
  contactTitle1: "Contact — titre (1ère ligne)",
  contactTitle2: "Contact — titre (2e ligne, italique)",
  contactIntro: "Contact — paragraphe d'intro",
  contactDelayLabel: "Contact — label délai de réponse",
  contactDelayValue: "Contact — valeur délai de réponse",
  contactHoursLabel: "Contact — label horaires",
  contactBookingLabel: "Contact — label réservation directe",
  contactBookingText: "Contact — texte réservation directe",

  reservationEyebrow: "Réservation — sur-titre",
  reservationTitle1: "Réservation — titre (1ère ligne)",
  reservationTitle2: "Réservation — titre (2e ligne, italique)",
  reservationIntro: "Réservation — paragraphe d'intro",
};

/**
 * Renvoie la valeur enregistrée si elle n'est pas vide, sinon le texte par défaut.
 * Permet l'effacement contrôlé dans l'admin tout en gardant un fallback.
 */
export function textOrDefault<K extends keyof SiteTexts>(
  texts: SiteTexts,
  key: K,
): string {
  const v = texts[key];
  return v && v.trim().length > 0 ? v : defaultTexts[key];
}
