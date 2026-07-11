"use client";

import { useState } from "react";
import Link from "next/link";
import { SITE_LOCATIONS, USAGE_TYPES } from "@/lib/billing/types";
import type { MediaItem, MediaStatus } from "@/lib/billing/types";
import { DeleteButton } from "./DeleteButton";
import {
  DISPLAY_GROUPS,
  GROUP_ICONS,
  STATUS_META,
  getStatus,
  fmtDate,
} from "./media-utils";

type FilterStatus = "all" | "draft" | "published" | "archived";
type FilterType = "all" | "image" | "video";

export function MediaGrid({
  medias,
  grouped,
  updateMediaAction,
  setMediaStatusAction,
}: {
  medias: MediaItem[];
  grouped: Map<string, MediaItem[]>;
  updateMediaAction: (formData: FormData) => Promise<void>;
  setMediaStatusAction: (formData: FormData) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterType, setFilterType] = useState<FilterType>("all");

  const query = search.toLowerCase().trim();

  function matchesFilters(m: MediaItem): boolean {
    const status = getStatus(m);
    if (filterStatus !== "all" && status !== filterStatus) return false;
    if (filterType !== "all") {
      const ft = m.file_type ?? "image";
      if (filterType === "image" && ft === "video") return false;
      if (filterType === "video" && ft !== "video") return false;
    }
    if (query) {
      const haystack = `${m.title ?? ""} ${m.alt_text ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  }

  const filtered = medias.filter(matchesFilters);

  // Regrouper les médias filtrés par catégorie
  const filteredGrouped = new Map<string, MediaItem[]>();
  for (const loc of DISPLAY_GROUPS) filteredGrouped.set(loc, []);
  for (const m of filtered) {
    const loc = m.site_location || "footer-ambiance";
    if (!filteredGrouped.has(loc)) filteredGrouped.set(loc, []);
    filteredGrouped.get(loc)!.push(m);
  }

  const hasResults = filtered.length > 0;

  return (
    <div className="space-y-8">
      {/* Barre de filtres */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-taupe-200/50 bg-white p-4">
        {/* Recherche texte */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un média..."
          className="min-w-[200px] flex-1 rounded-xl border border-taupe-300/50 bg-sand-50 px-3 py-2 text-sm text-ink-900 placeholder-taupe-400 focus:border-taupe-600 focus:outline-none focus:ring-2 focus:ring-taupe-500/30"
        />

        {/* Filtre statut */}
        <div className="flex items-center gap-1 rounded-xl border border-taupe-200/50 p-1">
          {(["all", "draft", "published", "archived"] as FilterStatus[]).map(
            (s) => {
              const labels: Record<FilterStatus, string> = {
                all: "Tous",
                draft: "Brouillon",
                published: "Publié",
                archived: "Archivé",
              };
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    filterStatus === s
                      ? "bg-ink-900 text-sand-50"
                      : "text-taupe-600 hover:bg-sand-50 hover:text-ink-900"
                  }`}
                >
                  {labels[s]}
                </button>
              );
            }
          )}
        </div>

        {/* Filtre type */}
        <div className="flex items-center gap-1 rounded-xl border border-taupe-200/50 p-1">
          {(["all", "image", "video"] as FilterType[]).map((t) => {
            const labels: Record<FilterType, string> = {
              all: "Tous",
              image: "Images",
              video: "Vidéos",
            };
            return (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterType === t
                    ? "bg-ink-900 text-sand-50"
                    : "text-taupe-600 hover:bg-sand-50 hover:text-ink-900"
                }`}
              >
                {labels[t]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Résultats */}
      {!hasResults ? (
        <div className="rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-10 text-center">
          <p className="text-sm text-taupe-500">Aucun média ne correspond aux filtres.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {DISPLAY_GROUPS.map((locValue) => {
            const locMeta = SITE_LOCATIONS.find((l) => l.value === locValue);
            const items = filteredGrouped.get(locValue) ?? [];
            const icon = GROUP_ICONS[locValue] ?? "";
            return (
              <section key={locValue}>
                <div className="mb-5 flex items-end justify-between gap-4 border-b border-taupe-300/30 pb-4">
                  <div>
                    <h2 className="font-serif text-lg text-ink-900">
                      {icon && <span className="mr-2">{icon}</span>}
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
                      <MediaCard
                        key={media.id}
                        media={media}
                        updateMediaAction={updateMediaAction}
                        setMediaStatusAction={setMediaStatusAction}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Carte média premium ────────────────────────────────────────

function MediaCard({
  media,
  updateMediaAction,
  setMediaStatusAction,
}: {
  media: MediaItem;
  updateMediaAction: (formData: FormData) => Promise<void>;
  setMediaStatusAction: (formData: FormData) => Promise<void>;
}) {
  const locMeta = SITE_LOCATIONS.find((l) => l.value === media.site_location);
  const usageMeta = USAGE_TYPES.find((u) => u.value === media.usage_type);
  const status = getStatus(media);
  const statusMeta = STATUS_META[status];

  return (
    <div
      className={`group flex flex-col rounded-2xl border bg-white overflow-hidden transition-all hover:shadow-md ${
        status === "archived"
          ? "border-taupe-200/30 opacity-55"
          : "border-taupe-300/40"
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
                <svg
                  className="h-4 w-4 translate-x-0.5 text-ink-900"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
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

      {/* Infos */}
      <div className="flex flex-1 flex-col p-4 space-y-3">
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
            <p
              className="truncate text-[11px] text-taupe-400"
              title={media.alt_text}
            >
              {media.alt_text}
            </p>
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
                🌍 Publier
              </button>
            </form>
          )}
        </div>

        {/* Lien "Ouvrir →" vers l'URL brute */}
        <a
          href={media.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 rounded-lg border border-taupe-200/50 py-1.5 text-xs text-taupe-500 hover:border-taupe-300 hover:text-ink-900 transition-colors"
        >
          Ouvrir →
        </a>

        {/* Actions secondaires */}
        <div className="flex items-center justify-between gap-2 border-t border-taupe-100 pt-2">
          {status !== "archived" ? (
            <form action={setMediaStatusAction}>
              <input type="hidden" name="id" value={media.id} />
              <input type="hidden" name="status" value="archived" />
              <button
                type="submit"
                className="text-[11px] text-taupe-400 hover:text-taupe-700 transition-colors"
              >
                📦 Archiver
              </button>
            </form>
          ) : (
            <form action={setMediaStatusAction}>
              <input type="hidden" name="id" value={media.id} />
              <input type="hidden" name="status" value="draft" />
              <button
                type="submit"
                className="text-[11px] text-taupe-400 hover:text-taupe-700 transition-colors"
              >
                Restaurer
              </button>
            </form>
          )}
          <DeleteButton
            id={media.id}
            fileUrl={media.file_url}
            storagePath={media.storage_path}
          />
        </div>

        {/* Édition inline */}
        <details className="group/edit border-t border-taupe-100 pt-2">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] font-medium text-taupe-500 hover:text-ink-900">
            ✏ Modifier
            <span className="transition-transform group-open/edit:rotate-90">›</span>
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
              <label className="text-[10px] font-medium text-taupe-500">
                Type d&apos;usage
              </label>
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
              <label className="text-[10px] font-medium text-taupe-500">
                Texte alternatif
              </label>
              <input
                type="text"
                name="alt_text"
                defaultValue={media.alt_text}
                placeholder="SEO et accessibilité"
                className="rounded-lg border border-taupe-300/50 bg-sand-50 px-3 py-1.5 text-xs text-ink-900 placeholder-taupe-300 focus:border-taupe-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-taupe-500">Légende</label>
              <input
                type="text"
                name="caption"
                defaultValue={media.caption}
                placeholder="Légende visible"
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
