"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, isSupabaseConfigured } from "@/lib/supabase/server";
import { inviteOsUser, updateOsProfile } from "@/lib/supabase/admin-actions";

function fail(msg: string): never {
  redirect(`/admin/os-clients?error=${encodeURIComponent(msg)}`);
}

function done(msg: string): never {
  redirect(`/admin/os-clients?saved=${encodeURIComponent(msg)}`);
}

export async function createClientAction(formData: FormData) {
  if (!isSupabaseConfigured()) fail("Supabase non configuré.");
  const user = await getCurrentUser();
  if (!user) fail("Non autorisé.");

  const email = String(formData.get("email") ?? "").trim();
  const display_name = String(formData.get("display_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || undefined;
  const coach_id = String(formData.get("coach_id") ?? "").trim() || undefined;

  if (!email || !display_name) fail("Email et nom sont obligatoires.");

  const result = await inviteOsUser({
    email,
    display_name,
    role: "client",
    phone,
    coach_id,
  });

  if (!result.ok) fail(result.error ?? "Erreur lors de la création.");
  done(`Client « ${display_name} » invité. Un email lui a été envoyé.`);
}

export async function updateClientAction(formData: FormData) {
  if (!isSupabaseConfigured()) fail("Supabase non configuré.");
  const user = await getCurrentUser();
  if (!user) fail("Non autorisé.");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) fail("Identifiant manquant.");

  const coach_id = String(formData.get("coach_id") ?? "").trim() || null;

  const result = await updateOsProfile(id, {
    display_name: String(formData.get("display_name") ?? "").trim() || undefined,
    phone: String(formData.get("phone") ?? "").trim() || null,
    coach_id,
    active: formData.get("active") === "on",
  });

  if (!result.ok) fail(result.error ?? "Erreur lors de la mise à jour.");
  done("Client mis à jour.");
}
