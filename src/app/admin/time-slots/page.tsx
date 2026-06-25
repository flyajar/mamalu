"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BOOKING_SLOT_CATEGORIES,
  type BookingSlotCategoryId,
  DAY_OPTIONS,
  DEFAULT_BOOKING_TIME_SLOTS,
} from "@/lib/booking-time-slots";

interface TimeSlot {
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

interface HiddenTimeSlot {
  id?: string;
  date: string;
  start: string;
  end: string;
}

type DateRules = Partial<Record<BookingSlotCategoryId, string[]>>;

const MONTHLY_SLOT_CATEGORY_IDS: BookingSlotCategoryId[] = ["monthly_mini", "monthly_big"];

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTimeLabel(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}

function buildLabel(start: string, end: string) {
  return `${formatTimeLabel(start)} - ${formatTimeLabel(end)}`;
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function calculateDuration(start: string, end: string) {
  return Math.max(toMinutes(end) - toMinutes(start), 0);
}

function normalizeSlot(slot: TimeSlot, index: number): TimeSlot {
  return {
    ...slot,
    duration: calculateDuration(slot.start, slot.end),
    days: [...new Set(slot.days)].sort((a, b) => a - b),
    sort_order: index * 10,
  };
}

export default function AdminTimeSlotsPage() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [dateRules, setDateRules] = useState<DateRules>({});
  const [hiddenTimeSlots, setHiddenTimeSlots] = useState<HiddenTimeSlot[]>([]);
  const [dateInput, setDateInput] = useState("");
  const [activeCategory, setActiveCategory] = useState<BookingSlotCategoryId>(BOOKING_SLOT_CATEGORIES[0].id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const activeCategoryMeta = BOOKING_SLOT_CATEGORIES.find((category) => category.id === activeCategory);
  const isMonthlyCategory = MONTHLY_SLOT_CATEGORY_IDS.includes(activeCategory);
  const datesForCategory = dateRules[activeCategory] || [];

  const slotsForCategory = useMemo(
    () =>
      slots
        .filter((slot) => slot.category_id === activeCategory)
        .sort((a, b) => a.sort_order - b.sort_order || a.start.localeCompare(b.start)),
    [slots, activeCategory]
  );

  const categoriesByGroup = useMemo(
    () =>
      BOOKING_SLOT_CATEGORIES.reduce<Record<string, typeof BOOKING_SLOT_CATEGORIES[number][]>>((groups, category) => {
        groups[category.group] = groups[category.group] || [];
        groups[category.group].push(category);
        return groups;
      }, {}),
    []
  );

  useEffect(() => {
    fetchSlots();
  }, []);

  async function fetchSlots() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/time-slots");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load time slots");
      setSlots(data.slots || []);
      setDateRules(data.dateRules || {});
      setHiddenTimeSlots(data.hiddenTimeSlots || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load time slots");
    } finally {
      setLoading(false);
    }
  }

  function addAvailableDate() {
    if (!dateInput || !isMonthlyCategory) return;

    setDateRules((current) => {
      const dates = current[activeCategory] || [];
      return {
        ...current,
        [activeCategory]: [...new Set([...dates, dateInput])].sort(),
      };
    });
    setDateInput("");
  }

  function removeAvailableDate(date: string) {
    setDateRules((current) => ({
      ...current,
      [activeCategory]: (current[activeCategory] || []).filter((currentDate) => currentDate !== date),
    }));
  }

  function updateSlot(index: number, updates: Partial<TimeSlot>) {
    setSlots((current) => {
      const categorySlots = current
        .filter((slot) => slot.category_id === activeCategory)
        .sort((a, b) => a.sort_order - b.sort_order || a.start.localeCompare(b.start));
      const slotToUpdate = categorySlots[index];
      if (!slotToUpdate) return current;

      const nextSlot = { ...slotToUpdate, ...updates };
      if (updates.start || updates.end) {
        nextSlot.duration = calculateDuration(nextSlot.start, nextSlot.end);
        nextSlot.label = buildLabel(nextSlot.start, nextSlot.end);
      }

      return current.map((slot) => (slot === slotToUpdate ? nextSlot : slot));
    });
  }

  function toggleDay(index: number, day: number) {
    const currentDays = slotsForCategory[index]?.days || [];
    const days = currentDays.includes(day)
      ? currentDays.filter((currentDay) => currentDay !== day)
      : [...currentDays, day];
    updateSlot(index, { days });
  }

  function addSlot() {
    const existingStarts = new Set(slotsForCategory.map((slot) => slot.start));
    const defaultTemplate = DEFAULT_BOOKING_TIME_SLOTS.find((slot) => !existingStarts.has(slot.start));
    const fallbackStart = ["09:00", "10:00", "12:00", "15:30", "17:30", "20:30", "22:00"]
      .find((start) => !existingStarts.has(start)) || "09:00";
    const nextStart = defaultTemplate?.start || fallbackStart;
    const nextEnd = defaultTemplate?.end || minutesToTime(Math.min(toMinutes(nextStart) + 90, 23 * 60 + 59));
    const nextDuration = calculateDuration(nextStart, nextEnd);

    setSlots((current) => [
      ...current,
      {
        category_id: activeCategory,
        label: defaultTemplate?.label || buildLabel(nextStart, nextEnd),
        start: nextStart,
        end: nextEnd,
        duration: nextDuration,
        days: defaultTemplate ? [...defaultTemplate.days] : [0, 1, 2, 3, 4, 5, 6],
        is_active: true,
        sort_order: slotsForCategory.length * 10,
      },
    ]);
  }

  function removeSlot(index: number) {
    const slotToRemove = slotsForCategory[index];
    if (!slotToRemove) return;
    setSlots((current) => current.filter((slot) => slot !== slotToRemove));
  }

  async function saveSlots() {
    setSaving(true);
    setMessage(null);
    try {
      const normalizedSlots = BOOKING_SLOT_CATEGORIES.flatMap((category) =>
        slots
          .filter((slot) => slot.category_id === category.id)
          .sort((a, b) => a.sort_order - b.sort_order || a.start.localeCompare(b.start))
          .map(normalizeSlot)
      );

      const invalid = normalizedSlots.find(
        (slot) => slot.duration <= 0 || slot.days.length === 0 || !slot.label.trim()
      );
      if (invalid) {
        throw new Error("Each slot needs a label, a valid time range, and at least one day selected.");
      }

      const res = await fetch("/api/admin/time-slots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slots: normalizedSlots,
          dateRules: MONTHLY_SLOT_CATEGORY_IDS.map((categoryId) => ({
            category_id: categoryId,
            available_dates: dateRules[categoryId] || [],
          })),
          hiddenTimeSlots,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save time slots");
      setSlots(data.slots || []);
      setDateRules(data.dateRules || {});
      setHiddenTimeSlots(data.hiddenTimeSlots || []);
      setMessage("Time slots saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save time slots");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-3">
            <Clock className="h-8 w-8" />
            Time Slots
          </h1>
          <p className="text-stone-500 mt-1">Configure booking time slots by Mini Chef and Big Chef category</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchSlots} disabled={loading || saving}>
            Refresh
          </Button>
          <Button onClick={saveSlots} disabled={loading || saving} className="bg-[#FF7A5C] hover:bg-[#ff6a48]">
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

      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        <div className="rounded-lg border border-stone-200 bg-white p-4 h-fit">
          {Object.entries(categoriesByGroup).map(([group, categories]) => (
            <div key={group} className="mb-5 last:mb-0">
              <p className="text-xs font-semibold uppercase text-stone-500 mb-2">{group}</p>
              <div className="space-y-2">
                {categories.map((category) => {
                  const count = slots.filter((slot) => slot.category_id === category.id).length;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setActiveCategory(category.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                        activeCategory === category.id
                          ? "border-[#FF7A5C] bg-orange-50 text-stone-900"
                          : "border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      <span className="block text-sm font-medium">{category.name}</span>
                      <span className="text-xs text-stone-500">{count} slots</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-stone-200 bg-white">
          <div className="flex items-center justify-between border-b border-stone-200 p-4">
            <div>
              <h2 className="font-semibold text-stone-900">{activeCategoryMeta?.name}</h2>
              <p className="text-sm text-stone-500">These slots appear on the public booking form for this category.</p>
            </div>
            <Button onClick={addSlot} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Slot
            </Button>
          </div>

          {isMonthlyCategory && (
            <div className="border-b border-stone-200 bg-orange-50/60 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 font-semibold text-stone-900">
                    <CalendarDays className="h-4 w-4 text-[#FF7A5C]" />
                    Available Dates
                  </div>
                  <p className="mt-1 text-sm text-stone-600">
                    Monthly Specials only show time slots on the dates selected here.
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateInput}
                    onChange={(event) => setDateInput(event.target.value)}
                    className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                  />
                  <Button type="button" variant="outline" onClick={addAvailableDate} disabled={!dateInput}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Date
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {datesForCategory.length > 0 ? (
                  datesForCategory.map((date) => (
                    <span
                      key={date}
                      className="inline-flex items-center gap-2 rounded-full border border-[#FF7A5C]/30 bg-white px-3 py-1.5 text-sm text-stone-800"
                    >
                      {new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      <button
                        type="button"
                        onClick={() => removeAvailableDate(date)}
                        className="rounded-full p-0.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remove ${date}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-amber-700">
                    No available dates set. Public booking pages will show no monthly special slots for this category.
                  </p>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 p-8 text-stone-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading time slots...
            </div>
          ) : slotsForCategory.length === 0 ? (
            <div className="p-8 text-center text-stone-500">
              No slots configured for this category.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50">
                  <tr className="text-left text-xs font-semibold uppercase text-stone-500">
                    <th className="px-4 py-3">Label</th>
                    <th className="px-4 py-3">Start</th>
                    <th className="px-4 py-3">End</th>
                    <th className="px-4 py-3">Days</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {slotsForCategory.map((slot, index) => (
                    <tr key={slot.id || `${slot.category_id}-${index}`}>
                      <td className="px-4 py-3 min-w-56">
                        <input
                          value={slot.label}
                          onChange={(event) => updateSlot(index, { label: event.target.value })}
                          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                        />
                        <p className="mt-1 text-xs text-stone-400">{slot.duration} minutes</p>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(event) => updateSlot(index, { start: event.target.value })}
                          className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(event) => updateSlot(index, { end: event.target.value })}
                          className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 min-w-72">
                        <div className="flex flex-wrap gap-1.5">
                          {DAY_OPTIONS.map((day) => {
                            const selected = slot.days.includes(day.id);
                            return (
                              <button
                                key={day.id}
                                type="button"
                                onClick={() => toggleDay(index, day.id)}
                                className={`rounded-full border px-2.5 py-1 text-xs ${
                                  selected
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                    : "border-stone-200 text-stone-500"
                                }`}
                              >
                                {day.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                          <input
                            type="checkbox"
                            checked={slot.is_active}
                            onChange={(event) => updateSlot(index, { is_active: event.target.checked })}
                            className="h-4 w-4 rounded border-stone-300"
                          />
                          Active
                        </label>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeSlot(index)}
                          className="inline-flex rounded-md p-2 text-stone-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="Remove slot"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
