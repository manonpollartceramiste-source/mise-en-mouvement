import "server-only";

import { readContentKey } from "@/lib/supabase/content";
import {
  defaultLegal,
  legalSchema,
  type LegalContent,
} from "@/lib/content/legal";

export async function loadLegal(): Promise<LegalContent> {
  const value = await readContentKey("legal");
  if (!value) return defaultLegal;
  const parsed = legalSchema.safeParse(value);
  return parsed.success ? parsed.data : defaultLegal;
}
