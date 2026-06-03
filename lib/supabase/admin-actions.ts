import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Profile, UserRole } from "@/lib/os/types";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing = (
    [
      !url && "NEXT_PUBLIC_SUPABASE_URL",
      !serviceKey && "SUPABASE_SERVICE_ROLE_KEY",
    ] as (string | false)[]
  ).filter((v): v is string => Boolean(v));

  if (missing.length > 0) {
    const names = missing.join(", ");
    console.error(`[SUPABASE_ADMIN] Variable(s) manquante(s) : ${names}`);
    throw new Error(`Variable(s) d'environnement manquante(s) : ${names}`);
  }

  return createClient(url!, serviceKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type CreateUserData = {
  email: string;
  display_name: string;
  role: UserRole;
  phone?: string;
  bio?: string;
  coach_id?: string | null;
  calcom_url?: string;
  sumup_url?: string;
};

/** Invite un utilisateur par email et configure son profil Cabinet OS. */
export async function inviteOsUser(
  data: CreateUserData,
): Promise<{ ok: boolean; error?: string }> {
  const admin = getServiceClient();

  const { data: inviteData, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(data.email, {
      data: { display_name: data.display_name, role: data.role },
    });

  if (inviteError) return { ok: false, error: inviteError.message };

  const userId = inviteData.user.id;

  const profileData: Record<string, unknown> = {
    id: userId,
    email: data.email,
    display_name: data.display_name,
    role: data.role,
    roles: [data.role],
    active: true,
  };
  if (data.phone) profileData.phone = data.phone;
  if (data.bio) profileData.bio = data.bio;
  if (data.coach_id) profileData.coach_id = data.coach_id;
  if (data.calcom_url) profileData.calcom_url = data.calcom_url;
  if (data.sumup_url) profileData.sumup_url = data.sumup_url;

  const { error: profileError } = await admin
    .from("profiles")
    .upsert(profileData, { onConflict: "id" });

  if (profileError) return { ok: false, error: profileError.message };
  return { ok: true };
}

export type UpdateProfileData = {
  display_name?: string;
  phone?: string | null;
  bio?: string | null;
  coach_id?: string | null;
  calcom_url?: string | null;
  sumup_url?: string | null;
  active?: boolean;
  role?: UserRole;
  roles?: string[];
};

/** Met à jour un profil Cabinet OS (service role, contourne RLS). */
export async function updateOsProfile(
  id: string,
  data: UpdateProfileData,
): Promise<{ ok: boolean; error?: string }> {
  const admin = getServiceClient();
  const { error } = await admin.from("profiles").update(data).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Vérifie qu'un profil existe pour cet auth user.
 * S'il est absent (trigger non déclenché), le crée depuis les metadata.
 * Retourne le profil (existant ou créé), ou null en cas d'échec.
 */
export async function ensureOsProfile(
  userId: string,
  email: string,
  metadata: Record<string, unknown> = {},
): Promise<{ role: string; roles: string[]; active: boolean } | null> {
  const admin = getServiceClient();

  const { data: existing } = await admin
    .from("profiles")
    .select("id, role, roles, active")
    .eq("id", userId)
    .maybeSingle();

  if (existing) return existing as { role: string; roles: string[]; active: boolean };

  const rawRole = metadata.role as string | undefined;
  const validRoles: UserRole[] = ["admin", "coach", "client"];
  const role: UserRole = validRoles.includes(rawRole as UserRole)
    ? (rawRole as UserRole)
    : "client";
  const displayName =
    (metadata.display_name as string | undefined) ??
    email.split("@")[0];

  const { data: created, error } = await admin
    .from("profiles")
    .insert({ id: userId, email, display_name: displayName, role, roles: [role], active: true })
    .select("id, role, roles, active")
    .single();

  if (error) return null;
  return created as { role: string; roles: string[]; active: boolean };
}

/** Retourne tous les profils coachs (actifs + inactifs). */
export async function getAllOsCoaches(): Promise<Profile[]> {
  const admin = getServiceClient();
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .eq("role", "coach")
    .order("display_name");
  if (error || !data) return [];
  return data as Profile[];
}

/** Retourne tous les profils clients (actifs + inactifs). */
export async function getAllOsClients(): Promise<Profile[]> {
  const admin = getServiceClient();
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .eq("role", "client")
    .order("display_name");
  if (error || !data) return [];
  return data as Profile[];
}

/**
 * Crée un client depuis l'espace coach (pas d'email envoyé).
 * Le client peut se connecter via "mot de passe oublié".
 */
export async function createClientForCoach(
  coachId: string,
  payload: {
    email: string;
    display_name: string;
    phone?: string;
    bio?: string;
  },
): Promise<{ ok: boolean; error?: string }> {
  console.log("[CLIENT_CREATE_START] getServiceClient...");

  let admin;
  try {
    admin = getServiceClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Service client unavailable";
    console.error("[CLIENT_CREATE_START] service client error:", msg);
    return { ok: false, error: msg };
  }

  console.log("[CLIENT_CREATE_START] service client OK. Creating auth user:", payload.email);

  // Mot de passe temporaire — le client devra faire "mot de passe oublié"
  const tmpPassword =
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6).toUpperCase() +
    "!9";

  // 1. Créer l'utilisateur auth
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email: payload.email,
      password: tmpPassword,
      email_confirm: true,
      user_metadata: {
        display_name: payload.display_name,
        role: "client",
      },
    });

  if (authError) {
    console.error("[CLIENT_CREATE_RESULT] auth createUser failed:", authError.message);
    return { ok: false, error: authError.message };
  }

  const userId = authData.user.id;
  console.log("[CLIENT_CREATE_START] auth user created, userId:", userId);

  // 2. Lire ce que le trigger handle_new_user a créé
  const { data: triggerProfile, error: readErr } = await admin
    .from("profiles")
    .select("id, email, display_name, role, coach_id, active")
    .eq("id", userId)
    .maybeSingle();

  console.log("[CLIENT_CREATE_START] trigger-created profile:", JSON.stringify(triggerProfile), "readErr:", readErr?.message);

  // 3. Mettre à jour avec les colonnes que nous connaissons (pas roles/calcom_url)
  const { data: updatedRows, error: updateError } = await admin
    .from("profiles")
    .update({
      display_name: payload.display_name,
      email: payload.email,
      role: "client",
      active: true,
      coach_id: coachId,
      phone: payload.phone || null,
      bio: payload.bio || null,
    })
    .eq("id", userId)
    .select("id, email, role, coach_id, active");

  if (updateError) {
    console.error("[CLIENT_CREATE_RESULT] profile update failed:", updateError.message, "| code:", updateError.code);
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: `Profile update failed: ${updateError.message}` };
  }

  console.log("[CLIENT_CREATE_RESULT] profile after update:", JSON.stringify(updatedRows));

  // 4. Vérification finale
  const { data: finalCheck } = await admin
    .from("profiles")
    .select("id, email, role, coach_id, active")
    .eq("id", userId)
    .single();

  console.log("[CLIENT_CREATE_RESULT] final check (service role):", JSON.stringify(finalCheck));

  if (finalCheck && finalCheck.coach_id !== coachId) {
    console.error("[CLIENT_CREATE_RESULT] ANOMALY: coach_id mismatch after update!", {
      expected: coachId,
      actual: finalCheck.coach_id,
    });
    // Tentative de correction forcée
    const { error: forceErr } = await admin
      .from("profiles")
      .update({ coach_id: coachId })
      .eq("id", userId);
    console.log("[CLIENT_CREATE_RESULT] forced coach_id update error:", forceErr?.message ?? "none");
  }

  return { ok: true };
}
