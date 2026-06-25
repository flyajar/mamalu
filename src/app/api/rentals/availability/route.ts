import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BLOCKING_STATUSES = ["confirmed", "pending", "deposit_paid", "completed"];
const FULL_DAY_PACKAGE = "full day rental";
const HALF_DAY_TIME_SLOTS = [
  { label: "9am - 1pm", start: "09:00", end: "13:00" },
  { label: "1pm - 5pm", start: "13:00", end: "17:00" },
  { label: "5pm - 9pm", start: "17:00", end: "21:00" },
];

interface HiddenTimeSlotRow {
  hidden_date: string;
  start_time: string;
  end_time: string;
}

function parseTime(time: string) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function isSlotHidden(slot: { start: string; end: string }, hiddenSlots: HiddenTimeSlotRow[]) {
  const slotStart = parseTime(slot.start);
  const slotEnd = parseTime(slot.end);

  return hiddenSlots.some((hiddenSlot) => {
    const hiddenStart = parseTime(hiddenSlot.start_time);
    const hiddenEnd = parseTime(hiddenSlot.end_time);
    return slotStart >= hiddenStart && slotEnd <= hiddenEnd;
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ blockedDates: [], blockedHalfDaySlots: [] });
    }
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dubai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const { data, error } = await supabase
      .from("service_bookings")
      .select("event_date, package_name")
      .gte("event_date", today)
      .in("status", BLOCKING_STATUSES)
      .ilike("service_name", "%rental%");

    if (error) {
      console.error("Rental availability query error:", error);
      return NextResponse.json(
        { error: "Could not check rental availability" },
        { status: 500 }
      );
    }

    const blockedDates = [...new Set(
      (data || [])
        .filter((booking) => booking.package_name?.trim().toLowerCase() === FULL_DAY_PACKAGE)
        .map((booking) => booking.event_date)
        .filter((date): date is string => Boolean(date))
    )].sort();

    let hiddenTimeSlots: HiddenTimeSlotRow[] = [];

    if (date) {
      const { data: hiddenRows, error: hiddenRowsError } = await supabase
        .from("booking_hidden_time_slots")
        .select("hidden_date, start_time, end_time")
        .eq("hidden_date", date);

      if (hiddenRowsError) {
        console.warn("Hidden rental time slots are not available yet:", hiddenRowsError.message);
      } else {
        hiddenTimeSlots = hiddenRows || [];
      }
    }

    const blockedHalfDaySlots = date
      ? HALF_DAY_TIME_SLOTS
          .filter((slot) => isSlotHidden(slot, hiddenTimeSlots))
          .map((slot) => slot.label)
      : [];

    return NextResponse.json({
      blockedDates,
      blockedHalfDaySlots,
      hasHiddenTimeRules: hiddenTimeSlots.length > 0,
    });
  } catch (error) {
    console.error("Rental availability error:", error);
    return NextResponse.json(
      { error: "Failed to check rental availability" },
      { status: 500 }
    );
  }
}
