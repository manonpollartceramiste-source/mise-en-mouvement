export const site = {
  name: "Mise en Mouvement",
  tagline: "Coaching sportif premium · réathlétisation, pilates, handball",
  description:
    "Cabinet de coaching sportif premium. Reprise du sport sans douleur, suivi personnalisé, ambiance calme et haut de gamme.",
  url: "https://miseenmouvement.example",
  contactEmail: "contact@miseenmouvement.example",
} as const;

export const nav = [
  { href: "/coachs", label: "Coachs" },
  { href: "/offres", label: "Offres" },
  { href: "/avis", label: "Avis" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;
