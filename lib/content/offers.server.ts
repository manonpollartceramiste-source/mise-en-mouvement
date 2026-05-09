import "server-only";

import { isSupabaseConfigured, getSupabaseServer } from "@/lib/supabase/server";
import {
  offerArraySchema,
  offers as staticOffers,
  type Offer,
  type OfferCategory,
} from "@/lib/content/offers";

/**
 * Server-only loader. Reads offers from Supabase if configured, falls back to
 * the static array on any error or missing config.
 */
export async function loadOffers(): Promise<Offer[]> {
  try {
    if (!isSupabaseConfigured()) return staticOffers;
    const supabase = await getSupabaseServer();
    const { data } = await supabase
      .from("content")
      .select("value")
      .eq("key", "offers")
      .maybeSingle();
    if (!data) return staticOffers;
    const parsed = offerArraySchema.safeParse(data.value);
    return parsed.success ? parsed.data : staticOffers;
  } catch {
    return staticOffers;
  }
}

export async function loadOffer(id: string): Promise<Offer | undefined> {
  const all = await loadOffers();
  return all.find((o) => o.id === id);
}

export async function loadOffersByCategory(
  category: OfferCategory,
): Promise<Offer[]> {
  const all = await loadOffers();
  return all.filter((o) => o.category === category);
}
