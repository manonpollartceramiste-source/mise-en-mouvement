import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getAvailabilityRules,
  createAvailabilityRule,
  deleteAvailabilityRule,
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

const CreateRuleSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  slot_duration_min: z.number().int().min(15).max(480).optional(),
});

export async function GET() {
  const user = await getCoachUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  try {
    const rules = await getAvailabilityRules(user.id);
    return NextResponse.json({ rules });
  } catch (err) {
    console.error("[api/booking/availability] GET error:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCoachUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const parsed = CreateRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const rule = await createAvailabilityRule(user.id, parsed.data);
    return NextResponse.json({ rule }, { status: 201 });
  } catch (err) {
    console.error("[api/booking/availability] POST error:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCoachUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id manquant." }, { status: 400 });

  // Verify ownership before deleting
  const rules = await getAvailabilityRules(user.id);
  const owned = rules.some((r) => r.id === id);
  if (!owned) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  try {
    await deleteAvailabilityRule(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/booking/availability] DELETE error:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
