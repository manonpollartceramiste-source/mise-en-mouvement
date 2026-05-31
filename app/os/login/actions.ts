"use server";

import { redirect } from "next/navigation";
import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";
import { ensureOsProfile } from "@/lib/supabase/admin-actions";

export async function osSignIn(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/os/login?error=supabase-missing");
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "").trim();

  console.log("[osSignIn] email:", email, "next:", next);

  if (!email || !password) {
    redirect("/os/login?error=missing-fields");
  }

  const supabase = await getSupabaseServer();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    console.log("[osSignIn] auth error:", error?.message);
    redirect(`/os/login?error=${encodeURIComponent(error?.message ?? "auth-error")}`);
  }

  console.log("[osSignIn] auth OK, user id:", data.user.id);

  // Récupérer le profil — essaie d'abord avec roles[], sinon fallback sans
  let profile: { role: string; roles?: unknown; active: boolean } | null = null;

  const { data: profileWithRoles, error: rolesErr } = await supabase
    .from("profiles")
    .select("role, roles, active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (rolesErr) {
    console.log("[osSignIn] select(roles) error:", rolesErr.message, "— fallback sans roles");
    const { data: profileBasic } = await supabase
      .from("profiles")
      .select("role, active")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profileBasic) profile = profileBasic;
  } else {
    profile = profileWithRoles;
  }

  console.log("[osSignIn] profile:", JSON.stringify(profile));

  // Fallback : créer le profil s'il est absent
  if (!profile) {
    console.log("[osSignIn] profil absent, création via ensureOsProfile");
    const ensured = await ensureOsProfile(
      data.user.id,
      data.user.email!,
      (data.user.user_metadata ?? {}) as Record<string, unknown>,
    );
    if (ensured) profile = ensured;
    console.log("[osSignIn] ensureOsProfile result:", JSON.stringify(ensured));
  }

  if (!profile || !profile.active) {
    console.log("[osSignIn] profil invalide ou inactif → unauthorized");
    await supabase.auth.signOut();
    redirect("/os/login?error=unauthorized");
  }

  // Résolution des rôles
  const rawRoles = profile.roles;
  const roles: string[] =
    Array.isArray(rawRoles) && (rawRoles as string[]).length > 0
      ? (rawRoles as string[])
      : [profile.role];

  console.log("[osSignIn] roles résolus:", roles);

  // Redirect intelligent
  let bestRedirect: string;
  if (roles.includes("coach")) {
    bestRedirect = "/os/coach";
  } else if (roles.includes("client")) {
    bestRedirect = "/os/client";
  } else if (roles.includes("admin")) {
    // admin pur (sans coach) → espace admin site
    bestRedirect = "/admin";
  } else {
    bestRedirect = "/os/client";
  }

  const destination = next && next.startsWith("/os/") ? next : bestRedirect;
  console.log("[osSignIn] redirect →", destination);

  redirect(destination);
}

export async function osSignOut() {
  if (!isSupabaseConfigured()) {
    redirect("/os/login");
  }
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut();
  redirect("/os/login");
}
