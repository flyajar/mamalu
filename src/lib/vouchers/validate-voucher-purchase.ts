import type { SupabaseClient } from "@supabase/supabase-js";

type VoucherPurchase = {
  paid_at: string | null;
  created_at: string | null;
};

export type VoucherValidity =
  | { valid: true; expiresAt: string }
  | { valid: false; error: string };

export async function validateVoucherPurchaseWindow(
  supabase: SupabaseClient,
  voucherCode: string
): Promise<VoucherValidity> {
  const { data, error } = await supabase
    .from("voucher_purchases")
    .select("paid_at, created_at")
    .eq("voucher_code", voucherCode)
    .eq("status", "paid")
    .limit(1);

  if (error) throw error;

  const purchase = (data?.[0] || null) as VoucherPurchase | null;
  if (!purchase) {
    return { valid: false, error: "Invalid or expired voucher code" };
  }

  const purchaseDateValue = purchase.paid_at || purchase.created_at;
  if (!purchaseDateValue) {
    return { valid: false, error: "Invalid or expired voucher code" };
  }

  const expiresAt = new Date(purchaseDateValue);
  expiresAt.setMonth(expiresAt.getMonth() + 6);

  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    return { valid: false, error: "This voucher has expired. Vouchers are valid for 6 months from purchase." };
  }

  return { valid: true, expiresAt: expiresAt.toISOString() };
}
