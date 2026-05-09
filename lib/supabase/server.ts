import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

/**
 * Returns a Supabase client bound to the current request cookies.
 * Throws if Supabase env vars are missing — guard via isSupabaseConfigured() first.
 */
export async function getSupabaseServer() {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase non configuré. Renseigne NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local.",
    );
  }
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll appelé depuis un Server Component — ignoré.
          // Le proxy.ts rafraîchit déjà la session côté requête.
        }
      },
    },
  });
}

/** Returns the current admin user, or null if not authenticated / not configured. */
export async function getCurrentUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
