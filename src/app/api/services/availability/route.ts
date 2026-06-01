import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_BOOKING_TIME_SLOTS } from "@/lib/booking-time-slots";

// Buffer time after each booking for preparation/cleaning (in minutes)
const BUFFER_MINUTES = 60;

interface BookedSlot {
  event_time: string;
  duration_minutes: number;
}

interface TimeSlotInfo {
  start: string;
  end: string;
  duration: number;
  label: string;
  days: number[];
}

interface TimeSlotRow {
  start_time: string;
  end_time: string;
  duration_minutes: number;
  label: string;
  days_of_week: number[];
}

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function isSlotBlockedByBooking(
  slot: TimeSlotInfo,
  bookedSlots: BookedSlot[]
): boolean {
  const slotStart = parseTime(slot.start);
  const slotEnd = parseTime(slot.end) + BUFFER_MINUTES; // Add buffer after slot ends

  for (const booking of bookedSlots) {
    if (!booking.event_time) continue;
    
    const bookingStart = parseTime(booking.event_time);
    // Use the slot's duration or booking's stored duration
    const bookingDuration = booking.duration_minutes || 120;
    const bookingEnd = bookingStart + bookingDuration + BUFFER_MINUTES;

    // Check if the slot overlaps with existing booking (including buffer)
    // Overlap occurs if: slotStart < bookingEnd AND slotEnd > bookingStart
    if (slotStart < bookingEnd && slotEnd > bookingStart) {
      return true;
    }
  }

  return false;
}

function normalizeTime(time: string): string {
  return time.slice(0, 5);
}

function toTimeSlotInfo(slot: typeof DEFAULT_BOOKING_TIME_SLOTS[number] | TimeSlotRow): TimeSlotInfo {
  if ("start_time" in slot) {
    return {
      start: normalizeTime(slot.start_time),
      end: normalizeTime(slot.end_time),
      duration: slot.duration_minutes,
      label: slot.label,
      days: slot.days_of_week || [],
    };
  }

  return {
    start: slot.start,
    end: slot.end,
    duration: slot.duration,
    label: slot.label,
    days: [...slot.days],
  };
}

function getSlotsForDay(dayOfWeek: number, slots: TimeSlotInfo[]): TimeSlotInfo[] {
  return slots.filter(slot => slot.days.includes(dayOfWeek));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const category = searchParams.get("category");

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 }
      );
    }

    // Get day of week from date (0=Sunday, 1=Monday, ..., 6=Saturday)
    const dateObj = new Date(date + "T00:00:00");
    const dayOfWeek = dateObj.getDay();

    const fallbackSlots = DEFAULT_BOOKING_TIME_SLOTS.map(toTimeSlotInfo);

    const supabase = createAdminClient();
    
    // If no supabase client, return all default slots as available
    if (!supabase) {
      console.log("Supabase not configured, returning all slots as available");
      const slotsForDay = getSlotsForDay(dayOfWeek, fallbackSlots);
      return NextResponse.json({
        date,
        dayOfWeek,
        category,
        allSlots: slotsForDay,
        availableSlots: slotsForDay,
        blockedSlots: [],
        bufferMinutes: BUFFER_MINUTES,
      });
    }

    let configuredSlots = fallbackSlots;

    if (category) {
      const { data: timeSlots, error: slotError } = await supabase
        .from("booking_time_slots")
        .select("start_time, end_time, duration_minutes, label, days_of_week")
        .eq("category_id", category)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("start_time", { ascending: true });

      if (slotError) {
        console.error("Error fetching configured time slots:", slotError);
      } else if (timeSlots && timeSlots.length > 0) {
        configuredSlots = timeSlots.map(toTimeSlotInfo);
      }
    }

    // Get slots available for this day of the week
    const slotsForDay = getSlotsForDay(dayOfWeek, configuredSlots);

    // Fetch all confirmed bookings for the given date
    let bookedSlots: BookedSlot[] = [];
    
    try {
      const { data: bookings, error } = await supabase
        .from("service_bookings")
        .select("event_time, duration_minutes")
        .eq("event_date", date)
        .in("status", ["confirmed", "pending", "deposit_paid"]);

      if (error) {
        console.error("Error fetching bookings:", error);
        // On error, still return all slots as available rather than failing
        return NextResponse.json({
          date,
          dayOfWeek,
          category,
          allSlots: slotsForDay,
          availableSlots: slotsForDay,
          blockedSlots: [],
          bufferMinutes: BUFFER_MINUTES,
          warning: "Could not check existing bookings",
        });
      }

      bookedSlots = (bookings || []).map((b) => ({
        event_time: b.event_time || "",
        duration_minutes: b.duration_minutes || 120,
      }));
    } catch (dbError) {
      console.error("Database error:", dbError);
      // On error, still return all slots as available
      return NextResponse.json({
        date,
        dayOfWeek,
        category,
        allSlots: slotsForDay,
        availableSlots: slotsForDay,
        blockedSlots: [],
        bufferMinutes: BUFFER_MINUTES,
        warning: "Database connection error",
      });
    }

    // Calculate available and blocked time slots
    const availableSlots = slotsForDay.filter(
      (slot) => !isSlotBlockedByBooking(slot, bookedSlots)
    );

    const blockedSlots = slotsForDay.filter(
      (slot) => isSlotBlockedByBooking(slot, bookedSlots)
    );

    return NextResponse.json({
      date,
      dayOfWeek,
      category,
      allSlots: slotsForDay,
      availableSlots,
      blockedSlots,
      bufferMinutes: BUFFER_MINUTES,
    });
  } catch (error) {
    console.error("Availability check error:", error);
    return NextResponse.json(
      { error: "Failed to check availability" },
      { status: 500 }
    );
  }
}
