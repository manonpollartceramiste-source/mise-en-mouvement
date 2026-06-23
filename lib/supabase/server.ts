import "server-only";

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Ces deux emails ont TOUJOURS accès admin, indépendamment de la variable ADMIN_EMAILS.
const ALWAYS_ADMIN_EMAILS = [
  "manonpollart.ceramiste@gmail.com",
  "dorian34.hebert@gmail.com",
];

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

function getAdminEmails(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...ALWAYS_ADMIN_EMAILS.map((e) => e.toLowerCase()), ...fromEnv])];
}

export function isAuthorizedAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
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

/**
 * Returns a Supabase client with the service role key (bypasses RLS).
 * ONLY use server-side for trusted operations — never expose to the client.
 */
export function getSupabaseAdmin() {
  const missing = (
    [
      !url && "NEXT_PUBLIC_SUPABASE_URL",
      !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
    ] as (string | false)[]
  ).filter((v): v is string => Boolean(v));

  if (missing.length > 0) {
    const names = missing.join(", ");
    console.error(`[SUPABASE_ADMIN] Variable(s) manquante(s) : ${names}`);
    throw new Error(`Variable(s) d'environnement manquante(s) : ${names}`);
  }

  return createClient(url!, serviceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Returns the current admin user, or null if not authenticated / not authorized / not configured. */
export async function getCurrentUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if (!isAuthorizedAdmin(user.email)) return null;
  return user;
}
