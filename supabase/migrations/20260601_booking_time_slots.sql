CREATE TABLE IF NOT EXISTS public.booking_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT NOT NULL,
  label TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  days_of_week INTEGER[] NOT NULL DEFAULT ARRAY[0, 1, 2, 3, 4, 5, 6],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT booking_time_slots_category_time_unique UNIQUE (category_id, start_time, end_time),
  CONSTRAINT booking_time_slots_duration_positive CHECK (duration_minutes > 0),
  CONSTRAINT booking_time_slots_days_valid CHECK (
    days_of_week <@ ARRAY[0, 1, 2, 3, 4, 5, 6]
    AND cardinality(days_of_week) > 0
  )
);

CREATE INDEX IF NOT EXISTS idx_booking_time_slots_category
  ON public.booking_time_slots(category_id);

CREATE INDEX IF NOT EXISTS idx_booking_time_slots_active_category
  ON public.booking_time_slots(category_id, is_active, sort_order);

DROP TRIGGER IF EXISTS update_booking_time_slots_updated_at ON public.booking_time_slots;
CREATE TRIGGER update_booking_time_slots_updated_at
  BEFORE UPDATE ON public.booking_time_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

INSERT INTO public.booking_time_slots (
  category_id,
  label,
  start_time,
  end_time,
  duration_minutes,
  days_of_week,
  is_active,
  sort_order
)
SELECT
  categories.category_id,
  slots.label,
  slots.start_time::time,
  slots.end_time::time,
  slots.duration_minutes,
  slots.days_of_week,
  TRUE,
  slots.sort_order
FROM (
  VALUES
    ('birthday'),
    ('packages'),
    ('classics_mini'),
    ('monthly_mini'),
    ('mommy_me'),
    ('corporate'),
    ('classics_big'),
    ('monthly_big'),
    ('teenagers'),
    ('nanny')
) AS categories(category_id)
CROSS JOIN (
  VALUES
    ('11:00 AM - 12:30 PM', '11:00', '12:30', 90, ARRAY[0, 1, 2, 3, 4, 5, 6], 10),
    ('1:30 PM - 3:00 PM', '13:30', '15:00', 90, ARRAY[0, 1, 2, 3, 4, 5, 6], 20),
    ('4:00 PM - 5:30 PM', '16:00', '17:30', 90, ARRAY[0, 1, 2, 3, 4, 5, 6], 30),
    ('6:30 PM - 8:00 PM', '18:30', '20:00', 90, ARRAY[0, 1, 2, 3, 4, 5, 6], 40),
    ('9:00 PM - 10:30 PM', '21:00', '22:30', 90, ARRAY[4, 5], 50)
) AS slots(label, start_time, end_time, duration_minutes, days_of_week, sort_order)
ON CONFLICT (category_id, start_time, end_time) DO NOTHING;

GRANT ALL ON public.booking_time_slots TO service_role;
GRANT SELECT ON public.booking_time_slots TO anon;
GRANT SELECT ON public.booking_time_slots TO authenticated;
