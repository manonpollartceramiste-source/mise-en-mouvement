"use server";

import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function updateProfileAction(formData: FormData) {
  const profile = await getOsProfileWithRole("client");
  if (!profile) redirect("/os/login");

  const display_name = String(formData.get("display_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;

  if (!display_name)
    redirect("/os/client/profil?error=Le+nom+est+obligatoire.");

  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name, phone })
    .eq("id", profile.id);

  if (error)
    redirect(`/os/client/profil?error=${encodeURIComponent(error.message)}`);
  redirect("/os/client/profil?saved=Profil+mis+à+jour.");
}
