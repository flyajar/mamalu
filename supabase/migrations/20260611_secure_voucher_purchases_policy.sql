DROP POLICY IF EXISTS "Service role full access on voucher_purchases"
  ON public.voucher_purchases;

CREATE POLICY "Service role full access on voucher_purchases"
  ON public.voucher_purchases
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
