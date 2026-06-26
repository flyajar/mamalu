import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/api-auth";

const HIDDEN_ADMIN_BOOKING_NUMBERS = ["SB-20260617-779821"];

const isPlainUnpaidBooking = (booking: {
  paid_at?: string | null;
  is_deposit_payment?: boolean | null;
  deposit_paid?: boolean | null;
  balance_paid?: boolean | null;
  payment_status?: string | null;
  status?: string | null;
  created_by?: string | null;
}) => {
  return (
    !booking.created_by &&
    !booking.paid_at &&
    !booking.deposit_paid &&
    !booking.balance_paid &&
    (booking.payment_status === "unpaid" || booking.status === "unpaid")
  );
};

/**
 * GET: Fetch all bookings with check-in status for admin dashboard
 */
export async function GET(request: NextRequest) {
  // Verify user is staff/admin
  const authResult = await requireAuth(request, ["staff", "admin", "super_admin"]);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("class_id");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    let classQuery = supabase
      .from("class_bookings")
      .select("*", { count: "exact" })
      .not("booking_number", "in", `(${HIDDEN_ADMIN_BOOKING_NUMBERS.join(",")})`)
      .order("created_at", { ascending: false });

    if (classId) {
      classQuery = classQuery.eq("class_id", classId);
    }

    if (status) {
      if (status === "checked_in") {
        classQuery = classQuery.not("checked_in_at", "is", null);
      } else if (status === "not_checked_in") {
        classQuery = classQuery.is("checked_in_at", null).eq("status", "confirmed");
      } else {
        classQuery = classQuery.eq("status", status);
      }
    }

    let serviceQuery = supabase
      .from("service_bookings")
      .select("*")
      .not("booking_number", "in", `(${HIDDEN_ADMIN_BOOKING_NUMBERS.join(",")})`)
      .order("created_at", { ascending: false });

    if (status) {
      if (status === "checked_in") {
        serviceQuery = serviceQuery.not("checked_in_at", "is", null);
      } else if (status === "not_checked_in") {
        serviceQuery = serviceQuery.is("checked_in_at", null);
      } else if (status === "confirmed") {
        serviceQuery = serviceQuery.in("status", ["confirmed", "paid"]);
      } else {
        serviceQuery = serviceQuery.eq("status", status);
      }
    }

    const [{ data: classBookings, error: classError }, { data: serviceBookings, error: serviceError }] =
      await Promise.all([
        classQuery,
        classId ? Promise.resolve({ data: [], error: null }) : serviceQuery,
      ]);

    if (classError || serviceError) {
      const error = classError || serviceError;
      console.error("Fetch attendees error:", error);
      return NextResponse.json({ error: error?.message }, { status: 500 });
    }

    const normalizedClassBookings = (classBookings || []).map(booking => ({
      ...booking,
      number_of_guests: booking.number_of_guests || 1,
      guests_checked_in: booking.attendance_count ?? booking.guests_checked_in ?? 0,
      booking_source: booking.booking_source || "class",
    }));

    const normalizedServiceBookings = (serviceBookings || [])
      .filter((booking) => !isPlainUnpaidBooking(booking))
      .map(booking => ({
      id: booking.id,
      booking_number: booking.booking_number,
      attendee_name: booking.customer_name,
      attendee_email: booking.customer_email,
      attendee_phone: booking.customer_phone,
      class_id: `service:${booking.service_id || booking.id}`,
      class_title: [booking.service_name, booking.package_name || booking.menu_name]
        .filter(Boolean)
        .join(" - "),
      sessions_booked: 1,
      total_amount: booking.total_amount,
      status: booking.status === "paid" ? "confirmed" : booking.status,
      paid_at: booking.paid_at,
      checked_in_at: booking.checked_in_at,
      created_at: booking.created_at,
      number_of_guests: booking.guest_count || 1,
      guests_checked_in: booking.attendance_count || (booking.checked_in_at ? booking.guest_count || 1 : 0),
      attendance_count: booking.attendance_count,
      booking_source: "service",
    }));

    const allBookings = [...normalizedClassBookings, ...normalizedServiceBookings]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const bookings = allBookings.slice(offset, offset + limit);

    return NextResponse.json({
      bookings,
      total: allBookings.length,
      limit,
      offset,
    });
  } catch (error: unknown) {
    console.error("Get attendees error:", error);
    return NextResponse.json({ error: "Failed to fetch attendees" }, { status: 500 });
  }
}
