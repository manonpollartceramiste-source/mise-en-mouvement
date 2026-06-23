import "server-only";

import { getSupabaseServer, getSupabaseAdmin } from "./server";
import type { Profile, UserRole } from "@/lib/os/types";

// ─────────────────────────────────────────────────────────────
// Client Supabase Cabinet OS — côté serveur
// ─────────────────────────────────────────────────────────────

/** Retourne le profil Cabinet OS de l'utilisateur connecté, ou null. */
export async function getOsProfile(): Promise<Profile | null> {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Priorité : RPC security definer — bypasse RLS (même logique que proxy.ts)
  const { data: rpcRaw, error: rpcErr } = await supabase.rpc("get_my_profile");
  if (!rpcErr && rpcRaw !== null && rpcRaw !== undefined) {
    const raw = Array.isArray(rpcRaw) ? rpcRaw[0] : rpcRaw;
    if (raw && typeof raw === "object" && "id" in raw) {
      return raw as Profile;
    }
  }

  // Fallback : requête directe
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Profile;
}

/** Retourne le profil et exige un rôle précis. Retourne null si pas le bon rôle. */
export async function getOsProfileWithRole(
  role: UserRole,
): Promise<Profile | null> {
  const profile = await getOsProfile();
  if (!profile) return null;
  // Résolution robuste : roles[] en priorité, sinon dérivé du rôle primaire
  const rawRoles = profile.roles as unknown;
  const roles: string[] =
    Array.isArray(rawRoles) && (rawRoles as string[]).length > 0
      ? (rawRoles as string[])
      : [profile.role as string];
  if (!roles.includes(role) && !roles.includes("admin")) return null;
  return profile;
}

/** Retourne le profil d'un utilisateur par son id (lecture admin/coach). */
export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

/** Retourne tous les clients d'un coach. */
export async function getCoachClients(coachId: string): Promise<Profile[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("coach_id", coachId)
    .eq("role", "client")
    .eq("active", true)
    .order("display_name");
  if (error || !data) return [];
  return data as Profile[];
}

/** Retourne tous les coachs actifs (admin seulement). */
export async function getAllCoaches(): Promise<Profile[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "coach")
    .eq("active", true)
    .order("display_name");
  if (error || !data) return [];
  return data as Profile[];
}

/** Retourne tous les clients actifs (admin — voit tout). */
export async function getAllActiveClients(): Promise<Profile[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "client")
    .eq("active", true)
    .order("display_name");
  if (error || !data) return [];
  return data as Profile[];
}

/** Déconnexion et redirect vers /os/login. */
export async function osSignOut() {
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut();
}

// ─────────────────────────────────────────────────────────────
// Helpers Sprint 3
// ─────────────────────────────────────────────────────────────

import type { Session } from "@/lib/os/types";

export type SessionWithClient = Session & {
  client_display_name: string;
  coach_display_name?: string | null;
};

/**
 * Toutes les séances de TOUS les coachs sur une plage — bypasse RLS via admin client.
 * Utilisé pour le calendrier partagé.
 */
export async function getAllSessionsInRange(
  from: Date,
  to: Date,
): Promise<SessionWithClient[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sessions")
    .select(
      "*, " +
      "client_profile:profiles!sessions_client_id_fkey(display_name), " +
      "coach_profile:profiles!sessions_coach_id_fkey(display_name)"
    )
    .gte("scheduled_at", from.toISOString())
    .lt("scheduled_at", to.toISOString())
    .order("scheduled_at");

  if (error) {
    console.error("[os-server] getAllSessionsInRange error:", error.message);
    throw new Error(error.message);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    ...row,
    client_profile: undefined,
    coach_profile: undefined,
    client_display_name:
      (row.client_profile as { display_name: string } | null)?.display_name ?? "Client",
    coach_display_name:
      (row.coach_profile as { display_name: string } | null)?.display_name ?? null,
  })) as SessionWithClient[];
}

/** Séances planifiées d'un coach dans les 7 prochains jours. */
export async function getCoachUpcomingSessions(
  coachId: string,
): Promise<SessionWithClient[]> {
  const supabase = await getSupabaseServer();
  const now = new Date().toISOString();
  const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("sessions")
    .select("*, profiles!sessions_client_id_fkey(display_name)")
    .eq("coach_id", coachId)
    .eq("status", "planifiée")
    .gte("scheduled_at", now)
    .lte("scheduled_at", sevenDays)
    .order("scheduled_at");
  if (!data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((row: any) => ({
    ...row,
    profiles: undefined,
    client_display_name: (row.profiles as { display_name: string } | null)?.display_name ?? "Client",
  })) as SessionWithClient[];
}

/** Séances d'un coach pour le mois calendaire en cours. */
export async function getCoachSessionsThisMonth(
  coachId: string,
): Promise<Session[]> {
  const supabase = await getSupabaseServer();
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  const { data } = await supabase
    .from("sessions")
    .select("*")
    .eq("coach_id", coachId)
    .gte("scheduled_at", first)
    .lt("scheduled_at", next);
  return (data ?? []) as Session[];
}

// ─────────────────────────────────────────────────────────────
// Bilans Mouvement
// ─────────────────────────────────────────────────────────────

import type { MovementAssessment, MovementAssessmentWithClient } from "@/lib/os/types";

/** Bilans d'un coach, optionnellement filtrés par client. */
export async function getCoachAssessments(
  coachId: string,
  clientId?: string,
): Promise<MovementAssessmentWithClient[]> {
  const supabase = await getSupabaseServer();
  let q = supabase
    .from("movement_assessments")
    .select("*, profiles!movement_assessments_client_id_fkey(display_name)")
    .eq("coach_id", coachId)
    .order("assessed_at", { ascending: false });
  if (clientId) q = q.eq("client_id", clientId);
  const { data } = await q;
  if (!data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((row: any) => ({
    ...row,
    profiles: undefined,
    client_display_name:
      (row.profiles as { display_name: string } | null)?.display_name ?? "Client",
  })) as MovementAssessmentWithClient[];
}

/** Tous les bilans (admin — voit tout). */
export async function getAllAssessments(
  clientId?: string,
): Promise<MovementAssessmentWithClient[]> {
  const supabase = await getSupabaseServer();
  let q = supabase
    .from("movement_assessments")
    .select("*, profiles!movement_assessments_client_id_fkey(display_name)")
    .order("assessed_at", { ascending: false });
  if (clientId) q = q.eq("client_id", clientId);
  const { data } = await q;
  if (!data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((row: any) => ({
    ...row,
    profiles: undefined,
    client_display_name:
      (row.profiles as { display_name: string } | null)?.display_name ?? "Client",
  })) as MovementAssessmentWithClient[];
}

/** Un bilan par id. */
export async function getAssessmentById(
  id: string,
): Promise<MovementAssessment | null> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("movement_assessments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as MovementAssessment;
}
