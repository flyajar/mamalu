import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const bookingNumber = request.nextUrl.searchParams.get("booking")?.trim();

  if (!bookingNumber) {
    return NextResponse.json({ error: "Booking reference is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { data: booking, error } = await supabase
    .from("service_bookings")
    .select(`
      booking_number,
      service_name,
      package_name,
      menu_name,
      event_date,
      event_time,
      time_label,
      guest_count,
      total_amount,
      deposit_amount,
      balance_amount,
      balance_paid,
      balance_paid_at
    `)
    .eq("booking_number", bookingNumber)
    .eq("balance_paid", true)
    .maybeSingle();

  if (error) {
    console.error("Fetch booking success details error:", error);
    return NextResponse.json({ error: "Failed to load booking details" }, { status: 500 });
  }

  if (!booking) {
    return NextResponse.json({ error: "Paid booking not found" }, { status: 404 });
  }

  return NextResponse.json({ booking });
}
