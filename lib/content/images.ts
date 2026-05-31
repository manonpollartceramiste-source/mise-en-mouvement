import { z } from "zod";

export type SiteImages = {
  logo: string | null;
  hero: string | null;
  /** Arrière-plan premium — affiché fondu derrière toutes les sections. */
  background: string | null;
  /** Map of coach id → public image URL. */
  coaches: Record<string, string>;
  /**
   * Galerie photos. Clés recommandées :
   *   cabinet-1 … cabinet-3   (photos du cabinet)
   *   ambiance-1 … ambiance-3 (photos séances / ambiance)
   */
  gallery: Record<string, string>;
};

export const siteImagesSchema = z.object({
  logo: z.string().nullable(),
  hero: z.string().nullable(),
  background: z.string().nullable(),
  coaches: z.record(z.string(), z.string()),
  gallery: z.record(z.string(), z.string()),
}) satisfies z.ZodType<SiteImages>;

export const defaultImages: SiteImages = {
  logo: null,
  hero: null,
  background: null,
  coaches: {},
  gallery: {},
};

/** Returns the resolved logo path: stored URL or the bundled fallback. */
export function getLogoSrc(images: SiteImages | null | undefined): string {
  return images?.logo && images.logo.length > 0 ? images.logo : "/logo.png";
}

/**
 * Returns sorted gallery URLs for a given slot prefix.
 * E.g. getGalleryPhotos(images, "cabinet-") → ["url1", "url2", …]
 */
export function getGalleryPhotos(
  images: SiteImages | null | undefined,
  prefix: string,
): string[] {
  if (!images?.gallery) return [];
  return Object.entries(images.gallery)
    .filter(([k]) => k.startsWith(prefix))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, url]) => url);
}
