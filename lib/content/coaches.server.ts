import "server-only";

import { readContentKey } from "@/lib/supabase/content";
import {
  coachArraySchema,
  coaches as staticCoaches,
  type Coach,
} from "@/lib/content/coaches";

export async function loadCoaches(): Promise<Coach[]> {
  const value = await readContentKey("coaches");
  if (!value) return staticCoaches;
  const parsed = coachArraySchema.safeParse(value);
  return parsed.success ? parsed.data : staticCoaches;
}

export async function loadCoach(id: string): Promise<Coach | undefined> {
  const all = await loadCoaches();
  return all.find((c) => c.id === id);
}

/** Coachs visibles côté public (active === true). */
export async function loadActiveCoaches(): Promise<Coach[]> {
  const all = await loadCoaches();
  return all.filter((c) => c.active !== false);
}
