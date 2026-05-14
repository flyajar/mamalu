-- Add menu_item_id to payment_links for tracking sales by menu item
ALTER TABLE public.payment_links 
ADD COLUMN IF NOT EXISTS menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_links_menu_item ON public.payment_links(menu_item_id);

-- Add comment
COMMENT ON COLUMN public.payment_links.menu_item_id IS 'Optional link to menu item for tracking sales by item';
