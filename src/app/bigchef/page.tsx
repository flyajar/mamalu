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

interface MenuItem { id: string; name: string; price: number; image: string; dishes: string[]; category: string; }
interface ExtraItem { id: string; name: string; description: string; price: number; icon: any; category: string; }
type CategoryType = "corporate" | "classics" | "monthly" | "nanny";

const categoryConfig: Record<CategoryType, { label: string; icon: string; minGuests: number; maxGuests: number; description: string }> = {
  corporate: { label: "Corporate / Private", icon: "/image-updates/corporate.png", minGuests: 6, maxGuests: 35, description: "2-hour hands-on cooking experience with professional chefs" },
  classics: { label: "Our Classics", icon: "/image-updates/our-classics.png", minGuests: 1, maxGuests: 35, description: "Classic cooking experiences for groups" },
  monthly: { label: "Monthly Specials", icon: "/image-updates/monthly-specials.png", minGuests: 1, maxGuests: 35, description: "Seasonal rotating menus" },
  nanny: { label: "Nanny Class", icon: "/image-updates/nanny-class.png", minGuests: 1, maxGuests: 10, description: "Mummy's Fabulous Helpers - Turn your housekeeper into a chef" },
};

const corporateMenus: MenuItem[] = [
  { id: "spirit_of_thailand", name: "Spirit of Thailand", price: 300, image: "/images/Green-Curry-In-A-Hurry-Paste.jpg", dishes: ["Shrimp summer rolls", "Thai green chicken curry", "Coconut steamed rice"], category: "corporate" },
  { id: "la_cucina_italiana", name: "La Cucina Italiana", price: 425, image: "/images/Farfalle-Pasta11-scaled.jpg", dishes: ["Pasta from scratch Pomodoro or alfredo sauce", "Margherita pizza", "Chicken milanese", "Classic tiramisu"], category: "corporate" },
  { id: "the_mexican_table", name: "The Mexican Table", price: 450, image: "/images/birria-tacos-5-1200x1800.jpg", dishes: ["Mexican corn salad", "Tortillas from scratch", "Pulled mexican chicken or beef", "Guacamole and churros with chocolate sauce"], category: "corporate" },
  { id: "the_art_of_sushi", name: "The Art of Sushi", price: 450, image: "/images/avocado-maki-roll-recipe-10.jpg", dishes: ["Miso soup", "Tempura shrimp maki roll", "Spicy tuna handroll", "Salmon avocado roll"], category: "corporate" },
  { id: "pan_asian_feast", name: "Pan Asian Feast", price: 475, image: "/images/shoyu-ramen-1-1200.jpg", dishes: ["Ramen with shoyu tare with egg noodles from scratch", "Beef yakitori skewers", "Mushroom gyoza", "Coconut and panda sago pudding"], category: "corporate" },
  { id: "le_petit_menu", name: "Le Petit Menu", price: 500, image: "/images/Grilled-Steak-with-Chimichurri-1.jpg", dishes: ["French onion tart tatin", "Steak frites (seared steak with triple cooked fries)"], category: "corporate" },
  { id: "umami_house", name: "Umami House", price: 550, image: "/images/Lemon-Garlic-Shrimp-Pasta.jpg", dishes: ["Shrimp papaya salad", "Tempura platter", "Chicken katsu curry or teriyaki ribeye donburi bowl"], category: "corporate" },
];

const classicsMenus: MenuItem[] = [
  { id: "spirit_of_thailand_c", name: "Spirit of Thailand", price: 300, image: "/images/Green-Curry-In-A-Hurry-Paste.jpg", dishes: ["Shrimp summer rolls", "Thai green chicken curry", "Coconut steamed rice"], category: "classics" },
  { id: "la_cucina_italiana_c", name: "La Cucina Italiana", price: 425, image: "/images/Farfalle-Pasta11-scaled.jpg", dishes: ["Pasta from scratch Pomodoro or alfredo sauce", "Margherita pizza", "Chicken milanese", "Classic tiramisu"], category: "classics" },
  { id: "the_mexican_table_c", name: "The Mexican Table", price: 450, image: "/images/birria-tacos-5-1200x1800.jpg", dishes: ["Mexican corn salad", "Tortillas from scratch", "Pulled mexican chicken or beef", "Guacamole and churros"], category: "classics" },
  { id: "the_art_of_sushi_c", name: "The Art of Sushi", price: 450, image: "/images/avocado-maki-roll-recipe-10.jpg", dishes: ["Miso soup", "Tempura shrimp maki roll", "Spicy tuna handroll", "Salmon avocado roll"], category: "classics" },
  { id: "pan_asian_feast_c", name: "Pan Asian Feast", price: 475, image: "/images/shoyu-ramen-1-1200.jpg", dishes: ["Ramen with shoyu tare", "Beef yakitori skewers", "Mushroom gyoza", "Coconut sago pudding"], category: "classics" },
  { id: "bread_baking", name: "Bread Baking Masterclass", price: 500, image: "/images/focaccia-bread-art-featured.jpg", dishes: ["Olive and Zaatar Focaccia", "Mixberry Braided Bread", "Ham and Cheese Pull apart bread"], category: "classics" },
  { id: "macaron_masterclass", name: "Macaron Masterclass", price: 550, image: "/images/Raspberry macarons.jpg", dishes: ["Dark Chocolate Raspberry Macaron", "Mango Macaron", "Pistachio Macaron"], category: "classics" },
  { id: "eclaire_masterclass", name: "Eclaire Masterclass", price: 500, image: "/images/raspberry_and_milk_chocolate_eclairs2-s.jpg", dishes: ["Classic Chocolate eclair", "Salted Caramel Eclair", "Vanilla Eclair with Craqualine"], category: "classics" },
];

const monthlySpecials: MenuItem[] = [
  { id: "first_light", name: "First Light - Suhoor Kitchen", price: 400, image: "/images/Cheese-Rolls.jpg", dishes: ["Crispy Beef Sambousek", "Creamy Ricotta filled Qatayef Pockets", "Hydrating Coconut Date Chia shake"], category: "monthly" },
  { id: "iftar_table", name: "The Iftar Table", price: 400, image: "/images/Chicken-Shawarma-10.jpg", dishes: ["Creamy lentil soup with crispy pita bread", "Smoky Grilled chicken with Lemon herb Freekeh", "Warm semolina cake"], category: "monthly" },
  { id: "rooted_plant", name: "Rooted & Plant-Based", price: 400, image: "/images/Vegan Beet Pesto Pasta.jpg", dishes: ["Whipped Hummus with warm Pita bread", "Lentil veggie shepherd's pie", "Dark Chocolate Avocado Mousse"], category: "monthly" },
  { id: "artisan_dough", name: "Artisan Dough Lab", price: 400, image: "/images/focaccia-bread-art-featured.jpg", dishes: ["Rosemary sea salt focaccia", "Caramelised onion & goat cheese mini galette", "Vanilla sugar brioche knots"], category: "monthly" },
  { id: "taste_france", name: "A Taste of France", price: 400, image: "/images/peking-duck-recipe-11.jpg", dishes: ["French Mini baked ratatouille", "Crispy Duck leg with vegetables", "Creamy Creme Brulee"], category: "monthly" },
  { id: "spring_comforts", name: "Spring Comforts - European Table", price: 400, image: "/images/shrimp-in-romesco-sauce-1-of-1-3.jpg", dishes: ["Sizzling king prawn with paprika", "Roasted chicken with yorkshire pudding", "Classic british treacle tart"], category: "monthly" },
];

const nannyMenus: MenuItem[] = [
  { id: "lebanese_1", name: "Lebanese Please 1", price: 1200, image: "/images/Chicken-Shawarma-10.jpg", dishes: ["Mograhrabieh with chicken", "Molokhiyyeh", "Riz al dajaj"], category: "nanny" },
  { id: "lebanese_2", name: "Lebanese Please 2", price: 1200, image: "/images/Pumpkin-Kibbeh.jpg", dishes: ["Kibbeh B'laban", "Shish barak", "Kibbeh B'saniyeh"], category: "nanny" },
  { id: "kibbe_master", name: "Kibbe Master Class", price: 1200, image: "/images/Pumpkin-Kibbeh.jpg", dishes: ["Pumpkin kibbe", "Lentil kibbe", "Salmon kibbe", "Potato kibbe"], category: "nanny" },
  { id: "kafta_master", name: "Kafta Master Class", price: 1200, image: "/images/Grilled-Steak-with-Chimichurri-1.jpg", dishes: ["Kafta B'saniyeh", "Kafta B'tahini", "Dawood basha"], category: "nanny" },
  { id: "stews", name: "Stew's For You", price: 1200, image: "/images/Mini-Chicken-Pot-Pies-tasteandtellblog.com-1.jpg", dishes: ["Bamiyeh", "Bezelleh", "Loubieh", "Potato stew"], category: "nanny" },
  { id: "fish_tastic", name: "Fish Tastic", price: 1200, image: "/images/DEL_2022_Q2_TOBY_SCOTT_beetroot-cured-salmon_960x1200-768x960.jpg", dishes: ["Samki harra", "Sayadieh", "Kibbeh samak"], category: "nanny" },
  { id: "roll_it", name: "Roll With It", price: 1200, image: "/images/Musakhan-Rolls-01.jpg", dishes: ["Classic malfouf (stuffed cabbage)", "Waraa Enab (stuffed vine leaves)"], category: "nanny" },
  { id: "family_friendly", name: "Family Friendly", price: 1200, image: "/images/chicken-alfredo-lasagna-roll-ups-recipe-4.jpg", dishes: ["Homemade lasagna", "Butter chicken with garlic naan", "Asian chicken stir fry noodles"], category: "nanny" },
  { id: "healthy_comfort", name: "Healthy Comfort Food", price: 1200, image: "/images/birria-tacos-5-1200x1800.jpg", dishes: ["Pulled chicken tacos", "Beef stroganoff", "Nut free pesto pasta"], category: "nanny" },
  { id: "asian_special", name: "Asian Special", price: 1200, image: "/images/Fresh-Spring-Rolls-15.jpg", dishes: ["Shrimp summer rolls", "Asian salmon", "Asian honey glazed chicken"], category: "nanny" },
  { id: "modern_middle", name: "Modern Middle Eastern", price: 1200, image: "/images/crispy-zaatar-potatoes-with-chicken-cover-12666b34.jpg", dishes: ["Zaatar chicken", "Musakhan rolls", "Freekeh salad"], category: "nanny" },
  { id: "dinner_starters", name: "Dinner Party Starters", price: 1200, image: "/images/Spicy-Tuna-Crispy-Rice-12.jpg", dishes: ["Whole roasted cauliflower", "Crispy rice with tuna", "White fish carpaccia"], category: "nanny" },
  { id: "lunchbox", name: "Lunch Box Favourites", price: 1200, image: "/images/Quinoa-Crusted-Chicken-Tenders.jpg", dishes: ["Oat crusted chicken tenders", "Pizza pinwheels", "Banana oat muffins", "Granola"], category: "nanny" },
  { id: "japanese", name: "Japanese Please", price: 1200, image: "/images/Crispy-rice-paper-dumplings-with-chili-garlic-oil-view-from-top_1718350397_142199.jpeg", dishes: ["Mushroom gyoza", "Ramen with shoyu tare", "Chicken yakitori"], category: "nanny" },
  { id: "thai_specials", name: "Thai Specials", price: 1200, image: "/images/korean-cream-cheese-garlic-buns-featured.jpg", dishes: ["Asian salad", "Beef bao buns", "Thai green curry"], category: "nanny" },
  { id: "dinner_tarts", name: "Dinner Party Tarts", price: 1200, image: "/images/5942-Feta_Tart_V2.jpg", dishes: ["Onion tart tatin", "Wild mushroom phyllo tart", "Goat cheese tomato tart"], category: "nanny" },
  { id: "sushi_nanny", name: "Sushi Master Class", price: 1200, image: "/images/avocado-maki-roll-recipe-10.jpg", dishes: ["Salmon and avocado rolls", "Salmon nigiri", "California maki roll"], category: "nanny" },
  { id: "healthy_dessert", name: "Healthy Dessert", price: 1200, image: "/images/oreo-brownies-5-1067x1600.jpg", dishes: ["Sweet potato brownies", "3 ingredient chocolate cake", "Protein cookies", "Date walnut cake"], category: "nanny" },
];

const corporateExtras: ExtraItem[] = [
  { id: "custom_apron", name: "Customized Apron", description: "Personalized apron with name", price: 80, icon: Gift, category: "custom" },
  { id: "custom_spatula", name: "Customized Spatula", description: "Personalized spatula", price: 50, icon: Utensils, category: "custom" },
  { id: "custom_chef_hat", name: "Customized Chef Hat", description: "Personalized chef hat", price: 60, icon: ChefHat, category: "custom" },
  { id: "custom_mug", name: "Customized Mugs", description: "Personalized mug", price: 45, icon: Gift, category: "custom" },
  { id: "cake_10", name: "Customized Cakes (10 persons)", description: "Custom designed cake", price: 575, icon: Cake, category: "cake" },
  { id: "cake_20", name: "Customized Cakes (20 persons)", description: "Custom designed cake", price: 700, icon: Cake, category: "cake" },
  { id: "cake_30", name: "Customized Cakes (30 persons)", description: "Custom designed cake", price: 900, icon: Cake, category: "cake" },
  { id: "table_10", name: "Table Set Up (10 persons)", description: "Full table setting", price: 300, icon: Utensils, category: "decor" },
  { id: "table_20", name: "Table Set Up (20 persons)", description: "Full table setting", price: 400, icon: Utensils, category: "decor" },
  { id: "table_30", name: "Table Set Up (30 persons)", description: "Full table setting", price: 500, icon: Utensils, category: "decor" },
  { id: "balloons", name: "Balloons (14 pcs)", description: "2 bunches of 7 balloons", price: 260, icon: PartyPopper, category: "decor" },
  { id: "mini_pizzas", name: "Mini Pizzas (12pcs)", description: "Delicious mini pizzas", price: 50, icon: Utensils, category: "snacks" },
  { id: "chicken_tenders", name: "Chicken Tenders (12pcs)", description: "Crispy chicken tenders", price: 60, icon: Utensils, category: "snacks" },
  { id: "mini_burgers", name: "Mini Burgers (6pcs)", description: "Mini burgers", price: 70, icon: Utensils, category: "snacks" },
  { id: "musakhan", name: "Musakhan Rolls", description: "Delicious rolls", price: 50, icon: Utensils, category: "snacks" },
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
  const [activeCategory, setActiveCategory] = useState<CategoryType>("corporate");
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [selectedNannyMenus, setSelectedNannyMenus] = useState<MenuItem[]>([]);
  const [guestCount, setGuestCount] = useState(6);
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [allTimeSlots, setAllTimeSlots] = useState<any[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [showWaiverModal, setShowWaiverModal] = useState(false);

  const currentConfig = categoryConfig[activeCategory];
  const isCorporate = activeCategory === "corporate";
  const isNanny = activeCategory === "nanny";
  const hasExtras = isCorporate;
  const maxStep = hasExtras ? 4 : 3;

  const getCurrentMenus = () => {
    switch (activeCategory) {
      case "corporate": return corporateMenus;
      case "classics": return classicsMenus;
      case "monthly": return monthlySpecials;
      case "nanny": return nannyMenus;
      default: return [];
    }
  };

  useEffect(() => {
    setSelectedMenu(null);
    setSelectedNannyMenus([]);
    setGuestCount(currentConfig.minGuests);
    setSelectedExtras({});
    setStep(1);
  }, [activeCategory]);

  useEffect(() => {
    if (!eventDate) { setAllTimeSlots([]); setAvailableTimeSlots([]); return; }
    setLoadingSlots(true);
    setEventTime("");
    fetch(`/api/services/availability?date=${eventDate}`)
      .then(res => res.json())
      .then(data => { setAllTimeSlots(data.allSlots || []); setAvailableTimeSlots(data.availableSlots || []); })
      .finally(() => setLoadingSlots(false));
  }, [eventDate]);

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
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button onClick={() => window.dispatchEvent(new CustomEvent("openMamaluMenu"))} className="p-2 hover:bg-stone-100 rounded-full"><ArrowLeft className="h-5 w-5" /></button>
            <div><h1 className="text-2xl text-black" style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 900 }}>BIG CHEF</h1><p className="text-black text-sm" style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 700 }}>Professional cooking experiences for adults</p></div>
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
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getCurrentMenus().map(menu => {
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
                                <div className="p-2 bg-stone-100 rounded-lg"><Icon className="h-5 w-5 text-stone-600" /></div>
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
                  <Button variant="outline" onClick={() => setStep(step - 1)} className="px-6"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
                  <Button className="bg-stone-900 hover:bg-stone-800 text-white px-8" onClick={() => setStep(step + 1)}>Continue<ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </div>
            )}
            {step === (hasExtras ? 3 : 2) && (
              <div className="space-y-6">
                <div><h2 className="text-2xl font-bold text-stone-900">Your Details</h2><p className="text-stone-500 mt-1">Tell us about you and your event</p></div>
                <Card><CardContent className="p-6 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-stone-700 mb-1">Your Name *</label><input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full px-4 py-2 border border-stone-300 rounded-lg" required /></div>
                    <div><label className="block text-sm font-medium text-stone-700 mb-1">Email *</label><input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="w-full px-4 py-2 border border-stone-300 rounded-lg" required /></div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-stone-700 mb-1">Phone</label><input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full px-4 py-2 border border-stone-300 rounded-lg" /></div>
                    {isCorporate && <div><label className="block text-sm font-medium text-stone-700 mb-1">Company Name</label><input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full px-4 py-2 border border-stone-300 rounded-lg" /></div>}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-stone-700 mb-1"><Calendar className="inline h-4 w-4 mr-1" />Event Date *</label><input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} min={today} className="w-full px-4 py-2 border border-stone-300 rounded-lg" required /></div>
                    <div><label className="block text-sm font-medium text-stone-700 mb-1"><Clock className="inline h-4 w-4 mr-1" />Time Slot *</label>
                      {loadingSlots ? <div className="flex items-center gap-2 py-2 text-stone-500"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div> : eventDate && allTimeSlots.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">{allTimeSlots.map((slot: any) => { const isAvailable = availableTimeSlots.some((s: any) => s.start === slot.start); return (<button key={slot.start} type="button" disabled={!isAvailable} onClick={() => setEventTime(slot.start)} className={`px-3 py-2 text-sm rounded-lg border ${eventTime === slot.start ? "bg-[#f5e6dc] text-stone-800 border border-stone-300" : isAvailable ? "border-stone-300 hover:border-stone-900" : "bg-stone-100 text-stone-400 cursor-not-allowed line-through"}`}>{slot.label}</button>); })}</div>
                      ) : <p className="text-sm text-stone-500 py-2">{eventDate ? "No slots available" : "Select a date first"}</p>}
                    </div>
                  </div>
                  <div><label className="block text-sm font-medium text-stone-700 mb-1">Special Requests</label><textarea value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} rows={3} placeholder="Any dietary restrictions or special requests..." className="w-full px-4 py-2 border border-stone-300 rounded-lg" /></div>
                </CardContent></Card>
                {/* Navigation Buttons - Desktop */}
                <div className="hidden lg:flex justify-between items-center pt-6 border-t">
                  <Button variant="outline" onClick={() => setStep(step - 1)} className="px-6"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
                  <Button className="bg-stone-900 hover:bg-stone-800 text-white px-8" onClick={() => setStep(step + 1)} disabled={!canProceed()}>Continue<ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </div>
            )}
            {step === maxStep && (
              <div className="space-y-6">
                <div><h2 className="text-2xl font-bold text-stone-900">Confirm Your Booking</h2></div>
                <Card><CardContent className="p-6 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div><span className="text-stone-500">Category:</span><span className="ml-2 font-medium">{currentConfig.label}</span></div>
                    <div><span className="text-stone-500">Package:</span><span className="ml-2 font-medium">{isNanny ? `${selectedNannyMenus.length} Menus` : selectedMenu?.name}</span></div>
                    {!isNanny && <div><span className="text-stone-500">Guests:</span><span className="ml-2 font-medium">{guestCount}</span></div>}
                    <div><span className="text-stone-500">Date:</span><span className="ml-2 font-medium">{eventDate}</span></div>
                    <div><span className="text-stone-500">Time:</span><span className="ml-2 font-medium">{eventTime}</span></div>
                  </div>
                  {requiresDeposit ? <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200"><div className="flex items-start gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /><div><p className="font-medium text-amber-800">50% Deposit Required</p><p className="text-sm text-amber-700 mt-1">Pay <strong>AED {depositAmount}</strong> now. Balance of <strong>AED {balanceAmount}</strong> due 48 hours before.</p></div></div></div> : <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200"><p className="text-green-800"><strong>Full Payment:</strong> AED {totalAmount}</p></div>}
                </CardContent></Card>
                {/* Navigation Buttons - Desktop */}
                <div className="hidden lg:flex justify-between items-center pt-6 border-t">
                  <Button variant="outline" onClick={() => setStep(step - 1)} className="px-6"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
                  <Button className="bg-stone-900 hover:bg-stone-800 text-white px-8" onClick={handleSubmit} disabled={submitting || !canProceed()}>{submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{submitting ? "Processing..." : "Pay Now"}{!submitting && <ArrowRight className="ml-2 h-4 w-4" />}</Button>
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
