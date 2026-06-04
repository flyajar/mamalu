import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createServiceClient } from "@/lib/supabase/server";

const ALLOWED_DESTINATIONS = new Set([
  "/account",
  "/account/bookings",
  "/account/orders",
  "/account/vouchers",
]);

interface AutoLoginRequest {
  sessionId?: string | null;
  bookingNumber?: string | null;
  destination?: string | null;
}

interface CustomerReference {
  email: string;
  completed: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AutoLoginRequest;
    const destination = normalizeDestination(body.destination);

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const reference = await findCustomerReference(supabase, {
      sessionId: body.sessionId,
      bookingNumber: body.bookingNumber,
    });

    if (!reference?.email || !reference.completed) {
      return NextResponse.json({ redirectTo: destination });
    }

    const customerEmail = reference.email.trim().toLowerCase();
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, email")
      .ilike("email", customerEmail)
      .maybeSingle();

    if (!existingProfile?.id) {
      return NextResponse.json({ redirectTo: destination });
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/$/, "");
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: customerEmail,
      options: {
        redirectTo: `${siteUrl}${destination}`,
      },
    });

    const tokenHash = data?.properties?.hashed_token;
    if (error || !tokenHash) {
      console.error("Generate customer auto-login link failed:", error);
      return NextResponse.json({ redirectTo: destination });
    }

    return NextResponse.json({
      email: customerEmail,
      tokenHash,
      redirectTo: destination,
    });
  } catch (error) {
    console.error("Customer auto-login failed:", error);
    return NextResponse.json({ error: "Failed to prepare account login" }, { status: 500 });
  }
}

async function findCustomerReference(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  params: Pick<AutoLoginRequest, "sessionId" | "bookingNumber">
): Promise<CustomerReference | null> {
  const sessionId = params.sessionId?.trim();
  const bookingNumber = params.bookingNumber?.trim();

  if (sessionId) {
    const fromDatabase = await findByStripeSessionId(supabase, sessionId);
    if (fromDatabase) return fromDatabase;

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const email =
      session.customer_details?.email ||
      session.customer_email ||
      session.metadata?.customer_email ||
      null;

    return email
      ? { email, completed: session.payment_status === "paid" || session.status === "complete" }
      : null;
  }

  if (bookingNumber) {
    return findByBookingNumber(supabase, bookingNumber);
  }

  return null;
}

async function findByStripeSessionId(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  sessionId: string
): Promise<CustomerReference | null> {
  const { data: classBooking } = await supabase
    .from("class_bookings")
    .select("attendee_email, status, paid_at")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (classBooking?.attendee_email) {
    return {
      email: classBooking.attendee_email,
      completed: Boolean(classBooking.paid_at) || classBooking.status === "confirmed",
    };
  }

  const { data: serviceBooking } = await supabase
    .from("service_bookings")
    .select("customer_email, status, payment_status, paid_at")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (serviceBooking?.customer_email) {
    return {
      email: serviceBooking.customer_email,
      completed:
        Boolean(serviceBooking.paid_at) ||
        serviceBooking.status === "confirmed" ||
        ["paid", "deposit_paid"].includes(serviceBooking.payment_status),
    };
  }

  const { data: order } = await supabase
    .from("product_orders")
    .select("customer_email, payment_status, paid_at")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (order?.customer_email) {
    return {
      email: order.customer_email,
      completed: Boolean(order.paid_at) || order.payment_status === "paid",
    };
  }

  const { data: voucherPurchase } = await supabase
    .from("voucher_purchases")
    .select("customer_email, status, paid_at")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (voucherPurchase?.customer_email) {
    return {
      email: voucherPurchase.customer_email,
      completed: Boolean(voucherPurchase.paid_at) || voucherPurchase.status === "paid",
    };
  }

  return null;
}

async function findByBookingNumber(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  bookingNumber: string
): Promise<CustomerReference | null> {
  const { data: classBooking } = await supabase
    .from("class_bookings")
    .select("attendee_email, status, paid_at")
    .eq("booking_number", bookingNumber)
    .maybeSingle();

  if (classBooking?.attendee_email) {
    return {
      email: classBooking.attendee_email,
      completed: Boolean(classBooking.paid_at) || classBooking.status === "confirmed",
    };
  }

  const { data: serviceBooking } = await supabase
    .from("service_bookings")
    .select("customer_email, status, payment_status, paid_at")
    .eq("booking_number", bookingNumber)
    .maybeSingle();

  if (serviceBooking?.customer_email) {
    return {
      email: serviceBooking.customer_email,
      completed:
        Boolean(serviceBooking.paid_at) ||
        serviceBooking.status === "confirmed" ||
        ["paid", "deposit_paid"].includes(serviceBooking.payment_status),
    };
  }

  return null;
}

function normalizeDestination(destination?: string | null) {
  if (destination && ALLOWED_DESTINATIONS.has(destination)) {
    return destination;
  }

  return "/account";
}
