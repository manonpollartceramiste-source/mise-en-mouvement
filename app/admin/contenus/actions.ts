"use server";

import { redirect } from "next/navigation";
import {
  defaultTexts,
  siteTextsSchema,
  type SiteTexts,
} from "@/lib/content/texts";
import { saveContentKey } from "@/lib/supabase/content";

const REVALIDATE_PATHS = ["/", "/admin/contenus"];

function fail(reason: string): never {
  redirect(`/admin/contenus?error=${encodeURIComponent(reason)}`);
}

function done(msg: string): never {
  redirect(`/admin/contenus?saved=${encodeURIComponent(msg)}`);
}

export async function saveTexts(formData: FormData) {
  const candidate = Object.fromEntries(
    Object.keys(defaultTexts).map((key) => [key, String(formData.get(key) ?? "")]),
  ) as SiteTexts;

  const parsed = siteTextsSchema.safeParse(candidate);
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "Validation échouée.");
  }

  const res = await saveContentKey("site_texts", parsed.data, REVALIDATE_PATHS);
  if (!res.ok) fail(res.error);
  done("Textes enregistrés.");
}
