"use client";

import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseBrowser() {
  if (!url || !anonKey) {
    throw new Error("Supabase non configuré côté navigateur.");
  }
  return createBrowserClient(url, anonKey);
}
