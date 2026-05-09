import { z } from "zod";

export type FaqItem = {
  question: string;
  answer: string;
};

export const faqItemSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
}) satisfies z.ZodType<FaqItem>;

export const faqArraySchema = z.array(faqItemSchema);

export const faq: FaqItem[] = [
  {
    question: "Comment réserver une séance ?",
    answer:
      "Choisissez votre coach, votre créneau et réservez directement en ligne en moins de 2 minutes.",
  },
  {
    question: "Peut-on payer en plusieurs fois ?",
    answer:
      "Oui, certaines formules peuvent être réglées en 2 ou 3 fois sans frais.",
  },
  {
    question: "Je débute complètement, est-ce adapté ?",
    answer:
      "Oui. Les séances sont personnalisées pour tous les niveaux, même si vous reprenez le sport après longtemps.",
  },
];
