"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import {
  clientStatuses,
  type ClientStatus,
} from "@/lib/content/clients";
import {
  deleteClient,
  updateClientStatus,
} from "@/lib/content/clients.server";
import { saveContentKey } from "@/lib/supabase/content";

function fail(reason: string): never {
  redirect(`/admin/clients?error=${encodeURIComponent(reason)}`);
}

function done(msg: string): never {
  redirect(`/admin/clients?saved=${encodeURIComponent(msg)}`);
}

export async function setClientStatus(formData: FormData) {
  if (!isSupabaseConfigured()) fail("Supabase non configuré.");
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id) fail("Identifiant manquant.");
  if (!clientStatuses.includes(status as ClientStatus)) {
    fail("Statut invalide.");
  }
  const res = await updateClientStatus(id, status as ClientStatus);
  if (!res.ok) fail(res.error);
  revalidatePath("/admin/clients");
  done("Statut mis à jour.");
}

export async function removeClient(formData: FormData) {
  if (!isSupabaseConfigured()) fail("Supabase non configuré.");
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const id = String(formData.get("id") ?? "");
  if (!id) fail("Identifiant manquant.");
  const res = await deleteClient(id);
  if (!res.ok) fail(res.error);
  revalidatePath("/admin/clients");
  done("Client supprimé.");
}

export async function saveSheetUrl(formData: FormData) {
  if (!isSupabaseConfigured()) fail("Supabase non configuré.");
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const url = String(formData.get("url") ?? "").trim();
  const value = url === "" ? null : url;
  const res = await saveContentKey(
    "clients_settings",
    { googleSheetUrl: value },
    ["/admin/clients"],
  );
  if (!res.ok) fail(res.error);
  done(value ? "Lien Google Sheet enregistré." : "Lien retiré.");
}
