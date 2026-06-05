import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingPaymentReminderEmail } from "@/lib/email/booking-payment-reminder";

export async function POST(request: NextRequest) {
  try {
    const { bookingId, serviceBookingId } = await request.json();
    const resolvedBookingId = bookingId || serviceBookingId;
    const bookingType = serviceBookingId ? "service" : "class";

    if (!resolvedBookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const tableName = bookingType === "service" ? "service_bookings" : "class_bookings";
    const { data: booking, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("id", resolvedBookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.paid_at || booking.payment_status === "paid") {
      return NextResponse.json({ skipped: true });
    }

    const resumeResponse = await fetch(new URL("/api/payments/resume-checkout", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: resolvedBookingId, bookingType }),
    });
    const resumeData = await resumeResponse.json();

    if (!resumeResponse.ok || !resumeData.url) {
      return NextResponse.json(
        { error: resumeData.error || "Failed to create payment link" },
        { status: resumeResponse.status || 500 }
      );
    }

    const title = bookingType === "service"
      ? [booking.service_name, booking.package_name || booking.menu_name].filter(Boolean).join(" - ")
      : booking.class_title;
    const amountDue = bookingType === "service" && booking.is_deposit_payment && !booking.deposit_paid
      ? booking.deposit_amount
      : booking.amount_due || booking.total_amount;

    const result = await sendBookingPaymentReminderEmail({
      bookingNumber: booking.booking_number,
      attendeeName: bookingType === "service" ? booking.customer_name : booking.attendee_name,
      attendeeEmail: bookingType === "service" ? booking.customer_email : booking.attendee_email,
      classTitle: title || "Mamalu Kitchen booking",
      totalAmount: amountDue,
      paymentUrl: resumeData.url,
      amountLabel: bookingType === "service" && booking.is_deposit_payment && !booking.deposit_paid ? "Deposit Due" : "Amount Due",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancelled payment email error:", error);
    return NextResponse.json({ error: "Failed to send cancellation email" }, { status: 500 });
  }
}
