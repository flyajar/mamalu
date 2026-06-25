"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Loader2, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HiddenTimeSlot {
  id?: string;
  date: string;
  start: string;
  end: string;
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function calculateDuration(start: string, end: string) {
  return Math.max(toMinutes(end) - toMinutes(start), 0);
}

function formatTimeLabel(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}

export function HiddenTimeSlotsManager() {
  const [slots, setSlots] = useState([]);
  const [dateRules, setDateRules] = useState({});
  const [hiddenTimeSlots, setHiddenTimeSlots] = useState<HiddenTimeSlot[]>([]);
  const [hiddenDate, setHiddenDate] = useState("");
  const [hiddenStart, setHiddenStart] = useState("16:00");
  const [hiddenEnd, setHiddenEnd] = useState("18:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchHiddenTimeSlots();
  }, []);

  async function fetchHiddenTimeSlots() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/time-slots");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load hidden time slots");
      setSlots(data.slots || []);
      setDateRules(data.dateRules || {});
      setHiddenTimeSlots(data.hiddenTimeSlots || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load hidden time slots");
    } finally {
      setLoading(false);
    }
  }

  function addHiddenTimeSlot() {
    if (!hiddenDate || calculateDuration(hiddenStart, hiddenEnd) <= 0) return;

    setHiddenTimeSlots((current) =>
      [
        ...current,
        {
          date: hiddenDate,
          start: hiddenStart,
          end: hiddenEnd,
        },
      ].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
    );
  }

  function removeHiddenTimeSlot(index: number) {
    setHiddenTimeSlots((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function saveHiddenTimeSlots() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/time-slots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slots,
          dateRules: Object.entries(dateRules).map(([category_id, available_dates]) => ({
            category_id,
            available_dates,
          })),
          hiddenTimeSlots,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save hidden time slots");
      setSlots(data.slots || []);
      setDateRules(data.dateRules || {});
      setHiddenTimeSlots(data.hiddenTimeSlots || []);
      setMessage("Hidden time slots saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save hidden time slots");
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
            Booked Time&Date
          </h1>
          <p className="text-stone-500 mt-1">
            Hide public Mini Chef and Big Chef slots that fall fully inside a date and time range.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchHiddenTimeSlots} disabled={loading || saving}>
            Refresh
          </Button>
          <Button
            onClick={saveHiddenTimeSlots}
            disabled={loading || saving}
            className="bg-[#FF7A5C] hover:bg-[#ff6a48]"
          >
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

      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-[#FF7A5C]" />
              <h2 className="font-semibold text-stone-900">Hide Time Slots</h2>
            </div>
            <p className="mt-1 text-sm text-stone-500">
              Hide public Mini Chef and Big Chef slots that fall fully inside a date and time range.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(160px,1fr)_130px_130px_auto]">
            <input
              type="date"
              value={hiddenDate}
              onChange={(event) => setHiddenDate(event.target.value)}
              className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            />
            <input
              type="time"
              value={hiddenStart}
              onChange={(event) => setHiddenStart(event.target.value)}
              className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            />
            <input
              type="time"
              value={hiddenEnd}
              onChange={(event) => setHiddenEnd(event.target.value)}
              className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addHiddenTimeSlot}
              disabled={!hiddenDate || calculateDuration(hiddenStart, hiddenEnd) <= 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Hide Rule
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading hidden time slots...
            </div>
          ) : hiddenTimeSlots.length > 0 ? (
            hiddenTimeSlots.map((rule, index) => (
              <span
                key={rule.id || `${rule.date}-${rule.start}-${rule.end}-${index}`}
                className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-800"
              >
                {new Date(`${rule.date}T00:00:00`).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                <span className="text-stone-400">/</span>
                {formatTimeLabel(rule.start)} - {formatTimeLabel(rule.end)}
                <button
                  type="button"
                  onClick={() => removeHiddenTimeSlot(index)}
                  className="rounded-full p-0.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Remove hidden time slot ${rule.date}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))
          ) : (
            <p className="text-sm text-stone-500">No hidden time slot rules configured.</p>
          )}
        </div>
      </div>
    </div>
  );
}
