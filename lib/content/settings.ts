import { z } from "zod";

export type SiteSettings = {
  companyName: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  googleMapsUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  ctaText: string;
  ctaUrl: string;
  footerText: string;
  copyright: string;
};

export const siteSettingsSchema = z.object({
  companyName: z.string().min(1),
  tagline: z.string(),
  email: z.string().min(1),
  phone: z.string(),
  address: z.string(),
  postalCode: z.string(),
  city: z.string(),
  googleMapsUrl: z.string(),
  instagramUrl: z.string(),
  facebookUrl: z.string(),
  ctaText: z.string().min(1),
  ctaUrl: z.string().min(1),
  footerText: z.string(),
  copyright: z.string(),
}) satisfies z.ZodType<SiteSettings>;

export const defaultSettings: SiteSettings = {
  companyName: "Mise en Mouvement",
  tagline: "Coaching sportif premium · réathlétisation, pilates, handball",
  email: "contact@miseenmouvement.example",
  phone: "",
  address: "",
  postalCode: "",
  city: "",
  googleMapsUrl: "",
  instagramUrl: "",
  facebookUrl: "",
  ctaText: "Réserver",
  ctaUrl: "/reservation",
  footerText: "Coaching sportif premium, réathlétisation, pilates.",
  copyright: "© {year} {companyName}",
};

export function formatCopyright(template: string, companyName: string): string {
  const year = new Date().getFullYear();
  return template
    .replaceAll("{year}", String(year))
    .replaceAll("{companyName}", companyName);
}
