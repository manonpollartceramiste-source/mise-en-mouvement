import "server-only";

import { readContentKey } from "@/lib/supabase/content";
import {
  defaultSettings,
  siteSettingsSchema,
  type SiteSettings,
} from "@/lib/content/settings";

export async function loadSettings(): Promise<SiteSettings> {
  const value = await readContentKey("settings");
  if (!value) return defaultSettings;
  const parsed = siteSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : defaultSettings;
}
