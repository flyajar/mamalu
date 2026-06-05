"use client";

import { useState, useEffect } from "react";
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
  Ticket,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MiniChefPageContent, defaultMiniChefContent } from "@/types/site-content";

// Menu item interface
interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: string;
  dishes: string[];
  category: string;
  scheduled_date?: string | null;
  class_count?: number;
  allowed_persons?: number | null;
}

// Extra item interface
interface ExtraItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: LucideIcon;
  category: string;
  image?: string;
}

interface DbPartyExtra {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  metadata: {
    extra_category?: string;
    icon?: string;
  } | null;
}

interface DbMenuItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  dishes: string[] | null;
  categories: string[] | null;
  scheduled_date?: string | null;
  allowed_persons?: number | null;
}

interface DbPackageMenuItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  dishes: string[] | null;
}

interface DbPackage {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  categories: string[] | null;
  metadata?: {
    class_count?: number;
  } | null;
  menu_items?: DbPackageMenuItem[] | null;
}

interface AppliedVoucher {
  code: string;
  amount: number;
}

// Category type
type CategoryType = "classics" | "monthly" | "mommy_me" | "birthdays" | "packages";

const AVAILABILITY_CATEGORY_BY_TAB: Record<CategoryType, string> = {
  classics: "classics_mini",
  monthly: "monthly_mini",
  mommy_me: "mommy_me",
  birthdays: "birthday",
  packages: "packages",
};

const MOMMY_ME_ADDITIONAL_CHILD_PRICE = 200;
const PRIMARY_BUTTON_CLASS = "bg-[rgb(255_140_107)] hover:bg-[rgb(255_126_91)] text-white border border-[rgb(255_140_107)] font-bold disabled:!bg-[rgb(255_170_145)] disabled:!border-[rgb(255_170_145)] disabled:!text-white disabled:!opacity-100 disabled:cursor-not-allowed";

// Category configuration with min guests - Birthdays last
const getCategoryConfig = (pageContent: MiniChefPageContent): Record<CategoryType, { label: string; icon: string; minGuests: number; maxGuests: number; description: string }> => ({
  classics: { label: "Our Classics", icon: pageContent.categoryIcons?.classics || "/icons/boy.png", minGuests: 1, maxGuests: 35, description: "2-hour hands-on cooking experience with professional chefs" },
  monthly: { label: "Monthly Specials", icon: pageContent.categoryIcons?.monthly || "/icons/girl.png", minGuests: 1, maxGuests: 35, description: "Seasonal rotating menus" },
  mommy_me: { label: "Mommy & Me", icon: pageContent.categoryIcons?.mommy_me || "/icons/boy.png", minGuests: 1, maxGuests: 20, description: "Mom and kid share their own station" },
  birthdays: { label: "Birthdays", icon: pageContent.categoryIcons?.birthdays || "/icons/girl.png", minGuests: 6, maxGuests: 35, description: "2-hour private birthday cooking experience" },
  packages: { label: "Packages", icon: pageContent.categoryIcons?.packages || "/icons/boy.png", minGuests: 6, maxGuests: 35, description: "Bundled menu packages for groups" },
});


const extraIconMap: Record<string, LucideIcon> = {
  gift: Gift,
  cake: Cake,
  party: PartyPopper,
  utensils: Utensils,
  chef_hat: ChefHat,
  drinks: Utensils,
};

const extraCategoryIconMap: Record<string, LucideIcon> = {
  custom: Gift,
  cake: Cake,
  decor: PartyPopper,
  snacks: Utensils,
  drinks: Utensils,
};

// Waiver Modal Component
function WaiverModal({ isOpen, onClose, onAccept }: { isOpen: boolean; onClose: () => void; onAccept: () => void }) {
  const [hasRead, setHasRead] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#FF8C6B] text-white p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">WAIVER FORM</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#ff7a54] rounded">
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
            
            <p className="text-[#FF8C6B]">
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
              className={`flex-1 ${PRIMARY_BUTTON_CLASS}`}
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
  const [step, setStep] = useState(1);
  const [pageContent, setPageContent] = useState<MiniChefPageContent>(defaultMiniChefContent);

  // Category and menu selection
  const [activeCategory, setActiveCategory] = useState<CategoryType>("classics");
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [guestCount, setGuestCount] = useState(6);

  // Dynamic menu data
  const [menuItemsByCategory, setMenuItemsByCategory] = useState<Record<string, MenuItem[]>>({});
  const [packageMenuItems, setPackageMenuItems] = useState<Record<string, MenuItem[]>>({});
  const [loadingMenus, setLoadingMenus] = useState(true);

  // Package menu item selection modal
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [pendingPackage, setPendingPackage] = useState<MenuItem | null>(null);
  const [selectedPackageMenuItems, setSelectedPackageMenuItems] = useState<MenuItem[]>([]);
  const [pendingPackageMenuItems, setPendingPackageMenuItems] = useState<MenuItem[]>([]);

  // Extras
  const [birthdayExtras, setBirthdayExtras] = useState<ExtraItem[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(true);
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});
  const [previewExtra, setPreviewExtra] = useState<ExtraItem | null>(null);

  // Booking details
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [allTimeSlots, setAllTimeSlots] = useState<{ start: string; end: string; duration: number; label: string }[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<{ start: string; end: string; duration: number; label: string }[]>([]);
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

  // Voucher
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null);
  const [voucherError, setVoucherError] = useState("");
  const [applyingVoucher, setApplyingVoucher] = useState(false);

  // Capacity tracking for monthly specials
  const [menuCapacities, setMenuCapacities] = useState<Record<string, { allowed: number; booked: number; available: number } | null>>({});

  // Get current category config
  const categoryConfig = getCategoryConfig(pageContent);
  const currentConfig = categoryConfig[activeCategory];
  const isBirthday = activeCategory === "birthdays";
  const isMommyAndMe = activeCategory === "mommy_me";
  const isPackage = activeCategory === "packages";
  const hasExtras = isBirthday;
  // Fetch page content
  useEffect(() => {
    fetch("/api/site-content?page=minichef")
      .then((res) => res.json())
      .then((data) => setPageContent(data))
      .catch(() => setPageContent(defaultMiniChefContent));
  }, []);

  useEffect(() => {
    async function fetchBirthdayExtras() {
      setLoadingExtras(true);
      try {
        const res = await fetch("/api/menus?category=party_extras");
        const data = res.ok ? await res.json() : { items: [] };
        const extras = (data.items || []).map((item: DbPartyExtra) => {
          const category = item.metadata?.extra_category || "custom";
          const icon = item.metadata?.icon
            ? extraIconMap[item.metadata.icon]
            : extraCategoryIconMap[category];
          return {
            id: item.id,
            name: item.name,
            description: item.description || "",
            price: Number(item.price) || 0,
            icon: icon || Gift,
            category,
            image: item.image_url || undefined,
          };
        });
        setBirthdayExtras(extras);
      } catch (error) {
        console.error("Failed to fetch birthday extras:", error);
        setBirthdayExtras([]);
      } finally {
        setLoadingExtras(false);
      }
    }
    fetchBirthdayExtras();
  }, []);

  // Fetch menu items and packages from DB on mount
  useEffect(() => {
    async function fetchMenuData() {
      setLoadingMenus(true);
      try {
        const [itemsRes, packagesRes] = await Promise.all([
          fetch("/api/admin/menu-items?active=true"),
          fetch("/api/admin/packages?active=true"),
        ]);
        const itemsData = itemsRes.ok ? await itemsRes.json() : { items: [] };
        const pkgsData = packagesRes.ok ? await packagesRes.json() : { packages: [] };

        const dbLabelToCategory: Record<string, CategoryType> = {
          "classics_mini": "classics",
          "monthly_mini": "monthly",
          "mommy_me": "mommy_me",
          "birthday": "birthdays",
        };

        const grouped: Record<string, MenuItem[]> = { classics: [], monthly: [], mommy_me: [], birthdays: [], packages: [] };

        for (const item of (itemsData.items || []) as DbMenuItem[]) {
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

        const activePkgs = ((pkgsData.packages || []) as DbPackage[]).filter((pkg) =>
          (pkg.categories || []).includes("packages")
        );

        grouped.packages = activePkgs.map((pkg) => ({
          id: pkg.id,
          name: pkg.name,
          price: pkg.price,
          image: pkg.image_url || "/images/placeholder.jpg",
          dishes: (pkg.menu_items || []).map((mi) => mi.name),
          category: "packages",
          class_count: pkg.metadata?.class_count,
        }));

        // Store full menu item details per package for the selection modal
        const pkgItemsMap: Record<string, MenuItem[]> = {};
        for (const pkg of activePkgs) {
          pkgItemsMap[pkg.id] = (pkg.menu_items || []).map((mi) => ({
            id: mi.id,
            name: mi.name,
            price: mi.price,
            image: mi.image_url || "/images/placeholder.jpg",
            dishes: mi.dishes || [],
            category: "packages",
          }));
        }

        setMenuItemsByCategory(grouped);
        setPackageMenuItems(pkgItemsMap);
      } catch (error) {
        console.error("Failed to fetch menu data:", error);
      } finally {
        setLoadingMenus(false);
      }
    }
    fetchMenuData();
  }, []);

  // Get menus for current category
  const getCurrentMenus = (): MenuItem[] => menuItemsByCategory[activeCategory] || [];

  const getPackageClassLimit = (pkg: MenuItem | null) => {
    if (!pkg) return 1;
    if (pkg.class_count && pkg.class_count > 0) return pkg.class_count;
    const match = pkg.name.match(/\b(\d+)\b/);
    const parsedLimit = match ? parseInt(match[1], 10) : 0;
    return parsedLimit > 0 ? parsedLimit : Math.max(1, packageMenuItems[pkg.id]?.length || 1);
  };

  const isPackageSelectionComplete = (pkg: MenuItem | null, selectedItems: MenuItem[]) => {
    if (!pkg) return false;
    return selectedItems.length === getPackageClassLimit(pkg);
  };

  const togglePendingPackageMenuItem = (item: MenuItem) => {
    const limit = getPackageClassLimit(pendingPackage);

    setPendingPackageMenuItems((prev) => {
      if (prev.some((selected) => selected.id === item.id)) {
        return prev.filter((selected) => selected.id !== item.id);
      }

      if (prev.length >= limit) return prev;
      return [...prev, item];
    });
  };

  // Reset selection when category changes
  useEffect(() => {
    setSelectedMenu(null);
    setSelectedPackageMenuItems([]);
    setPendingPackageMenuItems([]);
    setGuestCount(currentConfig.minGuests);
    setSelectedExtras({});
    setPreviewExtra(null);
    setStep(1);
    setEventDate("");
    setEventTime("");
  }, [activeCategory]);

  useEffect(() => {
    if (!previewExtra) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewExtra(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewExtra]);

  // Check if current selection is a monthly special with fixed date
  const isMonthlySpecial = activeCategory === "monthly" && selectedMenu?.scheduled_date;

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

  // Fetch available time slots when date changes
  useEffect(() => {
    // Skip fetching slots if this is a monthly special (date is fixed)
    if (isMonthlySpecial) return;
    if (!eventDate) {
      setAllTimeSlots([]);
      setAvailableTimeSlots([]);
      return;
    }
    setLoadingSlots(true);
    setEventTime("");
    fetch(`/api/services/availability?date=${eventDate}&category=${AVAILABILITY_CATEGORY_BY_TAB[activeCategory]}`)
      .then(res => res.json())
      .then(data => {
        setAllTimeSlots(data.allSlots || []);
        setAvailableTimeSlots(data.availableSlots || []);
      })
      .catch(err => console.error("Failed to fetch availability:", err))
      .finally(() => setLoadingSlots(false));
  }, [eventDate, activeCategory, isMonthlySpecial]);

  // Calculate totals
  const getMenuPrice = (menu = selectedMenu) => {
    if (!menu) return 0;
    if (isPackage) return menu.price;
    if (isMommyAndMe) {
      return menu.price + Math.max(0, guestCount - 1) * MOMMY_ME_ADDITIONAL_CHILD_PRICE;
    }
    return menu.price * guestCount;
  };

  const calculateBaseAmount = () => {
    if (!selectedMenu) return 0;
    return getMenuPrice();
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

  const selectedExtraItems = birthdayExtras
    .filter((extra) => selectedExtras[extra.id])
    .map((extra) => ({
      ...extra,
      quantity: selectedExtras[extra.id],
      total: extra.price * selectedExtras[extra.id],
    }));

  const selectedTimeSlotLabel = allTimeSlots.find((slot) => slot.start === eventTime)?.label || eventTime;
  const displayedTimeSlots = isBirthday ? availableTimeSlots : allTimeSlots;

  // Payment calculation - Mini Chef packages are paid in full.
  const totalAmount = calculateTotal();
  const voucherDiscount = appliedVoucher ? Math.min(totalAmount, Number(appliedVoucher.amount) || 0) : 0;
  const discountedTotalAmount = Math.max(0, totalAmount - voucherDiscount);
  const requiresDeposit = !isPackage;
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

  // Handle form submission
  const handleSubmit = async (acceptedWaiver = false) => {
    if (!selectedMenu) return;
    if (isPackage && !isPackageSelectionComplete(selectedMenu, selectedPackageMenuItems)) return;
    
    // Show waiver modal if not accepted
    if (!waiverAccepted && !acceptedWaiver) {
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

      const isDepositPayment = requiresDeposit;
      const packageClassNames = selectedPackageMenuItems.map((item) => item.name).join(", ");

      const res = await fetch("/api/services/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: "birthday_deck",
          serviceName: `Mini Chef - ${currentConfig.label}`,
          packageName: selectedMenu.name,
          menuId: isPackage && selectedPackageMenuItems.length > 0
            ? selectedPackageMenuItems.map((item) => item.id).join(",")
            : selectedMenu.id,
          menuName: isPackage && selectedPackageMenuItems.length > 0
            ? `${selectedMenu.name} — ${packageClassNames}`
            : selectedMenu.name,
          menuPrice: getMenuPrice(),
          chosenMenuItem: selectedPackageMenuItems[0]
            ? { id: selectedPackageMenuItems[0].id, name: selectedPackageMenuItems[0].name }
            : null,
          chosenMenuItems: selectedPackageMenuItems.map((item) => ({ id: item.id, name: item.name })),
          customerName,
          customerEmail,
          customerPhone,
          eventDate: eventDate || null,
          eventTime: eventTime || null,
          guestCount,
          items: isMommyAndMe
            ? [{
                id: selectedMenu.id,
                name: selectedMenu.name,
                children: guestCount,
                basePrice: selectedMenu.price,
                additionalChildren: Math.max(0, guestCount - 1),
                additionalChildPrice: MOMMY_ME_ADDITIONAL_CHILD_PRICE,
                totalPrice: getMenuPrice(),
              }]
            : isPackage
            ? selectedPackageMenuItems.map((item, index) => ({
                id: item.id,
                name: item.name,
                session: index + 1,
                packageId: selectedMenu.id,
                packageName: selectedMenu.name,
                event_date: index === 0 ? eventDate || null : null,
                event_time: index === 0 ? eventTime || null : null,
                time_label: index === 0 ? selectedTimeSlotLabel || null : null,
              }))
            : [],
          extras: extrasData,
          baseAmount: calculateBaseAmount(),
          extrasAmount: calculateExtrasTotal(),
          totalAmount,
          isDepositPayment,
          depositAmount: isDepositPayment ? depositAmount : null,
          balanceAmount: isDepositPayment ? balanceAmount : null,
          specialRequests: isMommyAndMe
            ? `${specialRequests ? `${specialRequests}\n\n` : ""}Mommy & Me children: ${guestCount}${guestCount > 1 ? ` (${guestCount - 1} additional child${guestCount - 1 === 1 ? "" : "ren"} at AED ${MOMMY_ME_ADDITIONAL_CHILD_PRICE} each)` : ""}`
            : isPackage && selectedPackageMenuItems.length > 0
            ? `${specialRequests ? `${specialRequests}\n\n` : ""}Selected package classes:\n${selectedPackageMenuItems.map((item, index) => `${index + 1}. ${item.name}`).join("\n")}`
            : specialRequests,
          ageRange,
          waiverAccepted: waiverAccepted || acceptedWaiver,
          category: activeCategory,
          voucherCode: appliedVoucher?.code || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else if (data.booking?.booking_number) {
          window.location.href = `/booking/success?booking=${data.booking.booking_number}`;
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
    handleSubmit(true);
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
    if (step === 1) {
      if (!selectedMenu) return false;
      if (isPackage) return isPackageSelectionComplete(selectedMenu, selectedPackageMenuItems);
      return true;
    }
    if (hasExtras && step === 2) return true; // Extras are optional
    const detailsStep = hasExtras ? 3 : 2;
    if (step === detailsStep) {
      if (!customerName || !customerEmail || !eventDate || !eventTime) return false;
      if (activeCategory === "monthly" && selectedMenu) {
        const cap = menuCapacities[selectedMenu.id];
        if (cap !== undefined && cap !== null && cap.available <= 0) return false;
      }
      return true;
    }
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

      {previewExtra?.image && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${previewExtra.name} preview`}
          onClick={() => setPreviewExtra(null)}
        >
          <div className="relative w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewExtra(null)}
              className="absolute -right-2 -top-12 rounded-full bg-white p-2 text-stone-700 shadow-lg transition hover:bg-stone-100 sm:-right-4"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-white shadow-2xl">
              <Image
                src={previewExtra.image}
                alt={previewExtra.name}
                fill
                className="object-contain"
                sizes="(min-width: 1024px) 768px, 92vw"
                priority
              />
            </div>
            <div className="mt-3 rounded-lg bg-white px-4 py-3 shadow-lg">
              <h3 className="font-semibold text-stone-900">{previewExtra.name}</h3>
              <p className="text-sm text-stone-600">{previewExtra.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Package Menu Item Selection Modal */}
      {showPackageModal && pendingPackage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-stone-900">{pendingPackage.name}</h2>
                <p className="text-sm text-stone-500 mt-0.5">
                  Choose up to {getPackageClassLimit(pendingPackage)} classes you&apos;d like to cook
                </p>
                <p className="text-xs font-bold text-stone-700 mt-2">
                  {pendingPackageMenuItems.length} of {getPackageClassLimit(pendingPackage)} selected
                </p>
              </div>
              <button onClick={() => setShowPackageModal(false)} className="p-1 hover:bg-stone-100 rounded-lg ml-4 shrink-0">
                <X className="h-5 w-5 text-stone-400" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              <div className="grid sm:grid-cols-2 gap-4">
                {(packageMenuItems[pendingPackage.id] || []).map((item) => {
                  const selectedIndex = pendingPackageMenuItems.findIndex((selected) => selected.id === item.id);
                  const isSelected = selectedIndex >= 0;
                  const limitReached = pendingPackageMenuItems.length >= getPackageClassLimit(pendingPackage);

                  return (
                    <div
                      key={item.id}
                      onClick={() => togglePendingPackageMenuItem(item)}
                      className={`cursor-pointer rounded-xl border-2 overflow-hidden transition-all ${
                        isSelected
                          ? "border-stone-900 shadow-md"
                          : limitReached
                          ? "border-stone-200 opacity-60 hover:opacity-80"
                          : "border-stone-200 hover:border-stone-400"
                      }`}
                    >
                      <div className="relative h-36 w-full bg-stone-200">
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                        {isSelected && (
                          <div className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#FF8C6B] text-xs font-bold text-white">
                            {selectedIndex + 1}
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-bold text-stone-900">{item.name}</h3>
                        <div className="mt-1.5 space-y-0.5">
                          {item.dishes.map((dish, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-sm text-stone-500">
                              <Check className="h-2.5 w-2.5 text-[#ff7f5c] shrink-0" />
                              <span>{dish}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-5 border-t flex gap-3">
              <Button variant="outline" onClick={() => setShowPackageModal(false)} className="flex-1">
                Cancel
              </Button>
              {(() => {
                const requiredClasses = getPackageClassLimit(pendingPackage);
                const packageComplete = isPackageSelectionComplete(pendingPackage, pendingPackageMenuItems);

                return (
              <Button
                disabled={!packageComplete}
                onClick={() => {
                  setSelectedMenu(pendingPackage);
                  setSelectedPackageMenuItems(pendingPackageMenuItems);
                  setShowPackageModal(false);
                }}
                className={`flex-1 ${PRIMARY_BUTTON_CLASS}`}
              >
                Confirm {pendingPackageMenuItems.length} of {requiredClasses} Classes
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Header with animated icons */}
      <div className="bg-white border-t relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => window.dispatchEvent(new CustomEvent("openMamaluMenu"))} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="hidden lg:block">
                <Image src="/images/0312b1_27732e4abccb4925bca29ff7f349d958~mv2_d_1772_1772_s_2.avif" alt="" width={160} height={160} className="float-gentle opacity-70" />
              </div>
              <div>
                <h1 className="text-2xl text-black" style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 900 }}>{pageContent.pageTitle}</h1>
                <p className="text-black text-base" style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 700 }}>
                  {pageContent.pageSubtitle}
                </p>
              </div>
            </div>
            <div className="hidden lg:block">
              <Image src="/images/0312b1_fee52e9b65c54277bd129615e50d68ff~mv2_d_1772_1772_s_2.avif" alt="" width={150} height={150} className="float-medium opacity-70" />
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
                  className={`flex items-center gap-1.5 sm:gap-2 px-4 py-2.5 sm:px-7 sm:py-3.5 rounded-full font-extrabold transition-all text-base sm:text-xl ${
                    activeCategory === cat
                      ? "bg-[#FF8C6B] text-white border border-[#FF8C6B] shadow-md"
                      : "text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  <Image src={categoryConfig[cat].icon} alt="" width={32} height={32} className="w-6 h-6 sm:w-8 sm:h-8" /> {categoryConfig[cat].label}
                </button>
              ))}
            </div>

            {/* Step 1: Package Selection */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl text-black" style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 900 }}>Pick your perfect Menu</h2>
                  <p className="text-stone-500 mt-1">{currentConfig.description}</p>
                  <p className="text-base text-stone-400 mt-2">
                    Min: {currentConfig.minGuests} {isMommyAndMe ? "child" : isBirthday ? "kid(s)" : "guest(s)"} • Max: {currentConfig.maxGuests} {isMommyAndMe ? "children" : isBirthday ? "kids" : "guests"} • {isMommyAndMe ? `AED ${MOMMY_ME_ADDITIONAL_CHILD_PRICE} per additional child` : "Price per person"}
                  </p>
                </div>

                {/* Mommy & Me Description */}
                {activeCategory === "mommy_me" && (
                  <div className="p-4 bg-[#FF8C6B]/10 rounded-lg border border-[#FF8C6B]/25">
                    <p className="font-bold text-stone-900">
                      Mom and kid have their own station where they share laughter, learning, and delicious moments together!
                    </p>
                    <p className="text-sm text-stone-700 mt-2">
                      Each menu includes 1 child. Add AED {MOMMY_ME_ADDITIONAL_CHILD_PRICE} for every additional child.
                    </p>
                  </div>
                )}

                {/* Guest Count Selector with Desktop Navigation */}
                <Card>
                  <CardContent className="p-5">
                    <label className="block text-lg font-bold text-stone-900 mb-3">
                      Number of {isMommyAndMe ? "Children" : isBirthday ? "Kids" : "Guests"}
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
                    {isMommyAndMe && selectedMenu && (
                      <div className="mb-4 rounded-lg border border-[#FF8C6B]/25 bg-[#FF8C6B]/10 px-4 py-3 text-sm text-stone-900">
                        <span className="font-bold">{selectedMenu.name} total:</span> AED {getMenuPrice().toLocaleString()}
                      </div>
                    )}
                    {/* Desktop Continue Button - Inside Card */}
                    <div className="hidden lg:flex justify-end items-center pt-4 border-t">
                      <Button
                        className={`px-8 ${PRIMARY_BUTTON_CLASS}`}
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
                {loadingMenus ? (
                  <div className="flex items-center justify-center py-12 text-stone-500">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Loading menus...
                  </div>
                ) : null}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {!loadingMenus && getCurrentMenus().map((menu) => {
                    const cap = activeCategory === "monthly" ? menuCapacities[menu.id] : undefined;
                    const isFull = cap !== undefined && cap !== null && cap.available <= 0;
                    return (
                    <Card
                      key={menu.id}
                      className={`cursor-pointer transition-all ${
                        selectedMenu?.id === menu.id ? "ring-2 ring-[#FF8C6B] shadow-lg" : "hover:shadow-md"
                      }`}
                      onClick={() => {
                        if (activeCategory === "packages" && packageMenuItems[menu.id]?.length > 0) {
                          setPendingPackage(menu);
                          setPendingPackageMenuItems(selectedMenu?.id === menu.id ? selectedPackageMenuItems : []);
                          setShowPackageModal(true);
                        } else {
                          setSelectedMenu(menu);
                          setSelectedPackageMenuItems([]);
                        }
                      }}
                    >
                      <CardContent className="p-0 overflow-hidden flex flex-col h-full">
                        <div className="relative h-64 w-full bg-stone-200">
                          <Image src={menu.image} alt={menu.name} fill className="object-cover" />
                          {cap && !isFull && (
                            <div className="absolute top-2 left-2">
                              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#FF8C6B]/15 text-[#FF8C6B]">
                                {cap.available} spot{cap.available === 1 ? "" : "s"} left
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                          {/* Full width menu name */}
                          <h3 className="text-xl font-bold text-stone-900 mb-3">{menu.name}</h3>
                          {/* Dishes list */}
                          <div className="space-y-1 flex-1">
                            {menu.dishes.map((dish, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-base text-stone-600">
                                <Check className="h-3 w-3 text-[#ff7f5c] flex-shrink-0" />
                                <span>{dish}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Price in separate box at bottom */}
                        <div className="bg-stone-50 border-t px-4 py-3">
                          {activeCategory === "packages" && selectedMenu?.id === menu.id && selectedPackageMenuItems.length > 0 && (
                            <p className="text-xs text-[#ff7f5c] font-bold mb-1.5">
                              ✓ {selectedPackageMenuItems.length} class{selectedPackageMenuItems.length === 1 ? "" : "es"} selected
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-base text-stone-500">{activeCategory === "packages" ? "flat rate" : isMommyAndMe ? "mom + 1 child" : "per person"}</span>
                            <span className="text-xl font-bold text-stone-900">
                              AED {isMommyAndMe && selectedMenu?.id === menu.id ? getMenuPrice(menu).toLocaleString() : menu.price.toLocaleString()}
                            </span>
                          </div>
                          {isMommyAndMe && (
                            <p className="text-xs text-stone-400 mt-1">
                              +AED {MOMMY_ME_ADDITIONAL_CHILD_PRICE} per additional child
                            </p>
                          )}
                          {activeCategory === "packages" && selectedMenu?.id !== menu.id && (
                            <p className="text-xs text-stone-400 mt-1">Click to choose your classes</p>
                          )}
                        </div>
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

            {/* Step 2: Customize (Birthday only) */}
            {hasExtras && step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-stone-900">Customize Your Party</h2>
                  <p className="text-stone-500 mt-1">Add extras to make it special (optional)</p>
                </div>

                {loadingExtras ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
                  </div>
                ) : birthdayExtras.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-stone-500">
                      No party extras are currently available.
                    </CardContent>
                  </Card>
                ) : (
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
                                <Card key={extra.id} className={qty > 0 ? "ring-2 ring-[#FF8C6B]" : ""}>
                                  <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                      <div className="flex-shrink-0">
                                        {extra.image ? (
                                          <button
                                            type="button"
                                            onClick={() => setPreviewExtra(extra)}
                                            className="group relative h-16 w-16 overflow-hidden rounded-lg bg-stone-100 focus:outline-none focus:ring-2 focus:ring-[#FF8C6B] focus:ring-offset-2"
                                            aria-label={`Preview ${extra.name}`}
                                          >
                                            <Image src={extra.image} alt={extra.name} fill className="object-cover transition group-hover:scale-105" />
                                          </button>
                                        ) : (
                                          <div className="p-2 bg-stone-100 rounded-lg">
                                            <Icon className="h-5 w-5 text-stone-600" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <h4 className="font-bold text-stone-900">{extra.name}</h4>
                                        <p className="text-sm text-stone-500">{extra.description}</p>
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
                )}

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
                    className={`px-8 ${PRIMARY_BUTTON_CLASS}`}
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
                    {activeCategory === "monthly" && selectedMenu && (() => {
                      const cap = menuCapacities[selectedMenu.id];
                      if (!cap) return null;
                      return (
                        <div className="px-4 py-3 rounded-xl bg-[#FF8C6B]/10 border border-[#FF8C6B]/25">
                          <p className="text-sm font-bold text-stone-900">
                            {cap.available === 1 ? "Only 1 spot remaining!" : `${cap.available} spots remaining for this class`}
                          </p>
                          <p className="text-xs text-stone-600 mt-0.5">{cap.booked} of {cap.allowed} spots already booked</p>
                        </div>
                      );
                    })()}
                    {isPackage && (
                      <div className="px-4 py-3 rounded-xl bg-[#FF8C6B]/10 border border-[#FF8C6B]/25">
                        <p className="flex items-center gap-2 text-sm font-bold text-stone-900">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-[#FF8C6B]" />
                          Only your first class will be scheduled here.
                        </p>
                        <p className="mt-1 text-sm leading-6 text-stone-700">
                          For the remaining classes in your package, please contact the Mamalu Kitchen team to arrange the dates and times.
                        </p>
                      </div>
                    )}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-base font-bold text-stone-700 mb-1">Your Name *</label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#FF8C6B] focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-base font-bold text-stone-700 mb-1">Email *</label>
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#FF8C6B] focus:border-transparent"
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
                          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#FF8C6B] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-base font-bold text-stone-700 mb-1">Age Range of Kids</label>
                        <input
                          type="text"
                          value={ageRange}
                          onChange={(e) => setAgeRange(e.target.value)}
                          placeholder="e.g., 5-8 years"
                          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#FF8C6B] focus:border-transparent"
                        />
                      </div>
                    </div>

                    {isMonthlySpecial ? (
                      <div className="p-4 bg-[#FF8C6B]/10 border border-[#FF8C6B]/25 rounded-lg">
                        <p className="flex items-center gap-2 text-sm font-bold text-stone-900 mb-3">
                          <Calendar className="h-4 w-4 shrink-0 text-[#FF8C6B]" />
                          This monthly special has a fixed schedule:
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-[#FF8C6B] mb-1">Event Date</label>
                            <div className="px-4 py-2 bg-white border border-[#FF8C6B]/30 rounded-lg text-stone-900 font-medium">
                              {new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-[#FF8C6B] mb-1">Time</label>
                            <div className="px-4 py-2 bg-white border border-[#FF8C6B]/30 rounded-lg text-stone-900 font-medium">
                              {selectedMenu?.scheduled_date ? new Date(selectedMenu.scheduled_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : eventTime}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
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
                            className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#FF8C6B] focus:border-transparent"
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
                          ) : eventDate && displayedTimeSlots.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                              {displayedTimeSlots.map((slot) => {
                                return (
                                  <button
                                    key={slot.start}
                                    type="button"
                                    onClick={() => setEventTime(slot.start)}
                                    className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                                      eventTime === slot.start
                                        ? "bg-[#FF8C6B] text-white border-[#FF8C6B]"
                                        : "border-stone-300 hover:border-[#FF8C6B]"
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
                    )}

                    <div>
                      <label className="block text-base font-bold text-stone-700 mb-1">Special Requests</label>
                      <textarea
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        rows={3}
                        placeholder="Any dietary restrictions, allergies, or special requests..."
                        className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#FF8C6B] focus:border-transparent"
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
                    className={`px-8 ${PRIMARY_BUTTON_CLASS}`}
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
                      {isPackage && selectedPackageMenuItems.length > 0 && (
                        <div className="sm:col-span-2">
                          <span className="font-bold text-stone-700">Selected Classes:</span>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {selectedPackageMenuItems.map((item, index) => (
                              <span key={item.id} className="rounded-full bg-stone-100 px-3 py-1 text-sm font-bold text-stone-700">
                                {index + 1}. {item.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-stone-700">{isMommyAndMe ? "Children:" : "Guests:"}</span>
                        <span className="ml-2 font-bold text-stone-900">{guestCount}</span>
                      </div>
                      {isMommyAndMe && (
                        <div>
                          <span className="font-bold text-stone-700">Menu Total:</span>
                          <span className="ml-2 font-bold text-stone-900">AED {calculateBaseAmount().toLocaleString()}</span>
                        </div>
                      )}
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
                            <p className="font-bold text-stone-900">{selectedMenu?.name}</p>
                            <p className="text-sm text-stone-500">
                              {isMommyAndMe
                                ? `Mom + 1 child base`
                                : isPackage
                                ? "Package rate"
                                : `${guestCount} ${isBirthday ? "kids" : "guests"} x AED ${selectedMenu?.price.toLocaleString() || 0}`}
                            </p>
                          </div>
                          <span className="font-bold text-stone-900">AED {calculateBaseAmount().toLocaleString()}</span>
                        </div>

                        {isMommyAndMe && guestCount > 1 && (
                          <div className="flex items-start justify-between gap-4 text-sm text-stone-600">
                            <span>{guestCount - 1} additional child{guestCount - 1 === 1 ? "" : "ren"} x AED {MOMMY_ME_ADDITIONAL_CHILD_PRICE}</span>
                            <span>AED {((guestCount - 1) * MOMMY_ME_ADDITIONAL_CHILD_PRICE).toLocaleString()}</span>
                          </div>
                        )}

                        {isPackage && selectedPackageMenuItems.length > 0 && (
                          <div className="rounded-lg bg-stone-50 px-3 py-2">
                            <p className="text-sm font-bold text-stone-700">Selected Classes</p>
                            <div className="mt-1 space-y-1">
                              {selectedPackageMenuItems.map((item, index) => (
                                <p key={item.id} className="text-sm text-stone-600">
                                  {index + 1}. {item.name}
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
                    className={`px-8 ${PRIMARY_BUTTON_CLASS}`}
                    onClick={() => handleSubmit()}
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

      {/* Floating booking action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:pl-8 lg:pr-32">
          {selectedMenu ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-stone-900 sm:text-base">
                  {selectedMenu.name} • {guestCount} {isMommyAndMe ? "children" : isBirthday ? "kids" : "guests"}
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
