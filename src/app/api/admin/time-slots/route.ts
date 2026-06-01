import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BOOKING_SLOT_CATEGORY_IDS } from "@/lib/booking-time-slots";

const CATEGORY_IDS = new Set<string>(BOOKING_SLOT_CATEGORY_IDS);
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

interface TimeSlotPayload {
  id?: string;
  category_id: string;
  label: string;
  start: string;
  end: string;
  duration: number;
  days: number[];
  is_active: boolean;
  sort_order: number;
}

interface TimeSlotRow {
  id: string;
  category_id: string;
  label: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  days_of_week: number[] | null;
  is_active: boolean;
  sort_order: number;
}

function isValidSlot(slot: TimeSlotPayload) {
  return (
    CATEGORY_IDS.has(slot.category_id) &&
    TIME_PATTERN.test(slot.start) &&
    TIME_PATTERN.test(slot.end) &&
    Number.isInteger(slot.duration) &&
    slot.duration > 0 &&
    Array.isArray(slot.days) &&
    slot.days.length > 0 &&
    slot.days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  );
}

function toApiSlot(row: TimeSlotRow) {
  return {
    id: row.id,
    category_id: row.category_id,
    label: row.label,
    start: String(row.start_time).slice(0, 5),
    end: String(row.end_time).slice(0, 5),
    duration: row.duration_minutes,
    days: row.days_of_week || [],
    is_active: row.is_active,
    sort_order: row.sort_order,
  };
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error("Failed to create Supabase client");

    const { data, error } = await supabase
      .from("booking_time_slots")
      .select("*")
      .order("category_id", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ slots: (data || []).map(toApiSlot) });
  } catch (error: unknown) {
    console.error("Error fetching booking time slots:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch time slots";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error("Failed to create Supabase client");

    const body = await request.json();
    const slots = body.slots as TimeSlotPayload[];

    if (!Array.isArray(slots)) {
      return NextResponse.json({ error: "Expected slots array" }, { status: 400 });
    }

    const invalidSlot = slots.find((slot) => !isValidSlot(slot));
    if (invalidSlot) {
      return NextResponse.json(
        { error: `Invalid slot configuration for ${invalidSlot.category_id || "unknown category"}` },
        { status: 400 }
      );
    }

    const existingIds = slots
      .map((slot) => slot.id)
      .filter((id): id is string => Boolean(id));

    const rows = slots.map((slot, index) => ({
      ...(slot.id ? { id: slot.id } : {}),
      category_id: slot.category_id,
      label: slot.label.trim() || `${slot.start} - ${slot.end}`,
      start_time: slot.start,
      end_time: slot.end,
      duration_minutes: slot.duration,
      days_of_week: [...new Set(slot.days)].sort((a, b) => a - b),
      is_active: slot.is_active,
      sort_order: Number.isInteger(slot.sort_order) ? slot.sort_order : index,
      updated_at: new Date().toISOString(),
    }));

    if (existingIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("booking_time_slots")
        .delete()
        .in("category_id", BOOKING_SLOT_CATEGORY_IDS)
        .not("id", "in", `(${existingIds.join(",")})`);

      if (deleteError) throw deleteError;
    } else {
      const { error: deleteError } = await supabase
        .from("booking_time_slots")
        .delete()
        .in("category_id", BOOKING_SLOT_CATEGORY_IDS);

      if (deleteError) throw deleteError;
    }

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from("booking_time_slots")
        .upsert(rows, { onConflict: "id" });

      if (upsertError) throw upsertError;
    }

    const { data, error } = await supabase
      .from("booking_time_slots")
      .select("*")
      .order("category_id", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ slots: (data || []).map(toApiSlot) });
  } catch (error: unknown) {
    console.error("Error saving booking time slots:", error);
    const message = error instanceof Error ? error.message : "Failed to save time slots";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
