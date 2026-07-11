import type { MediaItem, MediaStatus } from "@/lib/billing/types";

export const DISPLAY_GROUPS = [
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

export const GROUP_ICONS: Record<string, string> = {
  hero: "🎯",
  decouverte: "✨",
  cabinet: "🏠",
  coachs: "👥",
  exercices: "💪",
  temoignages: "⭐",
  "avant-apres": "🔄",
  "comment-ca-se-passe": "📋",
  "footer-ambiance": "🌿",
};

export const STATUS_META: Record<MediaStatus, { label: string; cls: string; dot: string }> = {
  draft:     { label: "Brouillon", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  published: { label: "Publié",    cls: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
  archived:  { label: "Archivé",   cls: "bg-sand-100 text-taupe-500 border-taupe-200", dot: "bg-taupe-400" },
};

export function getStatus(media: MediaItem): MediaStatus {
  return (media.status as MediaStatus) ?? "published";
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
