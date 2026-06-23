"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { updateSiteSettings, updateDiscoverySessionSettings } from "@/lib/billing/server";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

export async function saveSiteSettingsAction(formData: FormData) {
  await requireAdmin();

  await updateSiteSettings({
    company_name: (formData.get("company_name") as string) || "Mise en Mouvement",
    siret: (formData.get("siret") as string) || "",
    address: (formData.get("address") as string) || "",
    city: (formData.get("city") as string) || "",
    postal_code: (formData.get("postal_code") as string) || "",
    email: (formData.get("email") as string) || "",
    phone: (formData.get("phone") as string) || "",
    website: (formData.get("website") as string) || "",
    logo_url: (formData.get("logo_url") as string) || "",
    primary_color: (formData.get("primary_color") as string) || "#4f463b",
    secondary_color: (formData.get("secondary_color") as string) || "#a89a89",
    pdf_footer_text: (formData.get("pdf_footer_text") as string) || "",
    pdf_quote_conditions: (formData.get("pdf_quote_conditions") as string) || "",
    pdf_invoice_mentions: (formData.get("pdf_invoice_mentions") as string) || "",
  });

  redirect("/admin/personnalisation?saved=1");
}

export async function saveDiscoverySettingsAction(formData: FormData) {
  await requireAdmin();

  const steps = (formData.get("session_steps") as string || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const benefits = (formData.get("benefits") as string || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  await updateDiscoverySessionSettings({
    title: (formData.get("title") as string) || "Séance Découverte",
    subtitle: (formData.get("subtitle") as string) || "",
    price: Number(formData.get("price") || 25),
    duration_min: Number(formData.get("duration_min") || 60),
    description: (formData.get("description") as string) || "",
    session_steps: steps,
    benefits,
    cta_label: (formData.get("cta_label") as string) || "Réserver ma séance découverte",
    image_url: (formData.get("image_url") as string) || "",
    video_url: (formData.get("video_url") as string) || "",
  });

  redirect("/admin/personnalisation?saved=1");
}
