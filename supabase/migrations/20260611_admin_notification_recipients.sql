CREATE TABLE IF NOT EXISTS public.admin_notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  source_id TEXT,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notification_recipients_enabled
  ON public.admin_notification_recipients (is_enabled);

CREATE INDEX IF NOT EXISTS idx_admin_notification_logs_created_at
  ON public.admin_notification_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notification_logs_source
  ON public.admin_notification_logs (event_type, source_id);

CREATE OR REPLACE FUNCTION public.set_admin_notification_recipient_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_admin_notification_recipient_updated_at
  ON public.admin_notification_recipients;

CREATE TRIGGER set_admin_notification_recipient_updated_at
BEFORE UPDATE ON public.admin_notification_recipients
FOR EACH ROW
EXECUTE FUNCTION public.set_admin_notification_recipient_updated_at();

ALTER TABLE public.admin_notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notification_logs ENABLE ROW LEVEL SECURITY;
