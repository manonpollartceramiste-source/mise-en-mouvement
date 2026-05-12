import { z } from "zod";

export type Coach = {
  id: string;
  name: string;
  initials: string;
  role: string;
  shortRole: string;
  diploma: string;
  bio: string;
  highlights: string[];
  calcomUrl: string;
  /** Lien SumUp principal du coach (paiement direct). Null = pas de paiement. */
  sumupUrl: string | null;
  /** Coach actif (visible côté public). Default true. */
  active: boolean;
  /** SIRET pour les mentions légales (facultatif). */
  siret?: string;
  /** Rôle légal / activité affiché dans les mentions légales (facultatif). */
  legalRole?: string;
  /** Email professionnel facultatif affiché dans les mentions légales. */
  proEmail?: string;
};

export const coachSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  initials: z.string().min(1).max(4),
  role: z.string().min(1),
  shortRole: z.string().min(1),
  diploma: z.string().min(1),
  bio: z.string().min(1),
  highlights: z.array(z.string()),
  calcomUrl: z.url(),
  sumupUrl: z.string().nullable().default(null),
  active: z.boolean().default(true),
  siret: z.string().optional(),
  legalRole: z.string().optional(),
  proEmail: z.string().optional(),
}) satisfies z.ZodType<Coach>;

export const coachArraySchema = z.array(coachSchema);

export const coaches: Coach[] = [
  {
    id: "dorian",
    name: "Dorian Hébert",
    initials: "DH",
    role: "Coach sportif & Entraîneur de handball",
    shortRole: "Coach sportif & handball",
    diploma: "Licence STAPS, spécialité entraînement sportif",
    bio: "J'évolue auprès de profils souvent irréguliers, marqués par des arrêts et reprises successives. Mon approche mêle suivi individuel et culture du collectif, avec l'objectif de construire une pratique stable et durable.",
    highlights: [
      "Reprise progressive et durable",
      "Suivi individuel et collectif",
      "Préparation handball",
    ],
    calcomUrl: "https://app.cal.com/dorian-hbt-tcwe9j",
    sumupUrl: null,
    active: true,
  },
  {
    id: "gregory",
    name: "Grégory Nadal",
    initials: "GN",
    role: "Expert en réathlétisation & pilates",
    shortRole: "Réathlétisation & pilates",
    diploma:
      "Licence STAPS · Master en Sciences de la Nutrition du Sport",
    bio: "Je vous accompagne dans la reprise d'une activité sans douleur et durable à l'aide du functional training et du pilates. Avec des mouvements lents, contrôlés et sans impact pour vous renforcer en profondeur.",
    highlights: [
      "Reprise sans douleur",
      "Functional training & pilates",
      "Approche nutrition",
    ],
    calcomUrl: "https://cal.com/gregory-nadal-elgfxj",
    sumupUrl: null,
    active: true,
  },
];

export function getCoach(id: string): Coach | undefined {
  return coaches.find((c) => c.id === id);
}
