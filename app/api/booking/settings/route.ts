import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getBookingSettings,
  upsertBookingSettings,
} from "@/lib/supabase/booking.server";
import { getSupabaseServer } from "@/lib/supabase/server";

async function getCoachUser() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

const UpdateSettingsSchema = z.object({
  min_notice_hours: z.number().int().min(0).max(168).optional(),
  max_advance_days: z.number().int().min(1).max(365).optional(),
  slot_duration_min: z.number().int().min(15).max(480).optional(),
  buffer_after_min: z.number().int().min(0).max(120).optional(),
  auto_confirm: z.boolean().optional(),
  timezone: z.string().max(50).optional(),
});

export async function GET() {
  const user = await getCoachUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  try {
    const settings = await getBookingSettings(user.id);
    return NextResponse.json({ settings });
  } catch (err) {
    console.error("[api/booking/settings] GET error:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCoachUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const parsed = UpdateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const settings = await upsertBookingSettings(user.id, parsed.data);
    return NextResponse.json({ settings });
  } catch (err) {
    console.error("[api/booking/settings] PUT error:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
