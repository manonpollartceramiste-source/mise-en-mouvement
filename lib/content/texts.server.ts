import "server-only";

import { readContentKey } from "@/lib/supabase/content";
import {
  defaultTexts,
  siteTextsSchema,
  type SiteTexts,
} from "@/lib/content/texts";

export async function loadTexts(): Promise<SiteTexts> {
  const value = await readContentKey("site_texts");
  if (!value || typeof value !== "object") return defaultTexts;

  // Merge defaults so newly-added keys are filled in for older records.
  const merged = { ...defaultTexts, ...(value as Record<string, unknown>) };
  const parsed = siteTextsSchema.safeParse(merged);
  return parsed.success ? parsed.data : defaultTexts;
}
