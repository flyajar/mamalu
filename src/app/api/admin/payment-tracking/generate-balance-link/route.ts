import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingPaymentReminderEmail } from "@/lib/email/booking-payment-reminder";
import { createSourceInvoice } from "@/lib/invoices/source-invoices";

async function findBalanceInvoice(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  bookingId: string
) {
  const { data } = await supabase
    .from("invoices")
    .select("*")
    .eq("service_booking_id", bookingId)
    .ilike("description", "%balance payment%")
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { bookingId, sendEmail = false } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    // Get the booking
    const { data: booking, error: bookingError } = await supabase
      .from("service_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (!booking.deposit_paid) {
      return NextResponse.json({ error: "Deposit must be paid first" }, { status: 400 });
    }

    if (booking.balance_paid) {
      return NextResponse.json({ error: "Balance already paid" }, { status: 400 });
    }

    const productLabel = [booking.service_name, booking.package_name || booking.menu_name]
      .filter(Boolean)
      .join(" - ") || "Service Booking";
    let paymentLinkUrl = booking.balance_payment_link || null;
    let stripePaymentLinkId = booking.balance_stripe_session_id || null;

    if (!paymentLinkUrl) {
      const product = await stripe.products.create({
        name: `${productLabel} (Balance Payment)`,
        description: `Balance payment for booking ${booking.booking_number} - ${booking.guest_count} guests`,
        metadata: {
          booking_id: booking.id,
          booking_number: booking.booking_number,
          service_type: booking.service_type,
          payment_type: "balance",
        },
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(booking.balance_amount * 100),
        currency: "aed",
      });

      const paymentLink = await stripe.paymentLinks.create({
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: {
          booking_id: booking.id,
          booking_number: booking.booking_number,
          payment_type: "balance",
        },
        after_completion: {
          type: "redirect",
          redirect: {
            url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://mamalu.vercel.app"}/booking/success?booking=${booking.booking_number}&payment=balance`,
          },
        },
      });

      paymentLinkUrl = paymentLink.url;
      stripePaymentLinkId = paymentLink.id;

      let balanceDueDate = null;
      if (booking.event_date) {
        const eventDate = new Date(booking.event_date);
        balanceDueDate = new Date(eventDate.getTime() - 48 * 60 * 60 * 1000);
      }

      const { error: updateError } = await supabase
        .from("service_bookings")
        .update({
          balance_payment_link: paymentLinkUrl,
          balance_stripe_session_id: stripePaymentLinkId,
          balance_due_date: balanceDueDate?.toISOString().split("T")[0] || null,
          payment_status: "balance_pending",
        })
        .eq("id", bookingId);

      if (updateError) {
        console.error("Update booking error:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    let invoice = await findBalanceInvoice(supabase, booking.id);
    if (!invoice) {
      invoice = await createSourceInvoice(supabase, {
        sourceType: "service_booking",
        serviceBookingId: booking.id,
        customerName: booking.customer_name,
        customerEmail: booking.customer_email,
        customerPhone: booking.customer_phone,
        amount: Number(booking.balance_amount),
        baseAmount: Number(booking.balance_amount),
        extrasAmount: 0,
        description: `${productLabel} - Balance Payment`,
        lineItems: [{
          name: `${productLabel} (Balance Payment)`,
          quantity: 1,
          price: Number(booking.balance_amount),
        }],
        serviceName: booking.service_name,
        serviceType: booking.service_type,
        eventDate: booking.event_date,
        guestCount: booking.guest_count,
        status: "sent",
        paymentLink: paymentLinkUrl,
        stripeCheckoutSessionId: stripePaymentLinkId,
        notes: `Balance payment for booking ${booking.booking_number}`,
        updateBookingReference: false,
      });
    }

    let emailSent = false;
    let emailError: string | null = null;
    if (sendEmail) {
      if (!booking.customer_email) {
        emailError = "Booking does not have a customer email";
      } else {
        const emailResult = await sendBookingPaymentReminderEmail({
          bookingNumber: booking.booking_number,
          attendeeName: booking.customer_name || "there",
          attendeeEmail: booking.customer_email,
          classTitle: productLabel,
          totalAmount: Number(booking.balance_amount),
          paymentUrl: paymentLinkUrl,
          amountLabel: "Remaining Balance",
          introText: "the remaining balance for your booking is now due. You can complete the payment using the secure button below.",
        });
        emailSent = emailResult.success;
        emailError = emailResult.error || null;
      }
    }

    return NextResponse.json({
      success: true,
      paymentLink: paymentLinkUrl,
      invoice,
      emailSent,
      emailError,
    });
  } catch (error) {
    console.error("Generate balance link error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate link" },
      { status: 500 }
    );
  }
}
