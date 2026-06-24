import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMediaItems } from "@/lib/billing/server";
import { SITE_LOCATIONS, USAGE_TYPES } from "@/lib/billing/types";
import type { MediaItem, MediaStatus } from "@/lib/billing/types";
import {
  uploadMediaAction,
  updateMediaAction,
  setMediaStatusAction,
} from "./actions";
import { DeleteButton } from "./DeleteButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Médiathèque · Admin",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{
  uploaded?: string;
  deleted?: string;
  saved?: string;
  error?: string;
  detail?: string;
  preview?: string;
}>;

const DISPLAY_GROUPS = [
  "hero",
  "decouverte",
  "cabinet",
  "coachs",
  "exercices",
  "temoignages",
  "avant-apres",
  "comment-ca-se-passe",
  "footer-ambiance",
];

const STATUS_META: Record<MediaStatus, { label: string; cls: string; dot: string }> = {
  draft:     { label: "Brouillon",  cls: "bg-amber-50 text-amber-700 border-amber-200",  dot: "bg-amber-400" },
  published: { label: "Publié",     cls: "bg-green-50 text-green-700 border-green-200",  dot: "bg-green-500" },
  archived:  { label: "Archivé",    cls: "bg-sand-100 text-taupe-500 border-taupe-200",  dot: "bg-taupe-400" },
};

function getStatus(media: MediaItem): MediaStatus {
  return (media.status as MediaStatus) ?? "published";
}

export default async function MediasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const { uploaded, deleted, saved, error, detail, preview } = await searchParams;
  const medias = await getMediaItems(true); // adminView = true → tous statuts

  const grouped = new Map<string, MediaItem[]>();
  for (const loc of DISPLAY_GROUPS) grouped.set(loc, []);
  for (const m of medias) {
    const loc = m.site_location || "footer-ambiance";
    if (!grouped.has(loc)) grouped.set(loc, []);
    grouped.get(loc)!.push(m);
  }

  const previewMedia = preview ? medias.find((m) => m.id === preview) : null;

  const draftCount = medias.filter((m) => getStatus(m) === "draft").length;
  const publishedCount = medias.filter((m) => getStatus(m) === "published").length;

  return (
    <main className="min-h-screen bg-sand-50">
      {/* Preview modale */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-taupe-200/40 px-6 py-4">
              <div>
                <p className="text-xs font-medium text-taupe-500 uppercase tracking-wide">
                  Prévisualisation — {SITE_LOCATIONS.find((l) => l.value === previewMedia.site_location)?.label ?? previewMedia.site_location}
                </p>
                <p className="font-serif text-lg text-ink-900">{previewMedia.title}</p>
              </div>
              <Link
                href="/admin/medias"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-sand-100 text-taupe-600 hover:bg-sand-200 transition-colors text-sm"
              >
                ✕
              </Link>
            </div>
            <div className="p-6">
              <PreviewLayout media={previewMedia} />
            </div>
            <div className="border-t border-taupe-200/40 px-6 py-3 flex items-center justify-between bg-sand-50">
              <p className="text-xs text-taupe-400">
                {previewMedia.alt_text && <>Alt : {previewMedia.alt_text} · </>}
                {previewMedia.usage_type} · {previewMedia.file_type}
              </p>
              {getStatus(previewMedia) !== "published" && (
                <form action={setMediaStatusAction}>
                  <input type="hidden" name="id" value={previewMedia.id} />
                  <input type="hidden" name="status" value="published" />
                  <button
                    type="submit"
                    className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                  >
                    Publier sur le site
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-10 border-b border-taupe-300/30 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <Link href="/admin" className="text-xs text-taupe-500 hover:text-ink-900">
              ← Admin
            </Link>
            <h1 className="mt-0.5 font-serif text-2xl text-ink-900">Médiathèque</h1>
          </div>
          <div className="flex items-center gap-3">
            {draftCount > 0 && (
              <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-700">
                {draftCount} brouillon{draftCount > 1 ? "s" : ""}
              </span>
            )}
            <span className="rounded-full bg-sand-100 px-3 py-1 text-xs text-taupe-600">
              {publishedCount} publié{publishedCount !== 1 ? "s" : ""} · {medias.length} total
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-10">
        {/* Notifications */}
        {uploaded && (
          <div className="rounded-xl bg-green-50 border border-green-200 px-5 py-3 text-sm font-medium text-green-700">
            Média uploadé et enregistré — statut <strong>Brouillon</strong>. Cliquez sur Publier pour le mettre en ligne.
          </div>
        )}
        {deleted && (
          <div className="rounded-xl bg-sand-100 px-5 py-3 text-sm font-medium text-taupe-700">
            Média supprimé.
          </div>
        )}
        {saved && (
          <div className="rounded-xl bg-green-50 border border-green-200 px-5 py-3 text-sm font-medium text-green-700">
            Modifications enregistrées.
          </div>
        )}
        {error === "upload" && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-3 text-sm font-medium text-red-700 space-y-1">
            <p>Erreur upload — bucket : <code className="font-mono">site-media</code></p>
            {detail && (
              <p className="font-mono text-xs font-normal text-red-600 break-all">
                Supabase : {decodeURIComponent(detail)}
              </p>
            )}
          </div>
        )}
        {error === "no-file" && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-3 text-sm font-medium text-red-700">
            Aucun fichier sélectionné.
          </div>
        )}
        {error === "type" && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-3 text-sm font-medium text-red-700">
            Type non supporté. Utilisez JPG, PNG, WebP, GIF, MP4, WebM ou MOV.
          </div>
        )}
        {error === "size" && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-3 text-sm font-medium text-red-700">
            Fichier trop volumineux (limite : 50 Mo).
          </div>
        )}

        {/* ── Formulaire upload ─────────────────────────────── */}
        <section className="rounded-2xl border border-taupe-300/40 bg-white p-7">
          <h2 className="mb-1 font-serif text-xl text-ink-900">Ajouter un média</h2>
          <p className="mb-6 text-sm text-taupe-500">
            Le média sera enregistré en brouillon — il n&apos;apparaîtra pas sur le site
            tant que vous ne cliquez pas sur <strong>Publier</strong>.
          </p>
          <form action={uploadMediaAction} encType="multipart/form-data" className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-taupe-600">
                Fichier (image ou vidéo) *
              </label>
              <input
                type="file"
                name="file"
                accept="image/*,video/*"
                required
                className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 file:mr-4 file:rounded-lg file:border-0 file:bg-ink-900 file:px-3 file:py-1 file:text-xs file:font-medium file:text-sand-50"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-taupe-600">
                  Emplacement sur le site *
                </label>
                <select
                  name="site_location"
                  className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 focus:border-taupe-500 focus:outline-none"
                >
                  {SITE_LOCATIONS.map((loc) => (
                    <option key={loc.value} value={loc.value}>
                      {loc.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-taupe-600">
                  Type d&apos;usage *
                </label>
                <select
                  name="usage_type"
                  className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 focus:border-taupe-500 focus:outline-none"
                >
                  {USAGE_TYPES.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-taupe-600">Titre</label>
                <input
                  type="text"
                  name="title"
                  placeholder="Ex : Photo cabinet principal"
                  className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 placeholder-taupe-400 focus:border-taupe-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-taupe-600">
                  Ordre d&apos;affichage
                </label>
                <input
                  type="number"
                  name="sort_order"
                  defaultValue={0}
                  min={0}
                  className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 focus:border-taupe-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-taupe-600">
                  Texte alternatif (SEO / accessibilité)
                </label>
                <input
                  type="text"
                  name="alt_text"
                  placeholder="Ex : Salle de coaching Mise en Mouvement"
                  className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 placeholder-taupe-400 focus:border-taupe-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-taupe-600">
                  Légende visible (optionnel)
                </label>
                <input
                  type="text"
                  name="caption"
                  placeholder="Ex : Vue de l'espace coaching"
                  className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 placeholder-taupe-400 focus:border-taupe-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-ink-900 px-6 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-700"
              >
                Uploader
              </button>
            </div>
          </form>
        </section>

        {/* ── Médias groupés par emplacement ───────────────── */}
        {medias.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-16 text-center">
            <p className="font-serif text-2xl text-ink-900">Aucun média</p>
            <p className="mt-3 text-sm text-taupe-500">
              Uploadez votre première photo ou vidéo pour enrichir votre site.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {DISPLAY_GROUPS.map((locValue) => {
              const locMeta = SITE_LOCATIONS.find((l) => l.value === locValue);
              const items = grouped.get(locValue) ?? [];
              return (
                <section key={locValue}>
                  <div className="mb-5 flex items-end justify-between gap-4 border-b border-taupe-300/30 pb-4">
                    <div>
                      <h2 className="font-serif text-lg text-ink-900">
                        {locMeta?.label ?? locValue}
                      </h2>
                      {locMeta?.description && (
                        <p className="mt-0.5 text-xs text-taupe-500">
                          {locMeta.description}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-sand-100 px-2.5 py-0.5 text-xs text-taupe-500">
                      {items.length} média{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {items.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-taupe-200 px-5 py-4 text-sm text-taupe-400">
                      Aucun média pour cet emplacement.
                    </p>
                  ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {items.map((media) => (
                        <MediaCard key={media.id} media={media} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

// ── Prévisualisation contextuelle ─────────────────────────────

function PreviewLayout({ media }: { media: MediaItem }) {
  const loc = media.site_location;

  if (loc === "hero") {
    return (
      <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-ink-900">
        <MediaDisplay media={media} className="object-cover opacity-80" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
          <p className="font-serif text-3xl text-white">Mise en Mouvement</p>
          <p className="mt-2 text-sm text-sand-200">Coach sportif personnel</p>
        </div>
      </div>
    );
  }

  if (loc === "cabinet") {
    return (
      <div className="grid grid-cols-3 gap-2">
        <div className="relative col-span-2 aspect-[4/3] rounded-xl overflow-hidden">
          <MediaDisplay media={media} className="object-cover" />
        </div>
        <div className="space-y-2">
          <div className="aspect-[4/3] rounded-xl overflow-hidden bg-sand-100 flex items-center justify-center text-taupe-300 text-xs">
            Photo 2
          </div>
          <div className="aspect-[4/3] rounded-xl overflow-hidden bg-sand-100 flex items-center justify-center text-taupe-300 text-xs">
            Photo 3
          </div>
        </div>
      </div>
    );
  }

  if (loc === "coachs") {
    return (
      <div className="flex justify-center">
        <div className="w-48 rounded-2xl overflow-hidden shadow-md border border-taupe-200/40 bg-white">
          <div className="relative aspect-square overflow-hidden">
            <MediaDisplay media={media} className="object-cover" />
          </div>
          <div className="p-3 text-center">
            <p className="font-serif text-base text-ink-900">Prénom Coach</p>
            <p className="text-xs text-taupe-500">Coach certifié</p>
          </div>
        </div>
      </div>
    );
  }

  if (loc === "temoignages") {
    return (
      <div className="rounded-2xl bg-sand-50 border border-taupe-200/40 p-6 flex gap-4">
        <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0">
          <MediaDisplay media={media} className="object-cover" />
        </div>
        <div>
          <p className="text-sm text-ink-900 italic">&ldquo;Témoignage client exemple — votre visuel apparaîtra ici.&rdquo;</p>
          <p className="mt-2 text-xs font-medium text-taupe-500">— Prénom Client</p>
        </div>
      </div>
    );
  }

  if (loc === "footer-ambiance") {
    return (
      <div className="relative w-full h-32 rounded-2xl overflow-hidden">
        <MediaDisplay media={media} className="object-cover opacity-30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="font-serif text-xl text-ink-900">Footer ambiance</p>
        </div>
      </div>
    );
  }

  // Aperçu générique
  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-sand-100">
      <MediaDisplay media={media} className="object-contain" />
      {media.caption && (
        <p className="mt-3 text-center text-sm italic text-taupe-500">{media.caption}</p>
      )}
    </div>
  );
}

function MediaDisplay({
  media,
  className = "",
}: {
  media: MediaItem;
  className?: string;
}) {
  if (media.file_type === "video") {
    return (
      <video
        src={media.file_url}
        className={`h-full w-full ${className}`}
        autoPlay
        muted
        loop
        playsInline
      />
    );
  }
  return (
    <Image
      src={media.file_url}
      alt={media.alt_text || media.title}
      fill
      className={className}
      sizes="(max-width: 640px) 100vw, 50vw"
    />
  );
}

// ── Carte média ───────────────────────────────────────────────

function MediaCard({ media }: { media: MediaItem }) {
  const locMeta = SITE_LOCATIONS.find((l) => l.value === media.site_location);
  const usageMeta = USAGE_TYPES.find((u) => u.value === media.usage_type);
  const status = getStatus(media);
  const statusMeta = STATUS_META[status];

  return (
    <div
      className={`rounded-2xl border bg-white overflow-hidden transition-all ${
        status === "archived"
          ? "border-taupe-200/30 opacity-55"
          : "border-taupe-300/40"
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden bg-sand-100">
        {media.file_type === "video" ? (
          <video src={media.file_url} className="h-full w-full object-cover" muted />
        ) : (
          <Image
            src={media.file_url}
            alt={media.alt_text || media.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        )}

        {/* Badges overlay */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm bg-white/90 ${statusMeta.cls}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
            {statusMeta.label}
          </span>
        </div>

        {media.file_type === "video" && (
          <span className="absolute right-2 top-2 rounded-full bg-taupe-700/80 px-2 py-0.5 text-[10px] font-medium text-sand-50 backdrop-blur-sm">
            Vidéo
          </span>
        )}

        <span className="absolute bottom-2 right-2 rounded-full bg-ink-900/60 px-2 py-0.5 text-[10px] font-mono text-sand-100 backdrop-blur-sm">
          #{media.sort_order}
        </span>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <p className="truncate text-sm font-medium text-ink-900">
          {media.title || "Sans titre"}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {usageMeta && (
            <span className="rounded-full bg-sand-100 px-2 py-0.5 text-[10px] font-medium text-taupe-600">
              {usageMeta.label}
            </span>
          )}
          {locMeta && (
            <span className="rounded-full bg-sand-50 border border-taupe-200/60 px-2 py-0.5 text-[10px] text-taupe-500">
              {locMeta.label}
            </span>
          )}
        </div>

        {media.alt_text && (
          <p className="truncate text-[11px] text-taupe-400" title={media.alt_text}>
            {media.alt_text}
          </p>
        )}

        {/* Actions principales */}
        <div className="flex gap-2">
          {/* Prévisualiser */}
          <Link
            href={`/admin/medias?preview=${media.id}`}
            className="flex-1 rounded-lg border border-taupe-300/50 py-1.5 text-center text-xs font-medium text-ink-900 hover:bg-sand-50 transition-colors"
          >
            Prévisualiser
          </Link>

          {/* Publier / Dépublier */}
          {status === "published" ? (
            <form action={setMediaStatusAction} className="flex-1">
              <input type="hidden" name="id" value={media.id} />
              <input type="hidden" name="status" value="draft" />
              <button
                type="submit"
                className="w-full rounded-lg border border-amber-200 bg-amber-50 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
              >
                Dépublier
              </button>
            </form>
          ) : (
            <form action={setMediaStatusAction} className="flex-1">
              <input type="hidden" name="id" value={media.id} />
              <input type="hidden" name="status" value="published" />
              <button
                type="submit"
                className="w-full rounded-lg bg-green-600 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
              >
                Publier
              </button>
            </form>
          )}
        </div>

        {/* Actions secondaires */}
        <div className="flex items-center justify-between gap-2">
          {/* Archiver / Restaurer */}
          {status !== "archived" ? (
            <form action={setMediaStatusAction}>
              <input type="hidden" name="id" value={media.id} />
              <input type="hidden" name="status" value="archived" />
              <button type="submit" className="text-xs text-taupe-400 hover:text-taupe-700 transition-colors">
                Archiver
              </button>
            </form>
          ) : (
            <form action={setMediaStatusAction}>
              <input type="hidden" name="id" value={media.id} />
              <input type="hidden" name="status" value="draft" />
              <button type="submit" className="text-xs text-taupe-400 hover:text-taupe-700 transition-colors">
                Restaurer
              </button>
            </form>
          )}

          {/* Supprimer */}
          <DeleteButton id={media.id} fileUrl={media.file_url} />
        </div>

        {/* Édition inline */}
        <details className="group pt-1 border-t border-taupe-100">
          <summary className="cursor-pointer list-none pt-2 text-xs font-medium text-taupe-500 hover:text-ink-900">
            <span className="flex items-center gap-1">
              Modifier les métadonnées
              <span className="transition-transform group-open:rotate-90">›</span>
            </span>
          </summary>
          <form action={updateMediaAction} className="mt-3 space-y-2.5">
            <input type="hidden" name="id" value={media.id} />

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-taupe-500">Titre</label>
              <input
                type="text"
                name="title"
                defaultValue={media.title}
                className="rounded-lg border border-taupe-300/50 bg-sand-50 px-3 py-1.5 text-xs text-ink-900 focus:border-taupe-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-taupe-500">Emplacement</label>
              <select
                name="site_location"
                defaultValue={media.site_location || "footer-ambiance"}
                className="rounded-lg border border-taupe-300/50 bg-sand-50 px-3 py-1.5 text-xs text-ink-900 focus:border-taupe-500 focus:outline-none"
              >
                {SITE_LOCATIONS.map((loc) => (
                  <option key={loc.value} value={loc.value}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-taupe-500">Type d&apos;usage</label>
              <select
                name="usage_type"
                defaultValue={media.usage_type || "image-principale"}
                className="rounded-lg border border-taupe-300/50 bg-sand-50 px-3 py-1.5 text-xs text-ink-900 focus:border-taupe-500 focus:outline-none"
              >
                {USAGE_TYPES.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-taupe-500">Texte alternatif</label>
              <input
                type="text"
                name="alt_text"
                defaultValue={media.alt_text}
                placeholder="Description pour SEO et accessibilité"
                className="rounded-lg border border-taupe-300/50 bg-sand-50 px-3 py-1.5 text-xs text-ink-900 placeholder-taupe-300 focus:border-taupe-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-taupe-500">Légende</label>
              <input
                type="text"
                name="caption"
                defaultValue={media.caption}
                placeholder="Légende visible (optionnel)"
                className="rounded-lg border border-taupe-300/50 bg-sand-50 px-3 py-1.5 text-xs text-ink-900 placeholder-taupe-300 focus:border-taupe-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-taupe-500">Ordre</label>
              <input
                type="number"
                name="sort_order"
                defaultValue={media.sort_order}
                min={0}
                className="rounded-lg border border-taupe-300/50 bg-sand-50 px-3 py-1.5 text-xs text-ink-900 focus:border-taupe-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-ink-900 py-1.5 text-xs font-medium text-sand-50 transition-colors hover:bg-taupe-700"
            >
              Enregistrer
            </button>
          </form>
        </details>
      </div>
    </div>
  );
}
