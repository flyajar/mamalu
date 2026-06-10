"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ArrowRight, Check, Clock, Calendar, Minus, Plus, Loader2,
  Gift, Cake, PartyPopper, Utensils, X,
  Ticket,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MonthlyAvailableDatePicker } from "@/components/booking/monthly-available-date-picker";
import { BigChefPageContent, defaultBigChefContent } from "@/types/site-content";

interface MenuItem { id: string; name: string; price: number; image: string; dishes: string[]; category: string; scheduled_date?: string | null; allowed_persons?: number | null; }
interface ExtraItem { id: string; name: string; description: string; price: number; icon: LucideIcon; category: string; image?: string; }
interface PartyExtraMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  sort_order?: number | null;
  metadata: {
    extra_category?: string;
    icon?: string;
  } | null;
}
interface TimeSlot { start: string; end: string; duration: number; label: string; days?: number[]; }
interface NannyMenuSchedule { date: string; time: string; allTimeSlots: TimeSlot[]; availableTimeSlots: TimeSlot[]; loading: boolean; }
interface AppliedVoucher { code: string; amount: number; }
type CategoryType = "corporate" | "classics" | "monthly" | "teenagers" | "nanny";

const AVAILABILITY_CATEGORY_BY_TAB: Record<CategoryType, string> = {
  corporate: "corporate",
  classics: "classics_big",
  monthly: "monthly_big",
  teenagers: "teenagers",
  nanny: "nanny",
};

const PRIMARY_BUTTON_CLASS = "bg-[rgb(255_140_107)] hover:bg-[rgb(255_126_91)] text-white border border-[rgb(255_140_107)] font-bold disabled:!bg-[rgb(255_170_145)] disabled:!border-[rgb(255_170_145)] disabled:!text-white disabled:!opacity-100 disabled:cursor-not-allowed";

const getCategoryConfig = (pageContent: BigChefPageContent): Record<CategoryType, { label: string; icon: string; minGuests: number; maxGuests: number; description: string }> => ({
  corporate: { label: "Corporate / Private", icon: pageContent.categoryIcons?.corporate || "/icons/knives.png", minGuests: 6, maxGuests: 35, description: "2-hour hands-on cooking experience with professional chefs" },
  classics: { label: "Our Classics", icon: pageContent.categoryIcons?.classics || "/icons/whisk.png", minGuests: 1, maxGuests: 35, description: "2-hour hands-on cooking experience with professional chefs" },
  monthly: { label: "Monthly Specials", icon: pageContent.categoryIcons?.monthly || "/icons/knives.png", minGuests: 1, maxGuests: 35, description: "Seasonal rotating menus" },
  teenagers: { label: "Teenager Course", icon: pageContent.categoryIcons?.teenagers || "/icons/whisk.png", minGuests: 1, maxGuests: 20, description: "Fun cooking classes for teens aged 12-17" },
  nanny: { label: "Nanny Class", icon: pageContent.categoryIcons?.nanny || "/icons/knives.png", minGuests: 1, maxGuests: 10, description: "Mummy's Fabulous Helpers - Turn your housekeeper into a chef" },
});

const extraIconMap: Record<string, LucideIcon> = {
  cake: Cake,
  drinks: Utensils,
  gift: Gift,
  party: PartyPopper,
  utensils: Utensils,
};

const extraCategoryLabels: Record<string, string> = {
  custom: "Personalized Items",
  cake: "Cakes",
  decor: "Decorations & Setup",
  snacks: "Snacks",
  drinks: "Drinks",
};

const extraCategoryOrder = ["custom", "cake", "decor", "snacks", "drinks"];

function WaiverModal({ isOpen, onClose, onAccept }: { isOpen: boolean; onClose: () => void; onAccept: () => void }) {
  const [hasRead, setHasRead] = useState(false);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#FF8C6B] text-white p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">WAIVER FORM</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#ff7a54] rounded"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <h3 className="text-lg font-bold text-center mb-4">Cooking Class Waiver & Acknowledgement — Mamalu Kitchen Studio</h3>
          <div className="space-y-4 text-sm text-stone-700">
            <p>By completing this booking, I confirm that I am the participant or authorized representative and give permission to attend and participate in the cooking class at Mamalu Kitchen Studio. I understand that cooking activities involve the use of kitchen tools, utensils, heat sources, and food ingredients, and while Mamalu Kitchen Studio maintains a safe, supervised environment, minor injuries such as cuts, burns, slips, or allergic reactions may occur.</p>
            <p className="text-[#FF8C6B]">I confirm that I have informed Mamalu Kitchen Studio of any allergies, medical conditions, dietary restrictions, or special needs prior to the class. I understand that classes take place in a shared kitchen environment where cross-contact with allergens may occur despite careful handling procedures.</p>
            <p>I agree that Mamalu Kitchen Studio, its owners, instructors, and staff shall not be held liable for any injury, loss, or damage resulting from participation in the class, except in cases of gross negligence.</p>
            <p>I understand that photos or videos may be taken during the class for documentation and promotional purposes unless I notify Mamalu Kitchen Studio in writing prior to the session.</p>
            <p className="font-semibold">By checking this box, I confirm that I have read, understood, and agree to this waiver.</p>
          </div>
        </div>
        <div className="p-4 border-t bg-stone-50">
          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <input type="checkbox" checked={hasRead} onChange={(e) => setHasRead(e.target.checked)} className="mt-1 h-5 w-5" />
            <span className="text-sm text-stone-700">I have read and understood the waiver form above and agree to all terms.</span>
          </label>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={onAccept} disabled={!hasRead} className={`flex-1 ${PRIMARY_BUTTON_CLASS}`}>I Accept & Continue</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BigChefPage() {
  const [step, setStep] = useState(1);
  const [pageContent, setPageContent] = useState<BigChefPageContent>(defaultBigChefContent);
  const [activeCategory, setActiveCategory] = useState<CategoryType>("corporate");
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [selectedNannyMenus, setSelectedNannyMenus] = useState<MenuItem[]>([]);
  const [guestCount, setGuestCount] = useState(6);
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});

  // Dynamic menu data
  const [menuItemsByCategory, setMenuItemsByCategory] = useState<Record<string, MenuItem[]>>({});
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [corporateExtras, setCorporateExtras] = useState<ExtraItem[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(true);

  // Capacity tracking for monthly specials
  const [menuCapacities, setMenuCapacities] = useState<Record<string, { allowed: number; booked: number; available: number } | null>>({});

  // Fetch page content
  useEffect(() => {
    fetch("/api/site-content?page=bigchef")
      .then((res) => res.json())
      .then((data) => setPageContent(data))
      .catch(() => setPageContent(defaultBigChefContent));
  }, []);

  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [monthlyAvailableDates, setMonthlyAvailableDates] = useState<string[]>([]);
  const [loadingMonthlyDates, setLoadingMonthlyDates] = useState(false);
  const [, setAllTimeSlots] = useState<TimeSlot[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [nannySchedules, setNannySchedules] = useState<Record<string, NannyMenuSchedule>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null);
  const [voucherError, setVoucherError] = useState("");
  const [applyingVoucher, setApplyingVoucher] = useState(false);

  const categoryConfig = getCategoryConfig(pageContent);
  const currentConfig = categoryConfig[activeCategory];
  const isCorporate = activeCategory === "corporate";
  const isNanny = activeCategory === "nanny";
  const isMonthly = activeCategory === "monthly";
  const hasExtras = isCorporate;
  const maxStep = hasExtras ? 4 : 3;
  // Fetch menu items from DB on mount
  useEffect(() => {
    async function fetchMenuData() {
      setLoadingMenus(true);
      try {
        const res = await fetch("/api/admin/menu-items?active=true");
        const data = res.ok ? await res.json() : { items: [] };

        const dbLabelToCategory: Record<string, CategoryType> = {
          "corporate": "corporate",
          "classics_big": "classics",
          "monthly_big": "monthly",
          "teenagers": "teenagers",
          "nanny": "nanny",
        };

        const grouped: Record<string, MenuItem[]> = { corporate: [], classics: [], monthly: [], teenagers: [], nanny: [] };

        for (const item of data.items || []) {
          for (const dbLabel of (item.categories || [])) {
            const cat = dbLabelToCategory[dbLabel];
            if (cat) {
              grouped[cat].push({
                id: item.id,
                name: item.name,
                price: item.price,
                image: item.image_url || "/images/placeholder.jpg",
                dishes: item.dishes || [],
                category: cat,
                scheduled_date: item.scheduled_date || null,
                allowed_persons: item.allowed_persons ?? null,
              });
            }
          }
        }

        setMenuItemsByCategory(grouped);
      } catch (error) {
        console.error("Failed to fetch menu data:", error);
      } finally {
        setLoadingMenus(false);
      }
    }
    fetchMenuData();
  }, []);

  useEffect(() => {
    async function fetchCorporateExtras() {
      setLoadingExtras(true);
      try {
        const res = await fetch("/api/admin/menu-items?category=party_extras&active=true");
        const data = res.ok ? await res.json() : { items: [] };
        const mappedExtras = (data.items || []).map((item: PartyExtraMenuItem) => {
          const iconKey = item.metadata?.icon || "gift";
          const category = item.metadata?.extra_category || "custom";
          return {
            id: item.id,
            name: item.name,
            description: item.description || "",
            price: Number(item.price) || 0,
            icon: extraIconMap[iconKey] || extraIconMap.gift,
            category,
            image: item.image_url || undefined,
          };
        });
        setCorporateExtras(mappedExtras);
      } catch (error) {
        console.error("Failed to fetch party extras:", error);
        setCorporateExtras([]);
      } finally {
        setLoadingExtras(false);
      }
    }
    fetchCorporateExtras();
  }, []);

  const getCurrentMenus = (): MenuItem[] => menuItemsByCategory[activeCategory] || [];

  useEffect(() => {
    setSelectedMenu(null);
    setSelectedNannyMenus([]);
    setGuestCount(currentConfig.minGuests);
    setSelectedExtras({});
    setNannySchedules({});
    setStep(1);
    setEventDate("");
    setEventTime("");
  }, [activeCategory]);

  // Fetch capacity for monthly special menu items
  const fetchCapacity = async (menuId: string) => {
    if (menuCapacities[menuId] !== undefined) return;
    try {
      const res = await fetch(`/api/services/capacity?menuId=${menuId}`);
      const data = res.ok ? await res.json() : null;
      if (data && !data.is_unlimited) {
        setMenuCapacities(prev => ({ ...prev, [menuId]: { allowed: data.allowed_persons, booked: data.booked_count, available: data.available } }));
      } else {
        setMenuCapacities(prev => ({ ...prev, [menuId]: null }));
      }
    } catch {
      setMenuCapacities(prev => ({ ...prev, [menuId]: null }));
    }
  };

  useEffect(() => {
    if (activeCategory === "monthly") {
      const menus = menuItemsByCategory["monthly"] || [];
      menus.forEach(m => fetchCapacity(m.id));
    }
  }, [activeCategory, menuItemsByCategory]);

  useEffect(() => {
    if (!isMonthly) {
      setMonthlyAvailableDates([]);
      setLoadingMonthlyDates(false);
      return;
    }

    setLoadingMonthlyDates(true);
    fetch(`/api/services/monthly-dates?category=${AVAILABILITY_CATEGORY_BY_TAB.monthly}`)
      .then(res => res.json())
      .then(data => {
        const dates = data.dates || [];
        setMonthlyAvailableDates(dates);
        if (eventDate && !dates.includes(eventDate)) {
          setEventDate("");
          setEventTime("");
        }
      })
      .catch(err => {
        console.error("Failed to fetch monthly dates:", err);
        setMonthlyAvailableDates([]);
      })
      .finally(() => setLoadingMonthlyDates(false));
  }, [eventDate, isMonthly]);

  useEffect(() => {
    if (!eventDate) { setAllTimeSlots([]); setAvailableTimeSlots([]); return; }
    setLoadingSlots(true);
    setEventTime("");
    fetch(`/api/services/availability?date=${eventDate}&category=${AVAILABILITY_CATEGORY_BY_TAB[activeCategory]}`)
      .then(res => res.json())
      .then(data => { setAllTimeSlots(data.allSlots || []); setAvailableTimeSlots(data.availableSlots || []); })
      .finally(() => setLoadingSlots(false));
  }, [eventDate, activeCategory]);

  const emptyNannySchedule = (): NannyMenuSchedule => ({
    date: "",
    time: "",
    allTimeSlots: [],
    availableTimeSlots: [],
    loading: false,
  });

  const getNannySchedule = (menuId: string) => nannySchedules[menuId] || emptyNannySchedule();

  const fetchNannyAvailability = async (menuId: string, date: string) => {
    setNannySchedules(prev => ({
      ...prev,
      [menuId]: { ...(prev[menuId] || emptyNannySchedule()), date, time: "", loading: true },
    }));

    try {
      const res = await fetch(`/api/services/availability?date=${date}&category=nanny`);
      const data = await res.json();
      setNannySchedules(prev => ({
        ...prev,
        [menuId]: {
          ...(prev[menuId] || emptyNannySchedule()),
          date,
          time: "",
          allTimeSlots: data.allSlots || [],
          availableTimeSlots: data.availableSlots || [],
          loading: false,
        },
      }));
    } catch (error) {
      console.error("Failed to fetch nanny availability:", error);
      setNannySchedules(prev => ({
        ...prev,
        [menuId]: { ...(prev[menuId] || emptyNannySchedule()), date, time: "", loading: false },
      }));
    }
  };

  const updateNannyScheduleDate = (menuId: string, date: string) => {
    if (!date) {
      setNannySchedules(prev => ({
        ...prev,
        [menuId]: emptyNannySchedule(),
      }));
      return;
    }
    fetchNannyAvailability(menuId, date);
  };

  const updateNannyScheduleTime = (menuId: string, time: string) => {
    setNannySchedules(prev => ({
      ...prev,
      [menuId]: { ...(prev[menuId] || emptyNannySchedule()), time },
    }));
  };

  const toggleNannyMenu = (menu: MenuItem) => {
    const isSelected = selectedNannyMenus.some(m => m.id === menu.id);
    if (isSelected) {
      setSelectedNannyMenus(prev => prev.filter(m => m.id !== menu.id));
      setNannySchedules(prev => {
        const next = { ...prev };
        delete next[menu.id];
        return next;
      });
      return;
    }
    if (selectedNannyMenus.length < 4) {
      setSelectedNannyMenus(prev => [...prev, menu]);
      setNannySchedules(prev => ({ ...prev, [menu.id]: prev[menu.id] || emptyNannySchedule() }));
    }
  };

  const nannyScheduleItems = selectedNannyMenus.map((menu, index) => {
    const schedule = getNannySchedule(menu.id);
    const slot = schedule.availableTimeSlots.find(s => s.start === schedule.time)
      || schedule.allTimeSlots.find(s => s.start === schedule.time);
    return {
      id: menu.id,
      name: menu.name,
      session: index + 1,
      event_date: schedule.date,
      event_time: schedule.time,
      time_label: slot?.label || schedule.time,
    };
  });

  const nannySchedulesComplete = !isNanny || (selectedNannyMenus.length === 4 && nannyScheduleItems.every(item => item.event_date && item.event_time));

  const baseAmount = isNanny ? 1200 : (selectedMenu?.price || 0) * guestCount;
  const extrasTotal = Object.entries(selectedExtras).reduce((t, [id, qty]) => t + (corporateExtras.find(e => e.id === id)?.price || 0) * qty, 0);
  const selectedExtraItems = corporateExtras
    .filter((extra) => selectedExtras[extra.id])
    .map((extra) => ({
      ...extra,
      quantity: selectedExtras[extra.id],
      total: extra.price * selectedExtras[extra.id],
    }));
  const totalAmount = baseAmount + extrasTotal;
  const voucherDiscount = appliedVoucher ? Math.min(totalAmount, Number(appliedVoucher.amount) || 0) : 0;
  const discountedTotalAmount = Math.max(0, totalAmount - voucherDiscount);
  const requiresDeposit = true;
  const depositAmount = requiresDeposit ? Math.ceil(discountedTotalAmount * 0.5) : discountedTotalAmount;
  const balanceAmount = requiresDeposit ? discountedTotalAmount - depositAmount : 0;

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return;
    setApplyingVoucher(true);
    setVoucherError("");

    try {
      const res = await fetch("/api/vouchers/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: voucherCode.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAppliedVoucher(null);
        setVoucherError(data.error || "Invalid voucher code");
        return;
      }

      setAppliedVoucher(data.voucher);
      setVoucherCode(data.voucher.code);
    } catch {
      setVoucherError("Something went wrong. Please try again.");
    } finally {
      setApplyingVoucher(false);
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode("");
    setVoucherError("");
  };

  const handleSubmit = async (acceptedWaiver = false) => {
    if (!isNanny && !selectedMenu) return;
    if (isNanny && selectedNannyMenus.length !== 4) return;
    if (isNanny && !nannySchedulesComplete) return;
    if (!waiverAccepted && !acceptedWaiver) { setShowWaiverModal(true); return; }
    setSubmitting(true);
    try {
      const extrasData = corporateExtras.filter(e => selectedExtras[e.id]).map(e => ({ id: e.id, name: e.name, price: e.price, quantity: selectedExtras[e.id] }));
      const menuData = isNanny ? { menuId: selectedNannyMenus.map(m => m.id).join(","), menuName: selectedNannyMenus.map(m => m.name).join(", "), menuPrice: 1200 } : { menuId: selectedMenu?.id, menuName: selectedMenu?.name, menuPrice: selectedMenu?.price };
      const bookingEventDate = isNanny ? nannyScheduleItems[0]?.event_date : eventDate;
      const bookingEventTime = isNanny ? nannyScheduleItems[0]?.event_time : eventTime;
      const scheduleSummary = isNanny
        ? nannyScheduleItems.map(item => `Session ${item.session}: ${item.name} - ${item.event_date} ${item.time_label}`).join("\n")
        : "";
      const res = await fetch("/api/services/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceType: "corporate_deck", serviceName: `Big Chef - ${currentConfig.label}`, packageName: isNanny ? "Nanny Class (4 Sessions)" : selectedMenu?.name, ...menuData, customerName, customerEmail, customerPhone, companyName, eventDate: bookingEventDate, eventTime: bookingEventTime, guestCount: isNanny ? 1 : guestCount, items: isNanny ? nannyScheduleItems : [], extras: extrasData, baseAmount, extrasAmount: extrasTotal, totalAmount, isDepositPayment: requiresDeposit, depositAmount: requiresDeposit ? depositAmount : null, balanceAmount: requiresDeposit ? balanceAmount : null, specialRequests: isNanny && scheduleSummary ? `${specialRequests ? `${specialRequests}\n\n` : ""}Nanny class schedule:\n${scheduleSummary}` : specialRequests, waiverAccepted: waiverAccepted || acceptedWaiver, category: activeCategory, bookingSlotCategory: AVAILABILITY_CATEGORY_BY_TAB[activeCategory], voucherCode: appliedVoucher?.code || null }),
      });
      if (res.ok) { const data = await res.json(); if (data.checkoutUrl) window.location.href = data.checkoutUrl; else if (data.booking?.booking_number) window.location.href = `/booking/success?booking=${data.booking.booking_number}`; }
      else { const error = await res.json(); alert(error.error || "Failed to create booking"); }
    } catch { alert("An error occurred"); } finally { setSubmitting(false); }
  };

  const handleWaiverAccept = () => { setWaiverAccepted(true); setShowWaiverModal(false); handleSubmit(true); };
  const today = new Date().toISOString().split("T")[0];
  const detailsStep = hasExtras ? 3 : 2;
  const displayedTimeSlots = availableTimeSlots;

  const canProceed = () => {
    if (step === 1) return isNanny ? selectedNannyMenus.length === 4 : selectedMenu !== null && Boolean(eventDate && eventTime);
    if (hasExtras && step === 2) return true;
    if (step === detailsStep) {
      if (isNanny) return Boolean(customerName && customerEmail && nannySchedulesComplete);
      if (!customerName || !customerEmail || !eventDate || !eventTime) return false;
      if (activeCategory === "monthly" && selectedMenu) {
        const cap = menuCapacities[selectedMenu.id];
        if (cap !== undefined && cap !== null && cap.available <= 0) return false;
      }
      return true;
    }
    return true;
  };

  const selectMenu = (menu: MenuItem) => {
    setSelectedMenu(menu);

    const requiresManualContinue = activeCategory === "teenagers";
    if (!requiresManualContinue && eventDate && eventTime) {
      setStep(step + 1);
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "auto" });
      });
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <WaiverModal isOpen={showWaiverModal} onClose={() => setShowWaiverModal(false)} onAccept={handleWaiverAccept} />
      <div className="bg-white border-t relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => window.dispatchEvent(new CustomEvent("openMamaluMenu"))} className="p-2 hover:bg-stone-100 rounded-full"><ArrowLeft className="h-5 w-5" /></button>
              <div className="hidden lg:block">
                <Image src="/images/0312b1_27732e4abccb4925bca29ff7f349d958~mv2_d_1772_1772_s_2.avif" alt="" width={160} height={160} className="float-gentle opacity-70" />
              </div>
              <div><h1 className="text-2xl text-black" style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 900 }}>{pageContent.pageTitle}</h1><p className="text-black text-base" style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 700 }}>{pageContent.pageSubtitle}</p></div>
            </div>
            <div className="hidden lg:block">
              <Image src="/images/0312b1_fee52e9b65c54277bd129615e50d68ff~mv2_d_1772_1772_s_2.avif" alt="" width={150} height={150} className="float-medium opacity-70" />
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="space-y-6">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 sm:gap-3 p-1 sm:p-2 bg-stone-100 rounded-2xl sm:rounded-full">
              {(Object.keys(categoryConfig) as CategoryType[]).map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2.5 sm:px-7 sm:py-3.5 rounded-full font-extrabold transition-all text-base sm:text-xl flex items-center gap-1.5 sm:gap-2 ${activeCategory === cat ? "bg-[#FF8C6B] text-white border border-[#FF8C6B] shadow-md" : "text-stone-700 hover:bg-stone-200"}`}><Image src={categoryConfig[cat].icon} alt="" width={32} height={32} className="w-6 h-6 sm:w-8 sm:h-8" /> {categoryConfig[cat].label}</button>
              ))}
            </div>
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl text-black" style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 900 }}>{isNanny ? "Select 4 Menus for Your Course" : "Pick your perfect Menu"}</h2>
                  <p className="text-stone-500 mt-1">{currentConfig.description}</p>
                  {isNanny ? <div className="mt-3 p-4 bg-[#FF8C6B]/10 rounded-lg border border-[#FF8C6B]/25"><p className="text-lg font-bold text-[#FF8C6B]">AED 1,200 for 4 classes</p><p className="text-base text-[#FF8C6B] mt-1">Select any 4 menus. Each class is 1.5 hours. Available Monday and Tuesday at 11am</p></div> : <p className="text-base text-stone-400 mt-2">Min: {currentConfig.minGuests} • Max: {currentConfig.maxGuests} guests • Price per person</p>}
                </div>
                {!isNanny && (
                  <Card><CardContent className="p-5">
                    <label className="block text-lg font-bold text-stone-900 mb-3">Number of Guests</label>
                    <div className="flex items-center gap-4 mb-4 lg:mb-6">
                      <Button variant="outline" size="icon" onClick={() => setGuestCount(Math.max(currentConfig.minGuests, guestCount - 1))} disabled={guestCount <= currentConfig.minGuests}><Minus className="h-4 w-4" /></Button>
                      <span className="text-2xl font-bold w-12 text-center">{guestCount}</span>
                      <Button variant="outline" size="icon" onClick={() => setGuestCount(Math.min(currentConfig.maxGuests, guestCount + 1))} disabled={guestCount >= currentConfig.maxGuests}><Plus className="h-4 w-4" /></Button>
                      <span className="text-base font-bold text-stone-600">(Min: {currentConfig.minGuests}, Max: {currentConfig.maxGuests})</span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4 pb-4 lg:pb-6">
                      <div>
                        <label className="block text-base font-bold text-stone-700 mb-1">
                          <Calendar className="inline h-4 w-4 mr-1" />
                          Event Date *
                        </label>
                        {isMonthly ? (
                          loadingMonthlyDates ? (
                            <div className="flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-3 text-stone-500">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading dates...
                            </div>
                          ) : (
                            <MonthlyAvailableDatePicker availableDates={monthlyAvailableDates} value={eventDate} onChange={setEventDate} today={today} />
                          )
                        ) : (
                          <MonthlyAvailableDatePicker value={eventDate} onChange={setEventDate} today={today} restrictToAvailableDates={false} />
                        )}
                      </div>
                      <div>
                        <label className="block text-base font-bold text-stone-700 mb-1">
                          <Clock className="inline h-4 w-4 mr-1" />
                          Time Slot *
                        </label>
                        {loadingSlots ? (
                          <div className="flex items-center gap-2 py-2 text-stone-500"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>
                        ) : eventDate && displayedTimeSlots.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                            {displayedTimeSlots.map((slot) => (
                              <button key={slot.start} type="button" onClick={() => setEventTime(slot.start)} className={`px-3 py-2 text-sm rounded-lg border ${eventTime === slot.start ? "bg-[#FF8C6B] text-white border border-[#FF8C6B]" : "border-stone-300 hover:border-[#FF8C6B]"}`}>
                                {slot.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-stone-500 py-2">{eventDate ? "No slots available" : "Select a date first"}</p>
                        )}
                      </div>
                    </div>
                    {/* Desktop Continue Button - Inside Card */}
                    <div className="hidden lg:flex justify-end items-center pt-4 border-t">
                      <Button className={`px-8 ${PRIMARY_BUTTON_CLASS}`} onClick={() => setStep(step + 1)} disabled={!canProceed()}>Continue<ArrowRight className="ml-2 h-4 w-4" /></Button>
                    </div>
                  </CardContent></Card>
                )}
                {isNanny && <div className="p-4 bg-[#FF8C6B]/10 rounded-lg"><p className="font-medium text-stone-900">Selected: {selectedNannyMenus.length}/4 menus {selectedNannyMenus.length === 4 && <span className="text-[#FF8C6B] ml-2">✓ Ready</span>}</p>{selectedNannyMenus.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{selectedNannyMenus.map(m => <Badge key={m.id} className="bg-[#FF8C6B] text-white">{m.name}<button onClick={() => toggleNannyMenu(m)} className="ml-1">×</button></Badge>)}</div>}</div>}
                
                {/* Desktop Continue Button for Nanny Class */}
                {isNanny && (
                  <div className="hidden lg:flex justify-end items-center pb-4">
                    <Button 
                      className={`px-8 ${PRIMARY_BUTTON_CLASS}`}
                      onClick={() => setStep(step + 1)} 
                      disabled={!canProceed()}
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}

                {loadingMenus ? (
                  <div className="flex items-center justify-center py-12 text-stone-500">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Loading menus...
                  </div>
                ) : null}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {!loadingMenus && getCurrentMenus().map(menu => {
                    const isSelected = isNanny ? selectedNannyMenus.some(m => m.id === menu.id) : selectedMenu?.id === menu.id;
                    const isDisabled = isNanny && selectedNannyMenus.length >= 4 && !isSelected;
                    const cap = activeCategory === "monthly" ? menuCapacities[menu.id] : undefined;
                    const isFull = cap !== undefined && cap !== null && cap.available <= 0;
                    return (
                      <Card key={menu.id} className={`cursor-pointer transition-all ${isSelected ? "ring-2 ring-[#FF8C6B] shadow-lg" : isDisabled ? "opacity-50" : "hover:shadow-md"}`} onClick={() => { if (isDisabled) return; if (isNanny) toggleNannyMenu(menu); else selectMenu(menu); }}>
                        <CardContent className="p-0 overflow-hidden flex flex-col h-full">
                          <div className="relative h-64 w-full bg-stone-200"><Image src={menu.image} alt={menu.name} fill className="object-cover" />{cap && !isFull && <div className="absolute top-2 left-2"><span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#FF8C6B]/15 text-[#FF8C6B]">{cap.available} spot{cap.available === 1 ? "" : "s"} left</span></div>}{isSelected && <div className="absolute top-2 right-2 bg-[#FF8C6B] text-white p-1 rounded-full"><Check className="h-4 w-4" /></div>}</div>
                          <div className="p-4 flex-1 flex flex-col">
                            <h3 className="text-xl font-bold text-stone-900 mb-3">{menu.name}</h3>
                            <div className="space-y-1 flex-1">{menu.dishes.map((d, i) => <div key={i} className="flex items-center gap-2 text-base text-stone-600"><Check className="h-3 w-3 text-[#ff7f5c]" /><span>{d}</span></div>)}</div>
                          </div>
                          {!isNanny && <div className="bg-stone-50 border-t px-4 py-3"><div className="flex items-center justify-between"><span className="text-base text-stone-500">per person</span><span className="text-xl font-bold text-stone-900">AED {menu.price}</span></div></div>}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Price Update Link */}
                <div className="mt-4">
                  <p className="text-base text-stone-600">
                    Need to see our whole pricelist, <a 
                      href="https://docs.google.com/spreadsheets/d/1V52xihcamaOT7HrcsAJcLKhUGvTADwVkYW3Oi7JGrJA/edit?usp=sharing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-900 underline hover:text-stone-700"
                    >
                      Click here
                    </a>
                  </p>
                </div>

              </div>
            )}
            {hasExtras && step === 2 && (
              <div className="space-y-6">
                <div><h2 className="text-2xl font-bold text-stone-900">Customize Your Event</h2><p className="text-stone-500 mt-1">Add extras (optional)</p></div>
                {loadingExtras ? (
                  <div className="flex items-center gap-2 py-6 text-stone-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading extras...
                  </div>
                ) : corporateExtras.length === 0 ? (
                  <p className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500">
                    No extras are currently available.
                  </p>
                ) : extraCategoryOrder.map(cat => {
                  const catExtras = corporateExtras.filter(e => e.category === cat);
                  if (!catExtras.length) return null;
                  return (
                    <div key={cat}><h3 className="font-semibold text-stone-900 mb-3">{extraCategoryLabels[cat] || cat}</h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {catExtras.map(extra => {
                          const Icon = extra.icon;
                          const qty = selectedExtras[extra.id] || 0;
                          return (
                            <Card key={extra.id} className={qty > 0 ? "ring-2 ring-[#FF8C6B]" : ""}>
                              <CardContent className="p-4 flex items-start gap-3">
                                <div className="flex-shrink-0">
                                  {extra.image ? (
                                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-stone-100">
                                      <Image src={extra.image} alt={extra.name} fill className="object-cover" />
                                    </div>
                                  ) : (
                                    <div className="p-2 bg-stone-100 rounded-lg"><Icon className="h-5 w-5 text-stone-600" /></div>
                                  )}
                                </div>
                                <div className="flex-1"><h4 className="font-medium text-stone-900">{extra.name}</h4><p className="text-sm text-stone-500">{extra.description}</p><p className="text-sm font-bold text-stone-900 mt-1">AED {extra.price}</p></div>
                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedExtras(p => ({ ...p, [extra.id]: Math.max(0, (p[extra.id] || 0) - 1) }))} disabled={qty === 0}><Minus className="h-3 w-3" /></Button>
                                  <span className="w-6 text-center font-bold">{qty}</span>
                                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedExtras(p => ({ ...p, [extra.id]: (p[extra.id] || 0) + 1 }))}><Plus className="h-3 w-3" /></Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {/* Navigation Buttons - Desktop */}
                <div className="hidden lg:flex justify-between items-center pt-6 border-t">
                  <Button variant="outline" onClick={() => setStep(step - 1)} className="px-6 font-bold"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
                  <Button className={`px-8 ${PRIMARY_BUTTON_CLASS}`} onClick={() => setStep(step + 1)}>Continue<ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </div>
            )}
            {step === (hasExtras ? 3 : 2) && (
              <div className="space-y-6">
                <div><h2 className="text-2xl font-bold text-stone-900">Your Details</h2><p className="text-stone-500 mt-1">Tell us about you and your event</p></div>
                <Card><CardContent className="p-6 space-y-4">
                  {activeCategory === "monthly" && selectedMenu && (() => {
                    const cap = menuCapacities[selectedMenu.id];
                    if (!cap) return null;
                    return (
                      <div className="px-4 py-3 rounded-xl bg-[#FF8C6B]/10 border border-[#FF8C6B]/25">
                        <p className="text-sm font-bold text-[#FF8C6B]">{cap.available === 1 ? "Only 1 spot remaining!" : `${cap.available} spots remaining for this class`}</p>
                        <p className="text-xs text-[#FF8C6B]/70 mt-0.5">{cap.booked} of {cap.allowed} spots already booked</p>
                      </div>
                    );
                  })()}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className="block text-base font-bold text-stone-700 mb-1">Your Name *</label><input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full px-4 py-2 border border-stone-300 rounded-lg" required /></div>
                    <div><label className="block text-base font-bold text-stone-700 mb-1">Email *</label><input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="w-full px-4 py-2 border border-stone-300 rounded-lg" required /></div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className="block text-base font-bold text-stone-700 mb-1">Phone</label><input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full px-4 py-2 border border-stone-300 rounded-lg" /></div>
                    {isCorporate && <div><label className="block text-base font-bold text-stone-700 mb-1">Company Name</label><input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full px-4 py-2 border border-stone-300 rounded-lg" /></div>}
                  </div>
                  {isNanny ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-base font-bold text-stone-900">Class Schedule *</h3>
                        <p className="text-base text-stone-500">Choose a date and time slot for each selected menu.</p>
                      </div>
                      <div className="space-y-4">
                        {selectedNannyMenus.map((menu, index) => {
                          const schedule = getNannySchedule(menu.id);
                          return (
                            <div key={menu.id} className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-base font-bold text-stone-500">Session {index + 1}</p>
                                  <h4 className="font-bold text-stone-900">{menu.name}</h4>
                                </div>
                                {schedule.date && schedule.time ? (
                                  <span className="rounded-full bg-[#FF8C6B]/15 px-3 py-1 text-xs font-bold text-[#FF8C6B]">Scheduled</span>
                                ) : (
                                  <span className="rounded-full bg-[#FF8C6B]/15 px-3 py-1 text-xs font-bold text-[#FF8C6B]">Required</span>
                                )}
                              </div>
                              <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-base font-bold text-stone-700 mb-1">
                                    <Calendar className="inline h-4 w-4 mr-1" />
                                    Date *
                                  </label>
                                  <MonthlyAvailableDatePicker
                                    value={schedule.date}
                                    onChange={(date) => updateNannyScheduleDate(menu.id, date)}
                                    today={today}
                                    restrictToAvailableDates={false}
                                  />
                                </div>
                                <div>
                                  <label className="block text-base font-bold text-stone-700 mb-1">
                                    <Clock className="inline h-4 w-4 mr-1" />
                                    Time Slot *
                                  </label>
                                  {schedule.loading ? (
                                    <div className="flex items-center gap-2 py-2 text-stone-500">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Loading...
                                    </div>
                                  ) : schedule.date && schedule.availableTimeSlots.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2">
                                      {schedule.availableTimeSlots.map((slot) => {
                                        return (
                                          <button
                                            key={slot.start}
                                            type="button"
                                            onClick={() => updateNannyScheduleTime(menu.id, slot.start)}
                                            className={`px-3 py-2 text-sm rounded-lg border ${
                                              schedule.time === slot.start
                                                ? "bg-[#FF8C6B] text-white border border-[#FF8C6B]"
                                                : "border-stone-300 bg-white hover:border-[#FF8C6B]"
                                            }`}
                                          >
                                            {slot.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-stone-500 py-2">{schedule.date ? "No slots available" : "Select a date first"}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  {false && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-base font-bold text-stone-700 mb-1">
                          <Calendar className="inline h-4 w-4 mr-1" />
                          Event Date *
                        </label>
                        {isMonthly ? (
                          loadingMonthlyDates ? (
                            <div className="flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-3 text-stone-500">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading dates...
                            </div>
                          ) : (
                            <MonthlyAvailableDatePicker
                              availableDates={monthlyAvailableDates}
                              value={eventDate}
                              onChange={setEventDate}
                              today={today}
                            />
                          )
                        ) : (
                          <MonthlyAvailableDatePicker
                            value={eventDate}
                            onChange={setEventDate}
                            today={today}
                            restrictToAvailableDates={false}
                          />
                        )}
                      </div>
                      <div><label className="block text-base font-bold text-stone-700 mb-1"><Clock className="inline h-4 w-4 mr-1" />Time Slot *</label>
                        {loadingSlots ? <div className="flex items-center gap-2 py-2 text-stone-500"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div> : eventDate && displayedTimeSlots.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">{displayedTimeSlots.map((slot) => { return (<button key={slot.start} type="button" onClick={() => setEventTime(slot.start)} className={`px-3 py-2 text-sm rounded-lg border ${eventTime === slot.start ? "bg-[#FF8C6B] text-white border border-[#FF8C6B]" : "border-stone-300 hover:border-[#FF8C6B]"}`}>{slot.label}</button>); })}</div>
                        ) : <p className="text-sm text-stone-500 py-2">{eventDate ? "No slots available" : "Select a date first"}</p>}
                      </div>
                    </div>
                  )}
                  <div><label className="block text-base font-bold text-stone-700 mb-1">Special Requests</label><textarea value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} rows={3} placeholder="Any dietary restrictions or special requests..." className="w-full px-4 py-2 border border-stone-300 rounded-lg" /></div>
                </CardContent></Card>
                {/* Navigation Buttons - Desktop */}
                <div className="hidden lg:flex justify-between items-center pt-6 border-t">
                  <Button variant="outline" onClick={() => setStep(step - 1)} className="px-6 font-bold"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
                  <Button className={`px-8 ${PRIMARY_BUTTON_CLASS}`} onClick={() => setStep(step + 1)} disabled={!canProceed()}>Continue<ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </div>
            )}
            {step === maxStep && (
              <div className="space-y-6">
                <div><h2 className="text-2xl font-bold text-stone-900">Confirm Your Booking</h2></div>
                <Card><CardContent className="p-6 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4 text-base">
                    <div><span className="font-bold text-stone-700">Category:</span><span className="ml-2 font-bold text-stone-900">{currentConfig.label}</span></div>
                    <div><span className="font-bold text-stone-700">Package:</span><span className="ml-2 font-bold text-stone-900">{isNanny ? `${selectedNannyMenus.length} Menus` : selectedMenu?.name}</span></div>
                    {!isNanny && <div><span className="font-bold text-stone-700">Guests:</span><span className="ml-2 font-bold text-stone-900">{guestCount}</span></div>}
                    {!isNanny && <div><span className="font-bold text-stone-700">Date:</span><span className="ml-2 font-bold text-stone-900">{eventDate}</span></div>}
                    {!isNanny && <div><span className="font-bold text-stone-700">Time:</span><span className="ml-2 font-bold text-stone-900">{eventTime}</span></div>}
                  </div>
                  {isNanny && (
                    <div className="rounded-lg bg-stone-50 p-4">
                      <h3 className="font-bold text-stone-900 mb-3">Class Schedule</h3>
                      <div className="space-y-2">
                        {nannyScheduleItems.map((item) => (
                          <div key={item.id} className="flex flex-col gap-1 rounded-md border border-stone-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                            <span className="font-medium text-stone-900">Session {item.session}: {item.name}</span>
                            <span className="text-sm text-stone-600">{item.event_date} • {item.time_label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Ticket className="h-5 w-5 text-[#FF8C6B]" />
                      <h3 className="font-bold text-stone-900">Claim Voucher</h3>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="text"
                        value={voucherCode}
                        onChange={(e) => {
                          setVoucherCode(e.target.value.toUpperCase());
                          if (appliedVoucher) setAppliedVoucher(null);
                        }}
                        placeholder="Enter voucher code"
                        className="flex-1 rounded-lg border border-stone-300 px-4 py-2 uppercase tracking-wider"
                      />
                      {appliedVoucher ? (
                        <Button variant="outline" onClick={removeVoucher} className="font-bold">Remove</Button>
                      ) : (
                        <Button
                          onClick={handleApplyVoucher}
                          disabled={applyingVoucher || !voucherCode.trim()}
                          className={PRIMARY_BUTTON_CLASS}
                        >
                          {applyingVoucher && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Apply
                        </Button>
                      )}
                    </div>
                    {voucherError && <p className="mt-3 text-sm font-medium text-red-600">{voucherError}</p>}
                    {appliedVoucher && (
                      <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                        Voucher {appliedVoucher.code} applied. AED {voucherDiscount} will be deducted from your total.
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl border border-stone-200 p-4">
                    <div className="space-y-3 border-b border-stone-200 pb-3">
                      <div className="flex items-start justify-between gap-4 text-base">
                        <div>
                          <p className="font-bold text-stone-900">{isNanny ? "Nanny Class (4 Sessions)" : selectedMenu?.name}</p>
                          <p className="text-sm text-stone-500">
                            {isNanny
                              ? "4-session package"
                              : `${guestCount} guests x AED ${selectedMenu?.price.toLocaleString() || 0}`}
                          </p>
                        </div>
                        <span className="font-bold text-stone-900">AED {baseAmount.toLocaleString()}</span>
                      </div>

                      {isNanny && nannyScheduleItems.length > 0 && (
                        <div className="rounded-lg bg-stone-50 px-3 py-2">
                          <p className="text-sm font-bold text-stone-700">Selected Classes</p>
                          <div className="mt-1 space-y-1">
                            {nannyScheduleItems.map((item) => (
                              <p key={item.id} className="text-sm text-stone-600">
                                Session {item.session}: {item.name}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedExtraItems.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-bold text-stone-700">Extras</p>
                          {selectedExtraItems.map((extra) => (
                            <div key={extra.id} className="flex items-start justify-between gap-4 text-sm">
                              <span className="text-stone-600">{extra.name} x {extra.quantity}</span>
                              <span className="font-medium text-stone-900">AED {extra.total.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex justify-between text-base">
                      <span className="font-bold text-stone-700">Subtotal</span>
                      <span className="font-bold text-stone-900">AED {totalAmount.toLocaleString()}</span>
                    </div>
                    {voucherDiscount > 0 && (
                      <div className="mt-2 flex justify-between text-base text-green-700">
                        <span className="font-bold">Voucher discount</span>
                        <span className="font-bold">-AED {voucherDiscount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="mt-3 border-t pt-3 flex justify-between text-lg">
                      <span className="font-bold text-stone-900">{requiresDeposit ? "Deposit Due" : "Total Due"}</span>
                      <span className="font-bold text-[#FF8C6B]">AED {depositAmount.toLocaleString()}</span>
                    </div>
                    {requiresDeposit && (
                      <p className="mt-1 text-sm text-stone-500">Balance due later: AED {balanceAmount.toLocaleString()}</p>
                    )}
                  </div>
                </CardContent></Card>
                {/* Navigation Buttons - Desktop */}
                <div className="hidden lg:flex justify-between items-center pt-6 border-t">
                  <Button variant="outline" onClick={() => setStep(step - 1)} className="px-6 font-bold"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
                  <Button className={`px-8 ${PRIMARY_BUTTON_CLASS}`} onClick={() => handleSubmit()} disabled={submitting || !canProceed()}>{submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{submitting ? "Processing..." : "Pay Now"}{!submitting && <ArrowRight className="ml-2 h-4 w-4" />}</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating booking action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:pl-8 lg:pr-32">
          {(selectedMenu || (isNanny && selectedNannyMenus.length > 0)) ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-stone-900 sm:text-base">
                  {isNanny ? `Nanny Class • ${selectedNannyMenus.length} menus` : `${selectedMenu?.name} • ${guestCount} guests`}
                </p>
                <p className="text-xs font-bold text-stone-600 sm:text-sm">
                  Step {step} of {maxStep} • AED {discountedTotalAmount.toLocaleString()}
                </p>
              </div>
              
              <div className="flex flex-shrink-0 items-center gap-2">
                {step > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep(step - 1)}
                    className="px-3 font-bold"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                
                {step < maxStep ? (
                  <Button
                    className={PRIMARY_BUTTON_CLASS}
                    onClick={() => setStep(step + 1)}
                    disabled={!canProceed()}
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    className={PRIMARY_BUTTON_CLASS}
                    onClick={() => handleSubmit()}
                    disabled={submitting || !canProceed()}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Pay Now
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-stone-600 text-base font-bold py-2">Select a menu to continue</p>
          )}
        </div>
      </div>

      {/* Bottom padding to account for floating bar */}
      <div className="h-24" />
    </div>
  );
}
