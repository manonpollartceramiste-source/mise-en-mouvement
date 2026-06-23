export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled_by_client'
  | 'cancelled_by_coach'
  | 'completed'
  | 'no_show';

export type AvailabilityRule = {
  id: string;
  coach_id: string;
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday, JS convention
  start_time: string; // "HH:MM" or "HH:MM:SS"
  end_time: string;
  slot_duration_min: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Unavailability = {
  id: string;
  coach_id: string;
  starts_at: string; // ISO
  ends_at: string; // ISO
  label: string | null;
  is_all_day: boolean;
  created_at: string;
};

export type Booking = {
  id: string;
  coach_id: string;
  offer_id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  client_profile_id: string | null;
  starts_at: string; // ISO
  ends_at: string; // ISO
  duration_min: number;
  status: BookingStatus;
  payment_method: 'online' | 'cabinet' | null;
  payment_status: 'pending' | 'paid' | 'refunded' | null;
  client_notes: string | null;
  coach_notes: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  google_event_id: string | null;
  force_overlap: boolean;
  overlap_reason: string | null;
  // Joined field — populated by getAllBookingsInRange
  coach_name?: string | null;
  created_at: string;
  updated_at: string;
};

export type BookingSettings = {
  coach_id: string;
  min_notice_hours: number;
  max_advance_days: number;
  slot_duration_min: number;
  buffer_after_min: number;
  auto_confirm: boolean;
  timezone: string;
};

export type TimeSlot = {
  starts_at: string; // ISO UTC
  ends_at: string; // ISO UTC
  available: boolean;
};

export type CreateBookingInput = {
  coach_id: string;
  offer_id: string;
  starts_at: string;
  ends_at: string;
  duration_min: number;
  client_name: string;
  client_email: string;
  client_phone?: string | null;
  client_notes?: string | null;
  payment_method?: 'online' | 'cabinet' | null;
  client_profile_id?: string | null;
};

export type UpdateBookingInput = {
  status?: BookingStatus;
  coach_notes?: string | null;
  payment_status?: 'pending' | 'paid' | 'refunded';
  payment_method?: 'online' | 'cabinet';
  cancellation_reason?: string | null;
};

// Default settings (used when coach has no record in booking_settings)
export const DEFAULT_BOOKING_SETTINGS: Omit<BookingSettings, 'coach_id'> = {
  min_notice_hours: 24,
  max_advance_days: 90,
  slot_duration_min: 60,
  buffer_after_min: 0,
  auto_confirm: true,
  timezone: 'Europe/Paris',
};
