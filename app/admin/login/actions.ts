"use server";

import { redirect } from "next/navigation";
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
    redirect(`/admin/login?error=${encodeURIComponent(error.message)}`);
  }

  if (!isAuthorizedAdmin(data.user?.email ?? null)) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=unauthorized");
  }

  redirect("/admin");
}

export async function signOut() {
  if (!isSupabaseConfigured()) {
    redirect("/admin/login");
  }
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
