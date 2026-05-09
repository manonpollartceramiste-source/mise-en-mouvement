import { z } from "zod";

export type SiteImages = {
  logo: string | null;
  hero: string | null;
  /** Map of coach id → public image URL. */
  coaches: Record<string, string>;
};

export const siteImagesSchema = z.object({
  logo: z.string().nullable(),
  hero: z.string().nullable(),
  coaches: z.record(z.string(), z.string()),
}) satisfies z.ZodType<SiteImages>;

export const defaultImages: SiteImages = {
  logo: null,
  hero: null,
  coaches: {},
};

/** Returns the resolved logo path: stored URL or the bundled fallback. */
export function getLogoSrc(images: SiteImages | null | undefined): string {
  return images?.logo && images.logo.length > 0 ? images.logo : "/logo.png";
}
