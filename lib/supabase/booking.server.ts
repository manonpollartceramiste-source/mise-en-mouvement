import "server-only";

import { getSupabaseAdmin } from "./server";
import {
  type AvailabilityRule,
  type Booking,
  type BookingSettings,
  type CreateBookingInput,
  type Unavailability,
  type UpdateBookingInput,
  DEFAULT_BOOKING_SETTINGS,
} from "@/lib/booking/types";

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getBookingSettings(
  coachId: string,
): Promise<BookingSettings> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("booking_settings")
    .select("*")
    .eq("coach_id", coachId)
    .maybeSingle();

  if (error) {
    console.error("[booking.server] getBookingSettings error:", error.message);
    throw new Error(error.message);
  }

  if (!data) {
    return { ...DEFAULT_BOOKING_SETTINGS, coach_id: coachId };
  }

  return data as BookingSettings;
}

export async function upsertBookingSettings(
  coachId: string,
  data: Partial<Omit<BookingSettings, "coach_id">>,
): Promise<BookingSettings> {
  const supabase = getSupabaseAdmin();
  const { data: result, error } = await supabase
    .from("booking_settings")
    .upsert({ ...data, coach_id: coachId }, { onConflict: "coach_id" })
    .select()
    .single();

  if (error) {
    console.error("[booking.server] upsertBookingSettings error:", error.message);
    throw new Error(error.message);
  }

  return result as BookingSettings;
}

// ─── Availability rules ───────────────────────────────────────────────────────

export async function getAvailabilityRules(
  coachId: string,
): Promise<AvailabilityRule[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("coach_availability_rules")
    .select("*")
    .eq("coach_id", coachId)
    .eq("is_active", true)
    .order("day_of_week")
    .order("start_time");

  if (error) {
    console.error("[booking.server] getAvailabilityRules error:", error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as AvailabilityRule[];
}

// ─── Unavailabilities ─────────────────────────────────────────────────────────

export async function getUnavailabilities(
  coachId: string,
  from: Date,
  to: Date,
): Promise<Unavailability[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("coach_unavailabilities")
    .select("*")
    .eq("coach_id", coachId)
    .lt("starts_at", to.toISOString())
    .gt("ends_at", from.toISOString())
    .order("starts_at");

  if (error) {
    console.error("[booking.server] getUnavailabilities error:", error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as Unavailability[];
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function getBookingsInRange(
  coachId: string,
  from: Date,
  to: Date,
): Promise<Booking[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("coach_id", coachId)
    .not("status", "in", '("cancelled_by_client","cancelled_by_coach")')
    .lt("starts_at", to.toISOString())
    .gt("ends_at", from.toISOString())
    .order("starts_at");

  if (error) {
    console.error("[booking.server] getBookingsInRange error:", error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as Booking[];
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[booking.server] getBookingById error:", error.message);
    throw new Error(error.message);
  }

  return data as Booking | null;
}

export async function getCoachBookings(
  coachId: string,
  from?: Date,
  to?: Date,
): Promise<Booking[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("bookings")
    .select("*")
    .eq("coach_id", coachId)
    .order("starts_at");

  if (from) {
    query = query.gte("starts_at", from.toISOString());
  }
  if (to) {
    query = query.lte("starts_at", to.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("[booking.server] getCoachBookings error:", error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as Booking[];
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const settings = await getBookingSettings(input.coach_id);

  const now = new Date();
  const startsAt = new Date(input.starts_at);
  const endsAt = new Date(input.ends_at);

  // Check minimum notice
  const minNoticeMs = settings.min_notice_hours * 60 * 60 * 1000;
  if (startsAt.getTime() - now.getTime() < minNoticeMs) {
    throw new Error(
      `Le créneau doit être réservé au moins ${settings.min_notice_hours}h à l'avance.`,
    );
  }

  // Check maximum advance booking
  const maxAdvanceMs = settings.max_advance_days * 24 * 60 * 60 * 1000;
  if (startsAt.getTime() - now.getTime() > maxAdvanceMs) {
    throw new Error(
      `Le créneau ne peut pas être réservé plus de ${settings.max_advance_days} jours à l'avance.`,
    );
  }

  // Check for overlapping existing bookings
  const overlapping = await getBookingsInRange(input.coach_id, startsAt, endsAt);
  if (overlapping.length > 0) {
    throw new Error("Créneau déjà réservé");
  }

  // Check for unavailabilities
  const unavailabilities = await getUnavailabilities(
    input.coach_id,
    startsAt,
    endsAt,
  );
  if (unavailabilities.length > 0) {
    throw new Error("Créneau indisponible");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      coach_id: input.coach_id,
      offer_id: input.offer_id,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      duration_min: input.duration_min,
      client_name: input.client_name,
      client_email: input.client_email,
      client_phone: input.client_phone ?? null,
      client_notes: input.client_notes ?? null,
      payment_method: input.payment_method ?? null,
      client_profile_id: input.client_profile_id ?? null,
      status: "confirmed",
    })
    .select()
    .single();

  if (error) {
    console.error("[booking.server] createBooking error:", error.message);
    // Re-map DB trigger error to friendly message
    if (error.message.includes("Créneau déjà réservé")) {
      throw new Error("Créneau déjà réservé");
    }
    throw new Error(error.message);
  }

  return data as Booking;
}

export async function updateBooking(
  id: string,
  data: UpdateBookingInput,
): Promise<Booking> {
  const update: Record<string, unknown> = { ...data };

  // Automatically set cancelled_at when status is a cancellation
  if (
    data.status === "cancelled_by_client" ||
    data.status === "cancelled_by_coach"
  ) {
    update.cancelled_at = new Date().toISOString();
  }

  const supabase = getSupabaseAdmin();
  const { data: result, error } = await supabase
    .from("bookings")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[booking.server] updateBooking error:", error.message);
    throw new Error(error.message);
  }

  return result as Booking;
}
