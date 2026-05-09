import { z } from "zod";

export type OfferCategory = "ponctuelle" | "carte" | "programme";

export type CoachLink = {
  /** SumUp payment URL for this coach + this offer, or null. */
  sumup: string | null;
  /** Cal.com fallback URL specific to this offer for this coach, or null. */
  calcom: string | null;
};

export type Offer = {
  id: string;
  category: OfferCategory;
  name: string;
  /** Display price (per session for cartes, per person for duo/trio). */
  priceLabel: string;
  /** Total amount to charge in EUR cents (NOT per person), or null for "sur devis". */
  totalCents: number | null;
  /** Optional duration label (eg "60 min"). */
  duration: string | null;
  /** Optional number of participants (duo=2, trio=3). */
  participants: number | null;
  description: string;
  details: string[];
  highlight?: boolean;
  badge?: string;
  /**
   * Coachs autorisés pour cette offre. Tableau vide = tous les coachs.
   * Valeurs possibles : ids de coachs (eg "dorian", "gregory").
   */
  allowedCoaches: string[];
  /** Map coachId → liens SumUp + Cal.com pour ce duo (offre, coach). */
  coachLinks: Record<string, CoachLink>;
};

export const coachLinkSchema = z.object({
  sumup: z.string().nullable().default(null),
  calcom: z.string().nullable().default(null),
});

export const offerSchema = z.object({
  id: z.string().min(1),
  category: z.enum(["ponctuelle", "carte", "programme"]),
  name: z.string().min(1),
  priceLabel: z.string().min(1),
  totalCents: z.number().int().nullable(),
  duration: z.string().nullable().default(null),
  participants: z.number().int().nullable().default(null),
  description: z.string(),
  details: z.array(z.string()),
  highlight: z.boolean().optional(),
  badge: z.string().optional(),
  allowedCoaches: z.array(z.string()).default([]),
  coachLinks: z.record(z.string(), coachLinkSchema).default({}),
}) satisfies z.ZodType<Offer>;

export const offerArraySchema = z.array(offerSchema);

export const offers: Offer[] = [
  {
    id: "decouverte",
    category: "ponctuelle",
    name: "Séance Découverte",
    priceLabel: "25 €",
    totalCents: 2500,
    duration: "60 min",
    participants: 1,
    description: "Bilan mouvement complet pour démarrer en confiance.",
    details: [
      "Évaluation posturale et mobilité",
      "Recommandations personnalisées",
    ],
    badge: "Offre de lancement",
    highlight: true,
    allowedCoaches: [],
    coachLinks: {},
  },
  {
    id: "individuelle",
    category: "ponctuelle",
    name: "Séance individuelle",
    priceLabel: "70 €",
    totalCents: 7000,
    duration: "60 min",
    participants: 1,
    description: "Sans engagement, à votre rythme.",
    details: [
      "Accompagnement individuel",
      "Programme adapté à votre objectif",
      "Suivi des progrès",
    ],
    allowedCoaches: [],
    coachLinks: {},
  },
  {
    id: "duo",
    category: "ponctuelle",
    name: "Séance en duo",
    priceLabel: "40 € / personne",
    totalCents: 8000,
    duration: "60 min",
    participants: 2,
    description: "Partagez l'effort, divisez la solitude.",
    details: ["Séance en duo (2 personnes)", "Accompagnement simultané"],
    allowedCoaches: [],
    coachLinks: {},
  },
  {
    id: "trio",
    category: "ponctuelle",
    name: "Séance en trio",
    priceLabel: "30 € / personne",
    totalCents: 9000,
    duration: "60 min",
    participants: 3,
    description: "L'esprit petit collectif, l'attention préservée.",
    details: ["Séance en trio (3 personnes)", "Encadrement individualisé"],
    allowedCoaches: [],
    coachLinks: {},
  },
  {
    id: "carte-5",
    category: "carte",
    name: "Carte 5 séances",
    priceLabel: "66 € / séance",
    totalCents: 33000,
    duration: "5 × 60 min",
    participants: 1,
    description: "Le bon rythme pour s'installer dans la pratique.",
    details: ["5 séances individuelles", "Validité 3 mois"],
    allowedCoaches: [],
    coachLinks: {},
  },
  {
    id: "carte-10",
    category: "carte",
    name: "Carte 10 séances",
    priceLabel: "55 € / séance",
    totalCents: 55000,
    duration: "10 × 60 min",
    participants: 1,
    description: "L'engagement qui transforme.",
    details: ["10 séances individuelles", "Validité 6 mois"],
    highlight: true,
    badge: "Le plus choisi",
    allowedCoaches: [],
    coachLinks: {},
  },
  {
    id: "programme",
    category: "programme",
    name: "Programme 4 · 8 · 12 semaines",
    priceLabel: "Sur devis",
    totalCents: null,
    duration: "4 à 12 semaines",
    participants: 1,
    description: "Un parcours structuré pour un objectif précis.",
    details: [
      "Bilan initial approfondi",
      "Plan progressif personnalisé",
      "Bilan d'étape inclus",
    ],
    allowedCoaches: [],
    coachLinks: {},
  },
  {
    id: "programme-premium",
    category: "programme",
    name: "Programme Premium",
    priceLabel: "Sur devis",
    totalCents: null,
    duration: "Sur mesure",
    participants: 1,
    description: "Bilan complet de mouvement + nutrition.",
    details: [
      "Évaluation mouvement & nutrition",
      "Programme entraînement + alimentation",
      "Suivi rapproché",
    ],
    highlight: true,
    allowedCoaches: [],
    coachLinks: {},
  },
];

export function getOffer(id: string): Offer | undefined {
  return offers.find((o) => o.id === id);
}

export function offersByCategory(category: OfferCategory): Offer[] {
  return offers.filter((o) => o.category === category);
}

/** True si ce coach est autorisé à délivrer cette offre. */
export function isCoachAllowed(offer: Offer, coachId: string): boolean {
  return offer.allowedCoaches.length === 0 || offer.allowedCoaches.includes(coachId);
}

export type CoachLinksRef = {
  id: string;
  calcomUrl: string;
};

/**
 * Renvoie l'URL et le type de redirection pour le couple (offre, coach).
 * Le lien SumUp dépend du prix de l'offre, donc UNIQUEMENT le lien SumUp
 * propre au couple (offre, coach) est utilisé pour le paiement.
 *
 * Priorité :
 *   1. offer.coachLinks[coach].sumup   → SumUp (paiement)
 *   2. offer.coachLinks[coach].calcom  → override Cal.com par offre
 *   3. coach.calcomUrl                 → Cal.com par défaut du coach
 */
export function resolveBookingLink(
  offer: Offer,
  coach: CoachLinksRef,
): { url: string | null; isPayment: boolean } {
  const link = offer.coachLinks[coach.id];
  if (link?.sumup && link.sumup.length > 0) {
    return { url: link.sumup, isPayment: true };
  }
  if (link?.calcom && link.calcom.length > 0) {
    return { url: link.calcom, isPayment: false };
  }
  if (coach.calcomUrl && coach.calcomUrl.length > 0) {
    return { url: coach.calcomUrl, isPayment: false };
  }
  return { url: null, isPayment: false };
}
