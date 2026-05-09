import { z } from "zod";

export type SiteTexts = {
  siteName: string;
  heroEyebrow: string;
  heroTitleLead: string;
  heroTitleAccent: string;
  heroTitleTrail: string;
  heroSubtitle: string;
  heroMeta1: string;
  heroMeta2: string;
  heroMeta3: string;
  approcheEyebrow: string;
  approcheTitle: string;
  approcheBody: string;
  ctaFinalTitle: string;
  ctaFinalBody: string;
};

export const siteTextsSchema = z.object({
  siteName: z.string().min(1),
  heroEyebrow: z.string().min(1),
  heroTitleLead: z.string().min(1),
  heroTitleAccent: z.string().min(1),
  heroTitleTrail: z.string(),
  heroSubtitle: z.string().min(1),
  heroMeta1: z.string(),
  heroMeta2: z.string(),
  heroMeta3: z.string(),
  approcheEyebrow: z.string().min(1),
  approcheTitle: z.string().min(1),
  approcheBody: z.string().min(1),
  ctaFinalTitle: z.string().min(1),
  ctaFinalBody: z.string().min(1),
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
  approcheEyebrow: "Notre approche",
  approcheTitle: "Une autre manière de bouger : lente, précise, durable.",
  approcheBody:
    "Pas de salle bondée, pas d’intensité aveugle. Chez Mise en Mouvement, chaque séance est pensée pour reconstruire — la posture, la confiance, le plaisir de bouger. Que vous repreniez après une longue pause ou cherchiez un suivi exigeant, vous êtes au bon endroit.",
  ctaFinalTitle: "Prêt à reprendre ? Réservez votre première séance.",
  ctaFinalBody:
    "Bilan mouvement à 25 € — offre de lancement, deux premiers mois d’ouverture.",
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
  approcheEyebrow: "Approche — sur-titre",
  approcheTitle: "Approche — titre",
  approcheBody: "Approche — paragraphe",
  ctaFinalTitle: "CTA finale — titre",
  ctaFinalBody: "CTA finale — paragraphe",
};
