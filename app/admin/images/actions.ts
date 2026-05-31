"use server";

import { redirect } from "next/navigation";
import {
  defaultImages,
  siteImagesSchema,
  type SiteImages,
} from "@/lib/content/images";
import { loadImages } from "@/lib/content/images.server";
import {
  getCurrentUser,
  getSupabaseServer,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { saveContentKey } from "@/lib/supabase/content";

const REVALIDATE_PATHS = [
  "/",
  "/coachs",
  "/reservation",
  "/admin/images",
];

const BUCKET = "site-assets";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function fail(reason: string): never {
  redirect(`/admin/images?error=${encodeURIComponent(reason)}`);
}

function done(msg: string): never {
  redirect(`/admin/images?saved=${encodeURIComponent(msg)}`);
}

function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/svg+xml") return "svg";
  return "bin";
}

type Slot =
  | "logo"
  | "hero"
  | "background"
  | { coach: string }
  | { gallery: string };

async function uploadAndPersist(slot: Slot, file: File): Promise<void> {
  if (!isSupabaseConfigured()) fail("Supabase non configuré.");
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  if (file.size === 0) fail("Aucun fichier sélectionné.");
  if (file.size > MAX_BYTES) fail("Fichier trop lourd (max 5 Mo).");
  if (!file.type.startsWith("image/")) fail("Le fichier doit être une image.");

  const ext = extFromMime(file.type);
  const slotKey =
    typeof slot === "string"
      ? slot
      : "coach" in slot
        ? `coach-${slot.coach}`
        : `gallery-${slot.gallery}`;
  const path = `${slotKey}-${Date.now()}.${ext}`;

  const supabase = await getSupabaseServer();
  const buf = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buf, {
      contentType: file.type,
      upsert: false,
    });
  if (upErr) fail(`Upload échoué : ${upErr.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const current: SiteImages = await loadImages();
  let next: SiteImages;
  if (slot === "logo") {
    next = { ...current, logo: publicUrl };
  } else if (slot === "hero") {
    next = { ...current, hero: publicUrl };
  } else if (slot === "background") {
    next = { ...current, background: publicUrl };
  } else if (typeof slot === "object" && "coach" in slot) {
    next = {
      ...current,
      coaches: { ...current.coaches, [slot.coach]: publicUrl },
    };
  } else {
    const gallerySlot = (slot as { gallery: string }).gallery;
    next = {
      ...current,
      gallery: { ...current.gallery, [gallerySlot]: publicUrl },
    };
  }

  const valid = siteImagesSchema.safeParse(next);
  if (!valid.success) fail("Validation échouée.");

  const res = await saveContentKey("images", valid.data, REVALIDATE_PATHS);
  if (!res.ok) fail(res.error);

  done(`Image enregistrée (${slotKey}).`);
}

export async function uploadLogo(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) fail("Fichier manquant.");
  await uploadAndPersist("logo", file);
}

export async function uploadHero(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) fail("Fichier manquant.");
  await uploadAndPersist("hero", file);
}

export async function uploadBackground(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) fail("Fichier manquant.");
  await uploadAndPersist("background", file);
}

export async function uploadCoachPhoto(formData: FormData) {
  const coachId = String(formData.get("coachId") ?? "").trim();
  if (!coachId) fail("Coach manquant.");
  const file = formData.get("file");
  if (!(file instanceof File)) fail("Fichier manquant.");
  await uploadAndPersist({ coach: coachId }, file);
}

export async function uploadGalleryPhoto(formData: FormData) {
  const gallerySlot = String(formData.get("gallerySlot") ?? "").trim();
  if (!gallerySlot) fail("Slot galerie manquant.");
  const file = formData.get("file");
  if (!(file instanceof File)) fail("Fichier manquant.");
  await uploadAndPersist({ gallery: gallerySlot }, file);
}

export async function clearImage(formData: FormData) {
  if (!isSupabaseConfigured()) fail("Supabase non configuré.");
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const slot = String(formData.get("slot") ?? "");
  const current: SiteImages = await loadImages();
  let next: SiteImages = { ...defaultImages, ...current };

  if (slot === "logo") {
    next = { ...current, logo: null };
  } else if (slot === "hero") {
    next = { ...current, hero: null };
  } else if (slot === "background") {
    next = { ...current, background: null };
  } else if (slot.startsWith("coach:")) {
    const coachId = slot.slice("coach:".length);
    const { [coachId]: _omit, ...rest } = current.coaches;
    void _omit;
    next = { ...current, coaches: rest };
  } else if (slot.startsWith("gallery:")) {
    const galleryKey = slot.slice("gallery:".length);
    const { [galleryKey]: _omit, ...rest } = current.gallery;
    void _omit;
    next = { ...current, gallery: rest };
  } else {
    fail("Slot inconnu.");
  }

  const res = await saveContentKey("images", next, REVALIDATE_PATHS);
  if (!res.ok) fail(res.error);
  done("Image retirée.");
}
