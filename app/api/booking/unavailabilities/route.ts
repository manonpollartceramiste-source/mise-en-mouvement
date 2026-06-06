import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getAllFutureUnavailabilities,
  createUnavailability,
  deleteUnavailability,
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

const CreateUnavailabilitySchema = z.object({
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  label: z.string().max(200).optional().nullable(),
  is_all_day: z.boolean().optional(),
});

export async function GET() {
  const user = await getCoachUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  try {
    const unavailabilities = await getAllFutureUnavailabilities(user.id);
    return NextResponse.json({ unavailabilities });
  } catch (err) {
    console.error("[api/booking/unavailabilities] GET error:", err);
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

  const parsed = CreateUnavailabilitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const item = await createUnavailability(user.id, parsed.data);
    return NextResponse.json({ unavailability: item }, { status: 201 });
  } catch (err) {
    console.error("[api/booking/unavailabilities] POST error:", err);
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
  const items = await getAllFutureUnavailabilities(user.id);
  const owned = items.some((item) => item.id === id);
  if (!owned) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  try {
    await deleteUnavailability(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/booking/unavailabilities] DELETE error:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
