"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  getSupabaseServer,
  isAuthorizedAdmin,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/admin/login?error=supabase-missing");
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/admin/login?error=missing-fields");
  }

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("[admin/signIn] Auth error for", email, "→", error.message);
    redirect(`/admin/login?error=${encodeURIComponent(error.message)}`);
  }

  const userEmail = data.user?.email ?? null;
  if (!isAuthorizedAdmin(userEmail)) {
    console.error("[admin/signIn] Unauthorized email:", userEmail);
    await supabase.auth.signOut();
    redirect("/admin/login?error=unauthorized");
  }

  console.log("[admin/signIn] Login OK for", userEmail);
  // Invalide le cache layout pour forcer la relecture de la session
  revalidatePath("/", "layout");
  redirect("/admin");
}

export async function signOut() {
  if (!isSupabaseConfigured()) {
    redirect("/admin/login");
  }
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/admin/login");
}
