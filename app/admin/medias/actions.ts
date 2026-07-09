"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, getSupabaseAdmin } from "@/lib/supabase/server";
import { createMediaItem, updateMediaItem, deleteMediaItem } from "@/lib/billing/server";
import type { MediaCategory } from "@/lib/billing/types";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

const CATEGORY_MAP: Record<string, MediaCategory> = {
  hero: "hero",
  cabinet: "cabinet",
  coachs: "coach",
  decouverte: "seance",
  temoignages: "temoignage",
  exercices: "exercices",
};

function toCategory(siteLocation: string): MediaCategory {
  return CATEGORY_MAP[siteLocation] ?? "ambiance";
}

/**
 * Enregistre en DB les métadonnées d'un fichier déjà uploadé côté client vers Supabase Storage.
 * Ne reçoit jamais le fichier binaire — élimine les limites Vercel.
 */
export async function registerMediaAction(
  formData: FormData,
): Promise<{ error?: string }> {
  await requireAdmin();

  const storagePath = (formData.get("storage_path") as string | null)?.trim();
  const fileUrl = (formData.get("file_url") as string | null)?.trim();
  const rawType = (formData.get("file_type") as string | null)?.trim();

  if (!fileUrl || !rawType) {
    return { error: "Données manquantes (file_url, file_type)" };
  }
  if (rawType !== "image" && rawType !== "video") {
    return { error: "Type de fichier invalide" };
  }

  const siteLocation = (formData.get("site_location") as string) || "footer-ambiance";

  const created = await createMediaItem({
    title: (formData.get("title") as string) || "",
    description: "",
    file_url: fileUrl,
    file_type: rawType,
    category: toCategory(siteLocation),
    site_location: siteLocation,
    usage_type: (formData.get("usage_type") as string) || "image-principale",
    alt_text: (formData.get("alt_text") as string) || "",
    caption: (formData.get("caption") as string) || "",
    is_active: true,
    status: "draft",
    sort_order: Number(formData.get("sort_order") || 0),
  });

  if (!created) return { error: "Erreur lors de l'enregistrement en base de données" };
  return {};
}

export async function updateMediaAction(formData: FormData) {
  await requireAdmin();

  const id = formData.get("id") as string;
  if (!id) redirect("/admin/medias");

  const siteLocation = (formData.get("site_location") as string) || "footer-ambiance";

  await updateMediaItem(id, {
    title: (formData.get("title") as string) || "",
    category: toCategory(siteLocation),
    site_location: siteLocation,
    usage_type: (formData.get("usage_type") as string) || "image-principale",
    alt_text: (formData.get("alt_text") as string) || "",
    caption: (formData.get("caption") as string) || "",
    sort_order: Number(formData.get("sort_order") || 0),
  });

  redirect("/admin/medias?saved=1");
}

export async function deleteMediaAction(formData: FormData) {
  await requireAdmin();

  const id = formData.get("id") as string;
  const storagePath = (formData.get("storage_path") as string | null)?.trim() || null;
  const fileUrl = (formData.get("file_url") as string | null)?.trim() || null;

  // Résoudre le chemin storage : priorité storage_path en DB, fallback parse URL
  let resolvedPath: string | null = storagePath;
  if (!resolvedPath && fileUrl) {
    try {
      const parsed = new URL(fileUrl);
      const marker = "/site-media/";
      const idx = parsed.pathname.indexOf(marker);
      if (idx !== -1) resolvedPath = parsed.pathname.slice(idx + marker.length);
    } catch {
      // URL malformée — on continue sans supprimer le fichier storage
    }
  }

  if (resolvedPath) {
    const { error: delErr } = await getSupabaseAdmin().storage
      .from("site-media")
      .remove([resolvedPath]);
    if (delErr) console.error("[Media Delete] Storage:", delErr.message);
  }

  if (id) await deleteMediaItem(id);
  redirect("/admin/medias?deleted=1");
}

export async function setMediaStatusAction(formData: FormData) {
  await requireAdmin();

  const id = formData.get("id") as string;
  const status = formData.get("status") as "draft" | "published" | "archived";

  if (!id || !["draft", "published", "archived"].includes(status)) {
    redirect("/admin/medias");
  }

  await updateMediaItem(id, { status });
  redirect("/admin/medias");
}

