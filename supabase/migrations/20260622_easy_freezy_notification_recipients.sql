ALTER TABLE public.admin_notification_recipients
  ADD COLUMN IF NOT EXISTS recipient_group TEXT NOT NULL DEFAULT 'admin';

UPDATE public.admin_notification_recipients
SET recipient_group = 'admin'
WHERE recipient_group IS NULL;

ALTER TABLE public.admin_notification_recipients
  DROP CONSTRAINT IF EXISTS admin_notification_recipients_email_key;

ALTER TABLE public.admin_notification_recipients
  DROP CONSTRAINT IF EXISTS admin_notification_recipients_group_check;

ALTER TABLE public.admin_notification_recipients
  ADD CONSTRAINT admin_notification_recipients_group_check
  CHECK (recipient_group IN ('admin', 'easy_freezy'));

CREATE UNIQUE INDEX IF NOT EXISTS admin_notification_recipients_group_email_key
  ON public.admin_notification_recipients (recipient_group, email);

CREATE INDEX IF NOT EXISTS idx_admin_notification_recipients_group_enabled
  ON public.admin_notification_recipients (recipient_group, is_enabled);
