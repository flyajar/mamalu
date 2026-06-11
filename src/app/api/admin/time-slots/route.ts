import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BOOKING_SLOT_CATEGORY_IDS } from "@/lib/booking-time-slots";

const CATEGORY_IDS = new Set<string>(BOOKING_SLOT_CATEGORY_IDS);
const MONTHLY_CATEGORY_IDS = new Set(["monthly_mini", "monthly_big"]);
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

interface DateRulePayload {
  category_id: string;
  available_dates: string[];
}

interface DateRuleRow {
  category_id: string;
  available_dates: string[] | null;
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

function normalizeDateRules(rules: DateRulePayload[] | undefined): DateRulePayload[] {
  if (!Array.isArray(rules)) return [];

  return rules
    .filter((rule) => MONTHLY_CATEGORY_IDS.has(rule.category_id))
    .map((rule) => ({
      category_id: rule.category_id,
      available_dates: [...new Set((rule.available_dates || []).filter((date) => DATE_PATTERN.test(date)))].sort(),
    }));
}

function toDateRuleMap(rows: DateRuleRow[] | null) {
  return Object.fromEntries(
    (rows || []).map((row) => [row.category_id, (row.available_dates || []).sort()])
  );
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

    const { data: dateRules, error: dateRulesError } = await supabase
      .from("booking_slot_date_rules")
      .select("category_id, available_dates")
      .in("category_id", ["monthly_mini", "monthly_big"]);

    if (dateRulesError) {
      console.warn("Booking slot date rules are not available yet:", dateRulesError.message);
    }

    return NextResponse.json({
      slots: (data || []).map(toApiSlot),
      dateRules: toDateRuleMap(dateRules || null),
    });
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
    const dateRules = normalizeDateRules(body.dateRules);

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
      id: slot.id || crypto.randomUUID(),
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

    if (dateRules.length > 0) {
      const { error: dateRuleError } = await supabase
        .from("booking_slot_date_rules")
        .upsert(
          dateRules.map((rule) => ({
            category_id: rule.category_id,
            available_dates: rule.available_dates,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "category_id" }
        );

      if (dateRuleError) throw dateRuleError;
    }

    const { data, error } = await supabase
      .from("booking_time_slots")
      .select("*")
      .order("category_id", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;

    const { data: savedDateRules, error: savedDateRulesError } = await supabase
      .from("booking_slot_date_rules")
      .select("category_id, available_dates")
      .in("category_id", ["monthly_mini", "monthly_big"]);

    if (savedDateRulesError) throw savedDateRulesError;

    return NextResponse.json({
      slots: (data || []).map(toApiSlot),
      dateRules: toDateRuleMap(savedDateRules || null),
    });
  } catch (error: unknown) {
    console.error("Error saving booking time slots:", error);
    const message = error instanceof Error ? error.message : "Failed to save time slots";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
