import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { assignVoucherToPaidPurchase } from "@/lib/vouchers/assign-purchase-voucher";

type VoucherPurchase = {
  id: string;
  amount: number;
  status: string;
  voucher_code: string | null;
  paid_at: string | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "customer") {
      return NextResponse.json({ error: "Customer access only" }, { status: 403 });
    }

    const email = profile?.email || user.email || "";
    const serviceClient = createServiceClient();
    if (!serviceClient) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { data: vouchers, error } = await serviceClient
      .from("voucher_purchases")
      .select("*")
      .or(`and(is_gift.eq.false,customer_email.ilike.${email}),and(is_gift.eq.true,recipient_email.ilike.${email})`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch user vouchers error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const normalizedVouchers = await Promise.all(
      ((vouchers || []) as VoucherPurchase[]).map(async (voucher) => {
        const isPaid = voucher.status === "paid" || Boolean(voucher.paid_at);

        if (!isPaid || voucher.voucher_code) {
          return {
            ...voucher,
            status: isPaid ? "paid" : voucher.status,
          };
        }

        const assigned = await assignVoucherToPaidPurchase(serviceClient, voucher);

        return {
          ...voucher,
          status: "paid",
          voucher_id: assigned?.id || null,
          voucher_code: assigned?.code || voucher.voucher_code,
        };
      })
    );

    return NextResponse.json({ vouchers: normalizedVouchers });
  } catch (error) {
    console.error("Get user vouchers error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch vouchers" },
      { status: 500 }
    );
  }
}
