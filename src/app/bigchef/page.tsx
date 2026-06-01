"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ArrowRight, Check, Clock, Calendar, Minus, Plus, Loader2,
  Gift, Cake, PartyPopper, Utensils, ChefHat, MessageCircle, X, AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BigChefPageContent, defaultBigChefContent } from "@/types/site-content";

interface MenuItem { id: string; name: string; price: number; image: string; dishes: string[]; category: string; scheduled_date?: string | null; }
interface ExtraItem { id: string; name: string; description: string; price: number; icon: LucideIcon; category: string; image?: string; }
interface TimeSlot { start: string; end: string; duration: number; label: string; days?: number[]; }
type CategoryType = "corporate" | "classics" | "monthly" | "teenagers" | "nanny";

const AVAILABILITY_CATEGORY_BY_TAB: Record<CategoryType, string> = {
  corporate: "corporate",
  classics: "classics_big",
  monthly: "monthly_big",
  teenagers: "teenagers",
  nanny: "nanny",
};

const getCategoryConfig = (pageContent: BigChefPageContent): Record<CategoryType, { label: string; icon: string; minGuests: number; maxGuests: number; description: string }> => ({
  corporate: { label: "Corporate / Private", icon: pageContent.categoryIcons?.corporate || "/icons/knives.png", minGuests: 6, maxGuests: 35, description: "2-hour hands-on cooking experience with professional chefs" },
  classics: { label: "Our Classics", icon: pageContent.categoryIcons?.classics || "/icons/whisk.png", minGuests: 1, maxGuests: 35, description: "Classic cooking experiences for groups" },
  monthly: { label: "Monthly Specials", icon: pageContent.categoryIcons?.monthly || "/icons/knives.png", minGuests: 1, maxGuests: 35, description: "Seasonal rotating menus" },
  teenagers: { label: "Teenager Course", icon: pageContent.categoryIcons?.teenagers || "/icons/whisk.png", minGuests: 1, maxGuests: 20, description: "Fun cooking classes for teens aged 12-17" },
  nanny: { label: "Nanny Class", icon: pageContent.categoryIcons?.nanny || "/icons/knives.png", minGuests: 1, maxGuests: 10, description: "Mummy's Fabulous Helpers - Turn your housekeeper into a chef" },
});


const corporateExtras: ExtraItem[] = [
  { id: "custom_apron", name: "Customized Apron", description: "Personalized apron with name", price: 80, icon: Gift, category: "custom", image: "/personalized-items/apron.jpg" },
  { id: "custom_spatula", name: "Customized Spatula", description: "Personalized spatula", price: 50, icon: Utensils, category: "custom", image: "/personalized-items/spatula.jpg" },
  { id: "custom_chef_hat", name: "Customized Chef Hat", description: "Personalized chef hat", price: 60, icon: ChefHat, category: "custom", image: "/personalized-items/chef-hat.jpg" },
  { id: "custom_mug", name: "Customized Mugs", description: "Personalized mug", price: 45, icon: Gift, category: "custom", image: "/personalized-items/mugs.jpg" },
  { id: "cake_10", name: "Customized Cakes (10 persons)", description: "Custom designed cake", price: 575, icon: Cake, category: "cake" },
  { id: "cake_20", name: "Customized Cakes (20 persons)", description: "Custom designed cake", price: 700, icon: Cake, category: "cake" },
  { id: "cake_30", name: "Customized Cakes (30 persons)", description: "Custom designed cake", price: 900, icon: Cake, category: "cake" },
  { id: "table_10", name: "Table Set Up (10 persons)", description: "Full table setting", price: 300, icon: Utensils, category: "decor" },
  { id: "table_20", name: "Table Set Up (20 persons)", description: "Full table setting", price: 400, icon: Utensils, category: "decor" },
  { id: "table_30", name: "Table Set Up (30 persons)", description: "Full table setting", price: 500, icon: Utensils, category: "decor" },
  { id: "balloons", name: "Balloons (14 pcs)", description: "2 bunches of 7 balloons", price: 260, icon: PartyPopper, category: "decor" },
  { id: "mini_pizzas", name: "Mini Pizzas (12pcs)", description: "Delicious mini pizzas", price: 50, icon: Utensils, category: "snacks", image: "/snacks-and-drinks/SMILEY PIZZA.jpeg" },
  { id: "chicken_tenders", name: "Chicken Tenders (12pcs)", description: "Crispy chicken tenders", price: 60, icon: Utensils, category: "snacks", image: "/snacks-and-drinks/CHICKEN TENDERS.jpeg" },
  { id: "mini_burgers", name: "Mini Burgers (6pcs)", description: "Mini burgers", price: 70, icon: Utensils, category: "snacks", image: "/snacks-and-drinks/mini burgers.jpeg" },
  { id: "musakhan", name: "Musakhan Rolls", description: "Delicious rolls", price: 50, icon: Utensils, category: "snacks", image: "/snacks-and-drinks/MUSAKHAN ROLLS.jpeg" },
  { id: "juice", name: "Juices (per pc)", description: "Fresh juice", price: 8, icon: Utensils, category: "snacks" },
  { id: "soft_drinks", name: "Soft Drinks (per pc)", description: "Soft drink", price: 15, icon: Utensils, category: "snacks" },
];

function WaiverModal({ isOpen, onClose, onAccept }: { isOpen: boolean; onClose: () => void; onAccept: () => void }) {
  const [hasRead, setHasRead] = useState(false);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-red-600 text-white p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">WAIVER FORM</h2>
          <button onClick={onClose} className="p-1 hover:bg-red-700 rounded"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <h3 className="text-lg font-bold text-center mb-4">Cooking Class Waiver & Acknowledgement — Mamalu Kitchen Studio</h3>
          <div className="space-y-4 text-sm text-stone-700">
            <p>By completing this booking, I confirm that I am the participant or authorized representative and give permission to attend and participate in the cooking class at Mamalu Kitchen Studio. I understand that cooking activities involve the use of kitchen tools, utensils, heat sources, and food ingredients, and while Mamalu Kitchen Studio maintains a safe, supervised environment, minor injuries such as cuts, burns, slips, or allergic reactions may occur.</p>
            <p className="text-red-600">I confirm that I have informed Mamalu Kitchen Studio of any allergies, medical conditions, dietary restrictions, or special needs prior to the class. I understand that classes take place in a shared kitchen environment where cross-contact with allergens may occur despite careful handling procedures.</p>
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
            <Button onClick={onAccept} disabled={!hasRead} className="flex-1 bg-[#f5e6dc] hover:bg-[#f0ddd0] text-stone-800 border border-stone-300">I Accept & Continue</Button>
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

  // Fetch page content
  useEffect(() => {
    fetch("/api/site-content?page=bigchef")
      .then((res) => res.json())
      .then((data) => setPageContent(data))
      .catch(() => setPageContent(defaultBigChefContent));
  }, []);

  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [allTimeSlots, setAllTimeSlots] = useState<TimeSlot[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [showWaiverModal, setShowWaiverModal] = useState(false);

  const categoryConfig = getCategoryConfig(pageContent);
  const currentConfig = categoryConfig[activeCategory];
  const isCorporate = activeCategory === "corporate";
  const isNanny = activeCategory === "nanny";
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

  const getCurrentMenus = (): MenuItem[] => menuItemsByCategory[activeCategory] || [];

  useEffect(() => {
    setSelectedMenu(null);
    setSelectedNannyMenus([]);
    setGuestCount(currentConfig.minGuests);
    setSelectedExtras({});
    setStep(1);
    setEventDate("");
    setEventTime("");
  }, [activeCategory]);

  // Check if current selection is a monthly special with fixed date
  const isMonthlySpecial = activeCategory === "monthly" && selectedMenu?.scheduled_date;

  // Auto-populate date/time when a monthly special is selected
  useEffect(() => {
    if (activeCategory === "monthly" && selectedMenu?.scheduled_date) {
      const scheduledDate = new Date(selectedMenu.scheduled_date);
      const dateStr = scheduledDate.toISOString().split('T')[0];
      const hours = scheduledDate.getHours();
      const minutes = scheduledDate.getMinutes();
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      setEventDate(dateStr);
      setEventTime(timeStr);
    }
  }, [selectedMenu, activeCategory]);

  useEffect(() => {
    // Skip fetching slots if this is a monthly special (date is fixed)
    if (isMonthlySpecial) return;
    if (!eventDate) { setAllTimeSlots([]); setAvailableTimeSlots([]); return; }
    setLoadingSlots(true);
    setEventTime("");
    fetch(`/api/services/availability?date=${eventDate}&category=${AVAILABILITY_CATEGORY_BY_TAB[activeCategory]}`)
      .then(res => res.json())
      .then(data => { setAllTimeSlots(data.allSlots || []); setAvailableTimeSlots(data.availableSlots || []); })
      .finally(() => setLoadingSlots(false));
  }, [eventDate, activeCategory, isMonthlySpecial]);

  const toggleNannyMenu = (menu: MenuItem) => {
    setSelectedNannyMenus(prev => {
      const isSelected = prev.some(m => m.id === menu.id);
      if (isSelected) return prev.filter(m => m.id !== menu.id);
      if (prev.length < 4) return [...prev, menu];
      return prev;
    });
  };

  const baseAmount = isNanny ? 1200 : (selectedMenu?.price || 0) * guestCount;
  const extrasTotal = Object.entries(selectedExtras).reduce((t, [id, qty]) => t + (corporateExtras.find(e => e.id === id)?.price || 0) * qty, 0);
  const totalAmount = baseAmount + extrasTotal;
  const requiresDeposit = isCorporate;
  const depositAmount = requiresDeposit ? Math.ceil(totalAmount * 0.5) : totalAmount;
  const balanceAmount = requiresDeposit ? totalAmount - depositAmount : 0;

  const handleSubmit = async () => {
    if (!isNanny && !selectedMenu) return;
    if (isNanny && selectedNannyMenus.length !== 4) return;
    if (!waiverAccepted) { setShowWaiverModal(true); return; }
    setSubmitting(true);
    try {
      const extrasData = corporateExtras.filter(e => selectedExtras[e.id]).map(e => ({ id: e.id, name: e.name, price: e.price, quantity: selectedExtras[e.id] }));
      const menuData = isNanny ? { menuId: selectedNannyMenus.map(m => m.id).join(","), menuName: selectedNannyMenus.map(m => m.name).join(", "), menuPrice: 1200 } : { menuId: selectedMenu?.id, menuName: selectedMenu?.name, menuPrice: selectedMenu?.price };
      const res = await fetch("/api/services/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceType: "corporate_deck", serviceName: `Big Chef - ${currentConfig.label}`, packageName: isNanny ? "Nanny Class (4 Sessions)" : selectedMenu?.name, ...menuData, customerName, customerEmail, customerPhone, companyName, eventDate, eventTime, guestCount: isNanny ? 1 : guestCount, extras: extrasData, baseAmount, extrasAmount: extrasTotal, totalAmount, isDepositPayment: requiresDeposit, depositAmount: requiresDeposit ? depositAmount : null, balanceAmount: requiresDeposit ? balanceAmount : null, specialRequests, waiverAccepted, category: activeCategory }),
      });
      if (res.ok) { const data = await res.json(); if (data.checkoutUrl) window.location.href = data.checkoutUrl; }
      else { const error = await res.json(); alert(error.error || "Failed to create booking"); }
    } catch { alert("An error occurred"); } finally { setSubmitting(false); }
  };

  const handleWaiverAccept = () => { setWaiverAccepted(true); setShowWaiverModal(false); handleSubmit(); };
  const today = new Date().toISOString().split("T")[0];
  const stepLabels = hasExtras ? { 1: "Package", 2: "Customize", 3: "Details", 4: "Confirm" } : { 1: "Package", 2: "Details", 3: "Confirm" };
  const canProceed = () => {
    if (step === 1) return isNanny ? selectedNannyMenus.length === 4 : selectedMenu !== null;
    if (hasExtras && step === 2) return true;
    const detailsStep = hasExtras ? 3 : 2;
    if (step === detailsStep) return customerName && customerEmail && eventDate && eventTime;
    return true;
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <WaiverModal isOpen={showWaiverModal} onClose={() => setShowWaiverModal(false)} onAccept={handleWaiverAccept} />
      <div className="bg-white border-b relative overflow-hidden">
        {/* Animated knives/whisk icons for Big Chef */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden lg:block">
          <Image src={pageContent.headerImage} alt="" width={50} height={50} className="float-medium opacity-70" />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button onClick={() => window.dispatchEvent(new CustomEvent("openMamaluMenu"))} className="p-2 hover:bg-stone-100 rounded-full"><ArrowLeft className="h-5 w-5" /></button>
            <div className="hidden lg:block">
              <Image src={pageContent.headerIcon} alt="" width={60} height={60} className="float-gentle opacity-70" />
            </div>
            <div><h1 className="text-2xl text-black" style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 900 }}>{pageContent.pageTitle}</h1><p className="text-black text-sm" style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 700 }}>{pageContent.pageSubtitle}</p></div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="space-y-6">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 sm:gap-3 p-1 sm:p-2 bg-stone-100 rounded-2xl sm:rounded-full">
              {(Object.keys(categoryConfig) as CategoryType[]).map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3 py-2 sm:px-6 sm:py-3 rounded-full font-bold transition-all text-xs sm:text-base flex items-center gap-1 sm:gap-2 ${activeCategory === cat ? "bg-[#f5e6dc] text-stone-900 border border-stone-300 shadow-md" : "text-stone-700 hover:bg-stone-200"}`}><Image src={categoryConfig[cat].icon} alt="" width={28} height={28} className="w-5 h-5 sm:w-7 sm:h-7" /> {categoryConfig[cat].label}</button>
              ))}
            </div>
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl text-black" style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 900 }}>{isNanny ? "Select 4 Menus for Your Course" : "Pick your perfect Menu"}</h2>
                  <p className="text-stone-500 mt-1">{currentConfig.description}</p>
                  {isNanny ? <div className="mt-3 p-4 bg-amber-50 rounded-lg border border-amber-200"><p className="text-lg font-bold text-amber-800">AED 1,200 for 4 classes</p><p className="text-sm text-amber-700 mt-1">Select any 4 menus. Each class is 1.5 hours. Available Monday and Tuesday at 11am</p></div> : <p className="text-sm text-stone-400 mt-2">Min: {currentConfig.minGuests} • Max: {currentConfig.maxGuests} guests • Price per person</p>}
                </div>
                {!isNanny && (
                  <Card><CardContent className="p-5">
                    <label className="block text-lg font-bold text-stone-900 mb-3">Number of Guests</label>
                    <div className="flex items-center gap-4 mb-4 lg:mb-6">
                      <Button variant="outline" size="icon" onClick={() => setGuestCount(Math.max(currentConfig.minGuests, guestCount - 1))} disabled={guestCount <= currentConfig.minGuests}><Minus className="h-4 w-4" /></Button>
                      <span className="text-2xl font-bold w-12 text-center">{guestCount}</span>
                      <Button variant="outline" size="icon" onClick={() => setGuestCount(Math.min(currentConfig.maxGuests, guestCount + 1))} disabled={guestCount >= currentConfig.maxGuests}><Plus className="h-4 w-4" /></Button>
                      <span className="text-sm font-bold text-stone-600">(Min: {currentConfig.minGuests}, Max: {currentConfig.maxGuests})</span>
                    </div>
                    {/* Desktop Continue Button - Inside Card */}
                    <div className="hidden lg:flex justify-end items-center pt-4 border-t">
                      <Button className="bg-stone-900 hover:bg-stone-800 text-white px-8 font-bold" onClick={() => setStep(step + 1)} disabled={!canProceed()}>Continue<ArrowRight className="ml-2 h-4 w-4" /></Button>
                    </div>
                  </CardContent></Card>
                )}
                {isNanny && <div className="p-4 bg-stone-100 rounded-lg"><p className="font-medium text-stone-900">Selected: {selectedNannyMenus.length}/4 menus {selectedNannyMenus.length === 4 && <span className="text-green-600 ml-2">✓ Ready</span>}</p>{selectedNannyMenus.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{selectedNannyMenus.map(m => <Badge key={m.id} className="bg-stone-900 text-white">{m.name}<button onClick={() => toggleNannyMenu(m)} className="ml-1">×</button></Badge>)}</div>}</div>}
                
                {/* Desktop Continue Button for Nanny Class */}
                {isNanny && (
                  <div className="hidden lg:flex justify-end items-center pb-4">
                    <Button 
                      className="bg-stone-900 hover:bg-stone-800 text-white px-8 font-bold" 
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
                    return (
                      <Card key={menu.id} className={`cursor-pointer transition-all ${isSelected ? "ring-2 ring-stone-900 shadow-lg" : isDisabled ? "opacity-50" : "hover:shadow-md"}`} onClick={() => { if (!isDisabled) { if (isNanny) toggleNannyMenu(menu); else setSelectedMenu(menu); } }}>
                        <CardContent className="p-0 overflow-hidden flex flex-col h-full">
                          <div className="relative h-40 w-full bg-stone-200"><Image src={menu.image} alt={menu.name} fill className="object-cover" />{isSelected && <div className="absolute top-2 right-2 bg-[#f5e6dc] text-stone-800 p-1 rounded-full"><Check className="h-4 w-4" /></div>}</div>
                          <div className="p-4 flex-1 flex flex-col">
                            <h3 className="text-xl font-bold text-stone-900 mb-3">{menu.name}</h3>
                            <div className="space-y-1 flex-1">{menu.dishes.map((d, i) => <div key={i} className="flex items-center gap-2 text-sm text-stone-600"><Check className="h-3 w-3 text-[#ff7f5c]" /><span>{d}</span></div>)}</div>
                          </div>
                          {!isNanny && <div className="bg-stone-50 border-t px-4 py-3"><div className="flex items-center justify-between"><span className="text-sm text-stone-500">per person</span><span className="text-xl font-bold text-stone-900">AED {menu.price}</span></div></div>}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Price Update Link */}
                <div className="mt-4">
                  <p className="text-sm text-stone-600">
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
                {["custom", "cake", "decor", "snacks"].map(cat => {
                  const catExtras = corporateExtras.filter(e => e.category === cat);
                  if (!catExtras.length) return null;
                  const labels: Record<string, string> = { custom: "Personalized Items", cake: "Cakes", decor: "Decorations & Setup", snacks: "Snacks & Drinks" };
                  return (
                    <div key={cat}><h3 className="font-semibold text-stone-900 mb-3">{labels[cat]}</h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {catExtras.map(extra => {
                          const Icon = extra.icon;
                          const qty = selectedExtras[extra.id] || 0;
                          return (
                            <Card key={extra.id} className={qty > 0 ? "ring-2 ring-stone-900" : ""}>
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
                                <div className="flex-1"><h4 className="font-medium text-stone-900">{extra.name}</h4><p className="text-xs text-stone-500">{extra.description}</p><p className="text-sm font-bold text-stone-900 mt-1">AED {extra.price}</p></div>
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
                  <Button className="bg-stone-900 hover:bg-stone-800 text-white px-8 font-bold" onClick={() => setStep(step + 1)}>Continue<ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </div>
            )}
            {step === (hasExtras ? 3 : 2) && (
              <div className="space-y-6">
                <div><h2 className="text-2xl font-bold text-stone-900">Your Details</h2><p className="text-stone-500 mt-1">Tell us about you and your event</p></div>
                <Card><CardContent className="p-6 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className="block text-base font-bold text-stone-700 mb-1">Your Name *</label><input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full px-4 py-2 border border-stone-300 rounded-lg" required /></div>
                    <div><label className="block text-base font-bold text-stone-700 mb-1">Email *</label><input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="w-full px-4 py-2 border border-stone-300 rounded-lg" required /></div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className="block text-base font-bold text-stone-700 mb-1">Phone</label><input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full px-4 py-2 border border-stone-300 rounded-lg" /></div>
                    {isCorporate && <div><label className="block text-base font-bold text-stone-700 mb-1">Company Name</label><input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full px-4 py-2 border border-stone-300 rounded-lg" /></div>}
                  </div>
                  {isMonthlySpecial ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm font-medium text-amber-800 mb-3">
                        <Calendar className="inline h-4 w-4 mr-1" />
                        This monthly special has a fixed schedule:
                      </p>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-amber-700 mb-1">Event Date</label>
                          <div className="px-4 py-2 bg-white border border-amber-300 rounded-lg text-stone-900 font-medium">
                            {new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-amber-700 mb-1">Time</label>
                          <div className="px-4 py-2 bg-white border border-amber-300 rounded-lg text-stone-900 font-medium">
                            {selectedMenu?.scheduled_date ? new Date(selectedMenu.scheduled_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : eventTime}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div><label className="block text-base font-bold text-stone-700 mb-1"><Calendar className="inline h-4 w-4 mr-1" />Event Date *</label><input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} min={today} className="w-full px-4 py-2 border border-stone-300 rounded-lg" required /></div>
                      <div><label className="block text-base font-bold text-stone-700 mb-1"><Clock className="inline h-4 w-4 mr-1" />Time Slot *</label>
                        {loadingSlots ? <div className="flex items-center gap-2 py-2 text-stone-500"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div> : eventDate && allTimeSlots.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">{allTimeSlots.map((slot) => { const isAvailable = availableTimeSlots.some((s) => s.start === slot.start); return (<button key={slot.start} type="button" disabled={!isAvailable} onClick={() => setEventTime(slot.start)} className={`px-3 py-2 text-sm rounded-lg border ${eventTime === slot.start ? "bg-[#f5e6dc] text-stone-800 border border-stone-300" : isAvailable ? "border-stone-300 hover:border-stone-900" : "bg-stone-100 text-stone-400 cursor-not-allowed line-through"}`}>{slot.label}</button>); })}</div>
                        ) : <p className="text-sm text-stone-500 py-2">{eventDate ? "No slots available" : "Select a date first"}</p>}
                      </div>
                    </div>
                  )}
                  <div><label className="block text-base font-bold text-stone-700 mb-1">Special Requests</label><textarea value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} rows={3} placeholder="Any dietary restrictions or special requests..." className="w-full px-4 py-2 border border-stone-300 rounded-lg" /></div>
                </CardContent></Card>
                {/* Navigation Buttons - Desktop */}
                <div className="hidden lg:flex justify-between items-center pt-6 border-t">
                  <Button variant="outline" onClick={() => setStep(step - 1)} className="px-6 font-bold"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
                  <Button className="bg-stone-900 hover:bg-stone-800 text-white px-8 font-bold" onClick={() => setStep(step + 1)} disabled={!canProceed()}>Continue<ArrowRight className="ml-2 h-4 w-4" /></Button>
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
                    <div><span className="font-bold text-stone-700">Date:</span><span className="ml-2 font-bold text-stone-900">{eventDate}</span></div>
                    <div><span className="font-bold text-stone-700">Time:</span><span className="ml-2 font-bold text-stone-900">{eventTime}</span></div>
                  </div>
                  {/* Payment Info - Hidden per client request */}
                </CardContent></Card>
                {/* Navigation Buttons - Desktop */}
                <div className="hidden lg:flex justify-between items-center pt-6 border-t">
                  <Button variant="outline" onClick={() => setStep(step - 1)} className="px-6 font-bold"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
                  <Button className="bg-stone-900 hover:bg-stone-800 text-white px-8 font-bold" onClick={handleSubmit} disabled={submitting || !canProceed()}>{submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{submitting ? "Processing..." : "Pay Now"}{!submitting && <ArrowRight className="ml-2 h-4 w-4" />}</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Floating Order Summary Bar - Deliveroo Style */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="px-4 py-3">
          {(selectedMenu || (isNanny && selectedNannyMenus.length > 0)) ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-stone-900">
                  {isNanny ? `Nanny Class • ${selectedNannyMenus.length} menus` : `${selectedMenu?.name} • ${guestCount} guests`}
                </p>
                <p className="text-sm font-bold text-stone-600">
                  Step {step} of {maxStep}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
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
                    className="bg-[#f5e6dc] hover:bg-[#f0ddd0] text-stone-800 border border-stone-300 font-bold"
                    onClick={() => setStep(step + 1)}
                    disabled={!canProceed()}
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    className="bg-[#f5e6dc] hover:bg-[#f0ddd0] text-stone-800 border border-stone-300 font-bold"
                    onClick={handleSubmit}
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

      {/* Bottom padding for mobile to account for floating bar */}
      <div className="lg:hidden h-24" />
    </div>
  );
}
