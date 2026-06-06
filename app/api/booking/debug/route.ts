import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabase/server";
import { readContentKey } from "@/lib/supabase/content";

// GET /api/booking/debug — diagnostic complet pour le mapping coach_id / bookings
export async function GET(_req: NextRequest) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non authentifié.", authError }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  // 1. Profile from DB
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, role, roles, display_name")
    .eq("id", user.id)
    .maybeSingle();

  // 2. Raw coaches data from content table
  const coachesContent = await readContentKey("coaches");

  // 3. ALL bookings for week of 2026-06-08 (no coach filter)
  const { data: allBookingsWeek, error: weekError } = await admin
    .from("bookings")
    .select("id, coach_id, starts_at, ends_at, status, client_name, offer_id, created_at")
    .gte("starts_at", "2026-06-08T00:00:00.000Z")
    .lte("starts_at", "2026-06-15T00:00:00.000Z")
    .order("starts_at");

  // 4. ALL bookings for profile.id (all time)
  const { data: bookingsByProfileId, error: profileBookingError } = await admin
    .from("bookings")
    .select("id, coach_id, starts_at, ends_at, status, client_name, offer_id")
    .eq("coach_id", user.id)
    .order("starts_at", { ascending: false })
    .limit(10);

  // 5. Last 10 bookings in the table (any coach)
  const { data: recentBookings, error: recentError } = await admin
    .from("bookings")
    .select("id, coach_id, starts_at, ends_at, status, client_name, offer_id")
    .order("created_at", { ascending: false })
    .limit(10);

  // 6. Availability rules for profile.id
  const { data: rulesForProfileId } = await admin
    .from("coach_availability_rules")
    .select("id, coach_id, day_of_week, start_time, end_time, is_active")
    .eq("coach_id", user.id);

  // 7. Total booking count
  const { count: totalBookings } = await admin
    .from("bookings")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({
    auth: {
      user_id: user.id,
      email: user.email,
    },
    profile: profile ?? { error: profileError?.message },
    coaches_from_content_table: coachesContent,
    query_used_in_calendar: {
      note: "Le calendrier query avec profile.id = auth.user_id ci-dessus",
      profile_id: user.id,
    },
    bookings_for_week_2026_06_08: {
      count: allBookingsWeek?.length ?? 0,
      error: weekError?.message,
      data: allBookingsWeek,
    },
    bookings_by_profile_id: {
      coach_id_used: user.id,
      count: bookingsByProfileId?.length ?? 0,
      error: profileBookingError?.message,
      data: bookingsByProfileId,
    },
    recent_bookings_all_coaches: {
      total_in_table: totalBookings,
      error: recentError?.message,
      data: recentBookings,
    },
    availability_rules_for_profile_id: {
      coach_id_used: user.id,
      count: rulesForProfileId?.length ?? 0,
      data: rulesForProfileId,
    },
  });
}
