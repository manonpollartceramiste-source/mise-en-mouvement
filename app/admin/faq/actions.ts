"use server";

import { redirect } from "next/navigation";
import { faqArraySchema, faqItemSchema, type FaqItem } from "@/lib/content/faq";
import { loadFaq } from "@/lib/content/faq.server";
import { saveContentKey } from "@/lib/supabase/content";

const REVALIDATE_PATHS = ["/faq", "/admin/faq"];

function fail(reason: string): never {
  redirect(`/admin/faq?error=${encodeURIComponent(reason)}`);
}

function done(msg: string): never {
  redirect(`/admin/faq?saved=${encodeURIComponent(msg)}`);
}

export async function faqAction(formData: FormData) {
  const op = String(formData.get("op") ?? "");
  const all = await loadFaq();

  if (op === "delete") {
    const index = Number(formData.get("index") ?? -1);
    if (!Number.isInteger(index) || index < 0 || index >= all.length) {
      fail("Index invalide.");
    }
    const next = all.filter((_, i) => i !== index);
    const valid = faqArraySchema.safeParse(next);
    if (!valid.success) fail("Validation échouée.");
    const res = await saveContentKey("faq", valid.data, REVALIDATE_PATHS);
    if (!res.ok) fail(res.error);
    done("Question supprimée.");
  }

  if (op === "upsert") {
    const candidate: FaqItem = {
      question: String(formData.get("question") ?? "").trim(),
      answer: String(formData.get("answer") ?? "").trim(),
    };
    const parsed = faqItemSchema.safeParse(candidate);
    if (!parsed.success) {
      fail(parsed.error.issues[0]?.message ?? "Validation échouée.");
    }
    const indexRaw = String(formData.get("index") ?? "");
    const index = indexRaw === "" ? -1 : Number(indexRaw);

    const next: FaqItem[] =
      index >= 0 && index < all.length
        ? all.map((item, i) => (i === index ? parsed.data : item))
        : [...all, parsed.data];

    const valid = faqArraySchema.safeParse(next);
    if (!valid.success) fail("Validation globale échouée.");
    const res = await saveContentKey("faq", valid.data, REVALIDATE_PATHS);
    if (!res.ok) fail(res.error);
    done(index >= 0 ? "Question modifiée." : "Question ajoutée.");
  }

  fail("Opération inconnue.");
}
