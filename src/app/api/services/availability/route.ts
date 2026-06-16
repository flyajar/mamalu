import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_BOOKING_TIME_SLOTS } from "@/lib/booking-time-slots";

// Buffer time after each booking for preparation/cleaning (in minutes)
const BUFFER_MINUTES = 60;
const MIN_BOOKING_NOTICE_MINUTES = 120;
const BUSINESS_TIME_ZONE = "Asia/Dubai";
const MONTHLY_CATEGORY_IDS = new Set(["monthly_mini", "monthly_big"]);
const BOOKED_SLOT_STATUSES = ["confirmed", "pending", "deposit_paid", "completed"];
const FULL_DAY_RENTAL_PACKAGE = "full day rental";

interface BookedSlot {
  event_time: string;
  duration_minutes?: number;
}

interface BookingScheduleItem {
  event_date?: string | null;
  event_time?: string | null;
}

interface BookingConflictInfo {
  guest_count?: number | null;
  service_name?: string | null;
  package_name?: string | null;
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

interface DateRuleRow {
  available_dates: string[] | null;
}

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function getBusinessDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const value = (type: string) => parts.find((part) => part.type === type)?.value || "00";

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minutes: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

function isSlotBookableByNotice(date: string, slot: TimeSlotInfo): boolean {
  const now = getBusinessDateParts();

  if (date < now.date) return false;
  if (date > now.date) return true;

  return parseTime(slot.start) - now.minutes >= MIN_BOOKING_NOTICE_MINUTES;
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
    const bookingDuration = booking.duration_minutes || slot.duration;
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

function blocksEntireTimeSlot(booking: BookingConflictInfo): boolean {
  const serviceName = (booking.service_name || "").toLowerCase();
  const isPrivateCategory = serviceName.includes("birthday")
    || serviceName.includes("corporate / private")
    || serviceName.includes("corporate/private");

  return isPrivateCategory || Number(booking.guest_count || 0) >= 6;
}

function isFullDayRentalBooking(booking: BookingConflictInfo): boolean {
  return (booking.service_name || "").toLowerCase().includes("rental")
    && String(booking.package_name || "").trim().toLowerCase() === FULL_DAY_RENTAL_PACKAGE;
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
    const excludeBookingId = searchParams.get("excludeBookingId");

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
      const slotsForDay = getSlotsForDay(dayOfWeek, fallbackSlots).filter((slot) =>
        isSlotBookableByNotice(date, slot)
      );
      return NextResponse.json({
        date,
        dayOfWeek,
        category,
        allSlots: slotsForDay,
        availableSlots: slotsForDay,
        blockedSlots: [],
        bufferMinutes: BUFFER_MINUTES,
        minBookingNoticeMinutes: MIN_BOOKING_NOTICE_MINUTES,
      });
    }

    let configuredSlots = fallbackSlots;

    if (category) {
      if (MONTHLY_CATEGORY_IDS.has(category)) {
        const { data: dateRule, error: dateRuleError } = await supabase
          .from("booking_slot_date_rules")
          .select("available_dates")
          .eq("category_id", category)
          .maybeSingle<DateRuleRow>();

        if (dateRuleError) {
          console.warn("Monthly date rules are not available yet:", dateRuleError.message);
        } else {
          const availableDates = dateRule?.available_dates || [];
          if (availableDates.length === 0 || !availableDates.includes(date)) {
            return NextResponse.json({
              date,
              dayOfWeek,
              category,
              allSlots: [],
              availableSlots: [],
              blockedSlots: [],
              bufferMinutes: BUFFER_MINUTES,
              minBookingNoticeMinutes: MIN_BOOKING_NOTICE_MINUTES,
              dateRestricted: true,
            });
          }
        }
      }

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
    const slotsForDay = getSlotsForDay(dayOfWeek, configuredSlots).filter((slot) =>
      isSlotBookableByNotice(date, slot)
    );

    // Fetch all confirmed bookings for the given date
    let bookedSlots: BookedSlot[] = [];
    
    try {
      const { data: bookings, error } = await supabase
        .from("service_bookings")
        .select("id, event_time, items, guest_count, service_name, package_name")
        .eq("event_date", date)
        .in("status", BOOKED_SLOT_STATUSES);

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
          minBookingNoticeMinutes: MIN_BOOKING_NOTICE_MINUTES,
          warning: "Could not check existing bookings",
        });
      }

      if ((bookings || []).some(isFullDayRentalBooking)) {
        return NextResponse.json({
          date,
          dayOfWeek,
          category,
          allSlots: slotsForDay,
          availableSlots: [],
          blockedSlots: slotsForDay,
          bufferMinutes: BUFFER_MINUTES,
          minBookingNoticeMinutes: MIN_BOOKING_NOTICE_MINUTES,
        });
      }

      bookedSlots = (bookings || []).flatMap((booking) => {
        if (excludeBookingId && booking.id === excludeBookingId) return [];
        if (!blocksEntireTimeSlot(booking)) return [];

        const slots: BookedSlot[] = booking.event_time ? [{ event_time: booking.event_time }] : [];
        const items = Array.isArray(booking.items) ? booking.items as BookingScheduleItem[] : [];

        for (const item of items) {
          if (item.event_date && item.event_date !== date) continue;
          if (item.event_time) {
            slots.push({ event_time: item.event_time });
          }
        }

        return slots;
      });
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
        minBookingNoticeMinutes: MIN_BOOKING_NOTICE_MINUTES,
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
      minBookingNoticeMinutes: MIN_BOOKING_NOTICE_MINUTES,
    });
  } catch (error) {
    console.error("Availability check error:", error);
    return NextResponse.json(
      { error: "Failed to check availability" },
      { status: 500 }
    );
  }
}
