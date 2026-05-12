"use server";

import { redirect } from "next/navigation";
import {
  defaultSettings,
  siteSettingsSchema,
  type SiteSettings,
} from "@/lib/content/settings";
import { saveContentKey } from "@/lib/supabase/content";

const REVALIDATE_PATHS = [
  "/",
  "/coachs",
  "/offres",
  "/avis",
  "/faq",
  "/contact",
  "/reservation",
  "/mentions-legales",
  "/confidentialite",
  "/admin/parametres",
];

function fail(reason: string): never {
  redirect(`/admin/parametres?error=${encodeURIComponent(reason)}`);
}

function done(msg: string): never {
  redirect(`/admin/parametres?saved=${encodeURIComponent(msg)}`);
}

function s(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function saveSettings(formData: FormData) {
  const candidate: SiteSettings = {
    ...defaultSettings,
    companyName: s(formData, "companyName"),
    tagline: s(formData, "tagline"),
    email: s(formData, "email"),
    phone: s(formData, "phone"),
    address: s(formData, "address"),
    postalCode: s(formData, "postalCode"),
    city: s(formData, "city"),
    googleMapsUrl: s(formData, "googleMapsUrl"),
    instagramUrl: s(formData, "instagramUrl"),
    facebookUrl: s(formData, "facebookUrl"),
    ctaText: s(formData, "ctaText"),
    ctaUrl: s(formData, "ctaUrl"),
    footerText: s(formData, "footerText"),
    copyright: s(formData, "copyright"),
  };

  const parsed = siteSettingsSchema.safeParse(candidate);
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "Validation échouée.");
  }

  const res = await saveContentKey("settings", parsed.data, REVALIDATE_PATHS);
  if (!res.ok) fail(res.error);
  done("Modifications enregistrées.");
}
