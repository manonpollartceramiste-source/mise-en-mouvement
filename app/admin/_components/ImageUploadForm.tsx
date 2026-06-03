"use client";

import { useTransition, useState, useRef } from "react";

const MAX_SOURCE_BYTES = 20 * 1024 * 1024; // 20 Mo — refusé avant même compression
const MAX_WIDTH = 1800;
const QUALITY = 0.85;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
];

async function compressToWebP(file: File): Promise<File> {
  // SVG : vecteur, pas de compression canvas
  if (file.type === "image/svg+xml") return file;

  const objectUrl = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Impossible de lire l'image."));
    img.src = objectUrl;
  });
  URL.revokeObjectURL(objectUrl);

  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (w > MAX_WIDTH) {
    h = Math.round((h * MAX_WIDTH) / w);
    w = MAX_WIDTH;
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponible.");
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Compression échouée."))),
      "image/webp",
      QUALITY,
    ),
  );

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.webp`, { type: "image/webp" });
}

function fmt(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} Ko`
    : `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

export function ImageUploadForm({
  action,
  extraData,
}: {
  action: (formData: FormData) => Promise<void>;
  extraData?: Record<string, string>;
}) {
  const [isPending, startTransition] = useTransition();
  const [clientError, setClientError] = useState<string | null>(null);
  const [sizeInfo, setSizeInfo] = useState<{
    original: number;
    compressed: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Format non supporté (${file.type || "inconnu"}). Utilisez JPG, PNG, WEBP ou SVG.`;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      return `Fichier trop lourd (${fmt(file.size)}). Maximum accepté : 20 Mo.`;
    }
    return null;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setClientError(null);
    setSizeInfo(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) setClientError(err);
  }

  function handleSubmit() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setClientError("Sélectionne d'abord un fichier image.");
      return;
    }
    const err = validateFile(file);
    if (err) {
      setClientError(err);
      return;
    }
    setClientError(null);

    startTransition(async () => {
      let finalFile = file;
      try {
        finalFile = await compressToWebP(file);
        setSizeInfo({ original: file.size, compressed: finalFile.size });
      } catch {
        // Compression échouée → on envoie l'original sans bloquer l'upload
        finalFile = file;
      }

      const fd = new FormData();
      fd.set("file", finalFile);
      if (extraData) {
        for (const [k, v] of Object.entries(extraData)) fd.set(k, v);
      }
      await action(fd);
    });
  }

  return (
    <div className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wider text-taupe-500">
          Remplacer par
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={handleFileChange}
          disabled={isPending}
          className="block w-full text-sm text-ink-900 file:mr-3 file:rounded-full file:border-0 file:bg-taupe-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-sand-50 hover:file:bg-taupe-800 disabled:opacity-50"
        />
        <p className="text-xs text-taupe-500">
          JPG · PNG · WEBP · SVG — image recommandée : moins de 5 Mo ·
          compressée automatiquement en WEBP (1800 px max, qualité 85 %)
        </p>
      </label>

      {sizeInfo && sizeInfo.compressed < sizeInfo.original && (
        <p className="text-xs text-taupe-400">
          Compressé :{" "}
          <span className="text-emerald-700 font-medium">
            {fmt(sizeInfo.original)} → {fmt(sizeInfo.compressed)}
          </span>
        </p>
      )}

      {clientError && (
        <p className="rounded-xl border border-red-300/60 bg-red-50 px-3 py-2 text-xs text-red-800">
          {clientError}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-full bg-taupe-700 px-5 py-2.5 text-sm font-medium text-sand-50 transition-all hover:bg-taupe-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Envoi en cours…" : "Uploader →"}
      </button>
    </div>
  );
}
