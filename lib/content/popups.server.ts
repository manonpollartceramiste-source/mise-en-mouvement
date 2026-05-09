import "server-only";

import {
  getSupabaseServer,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import type { PageScope, Popup } from "@/lib/content/popups";

type DbRow = {
  id: string;
  title: string;
  body: string;
  cta_label: string | null;
  cta_href: string | null;
  scope: "home" | "offres" | "both";
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

function fromDb(row: DbRow): Popup {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    ctaLabel: row.cta_label,
    ctaHref: row.cta_href,
    scope: row.scope,
    active: row.active,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  };
}

function isWithinWindow(row: DbRow, now: number): boolean {
  if (row.starts_at) {
    const t = Date.parse(row.starts_at);
    if (!Number.isNaN(t) && t > now) return false;
  }
  if (row.ends_at) {
    const t = Date.parse(row.ends_at);
    if (!Number.isNaN(t) && t < now) return false;
  }
  return true;
}

/** Returns the most recent active popup matching the given page, or null. */
export async function loadActivePopup(
  page: PageScope,
): Promise<Popup | null> {
  try {
    if (!isSupabaseConfigured()) return null;
    const supabase = await getSupabaseServer();
    const { data } = await supabase
      .from("popups")
      .select(
        "id, title, body, cta_label, cta_href, scope, active, starts_at, ends_at",
      )
      .eq("active", true)
      .in("scope", [page, "both"])
      .order("created_at", { ascending: false });
    if (!data || data.length === 0) return null;
    const now = Date.now();
    const match = (data as DbRow[]).find((r) => isWithinWindow(r, now));
    return match ? fromDb(match) : null;
  } catch {
    return null;
  }
}

export async function loadAllPopups(): Promise<Popup[]> {
  try {
    if (!isSupabaseConfigured()) return [];
    const supabase = await getSupabaseServer();
    const { data } = await supabase
      .from("popups")
      .select(
        "id, title, body, cta_label, cta_href, scope, active, starts_at, ends_at",
      )
      .order("created_at", { ascending: false });
    return data ? (data as DbRow[]).map(fromDb) : [];
  } catch {
    return [];
  }
}
