import "server-only";

import { cache } from "react";
import { readContentKey } from "@/lib/supabase/content";
import {
  defaultImages,
  siteImagesSchema,
  type SiteImages,
} from "@/lib/content/images";

/**
 * Cached per-request reader. Header & Footer call this on every page render
 * but the cache deduplicates within a single React server pass.
 *
 * Merges with defaultImages before parsing so that old stored blobs
 * (missing background/gallery) don't break schema validation.
 */
export const loadImages = cache(async (): Promise<SiteImages> => {
  const value = await readContentKey("images");
  if (!value) return defaultImages;
  const merged =
    typeof value === "object" && value !== null
      ? { ...defaultImages, ...(value as Record<string, unknown>) }
      : value;
  const parsed = siteImagesSchema.safeParse(merged);
  return parsed.success ? parsed.data : defaultImages;
});
