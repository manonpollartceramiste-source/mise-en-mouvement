// ─── Line item ────────────────────────────────────────────────

export type LineItem = {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  tva_pct: number;
  total_ht: number;
  total_ttc: number;
};

// ─── Quote ────────────────────────────────────────────────────

export type QuoteStatus = "brouillon" | "envoyé" | "accepté" | "refusé" | "expiré";

export type Quote = {
  id: string;
  coach_id: string;
  number: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  title: string;
  description: string;
  line_items: LineItem[];
  discount_pct: number;
  discount_amount: number;
  notes: string;
  conditions: string;
  validity_days: number;
  status: QuoteStatus;
  issued_at: string;
  expires_at: string;
  subtotal_ht: number;
  total_tva: number;
  total_ttc: number;
  created_at: string;
  updated_at: string;
};

export type QuoteInsert = Omit<Quote, "id" | "created_at" | "updated_at">;

// ─── Invoice ──────────────────────────────────────────────────

export type InvoiceStatus = "brouillon" | "envoyée" | "payée" | "en_retard" | "annulée";

export type Invoice = {
  id: string;
  coach_id: string;
  quote_id: string | null;
  number: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  line_items: LineItem[];
  discount_pct: number;
  discount_amount: number;
  payment_method: string;
  legal_mentions: string;
  notes: string;
  status: InvoiceStatus;
  issued_at: string;
  due_at: string;
  subtotal_ht: number;
  total_tva: number;
  total_ttc: number;
  created_at: string;
  updated_at: string;
};

export type InvoiceInsert = Omit<Invoice, "id" | "created_at" | "updated_at">;

// ─── Prestation (bibliothèque) ────────────────────────────────

export type Prestation = {
  id: string;
  coach_id: string;
  name: string;
  description: string | null;
  unit_price: number;
  tva_pct: number;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PrestationInsert = Omit<Prestation, "id" | "created_at" | "updated_at">;

// ─── Site settings ────────────────────────────────────────────

export type SiteSettings = {
  id: 1;
  company_name: string;
  siret: string;
  address: string;
  city: string;
  postal_code: string;
  email: string;
  phone: string;
  website: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  pdf_footer_text: string;
  pdf_quote_conditions: string;
  pdf_invoice_mentions: string;
  updated_at: string;
};

// ─── Discovery session settings ───────────────────────────────

export type DiscoverySessionSettings = {
  id: 1;
  title: string;
  subtitle: string;
  price: number;
  duration_min: number;
  description: string;
  session_steps: string[];
  benefits: string[];
  cta_label: string;
  image_url: string;
  video_url: string;
  updated_at: string;
};

// ─── Media ────────────────────────────────────────────────────

export type MediaCategory =
  | "hero"
  | "cabinet"
  | "coach"
  | "seance"
  | "temoignage"
  | "exercices"
  | "ambiance";

export type SiteLocation =
  | "hero"
  | "decouverte"
  | "cabinet"
  | "coachs"
  | "comment-ca-se-passe"
  | "exercices"
  | "temoignages"
  | "avant-apres"
  | "footer-ambiance";

export const SITE_LOCATIONS: { value: string; label: string; description: string }[] = [
  { value: "hero",                label: "Hero page d'accueil",        description: "Image principale du bandeau hero" },
  { value: "decouverte",          label: "Section Séance Découverte",   description: "Visuels de la section séance découverte" },
  { value: "cabinet",             label: "Galerie cabinet",             description: "Photos du cabinet affichées en galerie" },
  { value: "coachs",              label: "Section Coachs",              description: "Photos et visuels des coachs" },
  { value: "comment-ca-se-passe", label: "Section Comment ça se passe", description: "Visuels illustrant les étapes de la méthode" },
  { value: "exercices",           label: "Section Exercices",           description: "Photos et vidéos d'exercices" },
  { value: "temoignages",         label: "Témoignages",                 description: "Visuels associés aux témoignages clients" },
  { value: "avant-apres",         label: "Avant / Après",               description: "Photos de comparaison avant / après" },
  { value: "footer-ambiance",     label: "Footer / Ambiance",           description: "Visuels de fond et d'ambiance générale" },
];

export const USAGE_TYPES: { value: string; label: string }[] = [
  { value: "image-principale", label: "Image principale" },
  { value: "image-secondaire", label: "Image secondaire" },
  { value: "video-principale", label: "Vidéo principale" },
  { value: "video-courte",     label: "Vidéo courte" },
  { value: "vignette",         label: "Vignette" },
  { value: "fond-section",     label: "Fond de section" },
];

export type MediaStatus = "draft" | "published" | "archived";

export type MediaItem = {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: "image" | "video";
  category: MediaCategory;
  site_location: string;
  usage_type: string;
  alt_text: string;
  caption: string;
  is_active: boolean;
  status: MediaStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type MediaItemInsert = {
  title: string;
  description: string;
  file_url: string;
  file_type: "image" | "video";
  category: MediaCategory;
  site_location?: string;
  usage_type?: string;
  alt_text?: string;
  caption?: string;
  is_active: boolean;
  status?: MediaStatus;
  sort_order: number;
};

// ─── Helpers ─────────────────────────────────────────────────

export function computeTotals(items: LineItem[], discountPct = 0, discountAmount = 0) {
  const rawHt = items.reduce((s, i) => s + i.total_ht, 0);
  const rawTva = items.reduce((s, i) => s + (i.total_ht * i.tva_pct) / 100, 0);
  const discountValue = discountAmount > 0 ? discountAmount : (rawHt * discountPct) / 100;
  const subtotal_ht = Math.max(0, rawHt - discountValue);
  const total_tva = rawHt > 0 ? (subtotal_ht / rawHt) * rawTva : 0;
  const total_ttc = subtotal_ht + total_tva;
  return { subtotal_ht, total_tva, total_ttc };
}

export function makeLineItem(partial: Partial<LineItem> = {}): LineItem {
  const qty = partial.quantity ?? 1;
  const unit = partial.unit_price ?? 0;
  const tva = partial.tva_pct ?? 0;
  const total_ht = qty * unit;
  const total_ttc = total_ht * (1 + tva / 100);
  return {
    id: partial.id ?? crypto.randomUUID(),
    name: partial.name ?? "",
    description: partial.description ?? "",
    quantity: qty,
    unit_price: unit,
    tva_pct: tva,
    total_ht,
    total_ttc,
  };
}

export function fmtEur(n: number | string | null | undefined): string {
  const num = Number(n ?? 0);
  return (isNaN(num) ? 0 : num).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  brouillon: "Brouillon",
  envoyé: "Envoyé",
  accepté: "Accepté",
  refusé: "Refusé",
  expiré: "Expiré",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  brouillon: "Brouillon",
  envoyée: "Envoyée",
  payée: "Payée",
  en_retard: "En retard",
  annulée: "Annulée",
};

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  brouillon: "bg-sand-200 text-taupe-700",
  envoyé: "bg-blue-50 text-blue-700",
  accepté: "bg-green-50 text-green-700",
  refusé: "bg-red-50 text-red-700",
  expiré: "bg-sand-100 text-taupe-500",
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  brouillon: "bg-sand-200 text-taupe-700",
  envoyée: "bg-blue-50 text-blue-700",
  payée: "bg-green-50 text-green-700",
  en_retard: "bg-red-50 text-red-700",
  annulée: "bg-sand-100 text-taupe-500",
};
