import "server-only";

import { revalidatePath } from "next/cache";
import {
  getCurrentUser,
  getSupabaseServer,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

/**
 * Server-side helper used by every admin save action.
 * Validates auth, upserts the JSON blob into the `content` table,
 * and revalidates the impacted public paths.
 */
export async function saveContentKey<T>(
  key: string,
  value: T,
  paths: string[] = [],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase non configuré." };
  }
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Non authentifié." };
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("content").upsert({
    key,
    value: value as unknown,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  for (const p of paths) {
    revalidatePath(p);
  }
  return { ok: true };
}

/** Reads a single content key. Returns null if not found / not configured. */
export async function readContentKey(key: string): Promise<unknown> {
  try {
    if (!isSupabaseConfigured()) return null;
    const supabase = await getSupabaseServer();
    const { data } = await supabase
      .from("content")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    return data ? data.value : null;
  } catch {
    return null;
  }
}
