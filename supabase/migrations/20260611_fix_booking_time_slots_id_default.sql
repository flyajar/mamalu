ALTER TABLE public.booking_time_slots
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
