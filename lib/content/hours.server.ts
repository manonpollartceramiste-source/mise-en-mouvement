import "server-only";

import { readContentKey } from "@/lib/supabase/content";
import {
  defaultHours,
  openingHoursSchema,
  type OpeningHours,
} from "@/lib/content/hours";

export async function loadHours(): Promise<OpeningHours> {
  const value = await readContentKey("hours");
  if (!value) return defaultHours;
  const parsed = openingHoursSchema.safeParse(value);
  return parsed.success ? parsed.data : defaultHours;
}
