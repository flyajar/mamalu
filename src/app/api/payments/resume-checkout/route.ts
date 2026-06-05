import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/server";
import { createClassBookingCheckoutSession } from "@/lib/payments/class-checkout";
import { getSiteUrl } from "@/lib/url/site";

export async function POST(request: NextRequest) {
  try {
    const { bookingId, bookingType = "class" } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    if (bookingType === "service") {
      const { data: booking, error } = await supabase
        .from("service_bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (error || !booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      if (booking.paid_at || booking.payment_status === "paid") {
        return NextResponse.json({ error: "Booking is already paid" }, { status: 400 });
      }

      if (booking.stripe_checkout_session_id) {
        try {
          const existingSession = await stripe.checkout.sessions.retrieve(booking.stripe_checkout_session_id);
          if (existingSession.status === "open" && existingSession.url) {
            return NextResponse.json({
              sessionId: existingSession.id,
              url: existingSession.url,
            });
          }
        } catch (stripeError) {
          console.error("Failed to retrieve service checkout session:", stripeError);
        }
      }

      const amountDue = booking.is_deposit_payment && !booking.deposit_paid
        ? Number(booking.deposit_amount || 0)
        : Number(booking.total_amount || 0);

      if (amountDue <= 0) {
        return NextResponse.json({ error: "No payment is due for this booking" }, { status: 400 });
      }

      const title = [booking.service_name, booking.package_name || booking.menu_name]
        .filter(Boolean)
        .join(" - ") || "Service Booking";
      const siteUrl = getSiteUrl(request);
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "aed",
              product_data: {
                name: booking.is_deposit_payment ? `${title} (50% Deposit)` : title,
                description: booking.is_deposit_payment
                  ? `50% Deposit for ${booking.guest_count || 1} guest(s)${booking.event_date ? ` on ${booking.event_date}` : ""}`
                  : `Booking for ${booking.guest_count || 1} guest(s)${booking.event_date ? ` on ${booking.event_date}` : ""}`,
              },
              unit_amount: Math.round(amountDue * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${siteUrl}/booking/success?booking=${booking.booking_number}`,
        cancel_url: `${siteUrl}/booking/cancelled?service_booking_id=${booking.id}`,
        customer_email: booking.customer_email || undefined,
        metadata: {
          type: "service_booking",
          booking_id: booking.id,
          booking_number: booking.booking_number,
        },
      });

      await supabase
        .from("service_bookings")
        .update({ stripe_checkout_session_id: session.id })
        .eq("id", bookingId);

      return NextResponse.json({
        sessionId: session.id,
        url: session.url,
      });
    }

    const { data: booking, error } = await supabase
      .from("class_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.paid_at || booking.status === "confirmed") {
      return NextResponse.json({ error: "Booking is already paid" }, { status: 400 });
    }

    if (booking.stripe_checkout_session_id) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(booking.stripe_checkout_session_id);
        if (existingSession.status === "open" && existingSession.url) {
          return NextResponse.json({
            sessionId: existingSession.id,
            url: existingSession.url,
          });
        }
      } catch (stripeError) {
        console.error("Failed to retrieve checkout session:", stripeError);
      }
    }

    const session = await createClassBookingCheckoutSession({
      booking,
      siteUrl: getSiteUrl(request),
    });

    await supabase
      .from("class_bookings")
      .update({
        stripe_checkout_session_id: session.id,
        payment_method: "stripe",
      })
      .eq("id", bookingId);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Resume checkout error:", error);
    return NextResponse.json({ error: "Failed to resume payment" }, { status: 500 });
  }
}
