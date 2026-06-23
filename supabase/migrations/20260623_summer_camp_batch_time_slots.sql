ALTER TABLE public.summer_camp_batches
  ADD COLUMN IF NOT EXISTS time_slots JSONB NOT NULL DEFAULT '{}'::JSONB;

COMMENT ON COLUMN public.summer_camp_batches.time_slots IS
  'Map of camp date YYYY-MM-DD to an array of configured time slots: [{"start":"10:00","end":"12:30"}].';
