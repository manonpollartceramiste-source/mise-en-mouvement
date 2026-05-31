"use server";

import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { createClientForCoach } from "@/lib/supabase/admin-actions";

export async function createClientAction(payload: {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  goal: string;
  notes: string;
}): Promise<{ ok: boolean; error?: string; debug?: Record<string, unknown> }> {
  console.log("[CLIENT_CREATE_START] payload:", JSON.stringify({
    first_name: payload.first_name,
    last_name: payload.last_name,
    email: payload.email,
    phone: payload.phone ? "****" : "",
  }));

  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  console.log("[CLIENT_CREATE_START] coach profile:", JSON.stringify({
    id: profile.id,
    role: profile.role,
    roles: profile.roles,
    email: profile.email,
  }));

  const display_name =
    `${payload.first_name.trim()} ${payload.last_name.trim()}`.trim();

  if (!display_name || !payload.email.trim()) {
    console.log("[CLIENT_CREATE_RESULT] validation error: missing name or email");
    return { ok: false, error: "Prénom, nom et email sont obligatoires." };
  }

  const bioParts: string[] = [];
  if (payload.goal.trim()) bioParts.push(`Objectif : ${payload.goal.trim()}`);
  if (payload.notes.trim()) bioParts.push(payload.notes.trim());

  const createPayload = {
    email: payload.email.trim().toLowerCase(),
    display_name,
    phone: payload.phone.trim() || undefined,
    bio: bioParts.join("\n\n") || undefined,
  };

  console.log("[CLIENT_CREATE_START] calling createClientForCoach with coachId:", profile.id);

  const result = await createClientForCoach(profile.id, createPayload);

  console.log("[CLIENT_CREATE_RESULT]", JSON.stringify(result));

  return result;
}
