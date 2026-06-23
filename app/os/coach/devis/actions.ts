"use server";

import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import {
  createQuote,
  updateQuote,
  deleteQuote,
  getNextQuoteNumber,
  getQuoteById,
} from "@/lib/billing/server";
import { computeTotals } from "@/lib/billing/types";
import type { LineItem } from "@/lib/billing/types";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function createQuoteAction(formData: FormData) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const number = await getNextQuoteNumber(profile.id);
  const validityDays = Number(formData.get("validity_days") ?? 30);
  const lineItems: LineItem[] = JSON.parse((formData.get("line_items") as string) ?? "[]");
  const discountPct = Number(formData.get("discount_pct") ?? 0);
  const discountAmount = Number(formData.get("discount_amount") ?? 0);
  const { subtotal_ht, total_tva, total_ttc } = computeTotals(lineItems, discountPct, discountAmount);

  const quote = await createQuote({
    coach_id: profile.id,
    number,
    client_name: (formData.get("client_name") as string) ?? "",
    client_email: (formData.get("client_email") as string) ?? "",
    client_phone: (formData.get("client_phone") as string) ?? "",
    client_address: (formData.get("client_address") as string) ?? "",
    title: (formData.get("title") as string) ?? "",
    description: (formData.get("description") as string) ?? "",
    line_items: lineItems,
    discount_pct: discountPct,
    discount_amount: discountAmount,
    notes: (formData.get("notes") as string) ?? "",
    conditions: (formData.get("conditions") as string) ?? "",
    validity_days: validityDays,
    status: "brouillon",
    issued_at: today(),
    expires_at: addDays(validityDays),
    subtotal_ht,
    total_tva,
    total_ttc,
  });

  if (!quote) redirect("/os/coach/devis?error=creation");
  redirect(`/os/coach/devis/${quote.id}`);
}

export async function updateQuoteAction(formData: FormData) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const id = formData.get("id") as string;
  if (!id) redirect("/os/coach/devis");

  const validityDays = Number(formData.get("validity_days") ?? 30);
  const lineItems: LineItem[] = JSON.parse((formData.get("line_items") as string) ?? "[]");
  const discountPct = Number(formData.get("discount_pct") ?? 0);
  const discountAmount = Number(formData.get("discount_amount") ?? 0);
  const { subtotal_ht, total_tva, total_ttc } = computeTotals(lineItems, discountPct, discountAmount);

  await updateQuote(id, {
    client_name: (formData.get("client_name") as string) ?? "",
    client_email: (formData.get("client_email") as string) ?? "",
    client_phone: (formData.get("client_phone") as string) ?? "",
    client_address: (formData.get("client_address") as string) ?? "",
    title: (formData.get("title") as string) ?? "",
    description: (formData.get("description") as string) ?? "",
    line_items: lineItems,
    discount_pct: discountPct,
    discount_amount: discountAmount,
    notes: (formData.get("notes") as string) ?? "",
    conditions: (formData.get("conditions") as string) ?? "",
    validity_days: validityDays,
    expires_at: addDays(validityDays),
    subtotal_ht,
    total_tva,
    total_ttc,
  });

  redirect(`/os/coach/devis/${id}`);
}

export async function updateQuoteStatusAction(formData: FormData) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  if (!id || !status) return;

  await updateQuote(id, { status: status as import("@/lib/billing/types").QuoteStatus });
  redirect(`/os/coach/devis/${id}`);
}

export async function deleteQuoteAction(formData: FormData) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const id = formData.get("id") as string;
  if (!id) redirect("/os/coach/devis");

  await deleteQuote(id);
  redirect("/os/coach/devis?deleted=1");
}

export async function createInvoiceFromQuoteAction(formData: FormData) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const quoteId = formData.get("quote_id") as string;
  const quote = await getQuoteById(quoteId);
  if (!quote) redirect("/os/coach/devis");

  redirect(`/os/coach/factures/nouvelle?from_quote=${quoteId}`);
}
