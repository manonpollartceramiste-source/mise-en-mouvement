"use server";

import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import {
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getNextInvoiceNumber,
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

export async function createInvoiceAction(formData: FormData) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const number = await getNextInvoiceNumber(profile.id);
  const lineItems: LineItem[] = JSON.parse((formData.get("line_items") as string) ?? "[]");
  const discountPct = Number(formData.get("discount_pct") ?? 0);
  const discountAmount = Number(formData.get("discount_amount") ?? 0);
  const { subtotal_ht, total_tva, total_ttc } = computeTotals(lineItems, discountPct, discountAmount);
  const quoteId = (formData.get("quote_id") as string) || null;

  const invoice = await createInvoice({
    coach_id: profile.id,
    quote_id: quoteId,
    number,
    client_name: (formData.get("client_name") as string) ?? "",
    client_email: (formData.get("client_email") as string) ?? "",
    client_phone: (formData.get("client_phone") as string) ?? "",
    client_address: (formData.get("client_address") as string) ?? "",
    line_items: lineItems,
    discount_pct: discountPct,
    discount_amount: discountAmount,
    payment_method: (formData.get("payment_method") as string) ?? "",
    legal_mentions: (formData.get("legal_mentions") as string) ?? "",
    notes: (formData.get("notes") as string) ?? "",
    status: "brouillon",
    issued_at: today(),
    due_at: addDays(30),
    subtotal_ht,
    total_tva,
    total_ttc,
  });

  if (!invoice) redirect("/os/coach/factures?error=creation");
  redirect(`/os/coach/factures/${invoice.id}`);
}

export async function updateInvoiceAction(formData: FormData) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const id = formData.get("id") as string;
  if (!id) redirect("/os/coach/factures");

  const lineItems: LineItem[] = JSON.parse((formData.get("line_items") as string) ?? "[]");
  const discountPct = Number(formData.get("discount_pct") ?? 0);
  const discountAmount = Number(formData.get("discount_amount") ?? 0);
  const { subtotal_ht, total_tva, total_ttc } = computeTotals(lineItems, discountPct, discountAmount);

  await updateInvoice(id, {
    client_name: (formData.get("client_name") as string) ?? "",
    client_email: (formData.get("client_email") as string) ?? "",
    client_phone: (formData.get("client_phone") as string) ?? "",
    client_address: (formData.get("client_address") as string) ?? "",
    line_items: lineItems,
    discount_pct: discountPct,
    discount_amount: discountAmount,
    payment_method: (formData.get("payment_method") as string) ?? "",
    legal_mentions: (formData.get("legal_mentions") as string) ?? "",
    notes: (formData.get("notes") as string) ?? "",
    due_at: (formData.get("due_at") as string) ?? addDays(30),
    subtotal_ht,
    total_tva,
    total_ttc,
  });

  redirect(`/os/coach/factures/${id}`);
}

export async function updateInvoiceStatusAction(formData: FormData) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  if (!id || !status) return;

  await updateInvoice(id, { status: status as import("@/lib/billing/types").InvoiceStatus });
  redirect(`/os/coach/factures/${id}`);
}

export async function deleteInvoiceAction(formData: FormData) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const id = formData.get("id") as string;
  if (!id) redirect("/os/coach/factures");

  await deleteInvoice(id);
  redirect("/os/coach/factures?deleted=1");
}
