import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface SummerCampBatchPayload {
  id?: string;
  name: string;
  camp_dates: string[];
  time_slots?: Record<string, SummerCampTimeSlot[]>;
  sort_order: number;
  is_active: boolean;
}

interface SummerCampTimeSlot {
  start: string;
  end: string;
}

interface SummerCampItemPayload {
  id: string;
  name: string;
  description: string;
  price: number;
  price_unit: string;
  image_url: string | null;
  discount_percentage?: number | null;
  discount_start_date?: string | null;
  discount_end_date?: string | null;
  is_active: boolean;
  sort_order: number;
}

interface SummerCampBatchRow {
  id: string;
  name: string;
  camp_dates: string[] | null;
  time_slots?: Record<string, SummerCampTimeSlot[]> | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SummerCampItemRow extends SummerCampItemPayload {
  created_at: string;
  updated_at: string;
}

function normalizeDates(dates: unknown) {
  if (!Array.isArray(dates)) return [];
  return [...new Set(dates.filter((date): date is string => typeof date === "string" && DATE_PATTERN.test(date)))].sort();
}

function normalizeTimeSlots(slots: unknown, dates: string[]) {
  if (!slots || typeof slots !== "object" || Array.isArray(slots)) return {};

  const allowedDates = new Set(dates);
  return Object.fromEntries(
    Object.entries(slots as Record<string, unknown>)
      .filter(([date]) => allowedDates.has(date))
      .map(([date, dateSlots]) => {
        const normalizedSlots = Array.isArray(dateSlots)
          ? dateSlots
              .map((slot) => {
                if (!slot || typeof slot !== "object") return null;
                const { start, end } = slot as Record<string, unknown>;
                if (typeof start !== "string" || typeof end !== "string") return null;
                if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || start >= end) return null;
                return { start, end };
              })
              .filter((slot): slot is SummerCampTimeSlot => Boolean(slot))
          : [];
        return [date, normalizedSlots];
      })
      .filter(([, dateSlots]) => dateSlots.length > 0)
  );
}

function normalizeOptionalDate(date: unknown) {
  return typeof date === "string" && DATE_PATTERN.test(date) ? date : null;
}

function toApiBatch(row: SummerCampBatchRow) {
  return {
    id: row.id,
    name: row.name,
    camp_dates: (row.camp_dates || []).sort(),
    time_slots: row.time_slots || {},
    sort_order: row.sort_order,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toApiItem(row: SummerCampItemRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price) || 0,
    price_unit: row.price_unit,
    image_url: row.image_url,
    discount_percentage: Number(row.discount_percentage) || 0,
    discount_start_date: row.discount_start_date || null,
    discount_end_date: row.discount_end_date || null,
    is_active: row.is_active,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error("Failed to create Supabase client");

    const { data, error } = await supabase
      .from("summer_camp_batches")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;

    const { data: items, error: itemsError } = await supabase
      .from("summer_camp_items")
      .select("*")
      .order("sort_order", { ascending: true });

    if (itemsError) throw itemsError;

    return NextResponse.json({
      batches: (data || []).map(toApiBatch),
      items: (items || []).map(toApiItem),
    });
  } catch (error: unknown) {
    console.error("Error fetching summer camp batches:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch summer camp batches";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error("Failed to create Supabase client");

    const body = await request.json();
    const batches = body.batches as SummerCampBatchPayload[];
    const items = body.items as SummerCampItemPayload[] | undefined;

    if (!Array.isArray(batches)) {
      return NextResponse.json({ error: "Expected batches array" }, { status: 400 });
    }

    const rows = batches.map((batch, index) => {
      const campDates = normalizeDates(batch.camp_dates);
      return {
        ...(batch.id ? { id: batch.id } : {}),
        name: batch.name?.trim() || `Batch ${index + 1}`,
        camp_dates: campDates,
        time_slots: normalizeTimeSlots(batch.time_slots, campDates),
        sort_order: Number.isInteger(batch.sort_order) ? batch.sort_order : index * 10,
        is_active: Boolean(batch.is_active),
        updated_at: new Date().toISOString(),
      };
    });

    const invalidBatch = rows.find((batch) => batch.camp_dates.length !== 5);
    if (invalidBatch) {
      return NextResponse.json(
        { error: `${invalidBatch.name} must have exactly 5 unique dates.` },
        { status: 400 }
      );
    }

    const batchWithoutSlots = rows.find((batch) => batch.camp_dates.some((date) => !batch.time_slots[date]?.length));
    if (batchWithoutSlots) {
      return NextResponse.json(
        { error: `${batchWithoutSlots.name} needs at least one time slot for every date.` },
        { status: 400 }
      );
    }

    const existingIds = rows.map((batch) => batch.id).filter((id): id is string => Boolean(id));

    if (existingIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("summer_camp_batches")
        .delete()
        .not("id", "in", `(${existingIds.join(",")})`);

      if (deleteError) throw deleteError;
    } else {
      const { error: deleteError } = await supabase.from("summer_camp_batches").delete().not("id", "is", null);
      if (deleteError) throw deleteError;
    }

    if (rows.length > 0) {
      const existingRows = rows.filter((row) => row.id);
      const newRows = rows
        .filter((row) => !row.id)
        .map((row) => {
          const { id, ...newRow } = row;
          void id;
          return newRow;
        });

      if (existingRows.length > 0) {
        const { error: updateError } = await supabase
          .from("summer_camp_batches")
          .upsert(existingRows, { onConflict: "id" });

        if (updateError) throw updateError;
      }

      if (newRows.length > 0) {
        const { error: insertError } = await supabase
          .from("summer_camp_batches")
          .insert(newRows);

        if (insertError) throw insertError;
      }
    }

    if (Array.isArray(items)) {
      const itemRows = items.map((item, index) => ({
        id: item.id,
        name: item.name?.trim() || (index === 0 ? "Per Day" : "Per Week"),
        description: item.description?.trim() || "",
        price: Math.max(0, Number(item.price) || 0),
        price_unit: item.price_unit?.trim() || "per guest",
        image_url: item.image_url?.trim() || null,
        discount_percentage: Math.min(100, Math.max(0, Number(item.discount_percentage) || 0)),
        discount_start_date: normalizeOptionalDate(item.discount_start_date),
        discount_end_date: normalizeOptionalDate(item.discount_end_date),
        is_active: Boolean(item.is_active),
        sort_order: Number.isInteger(item.sort_order) ? item.sort_order : index * 10,
        updated_at: new Date().toISOString(),
      }));

      const invalidDiscountItem = itemRows.find((item) =>
        item.discount_percentage > 0 &&
        (!item.discount_start_date || !item.discount_end_date || item.discount_start_date > item.discount_end_date)
      );
      if (invalidDiscountItem) {
        return NextResponse.json(
          { error: `${invalidDiscountItem.name} discount needs a valid start date and end date.` },
          { status: 400 }
        );
      }

      const { error: itemError } = await supabase
        .from("summer_camp_items")
        .upsert(itemRows, { onConflict: "id" });

      if (itemError) throw itemError;
    }

    const { data, error } = await supabase
      .from("summer_camp_batches")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;

    const { data: savedItems, error: savedItemsError } = await supabase
      .from("summer_camp_items")
      .select("*")
      .order("sort_order", { ascending: true });

    if (savedItemsError) throw savedItemsError;

    return NextResponse.json({
      batches: (data || []).map(toApiBatch),
      items: (savedItems || []).map(toApiItem),
    });
  } catch (error: unknown) {
    console.error("Error saving summer camp batches:", error);
    const message = error instanceof Error ? error.message : "Failed to save summer camp batches";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
