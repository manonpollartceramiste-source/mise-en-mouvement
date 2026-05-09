import "server-only";

import {
  getSupabaseServer,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import {
  clientStatuses,
  type Client,
  type ClientStatus,
  type NewClient,
} from "@/lib/content/clients";

type DbRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  offer_id: string | null;
  coach_id: string | null;
  subject: string | null;
  source: "contact" | "reservation";
  status: ClientStatus;
  created_at: string;
};

function fromDb(row: DbRow): Client {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    offerId: row.offer_id,
    coachId: row.coach_id,
    subject: row.subject,
    source: row.source,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function insertClient(
  data: NewClient,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase non configuré." };
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("clients").insert({
    name: data.name,
    email: data.email,
    phone: data.phone,
    message: data.message,
    offer_id: data.offerId,
    coach_id: data.coachId,
    subject: data.subject,
    source: data.source,
    status: "nouveau",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function loadClients(): Promise<Client[]> {
  try {
    if (!isSupabaseConfigured()) return [];
    const supabase = await getSupabaseServer();
    const { data } = await supabase
      .from("clients")
      .select(
        "id, name, email, phone, message, offer_id, coach_id, subject, source, status, created_at",
      )
      .order("created_at", { ascending: false });
    return data ? (data as DbRow[]).map(fromDb) : [];
  } catch {
    return [];
  }
}

export async function updateClientStatus(
  id: string,
  status: ClientStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase non configuré." };
  }
  if (!clientStatuses.includes(status)) {
    return { ok: false, error: "Statut invalide." };
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from("clients")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteClient(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase non configuré." };
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
