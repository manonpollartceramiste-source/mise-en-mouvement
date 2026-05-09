"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  getSupabaseServer,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { popupInputSchema } from "@/lib/content/popups";

const REVALIDATE_PATHS = ["/", "/offres", "/admin/popups"];

function fail(reason: string): never {
  redirect(`/admin/popups?error=${encodeURIComponent(reason)}`);
}

function done(msg: string): never {
  redirect(`/admin/popups?saved=${encodeURIComponent(msg)}`);
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  return s === "" ? null : s;
}

function isoOrNull(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function requireAdmin() {
  if (!isSupabaseConfigured()) fail("Supabase non configuré.");
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return getSupabaseServer();
}

export async function popupAction(formData: FormData) {
  const op = String(formData.get("op") ?? "");
  const supabase = await requireAdmin();

  if (op === "delete") {
    const id = String(formData.get("id") ?? "");
    if (!id) fail("Identifiant manquant.");
    const { error } = await supabase.from("popups").delete().eq("id", id);
    if (error) fail(error.message);
    for (const p of REVALIDATE_PATHS) revalidatePath(p);
    done("Pop-up supprimée.");
  }

  if (op === "upsert") {
    const candidate = {
      title: String(formData.get("title") ?? "").trim(),
      body: String(formData.get("body") ?? "").trim(),
      ctaLabel: emptyToNull(formData.get("ctaLabel")),
      ctaHref: emptyToNull(formData.get("ctaHref")),
      scope: String(formData.get("scope") ?? "home"),
      active: formData.get("active") === "on",
      startsAt: isoOrNull(formData.get("startsAt")),
      endsAt: isoOrNull(formData.get("endsAt")),
    };

    const parsed = popupInputSchema.safeParse(candidate);
    if (!parsed.success) {
      fail(parsed.error.issues[0]?.message ?? "Validation échouée.");
    }

    const id = String(formData.get("id") ?? "").trim();
    const dbRow = {
      title: parsed.data.title,
      body: parsed.data.body,
      cta_label: parsed.data.ctaLabel,
      cta_href: parsed.data.ctaHref,
      scope: parsed.data.scope,
      active: parsed.data.active,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
      updated_at: new Date().toISOString(),
    };

    if (id) {
      const { error } = await supabase
        .from("popups")
        .update(dbRow)
        .eq("id", id);
      if (error) fail(error.message);
      for (const p of REVALIDATE_PATHS) revalidatePath(p);
      done("Pop-up modifiée.");
    } else {
      const { error } = await supabase.from("popups").insert(dbRow);
      if (error) fail(error.message);
      for (const p of REVALIDATE_PATHS) revalidatePath(p);
      done("Pop-up créée.");
    }
  }

  fail("Opération inconnue.");
}
