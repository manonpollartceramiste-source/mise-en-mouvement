"use server";

import { redirect } from "next/navigation";
import {
  coachArraySchema,
  coachSchema,
  type Coach,
} from "@/lib/content/coaches";
import { loadCoaches } from "@/lib/content/coaches.server";
import { saveContentKey } from "@/lib/supabase/content";
import {
  inviteOsCoach,
  updateOsProfile,
  resendOsInvite,
  getOsProfileByEmail,
  setOsUserPassword,
} from "@/lib/supabase/admin-actions";

const REVALIDATE_PATHS = [
  "/",
  "/coachs",
  "/reservation",
  "/mentions-legales",
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
    const emailRaw = String(formData.get("email") ?? "").trim();
    const osProfileIdRaw = String(formData.get("osProfileId") ?? "").trim();

    const candidate: Coach = {
      id,
      name: String(formData.get("name") ?? "").trim(),
      initials: String(formData.get("initials") ?? "").trim(),
      role: String(formData.get("role") ?? "").trim(),
      shortRole: String(formData.get("shortRole") ?? "").trim(),
      diploma: String(formData.get("diploma") ?? "").trim(),
      bio: String(formData.get("bio") ?? "").trim(),
      highlights: parseHighlights(String(formData.get("highlights") ?? "")),
      sumupUrl: sumupRaw === "" ? null : sumupRaw,
      active: formData.get("active") === "on",
      siret: String(formData.get("siret") ?? "").trim() || undefined,
      legalRole: String(formData.get("legalRole") ?? "").trim() || undefined,
      proEmail: String(formData.get("proEmail") ?? "").trim() || undefined,
      email: emailRaw || undefined,
      osProfileId: osProfileIdRaw || undefined,
    };

    const parsed = coachSchema.safeParse(candidate);
    if (!parsed.success) {
      fail(parsed.error.issues[0]?.message ?? "Validation échouée.");
    }

    const idx = all.findIndex((c) => c.id === id);
    const isNew = idx < 0;
    let next: Coach[] =
      idx >= 0
        ? all.map((c, i) => (i === idx ? parsed.data : c))
        : [...all, parsed.data];

    // Nouveau coach + email fourni + pas encore de compte OS → invitation auto
    let osError: string | undefined;
    if (isNew && emailRaw && !osProfileIdRaw) {
      const invite = await inviteOsCoach({
        email: emailRaw,
        display_name: candidate.name,
        role: "coach",
        sumup_url: candidate.sumupUrl || undefined,
      });
      if (invite.ok && invite.userId) {
        next = next.map((c) =>
          c.id === id ? { ...c, osProfileId: invite.userId } : c,
        );
      } else {
        osError = invite.error;
      }
    }

    const valid = coachArraySchema.safeParse(next);
    if (!valid.success) fail("Validation globale échouée.");
    const res = await saveContentKey("coaches", valid.data, REVALIDATE_PATHS);
    if (!res.ok) fail(res.error);

    if (osError) done(`Coach ajouté mais invitation OS échouée : ${osError}`);
    done(isNew ? `Coach « ${id} » ajouté.` : `Coach « ${id} » modifié.`);
  }

  fail("Opération inconnue.");
}

/** Crée un compte OS pour un coach existant qui n'en a pas encore. */
export async function createOsAccountAction(formData: FormData) {
  const coachId = String(formData.get("coachId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!coachId || !email) fail("Données manquantes.");

  const all = await loadCoaches();
  const coach = all.find((c) => c.id === coachId);
  if (!coach) fail("Coach introuvable.");

  const invite = await inviteOsCoach({
    email,
    display_name: coach.name,
    role: "coach",
    sumup_url: coach.sumupUrl || undefined,
  });

  if (!invite.ok || !invite.userId) {
    fail(invite.error ?? "Erreur lors de l'invitation OS.");
  }

  const next = all.map((c) =>
    c.id === coachId ? { ...c, email, osProfileId: invite.userId } : c,
  );
  const valid = coachArraySchema.safeParse(next);
  if (!valid.success) fail("Validation échouée.");
  const res = await saveContentKey("coaches", valid.data, REVALIDATE_PATHS);
  if (!res.ok) fail(res.error);

  done(`Invitation OS envoyée à ${email}.`);
}

/** Rattache un compte OS existant à un coach public (sans créer ni inviter). */
export async function linkExistingOsAccountAction(formData: FormData) {
  const coachId = String(formData.get("coachId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!coachId || !email) fail("Données manquantes.");

  const all = await loadCoaches();
  const coach = all.find((c) => c.id === coachId);
  if (!coach) fail("Coach introuvable.");

  const profile = await getOsProfileByEmail(email);
  if (!profile) fail(`Aucun compte OS trouvé pour l'email « ${email} ».`);

  const roles: string[] =
    Array.isArray(profile.roles) && profile.roles.length > 0
      ? profile.roles
      : [profile.role];
  if (!roles.includes("coach") && !roles.includes("admin")) {
    fail("Ce compte OS n'a pas le rôle coach — rattachement refusé.");
  }

  const next = all.map((c) =>
    c.id === coachId ? { ...c, email, osProfileId: profile.id } : c,
  );
  const valid = coachArraySchema.safeParse(next);
  if (!valid.success) fail("Validation échouée.");
  const res = await saveContentKey("coaches", valid.data, REVALIDATE_PATHS);
  if (!res.ok) fail(res.error);

  done(`Compte OS « ${profile.display_name} » rattaché avec succès.`);
}

/** Renvoie l'invitation OS à un coach (si invitation non encore confirmée). */
export async function resendInviteAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) fail("Email manquant.");

  const result = await resendOsInvite(email);
  if (!result.ok) fail(result.error ?? "Erreur lors du renvoi.");
  done(`Invitation renvoyée à ${email}.`);
}

/** Définit ou réinitialise le mot de passe OS d'un coach (admin uniquement). */
export async function setCoachPasswordAction(formData: FormData) {
  const osProfileId = String(formData.get("osProfileId") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!osProfileId) fail("Profil OS manquant.");
  if (password.length < 8) fail("Le mot de passe doit contenir au moins 8 caractères.");

  const result = await setOsUserPassword(osProfileId, password);
  if (!result.ok) fail(result.error ?? "Erreur lors de la définition du mot de passe.");
  done("Mot de passe défini. Communiquez-le au coach par SMS / WhatsApp.");
}

/** Active ou désactive l'accès OS d'un coach. */
export async function toggleOsAccessAction(formData: FormData) {
  const osProfileId = String(formData.get("osProfileId") ?? "").trim();
  const activeStr = String(formData.get("active") ?? "");
  if (!osProfileId) fail("Profil OS manquant.");

  const active = activeStr === "true";
  const result = await updateOsProfile(osProfileId, { active });
  if (!result.ok) fail(result.error ?? "Erreur lors de la mise à jour.");
  done(active ? "Accès OS réactivé." : "Accès OS désactivé.");
}
