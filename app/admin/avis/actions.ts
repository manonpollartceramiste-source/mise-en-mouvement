"use server";

import { redirect } from "next/navigation";
import {
  testimonialArraySchema,
  testimonialSchema,
  type Testimonial,
} from "@/lib/content/testimonials";
import { loadTestimonials } from "@/lib/content/testimonials.server";
import { saveContentKey } from "@/lib/supabase/content";

const PATHS = ["/", "/avis", "/admin/avis"];

function fail(reason: string): never {
  redirect(`/admin/avis?error=${encodeURIComponent(reason)}`);
}

function done(msg: string): never {
  redirect(`/admin/avis?saved=${encodeURIComponent(msg)}`);
}

async function persist(items: Testimonial[], msg: string) {
  const reordered = items.map((t, i) => ({ ...t, order: i }));
  const valid = testimonialArraySchema.safeParse(reordered);
  if (!valid.success) fail("Validation échouée.");
  const res = await saveContentKey("testimonials", valid.data, PATHS);
  if (!res.ok) fail(res.error);
  done(msg);
}

export async function avisAction(formData: FormData) {
  const op = String(formData.get("op") ?? "");
  const all = await loadTestimonials();

  if (op === "delete") {
    const index = Number(formData.get("index") ?? -1);
    if (!Number.isInteger(index) || index < 0 || index >= all.length)
      fail("Index invalide.");
    await persist(
      all.filter((_, i) => i !== index),
      "Avis supprimé.",
    );
  }

  if (op === "toggleVisible") {
    const index = Number(formData.get("index") ?? -1);
    if (!Number.isInteger(index) || index < 0 || index >= all.length)
      fail("Index invalide.");
    const wasVisible = all[index].visible;
    const next = all.map((t, i) =>
      i === index ? { ...t, visible: !t.visible } : t,
    );
    await persist(next, wasVisible ? "Avis masqué." : "Avis rendu visible.");
  }

  if (op === "moveUp") {
    const index = Number(formData.get("index") ?? -1);
    if (!Number.isInteger(index) || index <= 0 || index >= all.length)
      fail("Déjà en première position.");
    const next = [...all];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    await persist(next, "Ordre mis à jour.");
  }

  if (op === "moveDown") {
    const index = Number(formData.get("index") ?? -1);
    if (!Number.isInteger(index) || index < 0 || index >= all.length - 1)
      fail("Déjà en dernière position.");
    const next = [...all];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    await persist(next, "Ordre mis à jour.");
  }

  if (op === "upsert") {
    const indexRaw = String(formData.get("index") ?? "");
    const index = indexRaw === "" ? -1 : Number(indexRaw);

    const contextRaw = String(formData.get("context") ?? "").trim();
    const dateRaw = String(formData.get("date") ?? "").trim();

    const candidate = {
      author: String(formData.get("author") ?? "").trim(),
      quote: String(formData.get("quote") ?? "").trim(),
      rating: Number(formData.get("rating") ?? 5),
      context: contextRaw || undefined,
      date: dateRaw || undefined,
      visible: formData.get("visible") === "on",
      order: index >= 0 ? (all[index]?.order ?? index) : all.length,
    };

    const parsed = testimonialSchema.safeParse(candidate);
    if (!parsed.success) {
      fail(parsed.error.issues[0]?.message ?? "Validation échouée.");
    }

    const next: Testimonial[] =
      index >= 0 && index < all.length
        ? all.map((item, i) => (i === index ? parsed.data : item))
        : [...all, parsed.data];

    await persist(next, index >= 0 ? "Avis modifié." : "Avis ajouté.");
  }

  fail("Opération inconnue.");
}
