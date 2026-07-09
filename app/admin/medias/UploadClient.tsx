"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { registerMediaAction } from "./actions";
import { SITE_LOCATIONS, USAGE_TYPES } from "@/lib/billing/types";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const ALLOWED_TYPES = new Set([...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function slugify(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "media";
}

function fmtBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function uploadViaXHR(
  url: string,
  accessToken: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        let msg = `Erreur ${xhr.status}`;
        try {
          const body = JSON.parse(xhr.responseText) as { message?: string; error?: string };
          msg = body.message ?? body.error ?? msg;
        } catch {
          // pas JSON
        }
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error("Erreur réseau lors de l'upload"));
    xhr.send(file);
  });
}

export function UploadClient() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadedUrl(null);
    setError(null);
    setProgress(0);
    setFile(null);

    if (!f) return;

    if (!ALLOWED_TYPES.has(f.type)) {
      setError("Format non supporté. Utilisez JPG, PNG, WebP, GIF, AVIF, MP4, WebM ou MOV.");
      return;
    }

    const isVideo = ALLOWED_VIDEO_TYPES.has(f.type);
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (f.size > maxBytes) {
      setError(
        isVideo
          ? `Vidéo trop lourde (${fmtBytes(f.size)}) — limite 200 Mo. Compressez avec HandBrake ou iMovie.`
          : `Image trop lourde (${fmtBytes(f.size)}) — limite 20 Mo.`,
      );
      return;
    }

    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file || uploading) return;

    const fd = new FormData(e.currentTarget);
    const siteLocation = (fd.get("site_location") as string) || "footer-ambiance";
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const storagePath = `${siteLocation}/${Date.now()}-${slugify(file.name)}.${ext}`;

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Session expirée — reconnectez-vous.");

      // Upload direct via XHR pour une vraie barre de progression
      const uploadUrl = `${SUPABASE_URL}/storage/v1/object/site-media/${storagePath}`;
      await uploadViaXHR(uploadUrl, session.access_token, file, setProgress);

      const { data: urlData } = supabase.storage
        .from("site-media")
        .getPublicUrl(storagePath);

      setUploadedUrl(urlData.publicUrl);

      // Enregistrement DB via Server Action (pas de fichier binaire envoyé)
      const registerFd = new FormData();
      registerFd.append("storage_path", storagePath);
      registerFd.append("file_url", urlData.publicUrl);
      registerFd.append("file_type", file.type.startsWith("video/") ? "video" : "image");
      registerFd.append("site_location", siteLocation);
      registerFd.append("usage_type", (fd.get("usage_type") as string) || "image-principale");
      registerFd.append("title", (fd.get("title") as string) || file.name);
      registerFd.append("alt_text", (fd.get("alt_text") as string) || "");
      registerFd.append("caption", (fd.get("caption") as string) || "");
      registerFd.append("sort_order", (fd.get("sort_order") as string) || "0");

      const result = await registerMediaAction(registerFd);
      if (result?.error) throw new Error(result.error);

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      router.push("/admin/medias?uploaded=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
      setUploading(false);
    }
  }

  const isVideo = file?.type.startsWith("video/") ?? false;

  return (
    <section className="rounded-2xl border border-taupe-300/40 bg-white p-7">
      <h2 className="mb-1 font-serif text-xl text-ink-900">Ajouter un média</h2>
      <p className="mb-6 text-sm text-taupe-500">
        Le média sera en <strong>brouillon</strong> — invisible sur le site tant que vous ne cliquez pas sur Publier.
        L&apos;upload se fait directement depuis votre navigateur, sans passer par le serveur.
      </p>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
        {/* Sélection fichier */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-taupe-600">
            Fichier (image ou vidéo) *
          </label>
          <p className="text-[11px] text-taupe-400">
            Images : JPG, PNG, WebP, AVIF, GIF — max 20 Mo · Vidéos : MP4, WebM, MOV — max 200 Mo
          </p>
          <input
            type="file"
            name="file_picker"
            accept="image/*,video/*"
            onChange={handleFileChange}
            disabled={uploading}
            required
            className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 file:mr-4 file:rounded-lg file:border-0 file:bg-ink-900 file:px-3 file:py-1 file:text-xs file:font-medium file:text-sand-50 disabled:opacity-50"
          />
          {file && (
            <p className="text-[11px] text-taupe-400">
              {file.name} · {fmtBytes(file.size)} · {isVideo ? "Vidéo" : "Image"}
            </p>
          )}
        </div>

        {/* Preview locale (avant upload) */}
        {previewUrl && !uploadedUrl && (
          <div className="overflow-hidden rounded-xl border border-taupe-200/50">
            <p className="border-b border-taupe-100 bg-sand-50 px-3 py-1.5 text-[10px] uppercase tracking-wider text-taupe-400">
              Aperçu local — avant upload
            </p>
            {isVideo ? (
              <video src={previewUrl} controls className="max-h-64 w-full object-contain bg-sand-100" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Aperçu" className="max-h-64 w-full object-contain bg-sand-100" />
            )}
          </div>
        )}

        {/* Preview Supabase (après upload réussi) */}
        {uploadedUrl && (
          <div className="overflow-hidden rounded-xl border border-green-200">
            <p className="border-b border-green-100 bg-green-50 px-3 py-1.5 text-[10px] uppercase tracking-wider text-green-700">
              ✓ Uploadé · Aperçu depuis Supabase Storage
            </p>
            {isVideo ? (
              <video src={uploadedUrl} controls className="max-h-64 w-full object-contain bg-sand-100" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={uploadedUrl} alt="Aperçu uploadé" className="max-h-64 w-full object-contain bg-sand-100" />
            )}
          </div>
        )}

        {/* Progress bar */}
        {uploading && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-taupe-500">
              <span>Upload en cours vers Supabase Storage…</span>
              <span className="font-mono font-medium text-ink-900">{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-sand-200">
              <div
                className="h-full rounded-full bg-ink-900 transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Métadonnées */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-taupe-600">Emplacement sur le site *</label>
            <select
              name="site_location"
              disabled={uploading}
              className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 focus:border-taupe-500 focus:outline-none disabled:opacity-50"
            >
              {SITE_LOCATIONS.map((loc) => (
                <option key={loc.value} value={loc.value}>{loc.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-taupe-600">Type d&apos;usage *</label>
            <select
              name="usage_type"
              disabled={uploading}
              className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 focus:border-taupe-500 focus:outline-none disabled:opacity-50"
            >
              {USAGE_TYPES.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-taupe-600">Titre</label>
            <input
              type="text"
              name="title"
              placeholder="Ex : Photo cabinet principal"
              disabled={uploading}
              className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 placeholder-taupe-400 focus:border-taupe-500 focus:outline-none disabled:opacity-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-taupe-600">Ordre d&apos;affichage</label>
            <input
              type="number"
              name="sort_order"
              defaultValue={0}
              min={0}
              disabled={uploading}
              className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 focus:border-taupe-500 focus:outline-none disabled:opacity-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-taupe-600">Texte alternatif (SEO)</label>
            <input
              type="text"
              name="alt_text"
              placeholder="Ex : Salle de coaching Mise en Mouvement"
              disabled={uploading}
              className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 placeholder-taupe-400 focus:border-taupe-500 focus:outline-none disabled:opacity-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-taupe-600">Légende visible (optionnel)</label>
            <input
              type="text"
              name="caption"
              placeholder="Ex : Vue de l'espace coaching"
              disabled={uploading}
              className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 placeholder-taupe-400 focus:border-taupe-500 focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!file || uploading}
            className="rounded-xl bg-ink-900 px-6 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? `Upload ${progress}%…` : "Uploader"}
          </button>
        </div>
      </form>
    </section>
  );
}
