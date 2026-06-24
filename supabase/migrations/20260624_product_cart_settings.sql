INSERT INTO public.site_content (id, content)
VALUES (
  'product_cart_settings',
  '{
    "minimumOrderValue": 100,
    "deliveryFee": 15
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;
