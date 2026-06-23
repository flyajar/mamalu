import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDubaiDate } from "@/lib/payments/deposit-policy";

interface SummerCampBatchRow {
  id?: string;
  name?: string | null;
  camp_dates: string[] | null;
  time_slots?: Record<string, SummerCampTimeSlot[]> | null;
}

interface SummerCampTimeSlot {
  start: string;
  end: string;
}

function normalizeTimeSlots(slots: SummerCampTimeSlot[] | undefined) {
  return (slots || [])
    .filter((slot) => slot.start && slot.end && slot.start < slot.end)
    .map((slot) => ({
      start: slot.start,
      end: slot.end,
      duration: 0,
      label: `${slot.start} - ${slot.end}`,
    }));
}

interface SummerCampItemRow {
  id: string;
  name: string;
  description: string;
  price: number;
  price_unit: string;
  image_url: string | null;
  discount_percentage?: number | null;
  discount_start_date?: string | null;
  discount_end_date?: string | null;
  sort_order: number;
}

function normalizeBatchDates(batch: SummerCampBatchRow, today: string) {
  return [...new Set(batch.camp_dates || [])].sort().filter((date) => date > today);
}

function selectDisplayDates(batches: SummerCampBatchRow[], option: string, dayCount: number, today: string) {
  const normalized = batches
    .map((batch) => ({
      allDates: [...new Set(batch.camp_dates || [])].sort(),
      remainingDates: normalizeBatchDates(batch, today),
    }))
    .filter((batch) => batch.allDates.length > 0);

  if (option === "per-week") {
    const nextFullBatch = normalized.find((batch) => batch.allDates[0] > today);
    return nextFullBatch?.allDates || [];
  }

  return [...new Set(normalized.flatMap((batch) => batch.remainingDates))].sort();
}

function getAvailableWeekBatches(batches: SummerCampBatchRow[], today: string) {
  return batches
    .map((batch, index) => ({
      id: batch.id || `batch-${index + 1}`,
      name: batch.name || `Batch ${index + 1}`,
      dates: [...new Set(batch.camp_dates || [])].sort(),
      time_slots: batch.time_slots || {},
    }))
    .filter((batch) => batch.dates.length === 5 && batch.dates.every((date) => date > today));
}

function getDiscountedItem(item: SummerCampItemRow, today: string) {
  const originalPrice = Number(item.price) || 0;
  const discountPercentage = Math.min(100, Math.max(0, Number(item.discount_percentage) || 0));
  const discountStartDate = item.discount_start_date || null;
  const discountEndDate = item.discount_end_date || null;
  const hasActiveDiscount = discountPercentage > 0
    && Boolean(discountStartDate)
    && Boolean(discountEndDate)
    && discountStartDate! <= today
    && today <= discountEndDate!;
  const price = hasActiveDiscount
    ? Math.round(originalPrice * (1 - discountPercentage / 100) * 100) / 100
    : originalPrice;

  return {
    ...item,
    price,
    original_price: originalPrice,
    discount_percentage: discountPercentage,
    discount_start_date: discountStartDate,
    discount_end_date: discountEndDate,
    discount_active: hasActiveDiscount,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error("Failed to create Supabase client");
    const searchParams = request.nextUrl.searchParams;
    const option = searchParams.get("option") === "per-week" ? "per-week" : "per-day";
    const requestedDays = Number(searchParams.get("days") || 1);
    const dayCount = Math.min(5, Math.max(1, Number.isFinite(requestedDays) ? requestedDays : 1));
    const today = getDubaiDate();

    const batchQuery = await supabase
      .from("summer_camp_batches")
      .select("id, name, camp_dates, time_slots")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    let data: unknown[] | null = batchQuery.data;
    let error = batchQuery.error;

    if (error && error.message.includes("time_slots")) {
      const fallback = await supabase
        .from("summer_camp_batches")
        .select("id, name, camp_dates")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;

    const batches = (data || []) as SummerCampBatchRow[];
    const dates = selectDisplayDates(batches, option, dayCount, today);

    const { data: itemData, error: itemError } = await supabase
      .from("summer_camp_items")
      .select("id, name, description, price, price_unit, image_url, discount_percentage, discount_start_date, discount_end_date, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (itemError) throw itemError;

    return NextResponse.json({
      dates,
      batches: getAvailableWeekBatches(batches, today),
      timeSlotsByDate: Object.fromEntries(
        batches.flatMap((batch) =>
          normalizeBatchDates(batch, today).map((date) => [date, normalizeTimeSlots(batch.time_slots?.[date])])
        )
      ),
      items: ((itemData || []) as SummerCampItemRow[]).map((item) => getDiscountedItem(item, today)),
    });
  } catch (error: unknown) {
    console.error("Error fetching summer camp dates:", error);
    const message = error instanceof Error ? error.message : "Failed to load summer camp dates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
