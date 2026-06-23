"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  createMediaItem,
  updateMediaItem,
  deleteMediaItem,
} from "@/lib/billing/server";
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
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export async function uploadMediaAction(formData: FormData) {
  await requireAdmin();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) redirect("/admin/medias?error=no-file");
  if (!ALLOWED_TYPES.has(file!.type)) redirect("/admin/medias?error=type");
  if (file!.size > MAX_SIZE_BYTES) redirect("/admin/medias?error=size");

  const supabase = await getSupabaseServer();
  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("site-media")
    .upload(filename, file, { contentType: file.type, upsert: false });

  if (uploadError || !uploadData) {
    console.error("[Media Upload] Erreur:", uploadError);
    redirect("/admin/medias?error=upload");
  }

  const { data: urlData } = supabase.storage
    .from("site-media")
    .getPublicUrl(uploadData.path);

  const fileType = file.type.startsWith("video/") ? "video" : "image";

  await createMediaItem({
    title: (formData.get("title") as string) || file.name,
    description: (formData.get("description") as string) || "",
    file_url: urlData.publicUrl,
    file_type: fileType,
    category: ((formData.get("category") as string) || "ambiance") as MediaCategory,
    is_active: true,
    sort_order: 0,
  });

  redirect("/admin/medias?uploaded=1");
}

export async function updateMediaAction(formData: FormData) {
  await requireAdmin();

  const id = formData.get("id") as string;
  if (!id) redirect("/admin/medias");

  await updateMediaItem(id, {
    title: (formData.get("title") as string) || "",
    description: (formData.get("description") as string) || "",
    category: ((formData.get("category") as string) || "ambiance") as MediaCategory,
    is_active: formData.get("is_active") === "true",
    sort_order: Number(formData.get("sort_order") || 0),
  });

  redirect("/admin/medias?saved=1");
}

export async function deleteMediaAction(formData: FormData) {
  await requireAdmin();

  const id = formData.get("id") as string;
  const fileUrl = formData.get("file_url") as string;

  if (fileUrl) {
    const supabase = await getSupabaseServer();
    try {
      const parsed = new URL(fileUrl);
      // URL pattern: /storage/v1/object/public/site-media/<path>
      const marker = "/site-media/";
      const idx = parsed.pathname.indexOf(marker);
      const storagePath = idx !== -1 ? parsed.pathname.slice(idx + marker.length) : null;
      if (storagePath) {
        await supabase.storage.from("site-media").remove([storagePath]);
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
