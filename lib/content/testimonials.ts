import { z } from "zod";

export type Testimonial = {
  author: string;
  quote: string;
  rating: number;
  context?: string;
  date?: string;
  visible: boolean;
  order: number;
};

export const testimonialSchema = z.object({
  author: z.string().min(1, "Le prénom/nom est requis."),
  quote: z.string().min(1, "Le texte de l'avis est requis."),
  rating: z.number().int().min(1).max(5),
  context: z.string().optional(),
  date: z.string().optional(),
  visible: z.boolean(),
  order: z.number().int().min(0),
});

export const testimonialArraySchema = z.array(testimonialSchema);

export const testimonials: Testimonial[] = [
  {
    author: "Sophie M.",
    quote:
      "Je n'aimais pas les salles de sport classiques et ici je me suis sentie à l'aise dès la première séance. Coaching ultra rassurant et vraiment personnalisé.",
    rating: 5,
    visible: true,
    order: 0,
  },
  {
    author: "Thomas R.",
    quote:
      "Très pro, ambiance calme et premium. J'ai repris le sport sans douleur et avec enfin un vrai suivi.",
    rating: 5,
    visible: true,
    order: 1,
  },
];
