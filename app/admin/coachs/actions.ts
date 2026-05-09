"use server";

import { redirect } from "next/navigation";
import {
  coachArraySchema,
  coachSchema,
  type Coach,
} from "@/lib/content/coaches";
import { loadCoaches } from "@/lib/content/coaches.server";
import { saveContentKey } from "@/lib/supabase/content";

const REVALIDATE_PATHS = [
  "/",
  "/coachs",
  "/reservation",
  "/admin/coachs",
];

function fail(reason: string): never {
  redirect(`/admin/coachs?error=${encodeURIComponent(reason)}`);
}

function done(msg: string): never {
  redirect(`/admin/coachs?saved=${encodeURIComponent(msg)}`);
}

function parseHighlights(raw: string): string[] {
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function coachAction(formData: FormData) {
  const op = String(formData.get("op") ?? "");
  const all = await loadCoaches();

  if (op === "delete") {
    const id = String(formData.get("id") ?? "");
    if (!id) fail("Identifiant manquant.");
    if (all.length <= 1) fail("Au moins un coach doit rester actif.");
    const next = all.filter((c) => c.id !== id);
    const valid = coachArraySchema.safeParse(next);
    if (!valid.success) fail("Validation échouée.");
    const res = await saveContentKey("coaches", valid.data, REVALIDATE_PATHS);
    if (!res.ok) fail(res.error);
    done("Coach supprimé.");
  }

  if (op === "upsert") {
    const id = String(formData.get("id") ?? "").trim();
    if (!id || !/^[a-z0-9-]+$/.test(id)) {
      fail("Identifiant invalide (a-z, 0-9, tirets uniquement).");
    }

    const sumupRaw = String(formData.get("sumupUrl") ?? "").trim();
    const candidate: Coach = {
      id,
      name: String(formData.get("name") ?? "").trim(),
      initials: String(formData.get("initials") ?? "").trim(),
      role: String(formData.get("role") ?? "").trim(),
      shortRole: String(formData.get("shortRole") ?? "").trim(),
      diploma: String(formData.get("diploma") ?? "").trim(),
      bio: String(formData.get("bio") ?? "").trim(),
      highlights: parseHighlights(String(formData.get("highlights") ?? "")),
      calcomUrl: String(formData.get("calcomUrl") ?? "").trim(),
      sumupUrl: sumupRaw === "" ? null : sumupRaw,
      active: formData.get("active") === "on",
    };

    const parsed = coachSchema.safeParse(candidate);
    if (!parsed.success) {
      fail(parsed.error.issues[0]?.message ?? "Validation échouée.");
    }

    const idx = all.findIndex((c) => c.id === id);
    const next: Coach[] =
      idx >= 0
        ? all.map((c, i) => (i === idx ? parsed.data : c))
        : [...all, parsed.data];

    const valid = coachArraySchema.safeParse(next);
    if (!valid.success) fail("Validation globale échouée.");
    const res = await saveContentKey("coaches", valid.data, REVALIDATE_PATHS);
    if (!res.ok) fail(res.error);
    done(idx >= 0 ? `Coach « ${id} » modifié.` : `Coach « ${id} » ajouté.`);
  }

  fail("Opération inconnue.");
}
