import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClassBookingCheckoutSession } from "@/lib/payments/class-checkout";
import { getSiteUrl } from "@/lib/url/site";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, successUrl, cancelUrl, campaign_id, utm_source, utm_medium, utm_campaign } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Fetch the booking
    const { data: booking, error: bookingError } = await supabase
      .from("class_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.paid_at) {
      return NextResponse.json(
        { error: "Booking already paid" },
        { status: 400 }
      );
    }

    const session = await createClassBookingCheckoutSession({
      booking,
      siteUrl: getSiteUrl(request),
      successUrl,
      cancelUrl,
    });

    // Update booking with checkout session ID and campaign attribution
    const updateData: Record<string, string> = {
      stripe_checkout_session_id: session.id,
      payment_method: "stripe",
    };
    
    // Add campaign attribution if provided
    if (campaign_id) updateData.campaign_id = campaign_id;
    if (utm_source) updateData.utm_source = utm_source;
    if (utm_medium) updateData.utm_medium = utm_medium;
    if (utm_campaign) updateData.utm_campaign = utm_campaign;
    
    await supabase
      .from("class_bookings")
      .update(updateData)
      .eq("id", bookingId);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
