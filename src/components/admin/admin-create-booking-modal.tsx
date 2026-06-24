"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dateAllowsDeposit, getDubaiDate } from "@/lib/payments/deposit-policy";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserId: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  categories: string[];
  description?: string;
  price_unit?: string;
}

interface PackageItem extends MenuItem {
  metadata?: { class_count?: number } | null;
  menu_items?: MenuItem[];
}

interface TimeSlot {
  start: string;
  label: string;
  end?: string;
}

interface SummerCampBatch {
  id: string;
  name: string;
  dates: string[];
  time_slots?: Record<string, TimeSlot[]>;
}

interface SummerCampApiItem {
  id: string;
  name: string;
  description: string;
  price: number;
  price_unit: string;
}

interface SessionSchedule {
  date: string;
  time: string;
  timeLabel: string;
  slots: TimeSlot[];
  loading: boolean;
}

type CategoryId =
  | "classics_mini" | "monthly_mini" | "mommy_me" | "birthday"
  | "packages" | "corporate" | "classics_big" | "monthly_big"
  | "teenagers" | "nanny" | "summer_camp";

interface CategoryRule {
  id: CategoryId;
  group: "Mini Chef" | "Big Chef";
  label: string;
  serviceType: "birthday_deck" | "corporate_deck";
  minGuests: number;
  maxGuests: number;
  selectionCount: number;
  separateSchedules?: boolean;
  packages?: boolean;
  extras?: boolean;
  flatPrice?: number;
  summerCamp?: boolean;
}

const RULES: CategoryRule[] = [
  { id: "classics_mini", group: "Mini Chef", label: "Our Classics", serviceType: "birthday_deck", minGuests: 1, maxGuests: 35, selectionCount: 1 },
  { id: "monthly_mini", group: "Mini Chef", label: "Monthly Specials", serviceType: "birthday_deck", minGuests: 1, maxGuests: 35, selectionCount: 1 },
  { id: "mommy_me", group: "Mini Chef", label: "Mommy & Me", serviceType: "birthday_deck", minGuests: 1, maxGuests: 20, selectionCount: 1 },
  { id: "birthday", group: "Mini Chef", label: "Birthdays", serviceType: "birthday_deck", minGuests: 6, maxGuests: 35, selectionCount: 1, extras: true },
  { id: "packages", group: "Mini Chef", label: "Packages", serviceType: "birthday_deck", minGuests: 6, maxGuests: 35, selectionCount: 1, packages: true },
  { id: "summer_camp", group: "Mini Chef", label: "Mini Chef Camp", serviceType: "birthday_deck", minGuests: 1, maxGuests: 35, selectionCount: 1, summerCamp: true },
  { id: "corporate", group: "Big Chef", label: "Corporate / Private", serviceType: "corporate_deck", minGuests: 6, maxGuests: 35, selectionCount: 1, extras: true },
  { id: "classics_big", group: "Big Chef", label: "Our Classics", serviceType: "corporate_deck", minGuests: 1, maxGuests: 35, selectionCount: 1 },
  { id: "monthly_big", group: "Big Chef", label: "Monthly Specials", serviceType: "corporate_deck", minGuests: 1, maxGuests: 35, selectionCount: 1 },
  { id: "teenagers", group: "Big Chef", label: "Teenager Course", serviceType: "corporate_deck", minGuests: 1, maxGuests: 20, selectionCount: 4, separateSchedules: true },
  { id: "nanny", group: "Big Chef", label: "Nanny Class", serviceType: "corporate_deck", minGuests: 1, maxGuests: 1, selectionCount: 4, separateSchedules: true, flatPrice: 1200 },
];

const MOMMY_ME_ADDITIONAL_CHILD_PRICE = 200;
const STATIC_SUMMER_CAMP_MENUS: MenuItem[] = [
  { id: "summer-camp-per-day", name: "Per Day", price: 250, categories: ["summer_camp"], description: "Summer camp class by day", price_unit: "per guest per day" },
  { id: "summer-camp-per-week", name: "Per Week", price: 1000, categories: ["summer_camp"], description: "Summer camp class by week", price_unit: "per guest per week" },
];

const uniqueTimeSlots = (slots: TimeSlot[]) => {
  const byTime = new Map<string, TimeSlot>();
  slots.forEach((slot) => byTime.set(`${slot.start}-${slot.end || ""}`, slot));
  return [...byTime.values()].sort((a, b) => a.start.localeCompare(b.start));
};

export function AdminCreateBookingModal({ isOpen, onClose, onSuccess, currentUserId }: Props) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<CategoryRule | null>(null);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [extras, setExtras] = useState<MenuItem[]>([]);
  const [summerCampItems, setSummerCampItems] = useState<MenuItem[]>(STATIC_SUMMER_CAMP_MENUS);
  const [summerCampAvailableDates, setSummerCampAvailableDates] = useState<string[]>([]);
  const [summerCampBatches, setSummerCampBatches] = useState<SummerCampBatch[]>([]);
  const [summerCampSelectedDates, setSummerCampSelectedDates] = useState<string[]>([]);
  const [summerCampTimeSlotsByDate, setSummerCampTimeSlotsByDate] = useState<Record<string, TimeSlot[]>>({});
  const [summerCampDayCount, setSummerCampDayCount] = useState(1);
  const [selectedMenus, setSelectedMenus] = useState<MenuItem[]>([]);
  const [selectedPackageClasses, setSelectedPackageClasses] = useState<MenuItem[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});
  const [guestCount, setGuestCount] = useState(1);
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventTimeLabel, setEventTimeLabel] = useState("");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [schedules, setSchedules] = useState<Record<string, SessionSchedule>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingData(true);
    Promise.all([
      fetch("/api/admin/menu-items?active=true").then((res) => res.json()),
      fetch("/api/admin/packages?active=true").then((res) => res.json()),
      fetch("/api/admin/menu-items?category=party_extras&active=true").then((res) => res.json()),
    ]).then(([menuData, packageData, extraData]) => {
      setMenus(menuData.items || []);
      setPackages(packageData.packages || []);
      setExtras(extraData.items || []);
    }).finally(() => setLoadingData(false));
  }, [isOpen]);

  useEffect(() => {
    if (!category || !eventDate || category.separateSchedules || category.summerCamp) return;
    setLoadingSlots(true);
    setEventTime("");
    fetch(`/api/services/availability?date=${eventDate}&category=${category.id}`)
      .then((res) => res.json())
      .then((data) => setSlots(data.availableSlots || []))
      .finally(() => setLoadingSlots(false));
  }, [category, eventDate]);

  const availableMenus = useMemo(() => {
    if (!category) return [];
    if (category.summerCamp) return summerCampItems;
    return category.packages
      ? packages.filter((item) => item.categories?.includes("packages"))
      : menus.filter((item) => item.categories?.includes(category.id));
  }, [category, menus, packages, summerCampItems]);

  const selectedPackage = category?.packages ? selectedMenus[0] as PackageItem | undefined : undefined;
  const packageClassLimit = selectedPackage?.metadata?.class_count || 1;
  const packageClassOptions = selectedPackage?.menu_items || [];

  const resetForCategory = (rule: CategoryRule) => {
    setCategory(rule);
    setSelectedMenus([]);
    setSelectedPackageClasses([]);
    setSelectedExtras({});
    setSchedules({});
    setGuestCount(rule.minGuests);
    setEventDate("");
    setEventTime("");
    setSlots([]);
    setSummerCampDayCount(1);
    setSummerCampSelectedDates([]);
    setSummerCampAvailableDates([]);
    setSummerCampBatches([]);
    setSummerCampTimeSlotsByDate({});
  };

  const toggleMenu = (menu: MenuItem) => {
    setSelectedMenus((current) => {
      if (current.some((item) => item.id === menu.id)) {
        setSchedules((existing) => {
          const next = { ...existing };
          delete next[menu.id];
          return next;
        });
        return current.filter((item) => item.id !== menu.id);
      }
      if (!category || current.length >= category.selectionCount) {
        return category?.selectionCount === 1 ? [menu] : current;
      }
      return [...current, menu];
    });
    if (category?.selectionCount === 1) setSelectedPackageClasses([]);
    if (category?.summerCamp) {
      setSummerCampDayCount(menu.id === "summer-camp-per-week" ? 1 : summerCampDayCount);
      setSummerCampSelectedDates([]);
      setEventDate("");
      setEventTime("");
      setSlots([]);
    }
  };

  const selectedSummerCampMenu = category?.summerCamp ? selectedMenus[0] : null;
  const selectedSummerCampMenuId = selectedSummerCampMenu?.id || "";
  const isSummerCampPerDay = selectedSummerCampMenu?.id === "summer-camp-per-day";
  const isSummerCampPerWeek = selectedSummerCampMenu?.id === "summer-camp-per-week";
  const summerCampRequiredDateCount = isSummerCampPerWeek ? 5 : summerCampDayCount;

  useEffect(() => {
    if (!category?.summerCamp || !selectedSummerCampMenuId) return;
    const params = new URLSearchParams({
      option: isSummerCampPerWeek ? "per-week" : "per-day",
      days: String(isSummerCampPerDay ? summerCampDayCount : 1),
    });
    fetch(`/api/services/summer-camp-dates?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        const dates = Array.isArray(data.dates) ? data.dates : [];
        setSummerCampAvailableDates(dates);
        setSummerCampBatches(Array.isArray(data.batches) ? data.batches : []);
        setSummerCampTimeSlotsByDate(data.timeSlotsByDate && typeof data.timeSlotsByDate === "object" ? data.timeSlotsByDate : {});
        if (Array.isArray(data.items) && data.items.length > 0) {
          const nextItems: MenuItem[] = data.items.map((item: SummerCampApiItem) => ({
            id: item.id,
            name: item.name,
            price: Number(item.price) || 0,
            categories: ["summer_camp"],
            description: item.description,
            price_unit: item.price_unit,
          }));
          setSummerCampItems(nextItems);
          setSelectedMenus((current) => current.map((menu) => nextItems.find((item) => item.id === menu.id) || menu));
        }
        setSummerCampSelectedDates((current) => {
          const valid = current.filter((date) => dates.includes(date)).slice(0, summerCampRequiredDateCount);
          setEventDate(valid[0] || "");
          if (valid.length !== current.length || valid.some((date, index) => date !== current[index])) {
            setEventTime("");
          }
          return valid;
        });
      })
      .catch(() => {
        setSummerCampAvailableDates([]);
        setSummerCampBatches([]);
        setSummerCampTimeSlotsByDate({});
      });
  }, [category, selectedSummerCampMenuId, isSummerCampPerDay, isSummerCampPerWeek, summerCampDayCount, summerCampRequiredDateCount]);

  useEffect(() => {
    if (!category?.summerCamp || !eventDate) return;
    if (isSummerCampPerWeek) {
      const batch = summerCampBatches.find((item) => item.dates.includes(eventDate));
      setSummerCampSelectedDates(batch?.dates || []);
      setSlots(uniqueTimeSlots(batch?.dates.flatMap((date) => summerCampTimeSlotsByDate[date] || []) || []));
      return;
    }
    if (!summerCampAvailableDates.includes(eventDate)) {
      setSummerCampSelectedDates([]);
      setSlots([]);
      setEventTime("");
      return;
    }
    setSummerCampSelectedDates([eventDate]);
    setSlots(summerCampTimeSlotsByDate[eventDate] || []);
    setEventTime("");
  }, [category, eventDate, isSummerCampPerWeek, summerCampAvailableDates, summerCampBatches, summerCampTimeSlotsByDate]);

  const setScheduleDate = (date: string) => {
    if (!category?.summerCamp) {
      setEventDate(date);
      return;
    }

    if (isSummerCampPerWeek) {
      const selectedBatch = summerCampSelectedDates.length > 0 ? summerCampSelectedDates : summerCampBatches.find((batch) => batch.dates.includes(date))?.dates || [];
      if (!selectedBatch.includes(date)) {
        setEventDate("");
        setEventTime("");
        setSlots([]);
        return;
      }
      setEventDate(date);
      setEventTime("");
      setSlots(uniqueTimeSlots(summerCampTimeSlotsByDate[date] || []));
      return;
    }

    if (!summerCampAvailableDates.includes(date)) {
      setEventDate("");
      setEventTime("");
      setSummerCampSelectedDates([]);
      setSlots([]);
      return;
    }

    setEventDate(date);
  };


  const togglePackageClass = (menu: MenuItem) => {
    setSelectedPackageClasses((current) => {
      if (current.some((item) => item.id === menu.id)) return current.filter((item) => item.id !== menu.id);
      if (current.length >= packageClassLimit) return current;
      return [...current, menu];
    });
  };

  const fetchSessionSlots = async (menuId: string, date: string) => {
    if (!category) return;
    setSchedules((current) => ({ ...current, [menuId]: { date, time: "", timeLabel: "", slots: [], loading: true } }));
    const data = await fetch(`/api/services/availability?date=${date}&category=${category.id}`).then((res) => res.json());
    setSchedules((current) => ({ ...current, [menuId]: { date, time: "", timeLabel: "", slots: data.availableSlots || [], loading: false } }));
  };

  const extrasTotal = Object.entries(selectedExtras).reduce((total, [id, quantity]) => {
    return total + (extras.find((item) => item.id === id)?.price || 0) * quantity;
  }, 0);

  const selectedMenuPrice = selectedMenus.reduce((total, item) => total + Number(item.price || 0), 0);
  const baseAmount = !category ? 0
    : category.flatPrice || (category.summerCamp
      ? selectedMenuPrice * guestCount * (isSummerCampPerDay ? summerCampDayCount : 1)
      : category.packages ? selectedMenuPrice
      : category.id === "mommy_me"
        ? selectedMenuPrice + Math.max(0, guestCount - 1) * MOMMY_ME_ADDITIONAL_CHILD_PRICE
        : selectedMenuPrice * guestCount);
  const totalAmount = baseAmount + extrasTotal;
  const firstSessionDate = category?.separateSchedules ? schedules[selectedMenus[0]?.id]?.date || "" : eventDate;
  const requiresDeposit = Boolean(category && ["birthday", "corporate"].includes(category.id) && dateAllowsDeposit(firstSessionDate, getDubaiDate()));
  const paymentAmount = requiresDeposit ? Math.ceil(totalAmount * 0.5) : totalAmount;

  const selectionComplete = Boolean(category)
    && selectedMenus.length === category?.selectionCount
    && (!category?.packages || selectedPackageClasses.length === packageClassLimit);
  const scheduleComplete = category ? (category.separateSchedules
    ? selectedMenus.every((menu) => schedules[menu.id]?.date && schedules[menu.id]?.time)
    : category.summerCamp
      ? summerCampSelectedDates.length === summerCampRequiredDateCount && Boolean(eventTime)
    : Boolean(eventDate && eventTime)) : false;
  const summerCampScheduleDates = isSummerCampPerWeek ? summerCampSelectedDates : summerCampAvailableDates;
  const summerCampBatchLabel = summerCampSelectedDates.join(", ");

  const categorySelectionComplete = selectionComplete
    && (!category?.summerCamp || !isSummerCampPerWeek || summerCampSelectedDates.length === summerCampRequiredDateCount);
  const canContinue = step === 1 ? categorySelectionComplete : step === 2 ? scheduleComplete : Boolean(customerName.trim() && customerEmail.trim());

  const handleSubmit = async () => {
    if (!category || !selectionComplete || !scheduleComplete || !customerName || !customerEmail) return;
    setSubmitting(true);
    try {
      const scheduleItems = category.separateSchedules
        ? selectedMenus.map((menu, index) => ({
            id: menu.id, name: menu.name, session: index + 1,
            event_date: schedules[menu.id].date,
            event_time: schedules[menu.id].time,
            time_label: schedules[menu.id].timeLabel,
          }))
        : category.summerCamp
          ? selectedMenus.map((menu, index) => ({
              id: menu.id, name: menu.name, session: index + 1,
              quantity: menu.id === "summer-camp-per-day" ? summerCampDayCount : 1,
              unitPrice: menu.price,
              event_date: eventDate || null,
              camp_dates: summerCampSelectedDates,
              event_time: eventTime || null,
              time_label: eventTimeLabel || null,
            }))
        : category.packages
          ? selectedPackageClasses.map((menu, index) => ({
              id: menu.id, name: menu.name, session: index + 1,
              packageId: selectedPackage?.id, packageName: selectedPackage?.name,
              event_date: index === 0 ? eventDate : null,
              event_time: index === 0 ? eventTime : null,
              time_label: index === 0 ? eventTimeLabel : null,
            }))
          : category.id === "mommy_me"
            ? [{ id: selectedMenus[0].id, name: selectedMenus[0].name, children: guestCount, totalPrice: baseAmount }]
            : [];
      const primaryDate = category.separateSchedules ? schedules[selectedMenus[0].id]?.date : eventDate;
      const primaryTime = category.separateSchedules ? schedules[selectedMenus[0].id]?.time : eventTime;
      const menuNames = selectedMenus.map((item) => item.name).join(", ");
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceName: `${category.group} - ${category.label}`,
          serviceType: category.serviceType,
          // Catalog packages live in `packages`, while service_bookings.package_id
          // references the legacy `service_packages` table.
          packageId: null,
          packageName: category.summerCamp ? "Summer Camp" : category.separateSchedules ? `${category.label} (${category.selectionCount} Sessions)` : selectedMenus[0]?.name,
          menuId: selectedMenus.map((item) => item.id).join(","),
          menuName: category.packages
            ? `${selectedPackage?.name} - ${selectedPackageClasses.map((item) => item.name).join(", ")}`
            : menuNames,
          menuPrice: category.summerCamp ? baseAmount : category.flatPrice || selectedMenuPrice,
          customerName, customerEmail, customerPhone, companyName,
          eventDate: primaryDate, eventTime: primaryTime, guestCount,
          items: scheduleItems,
          extras: extras.filter((item) => selectedExtras[item.id]).map((item) => ({
            id: item.id, name: item.name, price: item.price, quantity: selectedExtras[item.id],
          })),
          baseAmount, extrasAmount: extrasTotal, totalAmount,
          isDepositPayment: requiresDeposit,
          depositAmount: requiresDeposit ? paymentAmount : null,
          balanceAmount: requiresDeposit ? totalAmount - paymentAmount : null,
          specialRequests, notes, createdBy: currentUserId,
          bookingSlotCategory: category.id,
          generatePaymentLink: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create booking");
      alert(data.emailSent === false
        ? `Booking and invoice created, but the payment email failed: ${data.emailError || "Unknown error"}`
        : `Booking created. Payment link and invoice sent to ${customerEmail}.`);
      onSuccess();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white">
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-stone-900">Create New Booking</h2>
            <button onClick={onClose}><X className="h-6 w-6 text-stone-500" /></button>
          </div>
          <div className="mt-4 flex gap-2">{[1, 2, 3, 4].map((value) => <div key={value} className={`h-2 flex-1 rounded-full ${step >= value ? "bg-[#FF8C6B]" : "bg-stone-200"}`} />)}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-stone-900">Select Category</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {RULES.map((rule) => <button key={rule.id} onClick={() => resetForCategory(rule)} className={`rounded-lg border p-4 text-left ${category?.id === rule.id ? "border-[#FF8C6B] bg-[#FF8C6B]/10" : "border-stone-200"}`}><p className="text-xs font-bold uppercase text-stone-500">{rule.group}</p><p className="font-bold">{rule.label}</p><p className="text-sm text-stone-500">{rule.minGuests}-{rule.maxGuests} guest{rule.maxGuests === 1 ? "" : "s"}{rule.selectionCount > 1 ? ` • Select ${rule.selectionCount} menus` : ""}</p></button>)}
                </div>
              </div>
              {category && <div><h3 className="font-bold">Select {category.packages ? "Package" : category.selectionCount > 1 ? `${category.selectionCount} Menus` : "Menu"}</h3>{loadingData ? <Loader2 className="mt-4 h-5 w-5 animate-spin" /> : <div className="mt-3 grid gap-2 sm:grid-cols-2">{availableMenus.map((menu) => { const selected = selectedMenus.some((item) => item.id === menu.id); return <button key={menu.id} onClick={() => toggleMenu(menu)} className={`flex justify-between rounded-lg border p-3 text-left ${selected ? "border-[#FF8C6B] bg-[#FF8C6B]/10" : "border-stone-200"}`}><span>{menu.name}</span><span className="font-bold">AED {menu.price}</span></button>; })}</div>}</div>}
              {category?.summerCamp && isSummerCampPerWeek && <div><h3 className="font-bold">Select Batch</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{summerCampBatches.map((batch) => { const selected = summerCampSelectedDates.join("|") === batch.dates.join("|"); return <button key={batch.id} onClick={() => { setSummerCampSelectedDates(batch.dates); setEventDate(batch.dates[0] || ""); setEventTime(""); setSlots(uniqueTimeSlots(batch.dates.flatMap((date) => summerCampTimeSlotsByDate[date] || []))); }} className={`rounded-lg border p-3 text-left ${selected ? "border-[#FF8C6B] bg-[#FF8C6B]/10" : "border-stone-200"}`}><p className="font-bold">{batch.name}</p><p className="text-sm text-stone-500">{batch.dates.join(", ")}</p></button>; })}</div>{summerCampBatches.length === 0 && <p className="mt-2 text-sm text-stone-500">No full summer camp batches are available yet.</p>}</div>}
              {selectedPackage && <div><h3 className="font-bold">Choose {packageClassLimit} Classes ({selectedPackageClasses.length}/{packageClassLimit})</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{packageClassOptions.map((menu) => <button key={menu.id} onClick={() => togglePackageClass(menu)} className={`rounded-lg border p-3 text-left ${selectedPackageClasses.some((item) => item.id === menu.id) ? "border-[#FF8C6B] bg-[#FF8C6B]/10" : "border-stone-200"}`}>{menu.name}</button>)}</div></div>}
            </div>
          )}

          {step === 2 && category && (
            <div className="space-y-5">
              <div className="flex items-center justify-between"><h3 className="font-bold">Schedule</h3>{category.id !== "nanny" && <div className="flex items-center gap-3"><Button variant="outline" size="icon" onClick={() => setGuestCount(Math.max(category.minGuests, guestCount - 1))}><Minus className="h-4 w-4" /></Button><span className="font-bold">{guestCount} guests</span><Button variant="outline" size="icon" onClick={() => setGuestCount(Math.min(category.maxGuests, guestCount + 1))}><Plus className="h-4 w-4" /></Button></div>}</div>
              {category.separateSchedules ? selectedMenus.map((menu, index) => { const schedule = schedules[menu.id]; return <div key={menu.id} className="rounded-lg border bg-stone-50 p-4"><p className="text-sm text-stone-500">Session {index + 1}</p><p className="font-bold">{menu.name}</p><div className="mt-3 grid gap-4 sm:grid-cols-2"><input type="date" min={getDubaiDate()} value={schedule?.date || ""} onChange={(e) => fetchSessionSlots(menu.id, e.target.value)} className="rounded-lg border p-3" /><div>{schedule?.loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <div className="grid grid-cols-2 gap-2">{(schedule?.slots || []).map((slot) => <button key={slot.start} onClick={() => setSchedules((current) => ({ ...current, [menu.id]: { ...current[menu.id], time: slot.start, timeLabel: slot.label } }))} className={`rounded-lg border p-2 text-sm ${schedule?.time === slot.start ? "border-[#FF8C6B] bg-[#FF8C6B]/10" : ""}`}>{slot.label}</button>)}</div>}</div></div></div>; }) : <><div className="grid gap-4 sm:grid-cols-2">{category.summerCamp ? (isSummerCampPerWeek ? <div className="rounded-lg border bg-stone-50 p-3 text-sm text-stone-700"><p className="font-bold text-stone-900">Selected batch dates</p><p>{summerCampBatchLabel}</p></div> : <select value={eventDate} onChange={(e) => setScheduleDate(e.target.value)} className="rounded-lg border p-3"><option value="">Select camp date</option>{summerCampScheduleDates.map((date) => <option key={date} value={date}>{date}</option>)}</select>) : <input type="date" min={getDubaiDate()} value={eventDate} onChange={(e) => setScheduleDate(e.target.value)} className="rounded-lg border p-3" />}<div>{loadingSlots ? <Loader2 className="h-5 w-5 animate-spin" /> : <div className="grid grid-cols-2 gap-2">{slots.map((slot) => <button key={slot.start} onClick={() => { setEventTime(slot.start); setEventTimeLabel(slot.label); }} className={`rounded-lg border p-2 text-sm ${eventTime === slot.start ? "border-[#FF8C6B] bg-[#FF8C6B]/10" : ""}`}>{slot.label}</button>)}</div>}</div></div>{category.extras && <div><h3 className="font-bold">Extras</h3><div className="mt-3 space-y-2">{extras.map((extra) => <div key={extra.id} className="flex items-center justify-between rounded-lg border p-3"><span>{extra.name} • AED {extra.price}</span><div className="flex items-center gap-2"><button onClick={() => setSelectedExtras((current) => ({ ...current, [extra.id]: Math.max(0, (current[extra.id] || 0) - 1) }))}>-</button><span>{selectedExtras[extra.id] || 0}</span><button onClick={() => setSelectedExtras((current) => ({ ...current, [extra.id]: (current[extra.id] || 0) + 1 }))}>+</button></div></div>)}</div></div>}</>}
            </div>
          )}

          {step === 3 && <div className="space-y-4"><h3 className="font-bold">Customer Details</h3><div className="grid gap-4 sm:grid-cols-2"><input placeholder="Customer name *" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="rounded-lg border p-3" /><input type="email" placeholder="Email *" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="rounded-lg border p-3" /><input placeholder="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="rounded-lg border p-3" />{category?.id === "corporate" && <input placeholder="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="rounded-lg border p-3" />}</div><textarea placeholder="Special requests" value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} className="w-full rounded-lg border p-3" /><textarea placeholder="Internal notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border p-3" /></div>}

          {step === 4 && <div className="space-y-4"><h3 className="font-bold">Confirm Booking</h3><div className="rounded-lg border bg-stone-50 p-5"><p className="font-bold">{category?.group} - {category?.label}</p><p>{selectedMenus.map((item) => item.name).join(", ")}</p><p>{guestCount} guest{guestCount === 1 ? "" : "s"}</p><div className="mt-4 border-t pt-4"><div className="flex justify-between"><span>Base</span><span>AED {baseAmount.toLocaleString()}</span></div><div className="flex justify-between"><span>Extras</span><span>AED {extrasTotal.toLocaleString()}</span></div><div className="mt-2 flex justify-between text-lg font-bold"><span>{requiresDeposit ? "50% deposit due" : "Total due"}</span><span>AED {paymentAmount.toLocaleString()}</span></div></div></div><div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800"><Check className="mr-2 inline h-4 w-4" />Creating this booking also creates an invoice and emails its payment link to {customerEmail}.</div></div>}
        </div>

        <div className="flex justify-between border-t bg-stone-50 p-6"><Button variant="outline" onClick={() => step === 1 ? onClose() : setStep(step - 1)}><ArrowLeft className="mr-2 h-4 w-4" />{step === 1 ? "Cancel" : "Back"}</Button>{step < 4 ? <Button onClick={() => setStep(step + 1)} disabled={!canContinue}>Continue<ArrowRight className="ml-2 h-4 w-4" /></Button> : <Button onClick={handleSubmit} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Booking & Send Payment Link</Button>}</div>
      </div>
    </div>
  );
}




