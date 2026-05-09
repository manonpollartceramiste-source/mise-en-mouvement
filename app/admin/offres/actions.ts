"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  getSupabaseServer,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import {
  offerArraySchema,
  offerSchema,
  type CoachLink,
  type Offer,
} from "@/lib/content/offers";
import { loadOffers } from "@/lib/content/offers.server";
import { loadCoaches } from "@/lib/content/coaches.server";

const REVALIDATE_PATHS = [
  "/",
  "/offres",
  "/reservation",
  "/contact",
  "/admin/offres",
];

function fail(reason: string): never {
  redirect(`/admin/offres?error=${encodeURIComponent(reason)}`);
}

function done(msg: string): never {
  redirect(`/admin/offres?saved=${encodeURIComponent(msg)}`);
}

async function persist(next: Offer[]) {
  const valid = offerArraySchema.safeParse(next);
  if (!valid.success) fail("Validation globale échouée.");
  if (!isSupabaseConfigured()) fail("Supabase non configuré.");
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("content").upsert({
    key: "offers",
    value: valid.data,
    updated_at: new Date().toISOString(),
  });
  if (error) fail(error.message);
  for (const p of REVALIDATE_PATHS) revalidatePath(p);
}

function emptyToNull(s: string): string | null {
  return s === "" ? null : s;
}

async function buildOfferFromForm(
  formData: FormData,
  idOverride?: string,
): Promise<Offer> {
  const detailsRaw = String(formData.get("details") ?? "");
  const details = detailsRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const totalCentsRaw = formData.get("totalCents");
  const totalCents =
    typeof totalCentsRaw === "string" && totalCentsRaw.trim() !== ""
      ? Number(totalCentsRaw)
      : null;

  const participantsRaw = formData.get("participants");
  const participants =
    typeof participantsRaw === "string" && participantsRaw.trim() !== ""
      ? Number(participantsRaw)
      : null;

  const durationRaw = String(formData.get("duration") ?? "").trim();
  const badgeRaw = String(formData.get("badge") ?? "").trim();

  // Coachs autorisés + liens — itère sur les coachs connus.
  const coaches = await loadCoaches();
  const allowedCoaches: string[] = [];
  const coachLinks: Record<string, CoachLink> = {};

  for (const c of coaches) {
    if (formData.get(`coach_${c.id}_allowed`) === "on") {
      allowedCoaches.push(c.id);
    }
    const sumupRaw = String(formData.get(`coach_${c.id}_sumup`) ?? "").trim();
    const calcomRaw = String(formData.get(`coach_${c.id}_calcom`) ?? "").trim();
    if (sumupRaw !== "" || calcomRaw !== "") {
      coachLinks[c.id] = {
        sumup: emptyToNull(sumupRaw),
        calcom: emptyToNull(calcomRaw),
      };
    }
  }

  // « Tous les coachs » : la case "all" cochée → allowedCoaches = []
  if (formData.get("allow_all") === "on") {
    allowedCoaches.length = 0;
  }

  const candidate: unknown = {
    id: idOverride ?? String(formData.get("id") ?? "").trim(),
    category: String(formData.get("category") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    priceLabel: String(formData.get("priceLabel") ?? "").trim(),
    totalCents,
    duration: emptyToNull(durationRaw),
    participants,
    description: String(formData.get("description") ?? ""),
    details,
    highlight: formData.get("highlight") === "on",
    badge: badgeRaw === "" ? undefined : badgeRaw,
    allowedCoaches,
    coachLinks,
  };

  const parsed = offerSchema.safeParse(candidate);
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "Validation échouée.");
  }
  return parsed.data;
}

export async function saveOffer(formData: FormData) {
  if (!isSupabaseConfigured()) fail("Supabase non configuré.");
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const offer = await buildOfferFromForm(formData);
  const all = await loadOffers();
  const idx = all.findIndex((o) => o.id === offer.id);
  const next: Offer[] =
    idx >= 0
      ? all.map((o, i) => (i === idx ? offer : o))
      : [...all, offer];
  await persist(next);
  done(`Offre « ${offer.id} » enregistrée.`);
}

export async function createOffer(formData: FormData) {
  if (!isSupabaseConfigured()) fail("Supabase non configuré.");
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) fail("Identifiant requis.");
  if (!/^[a-z0-9-]+$/.test(id)) {
    fail("Identifiant invalide (a-z, 0-9, tirets).");
  }
  const all = await loadOffers();
  if (all.some((o) => o.id === id)) {
    fail(`L'identifiant « ${id} » existe déjà.`);
  }
  const offer = await buildOfferFromForm(formData, id);
  await persist([...all, offer]);
  done(`Offre « ${id} » créée.`);
}

export async function deleteOffer(formData: FormData) {
  if (!isSupabaseConfigured()) fail("Supabase non configuré.");
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) fail("Identifiant manquant.");
  const all = await loadOffers();
  if (!all.some((o) => o.id === id)) fail("Offre introuvable.");
  await persist(all.filter((o) => o.id !== id));
  done(`Offre « ${id} » supprimée.`);
}
