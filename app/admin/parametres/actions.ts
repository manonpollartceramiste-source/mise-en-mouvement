"use server";

import { redirect } from "next/navigation";
import {
  defaultSettings,
  siteSettingsSchema,
  type SiteSettings,
} from "@/lib/content/settings";
import { loadSettings } from "@/lib/content/settings.server";
import { saveContentKey } from "@/lib/supabase/content";
import {
  getCurrentUser,
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

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

const BUCKET = "site-media";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

function fail(reason: string): never {
  redirect(`/admin/parametres?error=${encodeURIComponent(reason)}`);
}

function done(msg: string): never {
  redirect(`/admin/parametres?saved=${encodeURIComponent(msg)}`);
}

function s(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/svg+xml") return "svg";
  return "bin";
}

export async function saveSettings(formData: FormData) {
  // Préserver logoUrl et backgroundUrl — ils sont gérés par des actions séparées
  const current = await loadSettings();

  const candidate: SiteSettings = {
    ...defaultSettings,
    logoUrl: current.logoUrl,
    backgroundUrl: current.backgroundUrl,
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

async function uploadIdentityFile(
  slot: "logo" | "background",
  formData: FormData,
): Promise<void> {
  if (!isSupabaseConfigured()) fail("Supabase non configuré.");
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) fail("Aucun fichier sélectionné.");
  if (file.size > MAX_BYTES)
    fail(`Fichier trop lourd (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum : 10 Mo.`);
  if (!ALLOWED_TYPES.includes(file.type))
    fail(`Format non supporté (${file.type || "inconnu"}). Utilisez JPG, PNG, WEBP ou SVG.`);

  const path = `${slot}-${Date.now()}.${extFromMime(file.type)}`;
  const admin = getSupabaseAdmin();
  const buf = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: file.type, upsert: false });
  if (upErr) fail(`Upload échoué : ${upErr.message}`);

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl;

  const current = await loadSettings();
  const next: SiteSettings = slot === "logo"
    ? { ...current, logoUrl: publicUrl }
    : { ...current, backgroundUrl: publicUrl };

  const parsed = siteSettingsSchema.safeParse(next);
  if (!parsed.success) fail("Validation interne échouée.");

  const res = await saveContentKey("settings", parsed.data, REVALIDATE_PATHS);
  if (!res.ok) fail(`Sauvegarde échouée : ${res.error}`);

  done(`${slot === "logo" ? "Logo" : "Arrière-plan"} mis à jour.`);
}

export async function uploadLogoAction(formData: FormData) {
  await uploadIdentityFile("logo", formData);
}

export async function uploadBackgroundAction(formData: FormData) {
  await uploadIdentityFile("background", formData);
}

export async function clearIdentityAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const slot = formData.get("slot") as "logo" | "background" | null;
  if (slot !== "logo" && slot !== "background") fail("Slot inconnu.");

  const current = await loadSettings();
  const next: SiteSettings = slot === "logo"
    ? { ...current, logoUrl: null }
    : { ...current, backgroundUrl: null };

  const res = await saveContentKey("settings", next, REVALIDATE_PATHS);
  if (!res.ok) fail(res.error);
  done(`${slot === "logo" ? "Logo" : "Arrière-plan"} retiré.`);
}
