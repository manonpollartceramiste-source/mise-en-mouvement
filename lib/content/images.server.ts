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
 */
export const loadImages = cache(async (): Promise<SiteImages> => {
  const value = await readContentKey("images");
  if (!value) return defaultImages;
  const parsed = siteImagesSchema.safeParse(value);
  return parsed.success ? parsed.data : defaultImages;
});
