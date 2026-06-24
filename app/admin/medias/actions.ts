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

const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
  "video/mp4", "video/webm", "video/quicktime",
]);
const MAX_SIZE_BYTES = 50 * 1024 * 1024;

export async function uploadMediaAction(formData: FormData) {
  await requireAdmin();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) redirect("/admin/medias?error=no-file");
  if (!ALLOWED_TYPES.has(file!.type)) redirect("/admin/medias?error=type");
  if (file!.size > MAX_SIZE_BYTES) redirect("/admin/medias?error=size");

  const supabaseAdmin = getSupabaseAdmin();
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const slug = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "media";
  const siteLocation = (formData.get("site_location") as string) || "footer-ambiance";
  const storagePath = `${siteLocation}/${Date.now()}-${slug}.${ext}`;

  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from("site-media")
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError || !uploadData) {
    const msg = uploadError?.message ?? "unknown";
    console.error(
      `[Media Upload] ERREUR\n  bucket: site-media\n  path: ${storagePath}\n  size: ${file.size} bytes\n  type: ${file.type}\n  supabase: ${msg}`,
    );
    redirect(`/admin/medias?error=upload&detail=${encodeURIComponent(msg)}`);
  }

  const { data: urlData } = supabaseAdmin.storage
    .from("site-media")
    .getPublicUrl(uploadData.path);

  const fileType = file.type.startsWith("video/") ? "video" : "image";

  // Dériver la category legacy depuis site_location pour compatibilité
  const categoryMap: Record<string, MediaCategory> = {
    hero: "hero",
    cabinet: "cabinet",
    coachs: "coach",
    decouverte: "seance",
    temoignages: "temoignage",
    exercices: "exercices",
  };
  const category: MediaCategory = categoryMap[siteLocation] ?? "ambiance";

  await createMediaItem({
    title: (formData.get("title") as string) || file.name,
    description: "",
    file_url: urlData.publicUrl,
    file_type: fileType,
    category,
    site_location: siteLocation,
    usage_type: (formData.get("usage_type") as string) || "image-principale",
    alt_text: (formData.get("alt_text") as string) || "",
    caption: (formData.get("caption") as string) || "",
    is_active: true,
    status: "draft",
    sort_order: Number(formData.get("sort_order") || 0),
  });

  redirect("/admin/medias?uploaded=1");
}

export async function updateMediaAction(formData: FormData) {
  await requireAdmin();

  const id = formData.get("id") as string;
  if (!id) redirect("/admin/medias");

  const siteLocation = (formData.get("site_location") as string) || "footer-ambiance";
  const categoryMap: Record<string, MediaCategory> = {
    hero: "hero",
    cabinet: "cabinet",
    coachs: "coach",
    decouverte: "seance",
    temoignages: "temoignage",
    exercices: "exercices",
  };
  const category: MediaCategory = categoryMap[siteLocation] ?? "ambiance";

  await updateMediaItem(id, {
    title: (formData.get("title") as string) || "",
    category,
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
  const fileUrl = formData.get("file_url") as string;

  if (fileUrl) {
    try {
      const parsed = new URL(fileUrl);
      const marker = "/site-media/";
      const idx = parsed.pathname.indexOf(marker);
      const storagePath = idx !== -1 ? parsed.pathname.slice(idx + marker.length) : null;
      if (storagePath) {
        const { error: delErr } = await getSupabaseAdmin().storage
          .from("site-media")
          .remove([storagePath]);
        if (delErr) console.error("[Media Delete] Storage:", delErr.message);
      }
    } catch {
      // URL malformée — on ignore, la DB sera nettoyée quand même
    }
  }

  if (id) await deleteMediaItem(id);
  redirect("/admin/medias?deleted=1");
}

export async function toggleMediaAction(formData: FormData) {
  await requireAdmin();

  const id = formData.get("id") as string;
  const current = formData.get("is_active") === "true";

  await updateMediaItem(id, { is_active: !current });
  redirect("/admin/medias");
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
