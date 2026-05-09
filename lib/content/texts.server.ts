import "server-only";

import { readContentKey } from "@/lib/supabase/content";
import {
  defaultTexts,
  siteTextsSchema,
  type SiteTexts,
} from "@/lib/content/texts";

export async function loadTexts(): Promise<SiteTexts> {
  const value = await readContentKey("site_texts");
  if (!value) return defaultTexts;
  const parsed = siteTextsSchema.safeParse(value);
  return parsed.success ? parsed.data : defaultTexts;
}
