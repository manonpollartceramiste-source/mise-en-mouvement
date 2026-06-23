import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMediaItems } from "@/lib/billing/server";
import { SITE_LOCATIONS, USAGE_TYPES } from "@/lib/billing/types";
import type { MediaItem } from "@/lib/billing/types";
import {
  uploadMediaAction,
  deleteMediaAction,
  toggleMediaAction,
  updateMediaAction,
} from "./actions";

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

export default async function MediasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const { uploaded, deleted, saved, error } = await searchParams;
  const medias = await getMediaItems(false);

  const grouped = new Map<string, MediaItem[]>();
  for (const loc of DISPLAY_GROUPS) grouped.set(loc, []);
  for (const m of medias) {
    const loc = m.site_location || "footer-ambiance";
    if (!grouped.has(loc)) grouped.set(loc, []);
    grouped.get(loc)!.push(m);
  }

  return (
    <main className="min-h-screen bg-sand-50">
      <header className="sticky top-0 z-10 border-b border-taupe-300/30 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <Link href="/admin" className="text-xs text-taupe-500 hover:text-ink-900">
              ← Admin
            </Link>
            <h1 className="mt-0.5 font-serif text-2xl text-ink-900">Médiathèque</h1>
          </div>
          <span className="rounded-full bg-sand-100 px-3 py-1 text-xs text-taupe-600">
            {medias.length} média{medias.length !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-10">
        {/* Notifications */}
        {uploaded && (
          <div className="rounded-xl bg-green-50 px-5 py-3 text-sm font-medium text-green-700">
            Média uploadé avec succès.
          </div>
        )}
        {deleted && (
          <div className="rounded-xl bg-sand-100 px-5 py-3 text-sm font-medium text-taupe-700">
            Média supprimé.
          </div>
        )}
        {saved && (
          <div className="rounded-xl bg-green-50 px-5 py-3 text-sm font-medium text-green-700">
            Modifications enregistrées.
          </div>
        )}
        {error === "upload" && (
          <div className="rounded-xl bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
            Erreur upload — vérifiez que le bucket Supabase &quot;site-media&quot; existe et est public.
          </div>
        )}
        {error === "no-file" && (
          <div className="rounded-xl bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
            Aucun fichier sélectionné.
          </div>
        )}
        {error === "type" && (
          <div className="rounded-xl bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
            Type non supporté. Utilisez JPG, PNG, WebP, GIF, MP4, WebM ou MOV.
          </div>
        )}
        {error === "size" && (
          <div className="rounded-xl bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
            Fichier trop volumineux (limite : 50 Mo).
          </div>
        )}

        {/* ── Formulaire upload ─────────────────────────────── */}
        <section className="rounded-2xl border border-taupe-300/40 bg-white p-7">
          <h2 className="mb-1 font-serif text-xl text-ink-900">Ajouter un média</h2>
          <p className="mb-6 text-sm text-taupe-500">
            Choisissez l&apos;emplacement et le type d&apos;usage pour que votre
            média apparaisse au bon endroit sur le site.
          </p>
          <form action={uploadMediaAction} encType="multipart/form-data" className="space-y-5">
            {/* Fichier */}
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
              {/* Emplacement */}
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

              {/* Type d'usage */}
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

              {/* Titre */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-taupe-600">Titre</label>
                <input
                  type="text"
                  name="title"
                  placeholder="Ex : Photo cabinet principal"
                  className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 placeholder-taupe-400 focus:border-taupe-500 focus:outline-none"
                />
              </div>

              {/* Ordre */}
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

              {/* Alt text */}
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

              {/* Légende */}
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
                      Aucun média pour cet emplacement. Uploadez-en un ci-dessus.
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

function MediaCard({ media }: { media: MediaItem }) {
  const locMeta = SITE_LOCATIONS.find((l) => l.value === media.site_location);
  const usageMeta = USAGE_TYPES.find((u) => u.value === media.usage_type);

  return (
    <div
      className={`rounded-2xl border bg-white transition-all ${
        media.is_active
          ? "border-taupe-300/40"
          : "border-taupe-200/30 opacity-55"
      }`}
    >
      {/* Preview */}
      <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-sand-100">
        {media.file_type === "video" ? (
          <video
            src={media.file_url}
            className="h-full w-full object-cover"
            muted
          />
        ) : (
          <Image
            src={media.file_url}
            alt={media.alt_text || media.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        )}
        {/* Statut badge */}
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm ${
            media.is_active
              ? "bg-green-600/80 text-white"
              : "bg-taupe-700/70 text-sand-200"
          }`}
        >
          {media.is_active ? "Actif" : "Inactif"}
        </span>
        {media.file_type === "video" && (
          <span className="absolute right-2 top-2 rounded-full bg-taupe-700/80 px-2 py-0.5 text-[10px] font-medium text-sand-50 backdrop-blur-sm">
            Vidéo
          </span>
        )}
        {/* Ordre */}
        <span className="absolute bottom-2 right-2 rounded-full bg-ink-900/70 px-2 py-0.5 text-[10px] font-mono text-sand-100 backdrop-blur-sm">
          #{media.sort_order}
        </span>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <p className="truncate text-sm font-medium text-ink-900">
          {media.title || "Sans titre"}
        </p>

        {/* Usage type */}
        {usageMeta && (
          <span className="inline-block rounded-full bg-sand-100 px-2.5 py-0.5 text-[10px] font-medium text-taupe-600">
            {usageMeta.label}
          </span>
        )}

        {/* Alt text */}
        {media.alt_text && (
          <p className="truncate text-xs text-taupe-400" title={media.alt_text}>
            Alt : {media.alt_text}
          </p>
        )}

        {/* Caption */}
        {media.caption && (
          <p className="truncate text-xs italic text-taupe-400" title={media.caption}>
            {media.caption}
          </p>
        )}

        {/* Aperçu emplacement */}
        <p className="text-[10px] text-taupe-300">
          → {locMeta?.description ?? media.site_location}
        </p>

        {/* Actions rapides */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <form action={toggleMediaAction}>
            <input type="hidden" name="id" value={media.id} />
            <input type="hidden" name="is_active" value={String(media.is_active)} />
            <button
              type="submit"
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                media.is_active
                  ? "bg-green-50 text-green-700 hover:bg-green-100"
                  : "bg-sand-100 text-taupe-600 hover:bg-sand-200"
              }`}
            >
              {media.is_active ? "Désactiver" : "Activer"}
            </button>
          </form>
          <form action={deleteMediaAction}>
            <input type="hidden" name="id" value={media.id} />
            <input type="hidden" name="file_url" value={media.file_url} />
            <button
              type="submit"
              onClick={(e) => {
                if (!confirm("Supprimer ce média définitivement ?")) e.preventDefault();
              }}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
            >
              Supprimer
            </button>
          </form>
        </div>

        {/* Édition inline */}
        <details className="group pt-1">
          <summary className="cursor-pointer list-none text-xs font-medium text-taupe-500 hover:text-ink-900">
            <span className="flex items-center gap-1">
              Modifier
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
