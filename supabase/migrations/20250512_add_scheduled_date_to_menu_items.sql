-- Add scheduled_date column to menu_items for monthly specials scheduling
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ;

-- Index for efficient querying by scheduled date
CREATE INDEX IF NOT EXISTS idx_menu_items_scheduled_date ON menu_items(scheduled_date);
