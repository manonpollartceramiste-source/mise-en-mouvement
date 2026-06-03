import { NextRequest, NextResponse } from "next/server";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { createClientForCoach } from "@/lib/supabase/admin-actions";

export async function POST(req: NextRequest) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Non autorisé." }, { status: 401 });
  }

  let body: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    goal?: string;
    notes?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Corps de requête invalide." }, { status: 400 });
  }

  const { first_name = "", last_name = "", email = "", phone = "", goal = "", notes = "" } = body;

  const display_name = `${first_name.trim()} ${last_name.trim()}`.trim();
  if (!display_name || !email.trim()) {
    return NextResponse.json(
      { ok: false, error: "Prénom, nom et email sont obligatoires." },
      { status: 400 },
    );
  }

  const bioParts: string[] = [];
  if (goal.trim()) bioParts.push(`Objectif : ${goal.trim()}`);
  if (notes.trim()) bioParts.push(notes.trim());

  const result = await createClientForCoach(profile.id, {
    email: email.trim().toLowerCase(),
    display_name,
    phone: phone.trim() || undefined,
    bio: bioParts.join("\n\n") || undefined,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
