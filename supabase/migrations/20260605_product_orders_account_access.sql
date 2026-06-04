-- Allow customer account and admin APIs to read product orders.
-- The table exists in production but is not present in the tracked base schema.

CREATE TABLE IF NOT EXISTS public.product_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT DEFAULT ('ORD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address JSONB,
  shipping_city TEXT,
  shipping_country TEXT DEFAULT 'AE',
  items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC DEFAULT 0,
  shipping_cost NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'processing',
  payment_status TEXT DEFAULT 'paid',
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  tracking_number TEXT,
  is_new BOOLEAN DEFAULT true,
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_orders_customer_email
ON public.product_orders(customer_email);

CREATE INDEX IF NOT EXISTS idx_product_orders_created_at
ON public.product_orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_orders_is_new
ON public.product_orders(is_new);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_orders TO service_role;

ALTER TABLE public.product_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view their product orders" ON public.product_orders;
CREATE POLICY "Customers can view their product orders"
ON public.product_orders
FOR SELECT
TO authenticated
USING (
  customer_email = (
    SELECT email
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Staff can manage product orders" ON public.product_orders;
CREATE POLICY "Staff can manage product orders"
ON public.product_orders
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'super_admin')
  )
);
