import { stripe } from "@/lib/stripe/server";

interface ClassBooking {
  id: string;
  booking_number: string;
  attendee_email: string;
  class_title: string;
  sessions_booked: number | null;
  payment_type: string | null;
  total_amount: number;
}

export async function createClassBookingCheckoutSession({
  booking,
  siteUrl,
  successUrl,
  cancelUrl,
}: {
  booking: ClassBooking;
  siteUrl: string;
  successUrl?: string;
  cancelUrl?: string;
}) {
  const finalSuccessUrl = successUrl || `${siteUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`;
  const finalCancelUrl = cancelUrl || `${siteUrl}/booking/cancelled?booking_id=${booking.id}`;

  return stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: booking.attendee_email,
    line_items: [
      {
        price_data: {
          currency: "aed",
          product_data: {
            name: booking.class_title,
            description: `${booking.sessions_booked || 1} session(s) - ${
              booking.payment_type === "full" || booking.payment_type === "full_course"
                ? "Full Course"
                : "Per Session"
            }`,
          },
          unit_amount: Math.round(Number(booking.total_amount || 0) * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      booking_id: booking.id,
      booking_number: booking.booking_number,
    },
    success_url: finalSuccessUrl,
    cancel_url: finalCancelUrl,
  });
}
