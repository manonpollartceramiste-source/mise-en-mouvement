"use server";

import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import {
  createPrestation,
  updatePrestation,
  deletePrestation,
} from "@/lib/billing/server";

export async function createPrestationAction(formData: FormData) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  await createPrestation({
    coach_id: profile.id,
    name: (formData.get("name") as string) ?? "",
    description: (formData.get("description") as string) || null,
    unit_price: Number(formData.get("unit_price") ?? 0),
    tva_pct: Number(formData.get("tva_pct") ?? 0),
    category: (formData.get("category") as string) || null,
    is_active: true,
  });

  redirect("/os/coach/prestations?saved=1");
}

export async function updatePrestationAction(formData: FormData) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const id = formData.get("id") as string;
  if (!id) redirect("/os/coach/prestations");

  await updatePrestation(id, {
    name: (formData.get("name") as string) ?? "",
    description: (formData.get("description") as string) || null,
    unit_price: Number(formData.get("unit_price") ?? 0),
    tva_pct: Number(formData.get("tva_pct") ?? 0),
    category: (formData.get("category") as string) || null,
  });

  redirect("/os/coach/prestations?saved=1");
}

export async function togglePrestationAction(formData: FormData) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const id = formData.get("id") as string;
  const is_active = formData.get("is_active") === "true";
  if (!id) redirect("/os/coach/prestations");

  await updatePrestation(id, { is_active: !is_active });
  redirect("/os/coach/prestations");
}

export async function deletePrestationAction(formData: FormData) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const id = formData.get("id") as string;
  if (!id) redirect("/os/coach/prestations");

  await deletePrestation(id);
  redirect("/os/coach/prestations?deleted=1");
}
