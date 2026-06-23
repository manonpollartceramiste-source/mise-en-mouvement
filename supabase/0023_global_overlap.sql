-- Add force_overlap and overlap_reason columns to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS force_overlap boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS overlap_reason text;

-- Drop the per-coach exclusion constraint if it exists (may be named differently)
DO $$
BEGIN
  -- Try to drop any existing per-coach overlap exclusion constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.bookings'::regclass
      AND contype = 'x'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.bookings DROP CONSTRAINT ' || quote_ident(conname)
      FROM pg_constraint
      WHERE conrelid = 'public.bookings'::regclass AND contype = 'x'
      LIMIT 1
    );
  END IF;
END $$;

-- Global overlap check function (all coaches)
CREATE OR REPLACE FUNCTION public.check_global_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip if force_overlap is true
  IF NEW.force_overlap THEN
    RETURN NEW;
  END IF;

  -- Skip cancelled bookings
  IF NEW.status IN ('cancelled_by_client', 'cancelled_by_coach') THEN
    RETURN NEW;
  END IF;

  -- Check for any overlapping confirmed/pending booking (all coaches)
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id <> NEW.id
      AND status NOT IN ('cancelled_by_client', 'cancelled_by_coach')
      AND force_overlap = false
      AND starts_at < NEW.ends_at
      AND ends_at > NEW.starts_at
  ) THEN
    RAISE EXCEPTION 'Créneau déjà réservé';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger
DROP TRIGGER IF EXISTS trg_global_booking_overlap ON public.bookings;
CREATE TRIGGER trg_global_booking_overlap
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_global_booking_overlap();
