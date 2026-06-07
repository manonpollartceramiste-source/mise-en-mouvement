"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, isSupabaseConfigured } from "@/lib/supabase/server";
import { inviteOsUser, updateOsProfile, setOsUserPassword, resendOsInvite } from "@/lib/supabase/admin-actions";

function fail(msg: string): never {
  redirect(`/admin/os-coachs?error=${encodeURIComponent(msg)}`);
}

function done(msg: string): never {
  redirect(`/admin/os-coachs?saved=${encodeURIComponent(msg)}`);
}

export async function createCoachAction(formData: FormData) {
  if (!isSupabaseConfigured()) fail("Supabase non configuré.");
  const user = await getCurrentUser();
  if (!user) fail("Non autorisé.");

  const email = String(formData.get("email") ?? "").trim();
  const display_name = String(formData.get("display_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || undefined;
  const bio = String(formData.get("bio") ?? "").trim() || undefined;
  const sumup_url = String(formData.get("sumup_url") ?? "").trim() || undefined;

  if (!email || !display_name) fail("Email et nom sont obligatoires.");

  const result = await inviteOsUser({
    email,
    display_name,
    role: "coach",
    phone,
    bio,
    sumup_url,
  });

  if (!result.ok) fail(result.error ?? "Erreur lors de la création.");
  done(`Coach « ${display_name} » invité. Un email lui a été envoyé.`);
}

export async function updateCoachAction(formData: FormData) {
  if (!isSupabaseConfigured()) fail("Supabase non configuré.");
  const user = await getCurrentUser();
  if (!user) fail("Non autorisé.");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) fail("Identifiant manquant.");

  const result = await updateOsProfile(id, {
    display_name: String(formData.get("display_name") ?? "").trim() || undefined,
    phone: String(formData.get("phone") ?? "").trim() || null,
    bio: String(formData.get("bio") ?? "").trim() || null,
    sumup_url: String(formData.get("sumup_url") ?? "").trim() || null,
    active: formData.get("active") === "on",
  });

  if (!result.ok) fail(result.error ?? "Erreur lors de la mise à jour.");
  done("Coach mis à jour.");
}

export async function setCoachPasswordAction(formData: FormData) {
  if (!isSupabaseConfigured()) fail("Supabase non configuré.");
  const user = await getCurrentUser();
  if (!user) fail("Non autorisé.");

  const id = String(formData.get("id") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!id) fail("Identifiant manquant.");
  if (password.length < 8) fail("Le mot de passe temporaire doit contenir au moins 8 caractères.");

  const result = await setOsUserPassword(id, password);
  if (!result.ok) fail(result.error ?? "Erreur lors de la définition du mot de passe.");
  done("Mot de passe défini. Communiquez-le au coach par SMS / WhatsApp.");
}

export async function resendCoachInviteAction(formData: FormData) {
  if (!isSupabaseConfigured()) fail("Supabase non configuré.");
  const user = await getCurrentUser();
  if (!user) fail("Non autorisé.");

  const email = String(formData.get("email") ?? "").trim();
  if (!email) fail("Email manquant.");

  const result = await resendOsInvite(email);
  if (!result.ok) fail(result.error ?? "Erreur lors du renvoi de l'invitation.");
  done("Invitation renvoyée par email.");
}
