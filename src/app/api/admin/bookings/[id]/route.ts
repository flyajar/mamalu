import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BOOKING_TABLES = ["service_bookings", "class_bookings"] as const;
type BookingTable = (typeof BOOKING_TABLES)[number];
type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

type ScheduleItem = {
  id?: string;
  name?: string;
  session?: number;
  packageId?: string;
  packageName?: string;
  event_date?: string | null;
  event_time?: string | null;
  time_label?: string | null;
};

type ServiceBookingForConflict = {
  id: string;
  booking_number?: string | null;
  status?: string | null;
  event_date?: string | null;
  event_time?: string | null;
  items?: ScheduleItem[] | null;
};

async function findBookingTable(supabase: AdminClient, id: string): Promise<BookingTable | null> {
  for (const table of BOOKING_TABLES) {
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(`Find booking in ${table} failed:`, error);
      continue;
    }

    if (data) {
      return table;
    }
  }

  return null;
}

function normalizeScheduleKey(date?: string | null, time?: string | null) {
  if (!date || !time) return null;
  return `${date}|${time}`;
}

function sameIdentity(original: ScheduleItem, next: ScheduleItem) {
  return (
    (original.id || null) === (next.id || null) &&
    (original.name || null) === (next.name || null) &&
    (original.session || null) === (next.session || null) &&
    (original.packageId || null) === (next.packageId || null) &&
    (original.packageName || null) === (next.packageName || null)
  );
}

function validateScheduleItems(originalItems: ScheduleItem[] | null | undefined, nextItems: unknown) {
  if (!Array.isArray(originalItems) || originalItems.length === 0) {
    return { error: "This booking does not have package menus to schedule" };
  }

  if (!Array.isArray(nextItems) || nextItems.length !== originalItems.length) {
    return { error: "Schedule items must match the original package menus" };
  }

  const seen = new Set<string>();
  const sanitized: ScheduleItem[] = [];

  for (let index = 0; index < originalItems.length; index++) {
    const original = originalItems[index] || {};
    const incoming = nextItems[index] as ScheduleItem;

    if (!incoming || typeof incoming !== "object" || !sameIdentity(original, incoming)) {
      return { error: "Schedule items cannot change package menu details" };
    }

    if (!incoming.event_date || !incoming.event_time) {
      return { error: "Every package menu needs a date and time before saving" };
    }

    const key = normalizeScheduleKey(incoming.event_date, incoming.event_time);
    if (!key) {
      return { error: "Every package menu needs a valid date and time" };
    }

    if (seen.has(key)) {
      return { error: "Two package menus in this booking cannot use the same date and time" };
    }
    seen.add(key);

    sanitized.push({
      ...original,
      event_date: incoming.event_date,
      event_time: incoming.event_time,
      time_label: incoming.time_label || incoming.event_time,
    });
  }

  return { items: sanitized };
}

async function findScheduleConflicts(
  supabase: AdminClient,
  bookingId: string,
  items: ScheduleItem[]
) {
  const requested = new Map<string, ScheduleItem>();
  items.forEach((item) => {
    const key = normalizeScheduleKey(item.event_date, item.event_time);
    if (key) requested.set(key, item);
  });

  if (requested.size === 0) return [];

  const { data: bookings, error } = await supabase
    .from("service_bookings")
    .select("id, booking_number, status, event_date, event_time, items")
    .neq("id", bookingId)
    .neq("status", "cancelled");

  if (error) {
    throw error;
  }

  const conflicts: Array<{ booking_id: string; booking_number?: string | null; item_name?: string | null; event_date: string; event_time: string }> = [];

  for (const booking of (bookings || []) as ServiceBookingForConflict[]) {
    const bookingKey = normalizeScheduleKey(booking.event_date, booking.event_time);
    if (bookingKey && requested.has(bookingKey)) {
      conflicts.push({
        booking_id: booking.id,
        booking_number: booking.booking_number,
        item_name: null,
        event_date: booking.event_date!,
        event_time: booking.event_time!,
      });
    }

    if (Array.isArray(booking.items)) {
      for (const item of booking.items) {
        const itemKey = normalizeScheduleKey(item.event_date, item.event_time);
        if (itemKey && requested.has(itemKey)) {
          conflicts.push({
            booking_id: booking.id,
            booking_number: booking.booking_number,
            item_name: item.name || null,
            event_date: item.event_date!,
            event_time: item.event_time!,
          });
        }
      }
    }
  }

  return conflicts;
}

// GET: Fetch single booking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const table = await findBookingTable(supabase, id);
    if (!table) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const { data: booking, error } = await supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Get booking error:", error);
    return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 });
  }
}

// PATCH: Update booking
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes, paid_at, refund_amount, refund_reason, items } = body;

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const table = await findBookingTable(supabase, id);
    if (!table) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (status) {
      updateData.status = status;
      
      // If confirming, check if we should also mark as paid
      if (status === "confirmed" && body.markAsPaid) {
        updateData.paid_at = new Date().toISOString();
      }
      
      // If cancelling, handle refund info if provided
      if (status === "cancelled") {
        if (refund_amount) updateData.refund_amount = refund_amount;
        if (refund_reason) updateData.refund_reason = refund_reason;
        updateData.refunded_at = new Date().toISOString();
      }
    }

    if (notes !== undefined) {
      // Fetch current notes and append
      const { data: currentBooking } = await supabase
        .from(table)
        .select("notes")
        .eq("id", id)
        .maybeSingle();
      
      updateData.notes = currentBooking?.notes
        ? `${currentBooking.notes}\n\n${notes}`
        : notes;
    }

    if (paid_at !== undefined) {
      updateData.paid_at = paid_at;
    }

    if (items !== undefined) {
      if (table !== "service_bookings") {
        return NextResponse.json({ error: "Schedule items can only be updated for service bookings" }, { status: 400 });
      }

      const { data: currentBooking, error: currentError } = await supabase
        .from("service_bookings")
        .select("id, items")
        .eq("id", id)
        .maybeSingle();

      if (currentError || !currentBooking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      const validation = validateScheduleItems(currentBooking.items as ScheduleItem[] | null, items);
      if (validation.error || !validation.items) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const conflicts = await findScheduleConflicts(supabase, id, validation.items);
      if (conflicts.length > 0) {
        const first = conflicts[0];
        return NextResponse.json(
          {
            error: `The selected slot is already occupied${first.booking_number ? ` by ${first.booking_number}` : ""}.`,
            conflicts,
          },
          { status: 409 }
        );
      }

      updateData.items = validation.items;
    }

    const { data: bookings, error } = await supabase
      .from(table)
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (bookings.length > 1) {
      return NextResponse.json({ error: "Multiple bookings matched this update" }, { status: 500 });
    }

    const booking = bookings[0];

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Update booking error:", error);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}

// DELETE: Cancel/delete booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const table = await findBookingTable(supabase, id);
    if (!table) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Soft delete by setting status to cancelled
    const { data: booking, error } = await supabase
      .from(table)
      .update({ status: "cancelled" })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ booking, message: "Booking cancelled" });
  } catch (error) {
    console.error("Delete booking error:", error);
    return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
  }
}
