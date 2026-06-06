import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { loadCoaches } from "@/lib/content/coaches.server";

// GET /api/booking/debug — auth-gated diagnostic for coaches/admins
export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role, roles")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !["coach", "admin"].includes(profile.role as string)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const admin = getSupabaseAdmin();

  // Find matching coach entry from content table
  const allCoaches = await loadCoaches().catch(() => []);
  const coachEntry = allCoaches.find(
    (c) => c.email?.toLowerCase() === (profile.email as string)?.toLowerCase(),
  );

  // Query bookings for both profile.id and osProfileId (in case they differ)
  const idsToCheck = Array.from(
    new Set([profile.id as string, coachEntry?.osProfileId].filter(Boolean)),
  ) as string[];

  const bookingsResults = await Promise.all(
    idsToCheck.map((id) =>
      admin
        .from("bookings")
        .select("id, coach_id, starts_at, ends_at, status, client_name, client_email, offer_id")
        .eq("coach_id", id)
        .order("starts_at", { ascending: false })
        .limit(20)
        .then(({ data, error }) => ({ id, data: data ?? [], error: error?.message })),
    ),
  );

  // Availability rules
  const rulesResults = await Promise.all(
    idsToCheck.map((id) =>
      admin
        .from("coach_availability_rules")
        .select("id, coach_id, day_of_week, start_time, end_time, is_active")
        .eq("coach_id", id)
        .then(({ data, error }) => ({ id, data: data ?? [], error: error?.message })),
    ),
  );

  return NextResponse.json({
    profile: { id: profile.id, email: profile.email, role: profile.role },
    coach_entry_from_content: coachEntry
      ? { id: coachEntry.id, email: coachEntry.email, osProfileId: coachEntry.osProfileId }
      : null,
    ids_checked: idsToCheck,
    bookings: bookingsResults,
    availability_rules: rulesResults,
  });
}
