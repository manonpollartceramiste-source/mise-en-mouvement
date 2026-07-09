import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMediaItems } from "@/lib/billing/server";
import { SITE_LOCATIONS, USAGE_TYPES } from "@/lib/billing/types";
import type { MediaItem, MediaStatus } from "@/lib/billing/types";

type MediaRow = MediaItem & { storage_path?: string | null };
import { updateMediaAction, setMediaStatusAction } from "./actions";
import { DeleteButton } from "./DeleteButton";
import { UploadClient } from "./UploadClient";

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
  draft:     { label: "Brouillon", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  published: { label: "Publié",    cls: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
  archived:  { label: "Archivé",   cls: "bg-sand-100 text-taupe-500 border-taupe-200", dot: "bg-taupe-400" },
};

function getStatus(media: MediaItem): MediaStatus {
  return (media.status as MediaStatus) ?? "published";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function MediasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const { uploaded, deleted, saved, error, preview } = await searchParams;
  const medias = await getMediaItems(true) as MediaRow[];

  const grouped = new Map<string, MediaRow[]>();
  for (const loc of DISPLAY_GROUPS) grouped.set(loc, []);
  for (const m of medias) {
    const loc = m.site_location || "footer-ambiance";
    if (!grouped.has(loc)) grouped.set(loc, []);
    grouped.get(loc)!.push(m);
  }

  const previewMedia = preview ? medias.find((m) => m.id === preview) : null;
  const draftCount     = medias.filter((m) => getStatus(m) === "draft").length;
  const publishedCount = medias.filter((m) => getStatus(m) === "published").length;

  return (
    <main className="min-h-screen bg-sand-50">

      {/* ── Modale prévisualisation ──────────────────────────── */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/75 p-4 backdrop-blur-sm">
          <div className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-taupe-200/40 px-6 py-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-taupe-400">
                  Aperçu — {SITE_LOCATIONS.find((l) => l.value === previewMedia.site_location)?.label ?? previewMedia.site_location}
                </p>
                <p className="mt-0.5 font-serif text-lg text-ink-900">{previewMedia.title}</p>
              </div>
              <Link
                href="/admin/medias"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-sand-100 text-sm text-taupe-600 hover:bg-sand-200 transition-colors"
              >
                ✕
              </Link>
            </div>

            <div className="overflow-y-auto p-6 max-h-[70vh]">
              <PreviewLayout media={previewMedia} />
            </div>

            <div className="flex items-center justify-between border-t border-taupe-200/40 bg-sand-50 px-6 py-3">
              <p className="text-[11px] text-taupe-400">
                {previewMedia.file_type} · {USAGE_TYPES.find((u) => u.value === previewMedia.usage_type)?.label ?? previewMedia.usage_type}
                {previewMedia.alt_text && ` · ${previewMedia.alt_text}`}
              </p>
              {getStatus(previewMedia) !== "published" ? (
                <form action={setMediaStatusAction}>
                  <input type="hidden" name="id" value={previewMedia.id} />
                  <input type="hidden" name="status" value="published" />
                  <button
                    type="submit"
                    className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                  >
                    🌍 Publier maintenant
                  </button>
                </form>
              ) : (
                <span className="rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-medium text-green-700">
                  ✓ Publié sur le site
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-taupe-300/30 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <Link href="/admin" className="text-xs text-taupe-500 hover:text-ink-900">
              ← Admin
            </Link>
            <h1 className="mt-0.5 font-serif text-2xl text-ink-900">Médiathèque</h1>
          </div>
          <div className="flex items-center gap-2">
            {draftCount > 0 && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                {draftCount} brouillon{draftCount > 1 ? "s" : ""}
              </span>
            )}
            <span className="rounded-full bg-sand-100 px-3 py-1 text-xs text-taupe-600">
              {publishedCount} publié{publishedCount !== 1 ? "s" : ""} · {medias.length} total
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-10 px-6 py-10">

        {/* Bandeaux */}
        {uploaded && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-3 text-sm font-medium text-green-700">
            Média uploadé — statut <strong>Brouillon</strong>. Cliquez sur <strong>Publier</strong> pour le mettre en ligne.
          </div>
        )}
        {deleted && (
          <div className="rounded-xl bg-sand-100 px-5 py-3 text-sm font-medium text-taupe-700">Média supprimé.</div>
        )}
        {saved && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-3 text-sm font-medium text-green-700">Modifications enregistrées.</div>
        )}
        {error === "upload" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
            Erreur upload inattendue.
          </div>
        )}

        {/* ── Upload client direct ───────────────────────────── */}
        <UploadClient />

        {/* ── Grille médias ─────────────────────────────────── */}
        {medias.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-16 text-center">
            <p className="font-serif text-2xl text-ink-900">Aucun média</p>
            <p className="mt-3 text-sm text-taupe-500">Uploadez votre première photo ou vidéo.</p>
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
                      <h2 className="font-serif text-lg text-ink-900">{locMeta?.label ?? locValue}</h2>
                      {locMeta?.description && (
                        <p className="mt-0.5 text-xs text-taupe-500">{locMeta.description}</p>
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
                      {items.map((media) => <MediaCard key={media.id} media={media} />)}
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

// ── Prévisualisation contextuelle — dimensions alignées sur le site public ──

function MediaEl({
  media,
  className,
  controls = false,
}: {
  media: MediaItem;
  className?: string;
  controls?: boolean;
}) {
  if (media.file_type === "video") {
    return (
      <video
        src={media.file_url}
        className={className ?? "h-full w-full object-cover"}
        autoPlay
        muted
        loop
        playsInline
        controls={controls}
        preload="metadata"
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={media.file_url}
      alt={media.alt_text || media.title}
      className={className ?? "h-full w-full object-cover"}
    />
  );
}

function PreviewLayout({ media }: { media: MediaItem }) {
  const loc = media.site_location;

  if (loc === "hero") {
    return (
      <div>
        <p className="mb-3 text-xs text-taupe-500">Rendu hero — image à droite du titre, ratio 4/5</p>
        <div className="relative overflow-hidden rounded-3xl shadow-[0_20px_60px_-15px_rgba(78,70,59,0.35)]" style={{ maxWidth: 300 }}>
          <MediaEl media={media} className="aspect-[4/5] w-full object-cover" />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "linear-gradient(to bottom, transparent 60%, rgba(247,242,232,0.55) 100%)" }}
          />
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-taupe-300/30" />
        </div>
      </div>
    );
  }

  if (loc === "cabinet") {
    return (
      <div>
        <p className="mb-3 text-[11px] uppercase tracking-widest text-taupe-400">Le cabinet</p>
        <h2 className="mb-5 font-serif text-xl text-ink-900">Un espace pensé <em className="text-taupe-600">pour votre progression.</em></h2>
        {/* Mêmes dimensions que EditorialGallery sur le site public */}
        <div className="flex flex-wrap gap-6">
          <div className="overflow-hidden rounded-2xl" style={{ width: 168, height: 236 }}>
            <MediaEl media={media} />
          </div>
          <div className="overflow-hidden rounded-2xl bg-sand-100 flex items-center justify-center text-taupe-300 text-xs" style={{ width: 168, height: 236 }}>
            Photo 2
          </div>
          <div className="overflow-hidden rounded-2xl bg-sand-100 flex items-center justify-center text-taupe-300 text-xs" style={{ width: 168, height: 236 }}>
            Photo 3
          </div>
        </div>
      </div>
    );
  }

  if (loc === "coachs") {
    return (
      <div>
        <p className="mb-5 font-serif text-xl text-ink-900">Vos coachs</p>
        <div className="flex gap-5">
          <div className="w-44 overflow-hidden rounded-2xl border border-taupe-200/40 bg-white shadow-sm">
            <MediaEl media={media} className="aspect-[3/4] w-full object-cover" />
            <div className="p-3 text-center">
              <p className="font-serif text-sm text-ink-900">{media.title || "Prénom Coach"}</p>
              <p className="text-[11px] text-taupe-500">Coach certifié</p>
            </div>
          </div>
          <div className="w-44 overflow-hidden rounded-2xl border border-taupe-200/30 bg-sand-100 flex items-center justify-center text-taupe-300 text-xs aspect-[3/4]">
            Coach 2
          </div>
        </div>
      </div>
    );
  }

  if (loc === "avant-apres") {
    return (
      <div>
        <p className="mb-3 text-[11px] uppercase tracking-widest text-taupe-400">Transformation</p>
        <h2 className="mb-5 font-serif text-xl text-ink-900">Avant / <em className="text-taupe-600">Après</em></h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="overflow-hidden rounded-2xl">
              <MediaEl media={media} className="w-full object-cover" />
            </div>
            <p className="mt-2 text-center text-[11px] uppercase tracking-wider text-taupe-500">Avant</p>
          </div>
          <div>
            <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-sand-100 flex items-center justify-center text-taupe-300 text-xs">Photo après</div>
            <p className="mt-2 text-center text-[11px] uppercase tracking-wider text-taupe-500">Après</p>
          </div>
        </div>
      </div>
    );
  }

  if (loc === "temoignages") {
    return (
      <div>
        <p className="mb-5 font-serif text-xl text-ink-900">Ce qu&apos;ils en disent</p>
        <div className="rounded-2xl border border-taupe-200/40 bg-sand-50 p-5">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full">
              <MediaEl media={media} />
            </div>
            <div>
              <p className="text-sm italic text-ink-900">
                &ldquo;{media.caption || "Votre visuel apparaîtra dans la section témoignages, à côté du texte du client."}&rdquo;
              </p>
              <p className="mt-2 text-xs font-medium text-taupe-500">— {media.title || "Prénom Client"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loc === "exercices") {
    return (
      <div>
        <p className="mb-3 text-[11px] uppercase tracking-widest text-taupe-400">En mouvement</p>
        <h2 className="mb-5 font-serif text-xl text-ink-900">Des exercices <em className="text-taupe-600">adaptés à votre corps.</em></h2>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 overflow-hidden rounded-xl">
            <MediaEl
              media={media}
              className="aspect-video w-full object-cover"
              controls={media.file_type === "video"}
            />
            {media.caption && <p className="px-2 py-1 text-[10px] text-taupe-400">{media.caption}</p>}
          </div>
          <div className="space-y-2">
            <div className="aspect-square overflow-hidden rounded-xl bg-sand-100 flex items-center justify-center text-taupe-300 text-[10px]">2</div>
            <div className="aspect-square overflow-hidden rounded-xl bg-sand-100 flex items-center justify-center text-taupe-300 text-[10px]">3</div>
          </div>
        </div>
      </div>
    );
  }

  if (loc === "footer-ambiance") {
    return (
      <div>
        <p className="mb-3 text-xs text-taupe-500">Le média apparaîtra en fond de la zone pied de page.</p>
        <div className="relative h-36 overflow-hidden rounded-2xl">
          <MediaEl media={media} className="absolute inset-0 h-full w-full object-cover opacity-35" />
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent to-sand-50/50">
            <p className="font-serif text-xl text-ink-900">Mise en Mouvement</p>
            <p className="mt-1 text-xs text-taupe-500">coach sportif · bilan mouvement</p>
          </div>
        </div>
      </div>
    );
  }

  // Générique (decouverte, comment-ca-se-passe, etc.)
  return (
    <div>
      <p className="mb-3 text-xs text-taupe-500">
        {SITE_LOCATIONS.find((l) => l.value === loc)?.description ?? "Aperçu du média"}
      </p>
      <div className="overflow-hidden rounded-2xl bg-sand-100">
        <MediaEl
          media={media}
          className="w-full object-contain max-h-80"
          controls={media.file_type === "video"}
        />
      </div>
      {media.caption && <p className="mt-3 text-center text-sm italic text-taupe-500">{media.caption}</p>}
    </div>
  );
}

// ── Carte média premium ────────────────────────────────────────

function MediaCard({ media }: { media: MediaRow }) {
  const locMeta   = SITE_LOCATIONS.find((l) => l.value === media.site_location);
  const usageMeta = USAGE_TYPES.find((u) => u.value === media.usage_type);
  const status    = getStatus(media);
  const statusMeta = STATUS_META[status];

  return (
    <div
      className={`group flex flex-col rounded-2xl border bg-white overflow-hidden transition-all hover:shadow-md ${
        status === "archived" ? "border-taupe-200/30 opacity-55" : "border-taupe-300/40"
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden bg-sand-100">
        {media.file_type === "video" ? (
          <>
            <video
              src={media.file_url}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              muted
              loop
              playsInline
              preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/85 shadow-md backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-white/95">
                <svg className="h-4 w-4 translate-x-0.5 text-ink-900" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.344-5.891a1.5 1.5 0 000-2.54L6.3 2.84z" />
                </svg>
              </div>
            </div>
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.file_url}
            alt={media.alt_text || media.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}

        {/* Badge statut */}
        <div className="absolute left-2 top-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm bg-white/90 ${statusMeta.cls}`}>
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

      {/* Infos */}
      <div className="flex flex-1 flex-col p-4 space-y-3">
        <p className="truncate text-sm font-medium text-ink-900">{media.title || "Sans titre"}</p>

        <div className="flex flex-wrap gap-1.5">
          {usageMeta && (
            <span className="rounded-full bg-sand-100 px-2 py-0.5 text-[10px] font-medium text-taupe-600">
              {usageMeta.label}
            </span>
          )}
          {locMeta && (
            <span className="rounded-full border border-taupe-200/60 bg-sand-50 px-2 py-0.5 text-[10px] text-taupe-500">
              {locMeta.label}
            </span>
          )}
        </div>

        <div className="space-y-0.5">
          {media.created_at && (
            <p className="text-[10px] text-taupe-300">{fmtDate(media.created_at)}</p>
          )}
          {media.alt_text && (
            <p className="truncate text-[11px] text-taupe-400" title={media.alt_text}>{media.alt_text}</p>
          )}
        </div>

        {/* Actions principales */}
        <div className="flex gap-2">
          <Link
            href={`/admin/medias?preview=${media.id}`}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-taupe-300/50 py-1.5 text-xs font-medium text-ink-900 hover:bg-sand-50 transition-colors"
          >
            👁 Aperçu
          </Link>
          {status === "published" ? (
            <form action={setMediaStatusAction} className="flex-1">
              <input type="hidden" name="id" value={media.id} />
              <input type="hidden" name="status" value="draft" />
              <button type="submit" className="w-full rounded-lg border border-amber-200 bg-amber-50 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors">
                Dépublier
              </button>
            </form>
          ) : (
            <form action={setMediaStatusAction} className="flex-1">
              <input type="hidden" name="id" value={media.id} />
              <input type="hidden" name="status" value="published" />
              <button type="submit" className="w-full rounded-lg bg-green-600 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors">
                🌍 Publier
              </button>
            </form>
          )}
        </div>

        {/* Actions secondaires */}
        <div className="flex items-center justify-between gap-2 border-t border-taupe-100 pt-2">
          {status !== "archived" ? (
            <form action={setMediaStatusAction}>
              <input type="hidden" name="id" value={media.id} />
              <input type="hidden" name="status" value="archived" />
              <button type="submit" className="text-[11px] text-taupe-400 hover:text-taupe-700 transition-colors">
                📦 Archiver
              </button>
            </form>
          ) : (
            <form action={setMediaStatusAction}>
              <input type="hidden" name="id" value={media.id} />
              <input type="hidden" name="status" value="draft" />
              <button type="submit" className="text-[11px] text-taupe-400 hover:text-taupe-700 transition-colors">
                Restaurer
              </button>
            </form>
          )}
          <DeleteButton id={media.id} fileUrl={media.file_url} storagePath={media.storage_path} />
        </div>

        {/* Édition inline */}
        <details className="group/edit border-t border-taupe-100 pt-2">
          <summary className="cursor-pointer list-none text-[11px] font-medium text-taupe-500 hover:text-ink-900 flex items-center gap-1">
            ✏ Modifier
            <span className="transition-transform group-open/edit:rotate-90">›</span>
          </summary>
          <form action={updateMediaAction} className="mt-3 space-y-2.5">
            <input type="hidden" name="id" value={media.id} />
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-taupe-500">Titre</label>
              <input type="text" name="title" defaultValue={media.title} className="rounded-lg border border-taupe-300/50 bg-sand-50 px-3 py-1.5 text-xs text-ink-900 focus:border-taupe-500 focus:outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-taupe-500">Emplacement</label>
              <select name="site_location" defaultValue={media.site_location || "footer-ambiance"} className="rounded-lg border border-taupe-300/50 bg-sand-50 px-3 py-1.5 text-xs text-ink-900 focus:border-taupe-500 focus:outline-none">
                {SITE_LOCATIONS.map((loc) => <option key={loc.value} value={loc.value}>{loc.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-taupe-500">Type d&apos;usage</label>
              <select name="usage_type" defaultValue={media.usage_type || "image-principale"} className="rounded-lg border border-taupe-300/50 bg-sand-50 px-3 py-1.5 text-xs text-ink-900 focus:border-taupe-500 focus:outline-none">
                {USAGE_TYPES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-taupe-500">Texte alternatif</label>
              <input type="text" name="alt_text" defaultValue={media.alt_text} placeholder="SEO et accessibilité" className="rounded-lg border border-taupe-300/50 bg-sand-50 px-3 py-1.5 text-xs text-ink-900 placeholder-taupe-300 focus:border-taupe-500 focus:outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-taupe-500">Légende</label>
              <input type="text" name="caption" defaultValue={media.caption} placeholder="Légende visible" className="rounded-lg border border-taupe-300/50 bg-sand-50 px-3 py-1.5 text-xs text-ink-900 placeholder-taupe-300 focus:border-taupe-500 focus:outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-taupe-500">Ordre</label>
              <input type="number" name="sort_order" defaultValue={media.sort_order} min={0} className="rounded-lg border border-taupe-300/50 bg-sand-50 px-3 py-1.5 text-xs text-ink-900 focus:border-taupe-500 focus:outline-none" />
            </div>
            <button type="submit" className="w-full rounded-lg bg-ink-900 py-1.5 text-xs font-medium text-sand-50 transition-colors hover:bg-taupe-700">
              Enregistrer
            </button>
          </form>
        </details>
      </div>
    </div>
  );
}
