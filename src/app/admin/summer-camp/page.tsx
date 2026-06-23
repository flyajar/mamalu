"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SummerCampBatch {
  id?: string;
  name: string;
  camp_dates: string[];
  time_slots: Record<string, SummerCampTimeSlot[]>;
  sort_order: number;
  is_active: boolean;
}

interface SummerCampTimeSlot {
  start: string;
  end: string;
}

interface SummerCampItem {
  id: string;
  name: string;
  description: string;
  price: number;
  price_unit: string;
  image_url: string | null;
  discount_percentage: number;
  discount_start_date: string | null;
  discount_end_date: string | null;
  is_active: boolean;
  sort_order: number;
}

const DATES_PER_BATCH = 5;

const DEFAULT_ITEMS: SummerCampItem[] = [
  {
    id: "summer-camp-per-day",
    name: "Per Day",
    description: "Summer camp class by day",
    price: 250,
    price_unit: "per guest per day",
    image_url: "/images/summer camp .png",
    discount_percentage: 0,
    discount_start_date: null,
    discount_end_date: null,
    is_active: true,
    sort_order: 10,
  },
  {
    id: "summer-camp-per-week",
    name: "Per Week",
    description: "Summer camp class by week",
    price: 1000,
    price_unit: "per guest per week",
    image_url: "/images/week 1 summer camp.png",
    discount_percentage: 0,
    discount_start_date: null,
    discount_end_date: null,
    is_active: true,
    sort_order: 20,
  },
];

function createBatch(index: number): SummerCampBatch {
  return {
    name: `Batch ${index + 1}`,
    camp_dates: Array(DATES_PER_BATCH).fill(""),
    time_slots: {},
    sort_order: index * 10,
    is_active: true,
  };
}

function createTimeSlot(): SummerCampTimeSlot {
  return { start: "10:00", end: "12:30" };
}

function formatDate(date: string) {
  if (!date) return "Not set";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeSlot(slot: SummerCampTimeSlot) {
  return `${slot.start || "--:--"} - ${slot.end || "--:--"}`;
}

export default function AdminSummerCampPage() {
  const [batches, setBatches] = useState<SummerCampBatch[]>([]);
  const [items, setItems] = useState<SummerCampItem[]>(DEFAULT_ITEMS);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchBatches();
  }, []);

  async function fetchBatches() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/summer-camp");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load summer camp batches");

      setBatches(
        (data.batches || []).map((batch: SummerCampBatch, index: number) => ({
          ...batch,
          camp_dates: [...batch.camp_dates, ...Array(DATES_PER_BATCH).fill("")].slice(0, DATES_PER_BATCH),
          time_slots: batch.time_slots || {},
          sort_order: batch.sort_order ?? index * 10,
        }))
      );
      setItems((data.items && data.items.length > 0 ? data.items : DEFAULT_ITEMS).map((item: SummerCampItem, index: number) => ({
        ...item,
        discount_percentage: Number(item.discount_percentage) || 0,
        discount_start_date: item.discount_start_date || null,
        discount_end_date: item.discount_end_date || null,
        sort_order: item.sort_order ?? index * 10,
      })));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load summer camp batches");
    } finally {
      setLoading(false);
    }
  }

  function addBatch() {
    setBatches((current) => [...current, createBatch(current.length)]);
  }

  function removeBatch(index: number) {
    setBatches((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function updateBatch(index: number, updates: Partial<SummerCampBatch>) {
    setBatches((current) =>
      current.map((batch, currentIndex) => (currentIndex === index ? { ...batch, ...updates } : batch))
    );
  }

  function updateBatchDate(batchIndex: number, dateIndex: number, date: string) {
    setBatches((current) =>
      current.map((batch, currentIndex) => {
        if (currentIndex !== batchIndex) return batch;
        const campDates = [...batch.camp_dates];
        const timeSlots = { ...(batch.time_slots || {}) };
        const previousDate = campDates[dateIndex];
        campDates[dateIndex] = date;
        if (previousDate && previousDate !== date && timeSlots[previousDate]) {
          timeSlots[date] = timeSlots[date] || timeSlots[previousDate];
          delete timeSlots[previousDate];
        }
        if (date && !timeSlots[date]) timeSlots[date] = [createTimeSlot()];
        return { ...batch, camp_dates: campDates, time_slots: timeSlots };
      })
    );
  }

  function updateBatchTimeSlot(
    batchIndex: number,
    date: string,
    slotIndex: number,
    updates: Partial<SummerCampTimeSlot>
  ) {
    if (!date) return;
    setBatches((current) =>
      current.map((batch, currentIndex) => {
        if (currentIndex !== batchIndex) return batch;
        const slots = [...(batch.time_slots?.[date] || [createTimeSlot()])];
        slots[slotIndex] = { ...slots[slotIndex], ...updates };
        return { ...batch, time_slots: { ...(batch.time_slots || {}), [date]: slots } };
      })
    );
  }

  function addBatchTimeSlot(batchIndex: number, date: string) {
    if (!date) return;
    setBatches((current) =>
      current.map((batch, currentIndex) => {
        if (currentIndex !== batchIndex) return batch;
        const slots = [...(batch.time_slots?.[date] || []), createTimeSlot()];
        return { ...batch, time_slots: { ...(batch.time_slots || {}), [date]: slots } };
      })
    );
  }

  function removeBatchTimeSlot(batchIndex: number, date: string, slotIndex: number) {
    if (!date) return;
    setBatches((current) =>
      current.map((batch, currentIndex) => {
        if (currentIndex !== batchIndex) return batch;
        const slots = (batch.time_slots?.[date] || []).filter((_, index) => index !== slotIndex);
        return { ...batch, time_slots: { ...(batch.time_slots || {}), [date]: slots } };
      })
    );
  }

  function updateItem(index: number, updates: Partial<SummerCampItem>) {
    setItems((current) =>
      current.map((item, currentIndex) => (currentIndex === index ? { ...item, ...updates } : item))
    );
  }

  async function uploadItemImage(index: number, file: File | undefined) {
    if (!file) return;

    const item = items[index];
    setUploadingItemId(item.id);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "images");
      formData.append("userId", "summer-camp");

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image upload failed");

      updateItem(index, { image_url: data.url });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setUploadingItemId(null);
    }
  }

  async function saveBatches() {
    setSaving(true);
    setMessage(null);
    try {
      const normalizedBatches = batches.map((batch, index) => ({
        ...batch,
        name: batch.name.trim() || `Batch ${index + 1}`,
        camp_dates: [...new Set(batch.camp_dates.filter(Boolean))].sort(),
        time_slots: Object.fromEntries(
          [...new Set(batch.camp_dates.filter(Boolean))].sort().map((date) => [
            date,
            (batch.time_slots?.[date] || []).filter((slot) => slot.start && slot.end && slot.start < slot.end),
          ])
        ),
        sort_order: index * 10,
      }));

      const invalidBatch = normalizedBatches.find((batch) => batch.camp_dates.length !== DATES_PER_BATCH);
      if (invalidBatch) {
        throw new Error(`${invalidBatch.name} must have exactly ${DATES_PER_BATCH} unique dates.`);
      }

      const invalidSlotBatch = normalizedBatches.find((batch) =>
        batch.camp_dates.some((date) => !batch.time_slots[date]?.length)
      );
      if (invalidSlotBatch) {
        throw new Error(`${invalidSlotBatch.name} needs at least one valid time slot for every date.`);
      }

      const invalidDiscountItem = items.find((item) => {
        const discountPercentage = Number(item.discount_percentage) || 0;
        if (discountPercentage <= 0) return false;
        return !item.discount_start_date
          || !item.discount_end_date
          || item.discount_start_date > item.discount_end_date;
      });
      if (invalidDiscountItem) {
        throw new Error(`${invalidDiscountItem.name} discount needs a valid start date and end date.`);
      }

      const res = await fetch("/api/admin/summer-camp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batches: normalizedBatches,
          items: items.map((item, index) => ({
            ...item,
            name: item.name.trim(),
            description: item.description.trim(),
            price: Number(item.price) || 0,
            price_unit: item.price_unit.trim(),
            image_url: item.image_url?.trim() || null,
            discount_percentage: Math.min(100, Math.max(0, Number(item.discount_percentage) || 0)),
            discount_start_date: item.discount_start_date || null,
            discount_end_date: item.discount_end_date || null,
            sort_order: index * 10,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save summer camp batches");

      setBatches(
        (data.batches || []).map((batch: SummerCampBatch) => ({
          ...batch,
          camp_dates: [...batch.camp_dates, ...Array(DATES_PER_BATCH).fill("")].slice(0, DATES_PER_BATCH),
          time_slots: batch.time_slots || {},
        }))
      );
      if (data.items) setItems(data.items);
      setMessage("Summer camp batches saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save summer camp batches");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-3">
            <CalendarDays className="h-8 w-8" />
            Summer Camp
          </h1>
          <p className="text-stone-500 mt-1">Assign five class dates for each summer camp batch.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchBatches} disabled={loading || saving}>
            Refresh
          </Button>
          <Button onClick={saveBatches} disabled={loading || saving} className="bg-[#FF7A5C] hover:bg-[#ff6a48]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700">
          {message}
        </div>
      )}

      <div className="rounded-lg border border-stone-200 bg-white">
        <div className="border-b border-stone-200 p-4">
          <h2 className="font-semibold text-stone-900">Summer Camp Items</h2>
          <p className="text-sm text-stone-500">Manage the two public Summer Camp options shown on Mini Chef.</p>
        </div>
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          {items.map((item, index) => (
            <div key={item.id} className="rounded-lg border border-stone-200 p-4">
              <div className="grid gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase text-stone-500">Name</label>
                  <input
                    value={item.name}
                    onChange={(event) => updateItem(index, { name: event.target.value })}
                    className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-stone-500">Description</label>
                  <input
                    value={item.description}
                    onChange={(event) => updateItem(index, { description: event.target.value })}
                    className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase text-stone-500">Price</label>
                    <input
                      type="number"
                      min="0"
                      value={item.price}
                      onChange={(event) => updateItem(index, { price: Number(event.target.value) || 0 })}
                      className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-stone-500">Price Unit</label>
                    <input
                      value={item.price_unit}
                      onChange={(event) => updateItem(index, { price_unit: event.target.value })}
                      className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-stone-500">Image URL</label>
                  <input
                    value={item.image_url || ""}
                    onChange={(event) => updateItem(index, { image_url: event.target.value })}
                    className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold uppercase text-stone-500">Discount %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.discount_percentage}
                      onChange={(event) => updateItem(index, { discount_percentage: Number(event.target.value) || 0 })}
                      className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-stone-500">Discount Start</label>
                    <input
                      type="date"
                      value={item.discount_start_date || ""}
                      onChange={(event) => updateItem(index, { discount_start_date: event.target.value || null })}
                      className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-stone-500">Discount End</label>
                    <input
                      type="date"
                      value={item.discount_end_date || ""}
                      onChange={(event) => updateItem(index, { discount_end_date: event.target.value || null })}
                      className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="rounded-lg border border-dashed border-stone-300 p-3">
                  {item.image_url ? (
                    <div className="mb-3 overflow-hidden rounded-md border border-stone-200 bg-stone-50">
                      <img src={item.image_url} alt={item.name} className="h-36 w-full object-cover" />
                    </div>
                  ) : (
                    <div className="mb-3 flex h-36 items-center justify-center rounded-md bg-stone-50 text-sm text-stone-500">
                      No image selected
                    </div>
                  )}
                  <label className="inline-flex cursor-pointer items-center rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
                    {uploadingItemId === item.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {uploadingItemId === item.id ? "Uploading..." : "Upload Image"}
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={uploadingItemId === item.id}
                      onChange={(event) => {
                        uploadItemImage(index, event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={item.is_active}
                    onChange={(event) => updateItem(index, { is_active: event.target.checked })}
                    className="h-4 w-4 rounded border-stone-300"
                  />
                  Active
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-200 p-4">
          <div>
            <h2 className="font-semibold text-stone-900">Camp Batches</h2>
            <p className="text-sm text-stone-500">Create batches with five dates and configurable time slots for each date.</p>
          </div>
          <Button type="button" variant="outline" onClick={addBatch} disabled={loading || saving}>
            <Plus className="h-4 w-4 mr-2" />
            Add Batch
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 p-8 text-stone-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading summer camp batches...
          </div>
        ) : batches.length === 0 ? (
          <div className="p-8 text-center text-stone-500">
            No summer camp batches yet. Add a batch to select its five class dates.
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {batches.map((batch, batchIndex) => {
              const filledDates = batch.camp_dates.filter(Boolean);
              const duplicateDates = filledDates.filter((date, index) => filledDates.indexOf(date) !== index);

              return (
                <div key={batch.id || batchIndex} className="p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex-1 space-y-4">
                      <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
                        <div>
                          <label className="text-xs font-semibold uppercase text-stone-500">Batch Name</label>
                          <input
                            value={batch.name}
                            onChange={(event) => updateBatch(batchIndex, { name: event.target.value })}
                            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase text-stone-500">Selected Dates</label>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {batch.camp_dates.map((date, dateIndex) => (
                              <span
                                key={`${dateIndex}-${date}`}
                                className="rounded-full border border-[#FF7A5C]/30 bg-orange-50 px-3 py-1.5 text-sm text-stone-800"
                              >
                                Day {dateIndex + 1}: {formatDate(date)}
                                {date && batch.time_slots?.[date]?.length ? ` (${batch.time_slots[date].map(formatTimeSlot).join(", ")})` : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-5">
                        {batch.camp_dates.map((date, dateIndex) => (
                          <div key={dateIndex} className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-stone-500">
                              Date {dateIndex + 1}
                            </label>
                            <input
                              type="date"
                              value={date}
                              onChange={(event) => updateBatchDate(batchIndex, dateIndex, event.target.value)}
                              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                            />
                            {date && (
                              <div className="space-y-2 rounded-md border border-stone-200 bg-stone-50 p-2">
                                {(batch.time_slots?.[date] || []).map((slot, slotIndex) => (
                                  <div key={slotIndex} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                                    <input
                                      type="time"
                                      value={slot.start}
                                      onChange={(event) => updateBatchTimeSlot(batchIndex, date, slotIndex, { start: event.target.value })}
                                      className="w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm"
                                      aria-label={`Day ${dateIndex + 1} slot ${slotIndex + 1} start`}
                                    />
                                    <input
                                      type="time"
                                      value={slot.end}
                                      onChange={(event) => updateBatchTimeSlot(batchIndex, date, slotIndex, { end: event.target.value })}
                                      className="w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm"
                                      aria-label={`Day ${dateIndex + 1} slot ${slotIndex + 1} end`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeBatchTimeSlot(batchIndex, date, slotIndex)}
                                      className="rounded-md p-2 text-stone-400 hover:bg-red-50 hover:text-red-600"
                                      aria-label={`Remove day ${dateIndex + 1} time slot ${slotIndex + 1}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addBatchTimeSlot(batchIndex, date)}
                                  className="w-full"
                                >
                                  <Plus className="mr-2 h-3.5 w-3.5" />
                                  Add Time Slot
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                          <input
                            type="checkbox"
                            checked={batch.is_active}
                            onChange={(event) => updateBatch(batchIndex, { is_active: event.target.checked })}
                            className="h-4 w-4 rounded border-stone-300"
                          />
                          Active
                        </label>
                        <span className="text-sm text-stone-500">
                          {filledDates.length}/{DATES_PER_BATCH} dates selected
                        </span>
                        {duplicateDates.length > 0 && (
                          <span className="text-sm text-red-600">Duplicate dates must be changed before saving.</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeBatch(batchIndex)}
                      className="inline-flex rounded-md p-2 text-stone-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove ${batch.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
