import "server-only";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  Quote,
  QuoteInsert,
  Invoice,
  InvoiceInsert,
  Prestation,
  PrestationInsert,
  SiteSettings,
  DiscoverySessionSettings,
  MediaItem,
  MediaItemInsert,
} from "./types";

// ─── Quotes ───────────────────────────────────────────────────

export async function getQuotes(coachId: string): Promise<Quote[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("quotes")
    .select("*")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Quote[];
}

export async function getAllQuotes(): Promise<Quote[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as Quote[];
}

export async function getQuoteById(id: string): Promise<Quote | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as Quote | null;
}

export async function createQuote(insert: QuoteInsert): Promise<Quote | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("quotes")
    .insert(insert)
    .select()
    .single();
  return data as Quote | null;
}

export async function updateQuote(id: string, patch: Partial<QuoteInsert>): Promise<Quote | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("quotes")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  return data as Quote | null;
}

export async function deleteQuote(id: string): Promise<void> {
  const supabase = await getSupabaseServer();
  await supabase.from("quotes").delete().eq("id", id);
}

export async function getNextQuoteNumber(coachId: string): Promise<string> {
  const supabase = await getSupabaseServer();
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("quotes")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", coachId)
    .like("number", `D${year}%`);
  const seq = ((count ?? 0) + 1).toString().padStart(3, "0");
  return `D${year}-${seq}`;
}

// ─── Invoices ─────────────────────────────────────────────────

export async function getInvoices(coachId: string): Promise<Invoice[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("invoices")
    .select("*")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Invoice[];
}

export async function getAllInvoices(): Promise<Invoice[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as Invoice[];
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as Invoice | null;
}

export async function createInvoice(insert: InvoiceInsert): Promise<Invoice | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("invoices")
    .insert(insert)
    .select()
    .single();
  return data as Invoice | null;
}

export async function updateInvoice(id: string, patch: Partial<InvoiceInsert>): Promise<Invoice | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("invoices")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  return data as Invoice | null;
}

export async function deleteInvoice(id: string): Promise<void> {
  const supabase = await getSupabaseServer();
  await supabase.from("invoices").delete().eq("id", id);
}

export async function getNextInvoiceNumber(coachId: string): Promise<string> {
  const supabase = await getSupabaseServer();
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", coachId)
    .like("number", `F${year}%`);
  const seq = ((count ?? 0) + 1).toString().padStart(3, "0");
  return `F${year}-${seq}`;
}

// ─── Prestation library ───────────────────────────────────────

export async function getPrestations(coachId: string): Promise<Prestation[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("prestations")
    .select("*")
    .eq("coach_id", coachId)
    .order("category", { nullsFirst: false })
    .order("name");
  return (data ?? []) as Prestation[];
}

export async function createPrestation(insert: PrestationInsert): Promise<Prestation | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("prestations")
    .insert(insert)
    .select()
    .single();
  return data as Prestation | null;
}

export async function updatePrestation(id: string, patch: Partial<PrestationInsert>): Promise<Prestation | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("prestations")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  return data as Prestation | null;
}

export async function deletePrestation(id: string): Promise<void> {
  const supabase = await getSupabaseServer();
  await supabase.from("prestations").delete().eq("id", id);
}

export async function saveLineItemsToLibrary(
  coachId: string,
  items: Array<{ name: string; description?: string; unit_price: number; tva_pct: number }>,
): Promise<void> {
  if (!items.length) return;
  const supabase = await getSupabaseServer();
  await supabase.from("prestations").insert(
    items.map((item) => ({
      coach_id: coachId,
      name: item.name,
      description: item.description || null,
      unit_price: item.unit_price,
      tva_pct: item.tva_pct,
      category: null,
      is_active: true,
    })),
  );
}

// ─── Site settings ────────────────────────────────────────────

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  id: 1,
  company_name: "Mise en Mouvement",
  siret: "",
  address: "",
  city: "",
  postal_code: "",
  email: "",
  phone: "",
  website: "",
  logo_url: "",
  primary_color: "#4f463b",
  secondary_color: "#a89a89",
  pdf_footer_text: "Mise en Mouvement — Coaching mouvement & bien-être",
  pdf_quote_conditions: "Devis valable 30 jours à compter de sa date d'émission.",
  pdf_invoice_mentions: "TVA non applicable, art. 293B du CGI.",
  updated_at: new Date().toISOString(),
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  return (data as SiteSettings | null) ?? DEFAULT_SITE_SETTINGS;
}

export async function updateSiteSettings(patch: Partial<SiteSettings>): Promise<SiteSettings | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("site_settings")
    .upsert({ id: 1, ...patch })
    .select()
    .single();
  return data as SiteSettings | null;
}

// ─── Discovery session ────────────────────────────────────────

const DEFAULT_DISCOVERY: DiscoverySessionSettings = {
  id: 1,
  title: "Séance Découverte",
  subtitle: "Votre premier pas vers une vie plus libre",
  price: 25,
  duration_min: 60,
  description: "Une séance unique pour comprendre votre corps, identifier vos blocages et tracer votre chemin vers le mieux-être.",
  session_steps: [
    "Échange sur votre quotidien et vos objectifs",
    "Observation et analyse de vos mouvements",
    "Bilan mouvement personnalisé",
    "Recommandations concrètes et plan d'action",
  ],
  benefits: [
    "Vous comprenez pourquoi vous avez mal",
    "Vous identifiez vos priorités de travail",
    "Vous repartez avec un plan concret",
    "Vous recevez votre bilan PDF personnalisé",
  ],
  cta_label: "Réserver ma séance découverte",
  image_url: "",
  video_url: "",
  updated_at: new Date().toISOString(),
};

export async function getDiscoverySessionSettings(): Promise<DiscoverySessionSettings> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("discovery_session_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  return (data as DiscoverySessionSettings | null) ?? DEFAULT_DISCOVERY;
}

export async function updateDiscoverySessionSettings(
  patch: Partial<DiscoverySessionSettings>,
): Promise<DiscoverySessionSettings | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("discovery_session_settings")
    .upsert({ id: 1, ...patch })
    .select()
    .single();
  return data as DiscoverySessionSettings | null;
}

// ─── Media library ────────────────────────────────────────────

// adminView = true → tous statuts (admin) ; false → published + is_active (site public)
export async function getMediaItems(adminView = false): Promise<MediaItem[]> {
  const supabase = adminView ? getSupabaseAdmin() : await getSupabaseServer();
  let q = supabase
    .from("media_library")
    .select("*")
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (!adminView) {
    q = q.eq("status", "published").eq("is_active", true);
  }
  const { data, error } = await q;
  if (error) console.error("[getMediaItems]", error.message);
  return (data ?? []) as MediaItem[];
}

export async function getMediaByLocation(location: string): Promise<MediaItem[]> {
  const { data, error } = await (await getSupabaseServer())
    .from("media_library")
    .select("*")
    .eq("site_location", location)
    .eq("status", "published")
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) console.error("[getMediaByLocation]", error.message);
  return (data ?? []) as MediaItem[];
}

export async function createMediaItem(item: MediaItemInsert): Promise<MediaItem | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("media_library")
    .insert(item)
    .select()
    .single();
  if (error) console.error("[createMediaItem]", error.message);
  return data as MediaItem | null;
}

export async function updateMediaItem(
  id: string,
  patch: Partial<Omit<MediaItem, "id" | "created_at" | "updated_at">>,
): Promise<MediaItem | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("media_library")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) console.error("[updateMediaItem]", error.message);
  return data as MediaItem | null;
}

export async function deleteMediaItem(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("media_library")
    .delete()
    .eq("id", id);
  if (error) console.error("[deleteMediaItem]", error.message);
}
