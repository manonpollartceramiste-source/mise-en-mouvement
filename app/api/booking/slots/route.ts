import { type NextRequest, NextResponse } from "next/server";
import {
  getBookingSettings,
  getAvailabilityRules,
  getUnavailabilities,
  getBookingsInRange,
} from "@/lib/supabase/booking.server";
import { computeSlots } from "@/lib/booking/slots";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/booking/slots?coach_id=<uuid>&from=YYYY-MM-DD&to=YYYY-MM-DD&duration_min=60
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const coachId = searchParams.get("coach_id");
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const durationStr = searchParams.get("duration_min");

  // Validate coach_id
  if (!coachId || !UUID_REGEX.test(coachId)) {
    return NextResponse.json(
      { error: "Paramètre coach_id invalide ou manquant (UUID requis)." },
      { status: 400 },
    );
  }

  // Validate from / to
  if (!fromStr || !DATE_REGEX.test(fromStr)) {
    return NextResponse.json(
      { error: "Paramètre from invalide ou manquant (format YYYY-MM-DD)." },
      { status: 400 },
    );
  }
  if (!toStr || !DATE_REGEX.test(toStr)) {
    return NextResponse.json(
      { error: "Paramètre to invalide ou manquant (format YYYY-MM-DD)." },
      { status: 400 },
    );
  }

  const fromDate = new Date(fromStr + "T00:00:00.000Z");
  const toDate = new Date(toStr + "T00:00:00.000Z");

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Dates invalides." }, { status: 400 });
  }

  if (toDate < fromDate) {
    return NextResponse.json(
      { error: "La date de fin doit être >= la date de début." },
      { status: 400 },
    );
  }

  // Max 31 days to prevent abuse
  const diffDays =
    (toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000);
  if (diffDays > 31) {
    return NextResponse.json(
      { error: "La plage de dates ne peut pas dépasser 31 jours." },
      { status: 400 },
    );
  }

  try {
    const settings = await getBookingSettings(coachId);

    // Resolve duration_min: query param → coach setting
    let durationMin = settings.slot_duration_min;
    if (durationStr !== null) {
      const parsed = parseInt(durationStr, 10);
      if (isNaN(parsed) || parsed < 15 || parsed > 480) {
        return NextResponse.json(
          {
            error:
              "Paramètre duration_min invalide (entier entre 15 et 480 requis).",
          },
          { status: 400 },
        );
      }
      durationMin = parsed;
    }

    // Fetch data in parallel — extend range slightly to catch bookings that
    // start before fromDate but end within it (buffer overlap)
    const bufferMs = settings.buffer_after_min * 60 * 1000;
    const fetchFrom = new Date(fromDate.getTime() - bufferMs - 24 * 60 * 60 * 1000);
    const fetchTo = new Date(toDate.getTime() + 24 * 60 * 60 * 1000);

    const [rules, unavailabilities, bookings] = await Promise.all([
      getAvailabilityRules(coachId),
      getUnavailabilities(coachId, fetchFrom, fetchTo),
      getBookingsInRange(coachId, fetchFrom, fetchTo),
    ]);

    const slots = computeSlots({
      rules,
      unavailabilities,
      bookings,
      settings,
      fromDate: fromStr,
      toDate: toStr,
      durationMin,
    });

    return NextResponse.json({ slots });
  } catch (err) {
    console.error("[api/booking/slots] Error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 },
    );
  }
}
