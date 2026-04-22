"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Users,
  Star,
  FileText,
  Calendar,
  Minus,
  Plus,
  Loader2,
  Gift,
  Cake,
  PartyPopper,
  Utensils,
  ChefHat,
  MessageCircle,
  X,
  AlertTriangle,
} from "lucide-react";

// Menu item interface
interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: string;
  dishes: string[];
  category: string;
}

// Extra item interface
interface ExtraItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: any;
  category: string;
  image?: string;
}

// Category type
type CategoryType = "classics" | "monthly" | "mommy_me" | "birthdays" | "packages";

// Category configuration with min guests - Birthdays last
const categoryConfig: Record<CategoryType, { label: string; icon: string; minGuests: number; maxGuests: number; description: string }> = {
  classics: { label: "Our Classics", icon: "/icons/boy.png", minGuests: 1, maxGuests: 35, description: "Fun cooking classes for kids" },
  monthly: { label: "Monthly Specials", icon: "/icons/girl.png", minGuests: 1, maxGuests: 35, description: "Seasonal rotating menus" },
  mommy_me: { label: "Mommy & Me", icon: "/icons/boy.png", minGuests: 1, maxGuests: 20, description: "Mom and kid share their own station" },
  birthdays: { label: "Birthdays", icon: "/icons/girl.png", minGuests: 6, maxGuests: 35, description: "2-hour private birthday cooking experience" },
  packages: { label: "Packages", icon: "/icons/boy.png", minGuests: 6, maxGuests: 35, description: "Bundled menu packages for groups" },
};

// Birthday Menus (min 6 kids)
const birthdayMenus: MenuItem[] = [
  { id: "texas_roadhouse", name: "Texas Roadhouse", price: 275, image: "/mini-chef/texas roadhouse.jpg", dishes: ["Baked BBQ wings", "Skillet Mac & Cheese", "Mississippi mud pie"], category: "birthdays" },
  { id: "little_italy", name: "Little Italy", price: 250, image: "/mini-chef/LITTLE ITALY.jpg", dishes: ["Pasta from scratch in pomodoro sauce", "Margherita pizza"], category: "birthdays" },
  { id: "funtastic", name: "Funtastic", price: 180, image: "/new-updates/funtastic.jpg", dishes: ["Mixed Berry babka", "Cheesy pizza bomb", "Chocolate chip marble cookies"], category: "birthdays" },
  { id: "kung_fu_panda", name: "Kung Fu Panda", price: 275, image: "/mini-chef/kung fu panda.jpg", dishes: ["California sushi rolls", "Chicken yakitori skewer", "Veggie stir-fried noodles", "Chocolate custard tart"], category: "birthdays" },
  { id: "cupcake_masterclass", name: "Cupcake Master Class", price: 275, image: "/mini-chef/cupcake-masterclass.jpg", dishes: ["Choose between: Vanilla, chocolate or red velvet cupcakes", "Learn piping skills and decorate to match the season"], category: "birthdays" },
  { id: "dream_diner", name: "Dream Diner", price: 200, image: "/mini-chef/dream diner.jpeg", dishes: ["Mini cheesy garlic monkey bread", "Alfredo chicken lasagna rolls", "Oreo sprinkle skillet cookie"], category: "birthdays" },
  { id: "hola_amigos", name: "Hola Amigos", price: 250, image: "/mini-chef/HOLA AMIGOS.jpg", dishes: ["Cheese and mushroom quesadillas", "Pulled chicken tacos", "Churros with chocolate sauce"], category: "birthdays" },
  { id: "healthylicious", name: "Healthylicious", price: 225, image: "/new-updates/healthylicious.jpg", dishes: ["Parmesan baked chicken tenders", "Sweet potato fries", "Double chocolate zucchini muffins"], category: "birthdays" },
  { id: "dumpling_masterclass", name: "Dumpling Masterclass", price: 225, image: "/new-updates/dumpling masterclass.jpg", dishes: ["Pan fried mushroom dumplings", "Steamed chicken dumplings", "Chocolate dumplings"], category: "birthdays" },
  { id: "pretzel_masterclass", name: "Pretzel Masterclass", price: 180, image: "/mini-chef/PRETZEL MASTER CLASS.jpeg", dishes: ["Pepperoni pizza pretzel", "Garlic and herb pretzel", "Cinnamon sugar pretzel"], category: "birthdays" },
  { id: "mama_mia", name: "Mama Mia", price: 250, image: "/images/Farfalle-Pasta11-scaled.jpg", dishes: ["Bow tie pasta from scratch", "Creamy pink sauce", "Baked chicken milanese", "Chocolate biscotti"], category: "birthdays" },
  { id: "cookie_masterclass", name: "Cookie Masterclass", price: 275, image: "/images/best-chocolate-chip-cookies-recipe-ever-no-chilling-1.jpg", dishes: ["Herb and cheddar cookies", "Funfetti cookies", "Brownie crinkle cookies"], category: "birthdays" },
];

// Our Classics (same as birthday menus but min 1)
const classicsMenus: MenuItem[] = [
  { id: "cupcake_masterclass_classic", name: "Cupcake Master Class", price: 275, image: "/mini-chef/cupcake-masterclass.jpg", dishes: ["Choose between: Vanilla, chocolate or red velvet cupcakes", "Learn piping skills and decorate to match the season"], category: "classics" },
  { id: "dream_diner_classic", name: "Dream Diner", price: 200, image: "/mini-chef/dream diner.jpeg", dishes: ["Mini cheesy garlic monkey bread", "Alfredo chicken lasagna rolls", "Oreo sprinkle skillet cookie"], category: "classics" },
  { id: "kung_fu_panda_classic", name: "Kung Fu Panda", price: 275, image: "/mini-chef/kung fu panda.jpg", dishes: ["California sushi rolls", "Chicken yakitori skewer", "Veggie stir-fried noodles", "Chocolate custard tart"], category: "classics" },
  { id: "little_italy_classic", name: "Little Italy", price: 250, image: "/mini-chef/LITTLE ITALY.jpg", dishes: ["Pasta from scratch in pomodoro sauce", "Margherita pizza"], category: "classics" },
  { id: "funtastic_classic", name: "Funtastic", price: 180, image: "/new-updates/funtastic.jpg", dishes: ["Mixed Berry babka", "Cheesy pizza bomb", "Chocolate chip marble cookies"], category: "classics" },
  { id: "cookie_masterclass_classic", name: "Cookie Master Class", price: 275, image: "/images/best-chocolate-chip-cookies-recipe-ever-no-chilling-1.jpg", dishes: ["Herb and cheddar cookies", "Funfetti cookies", "Brownie crinkle cookies"], category: "classics" },
];

// Monthly Specials (min 1)
const monthlySpecials: MenuItem[] = [
  { id: "spring_veggie_adventures", name: "Spring Veggie Adventures", price: 250, image: "/images/zucchini-bread-recipe.jpg", dishes: ["Crispy corn & zucchini bites with yogurt dip", "Rainbow veggie pinwheel wraps", "Lemon blueberry mini cakes"], category: "monthly" },
  { id: "little_bread_makers", name: "Little Bread Makers", price: 250, image: "/images/Honey-Oat-Bread-hi-res-25-1200x1800.jpg", dishes: ["Milk bread rolls from scratch", "Herb & cheese tear-and-share loaf", "Chocolate babka"], category: "monthly" },
  { id: "comfort_food_club", name: "Comfort Food Club", price: 250, image: "/images/Mini-Chicken-Pot-Pies-tasteandtellblog.com-1.jpg", dishes: ["Creamy chicken pot pie cups", "Baked mac & cheese (macaroni from scratch)", "Soft & Chewy Cinnamon Sugar Blondie Bites"], category: "monthly" },
  { id: "bloom_bakery", name: "Bloom Bakery", price: 250, image: "/images/jam-donut-babka.jpg", dishes: ["Baked Twisted Vanilla Donut", "Strawberry Kiss Cookies", "Colourful Spring time crinkle cookie"], category: "monthly" },
  { id: "asian_kitchen_day", name: "Asian Kitchen Day", price: 250, image: "/images/korean-cream-cheese-garlic-buns-featured.jpg", dishes: ["Steamed chicken bao buns", "Vegetable lo mein noodles from scratch", "Coconut Palm Sugar pancake rolls"], category: "monthly" },
];

// Packages - bundled menu sets
const packagesMenus: MenuItem[] = [
  { id: "pkg_corporate_3", name: "Corporate Bundle (3 Sessions)", price: 1200, image: "/images/Grilled-Steak-with-Chimichurri-1.jpg", dishes: ["3 corporate cooking sessions", "Team building activities", "Custom menus", "Cupcake Master Class", "Kung Fu Panda", "Cookie Master Class", "Little Italy", "Hola Amigos", "Mama Mia"], category: "packages" },
  { id: "pkg_monthly_4", name: "Monthly Special Bundle", price: 1400, image: "/images/peking-duck-recipe-11.jpg", dishes: ["4 monthly special sessions", "Seasonal ingredients", "Recipe booklet", "Cupcake Master Class", "Kung Fu Panda", "Cookie Master Class", "Little Italy", "Hola Amigos", "Mama Mia"], category: "packages" },
];

// Mommy & Me Classes (min 1)
const mommyAndMeMenus: MenuItem[] = [
  { id: "sushi_master_class", name: "Sushi Master Class", price: 375, image: "/images/avocado-maki-roll-recipe-10.jpg", dishes: ["California maki rolls", "Vegan hand roll", "Spam masubi"], category: "mommy_me" },
  { id: "bread_baking", name: "Bread Baking", price: 375, image: "/images/focaccia-bread-art-featured.jpg", dishes: ["Garden focaccia", "Bacon and cheese scrolls", "Cinnamon knots"], category: "mommy_me" },
  { id: "tea_time", name: "Tea Time", price: 375, image: "/images/Savory-Scones-with-Bacon-Cheddar-Chive.jpg", dishes: ["You can choose between savory option like scones to Petite four"], category: "mommy_me" },
  { id: "bagel_party", name: "Bagel Party", price: 375, image: "/images/Pizza-Bagels-15-650x975.jpg", dishes: ["Bagel from scratch with sweet and savory toppings"], category: "mommy_me" },
  { id: "cupcake_master_class_mommy", name: "Cupcake Master Class", price: 375, image: "/images/Each-Beach-Birthday-Cupcakes.jpg", dishes: ["Choose between: Vanilla, chocolate or red velvet cupcakes", "Learn piping skills and decorate to match the season"], category: "mommy_me" },
];

// Birthday Add-ons/Extras
const birthdayExtras: ExtraItem[] = [
  { id: "custom_apron", name: "Customized Apron", description: "Personalized Mamalu apron with name", price: 80, icon: Gift, category: "custom", image: "/personalized-items/apron.jpg" },
  { id: "custom_spatula", name: "Customized Spatula", description: "Personalized cooking spatula", price: 50, icon: Utensils, category: "custom", image: "/personalized-items/spatula.jpg" },
  { id: "custom_chef_hat", name: "Customized Chef Hat", description: "Personalized chef hat", price: 60, icon: ChefHat, category: "custom", image: "/personalized-items/chef-hat.jpg" },
  { id: "custom_mug", name: "Customized Mugs", description: "Personalized mug with any design", price: 45, icon: Gift, category: "custom", image: "/personalized-items/mugs.jpg" },
  { id: "custom_cake_10", name: "Customized Cakes (10 persons)", description: "Custom designed birthday cake", price: 575, icon: Cake, category: "cake" },
  { id: "custom_cake_20", name: "Customized Cakes (20 persons)", description: "Custom designed birthday cake", price: 700, icon: Cake, category: "cake" },
  { id: "custom_cake_30", name: "Customized Cakes (30 persons)", description: "Custom designed birthday cake", price: 900, icon: Cake, category: "cake" },
  { id: "table_setting_10", name: "Table Set Up (10 persons)", description: "Plates, cups, spoons, forks, knives, napkins, tablecloth", price: 300, icon: Utensils, category: "decor" },
  { id: "table_setting_20", name: "Table Set Up (20 persons)", description: "Plates, cups, spoons, forks, knives, napkins, tablecloth", price: 400, icon: Utensils, category: "decor" },
  { id: "table_setting_30", name: "Table Set Up (30 persons)", description: "Plates, cups, spoons, forks, knives, napkins, tablecloth", price: 500, icon: Utensils, category: "decor" },
  { id: "balloons", name: "Balloons (14 pcs balloons)", description: "2 bunches of 7 balloons (any color)", price: 260, icon: PartyPopper, category: "decor" },
  { id: "mini_pizzas", name: "Mini Pizzas (12pcs)", description: "12 pieces of delicious mini pizzas", price: 50, icon: Utensils, category: "snacks", image: "/snacks-and-drinks/SMILEY PIZZA.jpeg" },
  { id: "chicken_tenders", name: "Chicken Tenders (12pcs)", description: "12 pieces of crispy chicken tenders", price: 60, icon: Utensils, category: "snacks", image: "/snacks-and-drinks/CHICKEN TENDERS.jpeg" },
  { id: "mini_burgers", name: "Mini Burgers (6pcs)", description: "6 pieces of mini burgers", price: 70, icon: Utensils, category: "snacks", image: "/snacks-and-drinks/mini burgers.jpeg" },
  { id: "musakhan_rolls", name: "Musakhan Rolls", description: "Delicious musakhan rolls", price: 50, icon: Utensils, category: "snacks", image: "/snacks-and-drinks/MUSAKHAN ROLLS.jpeg" },
  { id: "juice", name: "Juices (per pc)", description: "Fresh juice per piece", price: 8, icon: Utensils, category: "drinks" },
  { id: "soft_drinks", name: "Soft Drinks (per pc)", description: "Soft drink per piece", price: 15, icon: Utensils, category: "drinks" },
];

// Waiver Modal Component
function WaiverModal({ isOpen, onClose, onAccept }: { isOpen: boolean; onClose: () => void; onAccept: () => void }) {
  const [hasRead, setHasRead] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-red-600 text-white p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">WAIVER FORM</h2>
          <button onClick={onClose} className="p-1 hover:bg-red-700 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <h3 className="text-lg font-bold text-center mb-4">
            Kids Cooking Class Waiver & Acknowledgement — Mamalu Kitchen Studio
          </h3>
          
          <div className="space-y-4 text-sm text-stone-700">
            <p>
              By completing this booking, I confirm that I am the parent or legal guardian of the participating child and give permission for them to attend and participate in the cooking class at Mamalu Kitchen Studio. I understand that cooking activities involve the use of kitchen tools, utensils, heat sources, and food ingredients, and while Mamalu Kitchen Studio maintains a safe, supervised environment, minor injuries such as cuts, burns, slips, or allergic reactions may occur.
            </p>
            
            <p className="text-red-600">
              I confirm that I have informed Mamalu Kitchen Studio of any allergies, medical conditions, dietary restrictions, or special needs prior to the class. I understand that classes take place in a shared kitchen environment where cross-contact with allergens may occur despite careful handling procedures.
            </p>
            
            <p>
              I agree that Mamalu Kitchen Studio, its owners, instructors, and staff shall not be held liable for any injury, loss, or damage resulting from participation in the class, except in cases of gross negligence. I authorize Mamalu Kitchen Studio to seek emergency medical assistance for my child if necessary and if I cannot be reached immediately.
            </p>
            
            <p>
              I understand that photos or videos may be taken during the class for documentation and promotional purposes unless I notify Mamalu Kitchen Studio in writing prior to the session. I also acknowledge that children are expected to follow safety instructions during the class to ensure a safe and enjoyable experience for everyone.
            </p>
            
            <p className="font-semibold">
              By checking this box, I confirm that I have read, understood, and agree to this waiver and consent to my child&apos;s participation in Mamalu Kitchen Studio activities.
            </p>
          </div>
        </div>
        
        <div className="p-4 border-t bg-stone-50">
          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={hasRead}
              onChange={(e) => setHasRead(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-stone-300"
            />
            <span className="text-sm text-stone-700">
              I have read and understood the waiver form above and agree to all terms and conditions.
            </span>
          </label>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 font-bold">
              Cancel
            </Button>
            <Button 
              onClick={onAccept} 
              disabled={!hasRead}
              className="flex-1 bg-[#f5e6dc] hover:bg-[#f0ddd0] text-stone-800 border border-stone-300 font-bold"
            >
              I Accept & Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MiniChefPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Category and menu selection
  const [activeCategory, setActiveCategory] = useState<CategoryType>("classics");
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [guestCount, setGuestCount] = useState(6);
  
  // Extras
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});
  
  // Booking details
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [allTimeSlots, setAllTimeSlots] = useState<{ start: string; end: string; duration: number; label: string }[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<{ start: string; end: string; duration: number; label: string }[]>([]);
  const [blockedTimeSlots, setBlockedTimeSlots] = useState<{ start: string; end: string; duration: number; label: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // Waiver
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [showWaiverModal, setShowWaiverModal] = useState(false);

  // Get current category config
  const currentConfig = categoryConfig[activeCategory];
  const isBirthday = activeCategory === "birthdays";
  const hasExtras = isBirthday;

  // Get menus for current category
  const getCurrentMenus = (): MenuItem[] => {
    switch (activeCategory) {
      case "birthdays": return birthdayMenus;
      case "classics": return classicsMenus;
      case "monthly": return monthlySpecials;
      case "mommy_me": return mommyAndMeMenus;
      case "packages": return packagesMenus;
      default: return [];
    }
  };

  // Reset selection when category changes
  useEffect(() => {
    setSelectedMenu(null);
    setGuestCount(currentConfig.minGuests);
    setSelectedExtras({});
    setStep(1);
  }, [activeCategory]);

  // Fetch available time slots when date changes
  useEffect(() => {
    async function fetchAvailability() {
      if (!eventDate) {
        setAllTimeSlots([]);
        setAvailableTimeSlots([]);
        setBlockedTimeSlots([]);
        return;
      }

      setLoadingSlots(true);
      setEventTime("");
      
      try {
        const res = await fetch(`/api/services/availability?date=${eventDate}`);
        if (res.ok) {
          const data = await res.json();
          setAllTimeSlots(data.allSlots || []);
          setAvailableTimeSlots(data.availableSlots || []);
          setBlockedTimeSlots(data.blockedSlots || []);
        }
      } catch (error) {
        console.error("Failed to fetch availability:", error);
      } finally {
        setLoadingSlots(false);
      }
    }

    fetchAvailability();
  }, [eventDate]);

  // Calculate totals
  const calculateBaseAmount = () => {
    if (!selectedMenu) return 0;
    return selectedMenu.price * guestCount;
  };

  const calculateExtrasTotal = () => {
    return Object.entries(selectedExtras).reduce((total, [id, qty]) => {
      const extra = birthdayExtras.find(e => e.id === id);
      return total + (extra?.price || 0) * qty;
    }, 0);
  };

  const calculateTotal = () => {
    return calculateBaseAmount() + calculateExtrasTotal();
  };

  // Payment calculation - only Birthday is 50% deposit
  const totalAmount = calculateTotal();
  const requiresDeposit = isBirthday;
  const depositAmount = requiresDeposit ? Math.ceil(totalAmount * 0.5) : totalAmount;
  const balanceAmount = requiresDeposit ? totalAmount - depositAmount : 0;

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedMenu) return;
    
    // Show waiver modal if not accepted
    if (!waiverAccepted) {
      setShowWaiverModal(true);
      return;
    }
    
    setSubmitting(true);
    try {
      const extrasData = birthdayExtras
        .filter((e) => selectedExtras[e.id])
        .map((e) => ({
          id: e.id,
          name: e.name,
          price: e.price,
          quantity: selectedExtras[e.id],
        }));

      const isDepositPayment = isBirthday;
      const paymentAmount = isDepositPayment ? Math.ceil(totalAmount * 0.5) : totalAmount;

      const res = await fetch("/api/services/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: "birthday_deck",
          serviceName: `Mini Chef - ${currentConfig.label}`,
          packageName: selectedMenu.name,
          menuId: selectedMenu.id,
          menuName: selectedMenu.name,
          menuPrice: selectedMenu.price,
          customerName,
          customerEmail,
          customerPhone,
          eventDate: eventDate || null,
          eventTime: eventTime || null,
          guestCount,
          extras: extrasData,
          baseAmount: calculateBaseAmount(),
          extrasAmount: calculateExtrasTotal(),
          totalAmount,
          isDepositPayment,
          depositAmount: isDepositPayment ? paymentAmount : null,
          balanceAmount: isDepositPayment ? balanceAmount : null,
          specialRequests,
          ageRange,
          waiverAccepted,
          category: activeCategory,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        }
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create booking");
      }
    } catch (error) {
      console.error("Booking error:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle waiver acceptance
  const handleWaiverAccept = () => {
    setWaiverAccepted(true);
    setShowWaiverModal(false);
    // Continue with submission
    handleSubmit();
  };

  // Get today's date for min date
  const today = new Date().toISOString().split("T")[0];

  // Determine max step
  const maxStep = hasExtras ? 4 : 3;
  const stepLabels = hasExtras 
    ? { 1: "Package", 2: "Customize", 3: "Details", 4: "Confirm" }
    : { 1: "Package", 2: "Details", 3: "Confirm" };

  // Can proceed to next step
  const canProceed = () => {
    if (step === 1) return selectedMenu !== null;
    if (hasExtras && step === 2) return true; // Extras are optional
    const detailsStep = hasExtras ? 3 : 2;
    if (step === detailsStep) return customerName && customerEmail && eventDate && eventTime;
    return true;
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Waiver Modal */}
      <WaiverModal 
        isOpen={showWaiverModal} 
        onClose={() => setShowWaiverModal(false)}
        onAccept={handleWaiverAccept}
      />

      {/* Header with animated icons */}
      <div className="bg-white border-b relative overflow-hidden">
        {/* Animated boy/girl icons for Mini Chef - now in flex container */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden lg:block">
          <Image src="/images/apron.png" alt="" width={50} height={50} className="float-medium opacity-70" />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => window.dispatchEvent(new CustomEvent("openMamaluMenu"))} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="hidden lg:block">
                <Image src="/images/girl-01.png" alt="" width={60} height={60} className="float-gentle opacity-70" />
              </div>
              <div>
                <h1 className="text-2xl text-black" style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 900 }}>MINI CHEF</h1>
                <p className="text-black text-sm" style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 700 }}>
                  Fun cooking experiences for little chefs
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>


      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="space-y-6">
          {/* Main Content - Full Width */}
          <div className="space-y-6">
            {/* Category Tabs - BEFORE Steps */}
            <div className="flex flex-wrap gap-2 sm:gap-3 p-1 sm:p-2 bg-stone-100 rounded-2xl sm:rounded-full">
              {(Object.keys(categoryConfig) as CategoryType[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-2 sm:px-6 sm:py-3 rounded-full font-bold transition-all text-xs sm:text-base ${
                    activeCategory === cat
                      ? "bg-[#f5e6dc] text-stone-900 border border-stone-300 shadow-md"
                      : "text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  <Image src={categoryConfig[cat].icon} alt="" width={28} height={28} className="inline-block w-5 h-5 sm:w-7 sm:h-7 mr-1 sm:mr-2" /> {categoryConfig[cat].label}
                </button>
              ))}
            </div>

            {/* Step 1: Package Selection */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl text-black" style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 900 }}>Pick your perfect Menu</h2>
                  <p className="text-stone-500 mt-1">{currentConfig.description}</p>
                  <p className="text-sm text-stone-400 mt-2">
                    Min: {currentConfig.minGuests} {isBirthday ? "kids" : "guest(s)"} • Max: {currentConfig.maxGuests} {isBirthday ? "kids" : "guests"} • Price per person
                  </p>
                </div>

                {/* Mommy & Me Description */}
                {activeCategory === "mommy_me" && (
                  <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                    <p className="text-pink-800 font-bold">
                      Mom and kid have their own station where they share laughter, learning, and delicious moments together!
                    </p>
                  </div>
                )}

                {/* Guest Count Selector with Desktop Navigation */}
                <Card>
                  <CardContent className="p-5">
                    <label className="block text-lg font-bold text-stone-900 mb-3">
                      Number of {isBirthday ? "Kids" : "Guests"}
                    </label>
                    <div className="flex items-center gap-4 mb-4 lg:mb-6">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => setGuestCount(Math.max(currentConfig.minGuests, guestCount - 1))} 
                        disabled={guestCount <= currentConfig.minGuests}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="text-2xl font-bold w-12 text-center">{guestCount}</span>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => setGuestCount(Math.min(currentConfig.maxGuests, guestCount + 1))} 
                        disabled={guestCount >= currentConfig.maxGuests}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-bold text-stone-600">
                        (Min: {currentConfig.minGuests}, Max: {currentConfig.maxGuests})
                      </span>
                    </div>
                    {/* Desktop Continue Button - Inside Card */}
                    <div className="hidden lg:flex justify-end items-center pt-4 border-t">
                      <Button
                        className="bg-stone-900 hover:bg-stone-800 text-white px-8 font-bold"
                        onClick={() => setStep(step + 1)}
                        disabled={!canProceed()}
                      >
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Menu Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getCurrentMenus().map((menu) => (
                    <Card
                      key={menu.id}
                      className={`cursor-pointer transition-all ${
                        selectedMenu?.id === menu.id
                          ? "ring-2 ring-stone-900 shadow-lg"
                          : "hover:shadow-md"
                      }`}
                      onClick={() => setSelectedMenu(menu)}
                    >
                      <CardContent className="p-0 overflow-hidden flex flex-col h-full">
                        <div className="relative h-40 w-full bg-stone-200">
                          <Image src={menu.image} alt={menu.name} fill className="object-cover" />
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                          {/* Full width menu name */}
                          <h3 className="text-xl font-bold text-stone-900 mb-3">{menu.name}</h3>
                          {/* Dishes list */}
                          <div className="space-y-1 flex-1">
                            {menu.dishes.map((dish, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm text-stone-600">
                                <Check className="h-3 w-3 text-[#ff7f5c] flex-shrink-0" />
                                <span>{dish}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Price in separate box at bottom */}
                        <div className="bg-stone-50 border-t px-4 py-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-stone-500">per person</span>
                            <span className="text-xl font-bold text-stone-900">AED {menu.price}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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

            {/* Step 2: Customize (Birthday only) */}
            {hasExtras && step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-stone-900">Customize Your Party</h2>
                  <p className="text-stone-500 mt-1">Add extras to make it special (optional)</p>
                </div>

                <div className="space-y-4">
                  {["custom", "cake", "decor", "snacks", "drinks"].map((cat) => {
                    const catExtras = birthdayExtras.filter(e => e.category === cat);
                    if (catExtras.length === 0) return null;
                    
                    const catLabels: Record<string, string> = {
                      custom: "Personalized Items",
                      cake: "Birthday Cakes",
                      decor: "Decorations & Setup",
                      snacks: "Snacks",
                      drinks: "Drinks",
                    };

                    return (
                      <div key={cat}>
                        <h3 className="font-semibold text-stone-900 mb-3">{catLabels[cat]}</h3>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {catExtras.map((extra) => {
                            const Icon = extra.icon;
                            const qty = selectedExtras[extra.id] || 0;
                            return (
                              <Card key={extra.id} className={qty > 0 ? "ring-2 ring-stone-900" : ""}>
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0">
                                      {extra.image ? (
                                        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-stone-100">
                                          <Image src={extra.image} alt={extra.name} fill className="object-cover" />
                                        </div>
                                      ) : (
                                        <div className="p-2 bg-stone-100 rounded-lg">
                                          <Icon className="h-5 w-5 text-stone-600" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="font-medium text-stone-900">{extra.name}</h4>
                                      <p className="text-xs text-stone-500">{extra.description}</p>
                                      <p className="text-sm font-bold text-stone-900 mt-1">AED {extra.price}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setSelectedExtras(prev => ({
                                          ...prev,
                                          [extra.id]: Math.max(0, (prev[extra.id] || 0) - 1)
                                        }))}
                                        disabled={qty === 0}
                                      >
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                      <span className="w-6 text-center font-bold">{qty}</span>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setSelectedExtras(prev => ({
                                          ...prev,
                                          [extra.id]: (prev[extra.id] || 0) + 1
                                        }))}
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Navigation Buttons - Desktop */}
                <div className="hidden lg:flex justify-between items-center pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    className="px-6 font-bold"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    className="bg-stone-900 hover:bg-stone-800 text-white px-8 font-bold"
                    onClick={() => setStep(step + 1)}
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3 (or 2): Details */}
            {step === (hasExtras ? 3 : 2) && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-stone-900">Your Details</h2>
                  <p className="text-stone-500 mt-1">Tell us about you and your event</p>
                </div>

                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-base font-bold text-stone-700 mb-1">Your Name *</label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-base font-bold text-stone-700 mb-1">Email *</label>
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-base font-bold text-stone-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-base font-bold text-stone-700 mb-1">Age Range of Kids</label>
                        <input
                          type="text"
                          value={ageRange}
                          onChange={(e) => setAgeRange(e.target.value)}
                          placeholder="e.g., 5-8 years"
                          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-base font-bold text-stone-700 mb-1">
                          <Calendar className="inline h-4 w-4 mr-1" />
                          Event Date *
                        </label>
                        <input
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          min={today}
                          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-base font-bold text-stone-700 mb-1">
                          <Clock className="inline h-4 w-4 mr-1" />
                          Time Slot *
                        </label>
                        {loadingSlots ? (
                          <div className="flex items-center gap-2 py-2 text-stone-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading available slots...
                          </div>
                        ) : eventDate && allTimeSlots.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                            {allTimeSlots.map((slot) => {
                              const isAvailable = availableTimeSlots.some(s => s.start === slot.start);
                              return (
                                <button
                                  key={slot.start}
                                  type="button"
                                  disabled={!isAvailable}
                                  onClick={() => setEventTime(slot.start)}
                                  className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                                    eventTime === slot.start
                                      ? "bg-[#f5e6dc] text-stone-800 border-stone-300"
                                      : isAvailable
                                      ? "border-stone-300 hover:border-stone-900"
                                      : "border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed line-through"
                                  }`}
                                >
                                  {slot.label}
                                </button>
                              );
                            })}
                          </div>
                        ) : eventDate ? (
                          <p className="text-sm text-stone-500 py-2">No slots available for this date</p>
                        ) : (
                          <p className="text-sm text-stone-500 py-2">Select a date first</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-base font-bold text-stone-700 mb-1">Special Requests</label>
                      <textarea
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        rows={3}
                        placeholder="Any dietary restrictions, allergies, or special requests..."
                        className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Navigation Buttons - Desktop */}
                <div className="hidden lg:flex justify-between items-center pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    className="px-6 font-bold"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    className="bg-stone-900 hover:bg-stone-800 text-white px-8 font-bold"
                    onClick={() => setStep(step + 1)}
                    disabled={!canProceed()}
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4 (or 3): Confirm */}
            {step === maxStep && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-stone-900">Confirm Your Booking</h2>
                  <p className="text-stone-500 mt-1">Review your details before payment</p>
                </div>

                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4 text-base">
                      <div>
                        <span className="font-bold text-stone-700">Category:</span>
                        <span className="ml-2 font-bold text-stone-900">{currentConfig.label}</span>
                      </div>
                      <div>
                        <span className="font-bold text-stone-700">Package:</span>
                        <span className="ml-2 font-bold text-stone-900">{selectedMenu?.name}</span>
                      </div>
                      <div>
                        <span className="font-bold text-stone-700">Guests:</span>
                        <span className="ml-2 font-bold text-stone-900">{guestCount}</span>
                      </div>
                      <div>
                        <span className="font-bold text-stone-700">Date:</span>
                        <span className="ml-2 font-bold text-stone-900">{eventDate}</span>
                      </div>
                      <div>
                        <span className="font-bold text-stone-700">Time:</span>
                        <span className="ml-2 font-bold text-stone-900">{eventTime}</span>
                      </div>
                      <div>
                        <span className="font-bold text-stone-700">Name:</span>
                        <span className="ml-2 font-bold text-stone-900">{customerName}</span>
                      </div>
                      <div>
                        <span className="font-bold text-stone-700">Email:</span>
                        <span className="ml-2 font-bold text-stone-900">{customerEmail}</span>
                      </div>
                    </div>

                    {/* Payment Info - Hidden per client request (order summary hidden at checkout) */}
                  </CardContent>
                </Card>

                {/* Navigation Buttons - Desktop */}
                <div className="hidden lg:flex justify-between items-center pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    className="px-6 font-bold"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    className="bg-stone-900 hover:bg-stone-800 text-white px-8 font-bold"
                    onClick={handleSubmit}
                    disabled={submitting || !canProceed()}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {submitting ? "Processing..." : "Pay Now"}
                    {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Mobile Floating Order Summary Bar - Deliveroo Style */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="px-4 py-3">
          {selectedMenu ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-stone-900">
                  {selectedMenu.name} • {guestCount} {isBirthday ? "kids" : "guests"}
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
