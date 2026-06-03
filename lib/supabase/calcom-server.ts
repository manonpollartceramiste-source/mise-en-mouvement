import "server-only";

import { getSupabaseAdmin } from "./server";

export type CalcomBooking = {
  id: string;
  calcom_uid: string;
  calcom_booking_id: number | null;
  coach_id: string;
  client_name: string;
  client_email: string;
  title: string | null;
  scheduled_at: string;
  duration_min: number;
  status: string;
  location: string | null;
  created_at: string;
  updated_at: string;
};

/** Récupère les réservations Cal.com d'un coach pour une plage de dates. */
export async function getCalcomBookingsForCoach(
  coachId: string,
  from: Date,
  to: Date,
): Promise<CalcomBooking[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("calcom_bookings")
    .select("*")
    .eq("coach_id", coachId)
    .gte("scheduled_at", from.toISOString())
    .lt("scheduled_at", to.toISOString())
    .order("scheduled_at");
  if (error || !data) return [];
  return data as CalcomBooking[];
}
