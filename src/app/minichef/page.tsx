"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { dateAllowsDeposit, getDubaiDate } from "@/lib/payments/deposit-policy";
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
  ExternalLink,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MonthlyAvailableDatePicker } from "@/components/booking/monthly-available-date-picker";
import { MiniChefPageContent, defaultMiniChefContent } from "@/types/site-content";

// Menu item interface
interface MenuItem {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  discount_active?: boolean;
  image: string;
  dishes: string[];
  category: string;
  scheduled_date?: string | null;
  class_count?: number;
  allowed_persons?: number | null;
  metadata?: {
    monthly_special_end_time?: string;
    monthly_special_schedules?: MonthlySpecialSchedule[];
  } | null;
}

interface MonthlySpecialTimeRange {
  start: string;
  end: string;
}

interface MonthlySpecialSchedule {
  date: string;
  times: MonthlySpecialTimeRange[];
}

const formatTimeLabel = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const getMonthlySpecialSchedules = (menu: MenuItem | null): MonthlySpecialSchedule[] => {
  const schedules = menu?.metadata?.monthly_special_schedules;
  if (Array.isArray(schedules) && schedules.length > 0) {
    return schedules
      .map((schedule) => ({
        date: typeof schedule.date === "string" ? schedule.date : "",
        times: Array.isArray(schedule.times)
          ? schedule.times.filter((time) => time.start && time.end)
          : [],
      }))
      .filter((schedule) => schedule.date && schedule.times.length > 0);
  }

  if (!menu?.scheduled_date) return [];
  const date = new Date(menu.scheduled_date);
  if (Number.isNaN(date.getTime())) return [];
  const start = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const fallbackEnd = new Date(date);
  fallbackEnd.setHours(date.getHours() + 1, date.getMinutes(), 0, 0);
  const end = menu.metadata?.monthly_special_end_time || `${String(fallbackEnd.getHours()).padStart(2, "0")}:${String(fallbackEnd.getMinutes()).padStart(2, "0")}`;
  return [{
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    times: [{ start, end }],
  }];
};

const formatMonthlySpecialSchedules = (menu: MenuItem) => {
  const schedules = getMonthlySpecialSchedules(menu);
  if (schedules.length === 0) return null;
  return schedules.map((schedule) => {
    const date = new Date(`${schedule.date}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    const dateLabel = date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const times = schedule.times
      .map((time) => `${formatTimeLabel(time.start)} to ${formatTimeLabel(time.end)}`)
      .join(", ");
    return `${dateLabel}, ${times}`;
  }).filter(Boolean).join("; ");
};

const getMonthlySpecialTimeSlots = (menu: MenuItem | null, dateKey: string) =>
  getMonthlySpecialSchedules(menu)
    .find((schedule) => schedule.date === dateKey)
    ?.times.map((time) => ({
    start: time.start,
    end: time.end,
    duration: 0,
    label: `${formatTimeLabel(time.start)} - ${formatTimeLabel(time.end)}`,
  })) || [];

const getMonthlySpecialDates = (menu: MenuItem | null) =>
  getMonthlySpecialSchedules(menu).map((schedule) => schedule.date);

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
  metadata?: {
    monthly_special_end_time?: string;
  } | null;
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

interface SummerCampApiItem {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  discount_active?: boolean;
  price_unit: string;
  image_url: string | null;
}

interface SummerCampApiBatch {
  id: string;
  name: string;
  dates: string[];
  time_slots?: Record<string, TimeSlot[]>;
}

interface TimeSlot {
  start: string;
  end: string;
  duration: number;
  label: string;
}

interface AppliedVoucher {
  code: string;
  amount: number;
}

interface ExternalSupplierRequirements {
  photographerName: string;
  photographerEmiratesId: string;
  photographerTradeLicense: string;
  photographerEquipmentList: string;
  backdropDesign: string;
  backdropSetupPersonEmiratesId: string;
  backdropSupplierTradeLicense: string;
}

interface ExternalSupplierFiles {
  photographerEmiratesId: File | null;
  photographerTradeLicense: File | null;
  backdropDesign: File | null;
  backdropSetupPersonEmiratesId: File | null;
  backdropSupplierTradeLicense: File | null;
}

type ExternalSupplierFileKey = keyof ExternalSupplierFiles;

// Category type
type CategoryType = "classics" | "monthly" | "mommy_me" | "birthdays" | "packages" | "summer_camp";

const AVAILABILITY_CATEGORY_BY_TAB: Record<CategoryType, string> = {
  classics: "classics_mini",
  monthly: "monthly_mini",
  mommy_me: "mommy_me",
  birthdays: "birthday",
  packages: "packages",
  summer_camp: "summer_camp",
};

const MOMMY_ME_ADDITIONAL_CHILD_PRICE = 200;
const SUMMER_CAMP_SELECTION_COUNT = 1;
const PRIMARY_BUTTON_CLASS = "bg-[rgb(255_140_107)] hover:bg-[rgb(255_126_91)] text-white border border-[rgb(255_140_107)] font-bold disabled:!bg-[rgb(255_170_145)] disabled:!border-[rgb(255_170_145)] disabled:!text-white disabled:!opacity-100 disabled:cursor-not-allowed";
const EMPTY_SUPPLIER_REQUIREMENTS: ExternalSupplierRequirements = {
  photographerName: "",
  photographerEmiratesId: "",
  photographerTradeLicense: "",
  photographerEquipmentList: "",
  backdropDesign: "",
  backdropSetupPersonEmiratesId: "",
  backdropSupplierTradeLicense: "",
};
const EMPTY_SUPPLIER_FILES: ExternalSupplierFiles = {
  photographerEmiratesId: null,
  photographerTradeLicense: null,
  backdropDesign: null,
  backdropSetupPersonEmiratesId: null,
  backdropSupplierTradeLicense: null,
};

const formatExternalSupplierRequirements = (requirements: ExternalSupplierRequirements) => {
  const hasRequirements = Object.values(requirements).some((value) => value.trim());
  if (!hasRequirements) return "";

  return [
    "External Suppliers Requirements",
    `Photographer / Videographer Company: ${requirements.photographerName.trim()}`,
    `Photographer Emirates ID: ${requirements.photographerEmiratesId.trim()}`,
    `Photography / Videography Trade License: ${requirements.photographerTradeLicense.trim()}`,
    `Equipment List: ${requirements.photographerEquipmentList.trim()}`,
    `Backdrop / Balloon Design: ${requirements.backdropDesign.trim()}`,
    `Delivery / Setup Person Emirates ID: ${requirements.backdropSetupPersonEmiratesId.trim()}`,
    `Backdrop / Balloon Supplier Trade License: ${requirements.backdropSupplierTradeLicense.trim()}`,
  ].join("\n");
};

const hasExternalSupplierRequirementsStarted = (requirements: ExternalSupplierRequirements) =>
  Object.values(requirements).some((value) => value.trim().length > 0);

const hasExternalSupplierFilesStarted = (files: ExternalSupplierFiles) =>
  Object.values(files).some(Boolean);

const hasCompleteExternalSupplierRequirements = (requirements: ExternalSupplierRequirements) =>
  Object.values(requirements).every((value) => value.trim().length > 0);

const hasCompleteExternalSupplierFiles = (files: ExternalSupplierFiles) =>
  Object.values(files).every(Boolean);

const uploadExternalSupplierFiles = async (files: ExternalSupplierFiles, customerEmail: string) => {
  const labels: Record<ExternalSupplierFileKey, string> = {
    photographerEmiratesId: "Photographer Emirates ID file",
    photographerTradeLicense: "Photography / videography trade license file",
    backdropDesign: "Backdrop / balloon sample design file",
    backdropSetupPersonEmiratesId: "Setup person Emirates ID file",
    backdropSupplierTradeLicense: "Backdrop / balloon supplier trade license file",
  };

  const uploaded: string[] = [];
  for (const [key, file] of Object.entries(files) as [ExternalSupplierFileKey, File | null][]) {
    if (!file) throw new Error(`${labels[key]} is required.`);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "documents");
    formData.append("userId", `supplier-${customerEmail.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`);

    const res = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Failed to upload ${labels[key]}.`);
    }

    uploaded.push(`${labels[key]}: ${data.url}`);
  }

  return uploaded.join("\n");
};

const STATIC_SUMMER_CAMP_MENUS: MenuItem[] = [
  {
    id: "summer-camp-per-day",
    name: "Per Day",
    price: 250,
    image: "/images/summer camp .png",
    dishes: ["Summer camp class by day"],
    category: "summer_camp",
  },
  {
    id: "summer-camp-per-week",
    name: "Per Week",
    price: 1000,
    image: "/images/week 1 summer camp.png",
    dishes: ["Summer camp class by week"],
    category: "summer_camp",
  },
];

// Category configuration with min guests - Birthdays last
const getCategoryConfig = (pageContent: MiniChefPageContent): Record<CategoryType, { label: string; icon: string; minGuests: number; maxGuests: number; description: string }> => ({
  classics: { label: "Our Classics", icon: pageContent.categoryIcons?.classics || "/icons/boy.png", minGuests: 1, maxGuests: 35, description: "1 and a half hour hands-on cooking experience with professional chefs" },
  monthly: { label: "Monthly Specials", icon: pageContent.categoryIcons?.monthly || "/icons/girl.png", minGuests: 1, maxGuests: 35, description: "Seasonal rotating menus" },
  mommy_me: { label: "Mommy & Me", icon: pageContent.categoryIcons?.mommy_me || "/icons/boy.png", minGuests: 1, maxGuests: 20, description: "Mom and kid have their own station where they share laughter, learning, and delicious moments together!" },
  birthdays: { label: "Birthdays", icon: pageContent.categoryIcons?.birthdays || "/icons/girl.png", minGuests: 6, maxGuests: 35, description: "2-hour private birthday cooking experience" },
  packages: { label: "Packages", icon: pageContent.categoryIcons?.packages || "/icons/boy.png", minGuests: 6, maxGuests: 35, description: "Bundled menu packages for groups" },
  summer_camp: { label: "Mini Chef Camp", icon: pageContent.categoryIcons?.packages || "/icons/boy.png", minGuests: 1, maxGuests: 35, description: "Choose Per Day or Per Week for the selected camp date." },
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

function ExternalSupplierModal({
  isOpen,
  value,
  files,
  onChange,
  onFilesChange,
  onClose,
}: {
  isOpen: boolean;
  value: ExternalSupplierRequirements;
  files: ExternalSupplierFiles;
  onChange: (value: ExternalSupplierRequirements) => void;
  onFilesChange: (value: ExternalSupplierFiles) => void;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  const updateField = (field: keyof ExternalSupplierRequirements, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
  };

  const updateFile = (field: ExternalSupplierFileKey, file: File | null) => {
    onFilesChange({ ...files, [field]: file });
  };

  const renderFileInput = (field: ExternalSupplierFileKey, label: string) => (
    <div>
      <label className="mb-1 block text-sm font-bold text-stone-700">{label} *</label>
      <input
        type="file"
        accept=".pdf,image/jpeg,image/png,image/webp"
        onChange={(event) => updateFile(field, event.target.files?.[0] || null)}
        className="w-full rounded-lg border border-stone-300 px-4 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:font-bold file:text-stone-700 hover:file:bg-stone-200"
        required
      />
      {files[field] && <p className="mt-1 truncate text-xs font-medium text-stone-500">{files[field]?.name}</p>}
    </div>
  );

  const canSave = hasCompleteExternalSupplierRequirements(value) && hasCompleteExternalSupplierFiles(files);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-xl font-bold text-stone-900">External Suppliers Requirements</h2>
            <p className="mt-1 text-sm text-stone-600">All fields are required for venue permit processing.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto p-5">
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-700">
            To ensure smooth coordination and compliance with venue regulations, all external suppliers must submit the required documents at least 5 days prior to the event to allow sufficient time for permit processing.
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-stone-900">1. Photographer & Videographer</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold text-stone-700">Company / Supplier Name *</label>
                <input value={value.photographerName} onChange={(e) => updateField("photographerName", e.target.value)} className="w-full rounded-lg border border-stone-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-[#FF8C6B]" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-stone-700">Photographer Emirates ID *</label>
                <input value={value.photographerEmiratesId} onChange={(e) => updateField("photographerEmiratesId", e.target.value)} className="w-full rounded-lg border border-stone-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-[#FF8C6B]" required />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-stone-700">Photography / Videography Trade License *</label>
              <input value={value.photographerTradeLicense} onChange={(e) => updateField("photographerTradeLicense", e.target.value)} className="w-full rounded-lg border border-stone-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-[#FF8C6B]" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-stone-700">Complete Equipment List *</label>
              <textarea value={value.photographerEquipmentList} onChange={(e) => updateField("photographerEquipmentList", e.target.value)} rows={3} placeholder="Cameras, lenses, lighting equipment, flashes, tripods, etc." className="w-full rounded-lg border border-stone-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-[#FF8C6B]" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {renderFileInput("photographerEmiratesId", "Photographer Emirates ID File")}
              {renderFileInput("photographerTradeLicense", "Trade License File")}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-stone-900">2. Backdrops & Balloon Suppliers</h3>
            <div>
              <label className="mb-1 block text-sm font-bold text-stone-700">Sample Image / Design and Dimensions *</label>
              <textarea value={value.backdropDesign} onChange={(e) => updateField("backdropDesign", e.target.value)} rows={3} placeholder="Describe the backdrop or balloon setup, including dimensions / measurements." className="w-full rounded-lg border border-stone-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-[#FF8C6B]" required />
            </div>
            {renderFileInput("backdropDesign", "Sample Image / Design File")}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold text-stone-700">Setup Person Emirates ID *</label>
                <input value={value.backdropSetupPersonEmiratesId} onChange={(e) => updateField("backdropSetupPersonEmiratesId", e.target.value)} className="w-full rounded-lg border border-stone-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-[#FF8C6B]" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-stone-700">Supplier Trade License *</label>
                <input value={value.backdropSupplierTradeLicense} onChange={(e) => updateField("backdropSupplierTradeLicense", e.target.value)} className="w-full rounded-lg border border-stone-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-[#FF8C6B]" required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {renderFileInput("backdropSetupPersonEmiratesId", "Setup Person Emirates ID File")}
              {renderFileInput("backdropSupplierTradeLicense", "Supplier Trade License File")}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t bg-stone-50 p-5">
          <Button type="button" variant="outline" onClick={onClose} className="font-bold">Cancel</Button>
          <Button type="button" onClick={onClose} disabled={!canSave} className={PRIMARY_BUTTON_CLASS}>Save Requirements</Button>
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
  const [selectedSummerCampMenus, setSelectedSummerCampMenus] = useState<MenuItem[]>([]);
  const [summerCampDayCount, setSummerCampDayCount] = useState(1);

  // Extras
  const [birthdayExtras, setBirthdayExtras] = useState<ExtraItem[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(true);
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});
  const [previewExtra, setPreviewExtra] = useState<ExtraItem | null>(null);

  // Booking details
  const [eventDate, setEventDate] = useState("");
  const [summerCampSelectedDates, setSummerCampSelectedDates] = useState<string[]>([]);
  const [eventTime, setEventTime] = useState("");
  const [monthlyAvailableDates, setMonthlyAvailableDates] = useState<string[]>([]);
  const [loadingMonthlyDates, setLoadingMonthlyDates] = useState(false);
  const [blockedRentalDates, setBlockedRentalDates] = useState<string[]>([]);
  const [summerCampAvailableDates, setSummerCampAvailableDates] = useState<string[]>([]);
  const [summerCampBatches, setSummerCampBatches] = useState<SummerCampApiBatch[]>([]);
  const [summerCampTimeSlotsByDate, setSummerCampTimeSlotsByDate] = useState<Record<string, TimeSlot[]>>({});
  const [loadingSummerCampDates, setLoadingSummerCampDates] = useState(false);
  const [summerCampItems, setSummerCampItems] = useState<MenuItem[]>(STATIC_SUMMER_CAMP_MENUS);
  const [allTimeSlots, setAllTimeSlots] = useState<TimeSlot[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [externalSupplierRequirements, setExternalSupplierRequirements] = useState<ExternalSupplierRequirements>(EMPTY_SUPPLIER_REQUIREMENTS);
  const [externalSupplierFiles, setExternalSupplierFiles] = useState<ExternalSupplierFiles>(EMPTY_SUPPLIER_FILES);

  // Validation message
  const [validationMessage, setValidationMessage] = useState("");

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
  const isMonthly = activeCategory === "monthly";
  const isMommyAndMe = activeCategory === "mommy_me";
  const isPackage = activeCategory === "packages";
  const isSummerCamp = activeCategory === "summer_camp";
  const selectedSummerCampMenu = selectedSummerCampMenus[0] || null;
  const isSummerCampPerDay = selectedSummerCampMenu?.id === "summer-camp-per-day";
  const isSummerCampPerWeek = selectedSummerCampMenu?.id === "summer-camp-per-week";
  const summerCampBookingOption = selectedSummerCampMenu?.id === "summer-camp-per-week" ? "per-week" : "per-day";
  const summerCampRequiredDateCount = isSummerCampPerWeek ? 5 : summerCampDayCount;
  const hasExtras = isBirthday;
  // Fetch page content
  useEffect(() => {
    fetch("/api/site-content?page=minichef")
      .then((res) => res.json())
      .then((data) => setPageContent(data))
      .catch(() => setPageContent(defaultMiniChefContent));
  }, []);

  useEffect(() => {
    fetch("/api/rentals/availability", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { blockedDates: [] }))
      .then((data) => {
        const dates = Array.isArray(data.blockedDates) ? data.blockedDates : [];
        setBlockedRentalDates(dates);
        if (eventDate && dates.includes(eventDate)) {
          setEventDate("");
          setEventTime("");
        }
      })
      .catch((error) => {
        console.error("Failed to fetch rental blocked dates:", error);
        setBlockedRentalDates([]);
      });
  }, [eventDate]);

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
          "summer_camp": "summer_camp",
        };

        const grouped: Record<string, MenuItem[]> = { classics: [], monthly: [], mommy_me: [], birthdays: [], packages: [], summer_camp: [] };

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
                metadata: item.metadata || null,
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
  const getCurrentMenus = (): MenuItem[] => {
    const menus = menuItemsByCategory[activeCategory] || [];
    if (isSummerCamp) return menus.length > 0 ? menus : summerCampItems;
    return menus;
  };

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
    setSelectedSummerCampMenus([]);
    setSummerCampDayCount(1);
    setGuestCount(currentConfig.minGuests);
    setSelectedExtras({});
    setPreviewExtra(null);
    setStep(1);
    setEventDate("");
    setSummerCampSelectedDates([]);
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

    const dates = getMonthlySpecialDates(selectedMenu);
    setMonthlyAvailableDates(dates);
    setLoadingMonthlyDates(false);
    if (eventDate && !dates.includes(eventDate)) {
      setEventDate("");
      setEventTime("");
    }
  }, [eventDate, isMonthly, selectedMenu]);

  useEffect(() => {
    if (!isSummerCamp) {
      setSummerCampAvailableDates([]);
      setSummerCampBatches([]);
      setSummerCampTimeSlotsByDate({});
      setLoadingSummerCampDates(false);
      return;
    }

    setLoadingSummerCampDates(true);
    const params = new URLSearchParams({
      option: summerCampBookingOption,
      days: String(isSummerCampPerDay ? summerCampDayCount : 1),
    });

    fetch(`/api/services/summer-camp-dates?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        const dates = data.dates || [];
        setSummerCampAvailableDates(dates);
        setSummerCampBatches(Array.isArray(data.batches) ? data.batches : []);
        setSummerCampTimeSlotsByDate(data.timeSlotsByDate && typeof data.timeSlotsByDate === "object" ? data.timeSlotsByDate : {});
        if (Array.isArray(data.items) && data.items.length > 0) {
          setSummerCampItems(
            data.items.map((item: SummerCampApiItem) => ({
              id: item.id,
              name: item.name,
              price: Number(item.price) || 0,
              original_price: Number(item.original_price) || Number(item.price) || 0,
              discount_percentage: Number(item.discount_percentage) || 0,
              discount_active: Boolean(item.discount_active),
              image: item.image_url || "/images/summer camp .png",
              dishes: [item.description || item.price_unit],
              category: "summer_camp",
            }))
          );
        }
        if (isSummerCampPerWeek) {
          const selectedBatchStillAvailable = Array.isArray(data.batches)
            && data.batches.some((batch: SummerCampApiBatch) => batch.dates.join("|") === summerCampSelectedDates.join("|"));
          if (!selectedBatchStillAvailable && summerCampSelectedDates.length > 0) {
            setSummerCampSelectedDates([]);
            setEventDate("");
            setEventTime("");
          }
          return;
        }

        setSummerCampSelectedDates((prev) => {
          const validSelectedDates = prev
            .filter((date) => dates.includes(date))
            .slice(0, summerCampRequiredDateCount);
          const nextEventDate = validSelectedDates[0] || "";
          setEventDate((currentEventDate) => {
            if (currentEventDate === nextEventDate) return currentEventDate;
            setEventTime("");
            return nextEventDate;
          });
          return prev.join("|") === validSelectedDates.join("|") ? prev : validSelectedDates;
        });
      })
      .catch(err => {
        console.error("Failed to fetch summer camp dates:", err);
        setSummerCampAvailableDates([]);
        setSummerCampBatches([]);
        setSummerCampTimeSlotsByDate({});
      })
      .finally(() => setLoadingSummerCampDates(false));
  }, [isSummerCamp, isSummerCampPerDay, isSummerCampPerWeek, summerCampBookingOption, summerCampDayCount, summerCampRequiredDateCount]);

  const handleSummerCampDatesChange = (dates: string[]) => {
    const nextDates = dates.slice(0, summerCampRequiredDateCount).sort();
    setSummerCampSelectedDates(nextDates);
    setEventDate(nextDates[0] || "");
    setEventTime("");
  };

  const handleSummerCampBatchSelect = (batch: SummerCampApiBatch) => {
    handleSummerCampDatesChange(batch.dates);
  };

  const getSummerCampTimeSlotsForSelection = () => {
    if (!isSummerCamp || summerCampSelectedDates.length === 0) return [];
    const slotsByKey = new Map<string, TimeSlot>();

    summerCampSelectedDates.forEach((date) => {
      const slots = summerCampTimeSlotsByDate[date] || [];
      slots.forEach((slot) => slotsByKey.set(`${slot.start}-${slot.end}`, slot));
    });

    return [...slotsByKey.values()].sort((a, b) => a.start.localeCompare(b.start));
  };

  const formatSummerCampDate = (date: string) => {
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatSummerCampBatchRange = (dates: string[]) => {
    if (dates.length === 0) return "";
    const sortedDates = [...dates].sort();
    return `${formatSummerCampDate(sortedDates[0])} - ${formatSummerCampDate(sortedDates[sortedDates.length - 1])}`;
  };

  useEffect(() => {
    if (!isSummerCamp || !isSummerCampPerDay) return;

    setSummerCampSelectedDates((prev) => {
      if (prev.length <= summerCampDayCount) return prev;
      const nextDates = prev.slice(0, summerCampDayCount);
      setEventDate(nextDates[0] || "");
      return nextDates;
    });
  }, [isSummerCamp, isSummerCampPerDay, summerCampDayCount]);

  useEffect(() => {
    if (!isSummerCamp || !isSummerCampPerDay || summerCampDayCount < 5) return;

    const perWeekMenu = getCurrentMenus().find((menu) => menu.id === "summer-camp-per-week");
    if (!perWeekMenu) return;

    setSelectedSummerCampMenus([perWeekMenu]);
    setSelectedMenu(perWeekMenu);
    setSummerCampDayCount(1);
  }, [isSummerCamp, isSummerCampPerDay, summerCampDayCount, menuItemsByCategory, summerCampItems]);

  const summerCampTimeSlots = getSummerCampTimeSlotsForSelection();
  const summerCampTimeSlotKey = summerCampTimeSlots.map((slot) => `${slot.start}-${slot.end}`).join("|");

  // Fetch available time slots when date changes
  useEffect(() => {
    if (isMonthly) {
      setAllTimeSlots([]);
      setAvailableTimeSlots([]);
      return;
    }
    if (isSummerCamp) {
      setAllTimeSlots([]);
      setAvailableTimeSlots([]);
      setLoadingSlots(false);
      return;
    }
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
  }, [eventDate, activeCategory, isMonthly, isSummerCamp]);

  useEffect(() => {
    if (!isSummerCamp || !eventTime) return;
    const stillAvailable = summerCampTimeSlots.some((slot) => slot.start === eventTime);
    if (!stillAvailable) setEventTime("");
  }, [eventTime, isSummerCamp, summerCampTimeSlotKey]);

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
    if (isSummerCamp) {
      return selectedSummerCampMenus.reduce((total, menu) => {
        const quantity = menu.id === "summer-camp-per-day" ? summerCampDayCount : 1;
        return total + menu.price * guestCount * quantity;
      }, 0);
    }
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

  const today = getDubaiDate();
  const lookupTimeSlots = isSummerCamp ? summerCampTimeSlots : allTimeSlots;
  const selectedTimeSlotLabel = lookupTimeSlots.find((slot) => slot.start === eventTime)?.label || eventTime;
  const monthlySpecialDates = getMonthlySpecialDates(selectedMenu);
  const monthlySpecialTimeSlots = isMonthly && eventDate && monthlySpecialDates.includes(eventDate) && eventDate >= today
    ? getMonthlySpecialTimeSlots(selectedMenu, eventDate)
    : [];
  const displayedTimeSlots = isMonthly ? monthlySpecialTimeSlots : isSummerCamp ? summerCampTimeSlots : availableTimeSlots;
  const timeSlotEmptyMessage = isMonthly
    ? selectedMenu && monthlySpecialDates.length > 0 && monthlySpecialDates.every((date) => date < today)
      ? "These monthly special dates have passed"
      : selectedMenu
      ? "Select the available date first"
      : "Select a monthly special first"
    : isSummerCamp
    ? summerCampSelectedDates.length > 0
      ? "No camp time slots configured for the selected date"
      : "Select a camp date first"
    : eventDate
    ? "No slots available for this date"
    : "Select a date first";

  // Only birthday bookings allow a 50% deposit when booked more than two days ahead.
  const totalAmount = calculateTotal();
  const voucherDiscount = appliedVoucher ? Math.min(totalAmount, Number(appliedVoucher.amount) || 0) : 0;
  const discountedTotalAmount = Math.max(0, totalAmount - voucherDiscount);
  const requiresDeposit = isBirthday && dateAllowsDeposit(eventDate, getDubaiDate());
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
    if (isSummerCamp && selectedSummerCampMenus.length !== SUMMER_CAMP_SELECTION_COUNT) return;
    
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
      const summerCampClassNames = selectedSummerCampMenus.map((item) => item.name).join(", ");
      const bookingMenuItems = isSummerCamp ? selectedSummerCampMenus : selectedPackageMenuItems;
      const supplierRequirementsText = isBirthday ? formatExternalSupplierRequirements(externalSupplierRequirements) : "";
      const supplierFilesText = supplierRequirementsText
        ? await uploadExternalSupplierFiles(externalSupplierFiles, customerEmail)
        : "";
      const combinedSpecialRequests = [specialRequests.trim(), supplierRequirementsText, supplierFilesText].filter(Boolean).join("\n\n");

      const res = await fetch("/api/services/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: "birthday_deck",
          serviceName: `Mini Chef - ${currentConfig.label}`,
          packageName: isSummerCamp ? "Summer Camp" : selectedMenu.name,
          menuId: isSummerCamp
            ? selectedSummerCampMenus.map((item) => item.id).join(",")
            : isPackage && selectedPackageMenuItems.length > 0
            ? selectedPackageMenuItems.map((item) => item.id).join(",")
            : selectedMenu.id,
          menuName: isSummerCamp
            ? summerCampClassNames
            : isPackage && selectedPackageMenuItems.length > 0
            ? `${selectedMenu.name} — ${packageClassNames}`
            : selectedMenu.name,
          menuPrice: calculateBaseAmount(),
          chosenMenuItem: bookingMenuItems[0]
            ? { id: bookingMenuItems[0].id, name: bookingMenuItems[0].name }
            : null,
          chosenMenuItems: bookingMenuItems.map((item) => ({ id: item.id, name: item.name })),
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
            : isSummerCamp
            ? selectedSummerCampMenus.map((item, index) => ({
                id: item.id,
                name: item.name,
                quantity: item.id === "summer-camp-per-day" ? summerCampDayCount : 1,
                unitPrice: item.price,
                session: index + 1,
                event_date: eventDate || null,
                camp_dates: summerCampSelectedDates,
                event_time: eventTime || null,
                time_label: selectedTimeSlotLabel || null,
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
            ? `${combinedSpecialRequests ? `${combinedSpecialRequests}\n\n` : ""}Mommy & Me children: ${guestCount}${guestCount > 1 ? ` (${guestCount - 1} additional child${guestCount - 1 === 1 ? "" : "ren"} at AED ${MOMMY_ME_ADDITIONAL_CHILD_PRICE} each)` : ""}`
            : isPackage && selectedPackageMenuItems.length > 0
            ? `${combinedSpecialRequests ? `${combinedSpecialRequests}\n\n` : ""}Selected package classes:\n${selectedPackageMenuItems.map((item, index) => `${index + 1}. ${item.name}`).join("\n")}`
            : isSummerCamp
            ? `${combinedSpecialRequests ? `${combinedSpecialRequests}\n\n` : ""}Selected summer camp option:\n${selectedSummerCampMenus.map((item, index) => `${index + 1}. ${item.name}${item.id === "summer-camp-per-day" ? ` (${summerCampDayCount} day${summerCampDayCount === 1 ? "" : "s"})` : ""}`).join("\n")}\nSelected camp dates: ${summerCampSelectedDates.join(", ")}`
            : combinedSpecialRequests,
          ageRange,
          waiverAccepted: waiverAccepted || acceptedWaiver,
          category: activeCategory,
          bookingSlotCategory: AVAILABILITY_CATEGORY_BY_TAB[activeCategory],
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

  // Determine max step
  const maxStep = hasExtras ? 4 : 3;
  const stepLabels = hasExtras 
    ? { 1: "Package", 2: "Customize", 3: "Details", 4: "Confirm" }
    : { 1: "Package", 2: "Details", 3: "Confirm" };

  // Get reason why we can't proceed
  const getValidationMessage = () => {
    if (step === 1) {
      if (!selectedMenu) return "Please select a menu to continue.";
      if (isPackage && !isPackageSelectionComplete(selectedMenu, selectedPackageMenuItems)) return "Please complete your package class selection.";
      if (isSummerCamp && selectedSummerCampMenus.length !== SUMMER_CAMP_SELECTION_COUNT) return "Please select your summer camp option.";
      if (!eventDate) return "Please select an event date.";
      if (!eventTime) return "Please select a time slot.";
    }
    const detailsStep = hasExtras ? 3 : 2;
    if (step === detailsStep) {
      if (!customerName) return "Please enter your name.";
      if (!customerEmail) return "Please enter your email address.";
      if (!eventDate) return "Please select an event date.";
      if (!eventTime) return "Please select a time slot.";
    }
    return "";
  };

  // Can proceed to next step
  const canProceed = () => {
    if (step === 1) {
      if (!selectedMenu) return false;
      if (isPackage && !isPackageSelectionComplete(selectedMenu, selectedPackageMenuItems)) return false;
      if (isSummerCamp && selectedSummerCampMenus.length !== SUMMER_CAMP_SELECTION_COUNT) return false;
      if (isSummerCamp) {
        return summerCampSelectedDates.length === summerCampRequiredDateCount && Boolean(eventTime);
      }
      return Boolean(eventDate && eventTime);
    }
    if (hasExtras && step === 2) {
      const hasStartedSupplierRequirements = hasExternalSupplierRequirementsStarted(externalSupplierRequirements)
        || hasExternalSupplierFilesStarted(externalSupplierFiles);
      return !hasStartedSupplierRequirements
        || (hasCompleteExternalSupplierRequirements(externalSupplierRequirements) && hasCompleteExternalSupplierFiles(externalSupplierFiles));
    }
    const detailsStep = hasExtras ? 3 : 2;
    if (step === detailsStep) {
      if (!customerName || !customerEmail || !eventDate || !eventTime) return false;
      if (isSummerCamp && summerCampSelectedDates.length !== summerCampRequiredDateCount) return false;
      if (activeCategory === "monthly" && selectedMenu) {
        const cap = menuCapacities[selectedMenu.id];
        if (cap !== undefined && cap !== null && cap.available <= 0) return false;
      }
      return true;
    }
    return true;
  };

  const goToStep = (nextStep: number) => {
    setStep(nextStep);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  };

  const selectMenu = (menu: MenuItem) => {
    if (isSummerCamp) {
      setSelectedSummerCampMenus([menu]);
      setSelectedMenu(menu);
      return;
    }

    setSelectedMenu(menu);
    setSelectedPackageMenuItems([]);
    if (activeCategory === "monthly") {
      setEventDate("");
      setEventTime("");
      return;
    }

    const requiresManualContinue = isPackage;
    if (!requiresManualContinue && eventDate && eventTime) {
      goToStep(step + 1);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Waiver Modal */}
      <WaiverModal
        isOpen={showWaiverModal}
        onClose={() => setShowWaiverModal(false)}
        onAccept={handleWaiverAccept}
      />

      <ExternalSupplierModal
        isOpen={showSupplierModal}
        value={externalSupplierRequirements}
        files={externalSupplierFiles}
        onChange={setExternalSupplierRequirements}
        onFilesChange={setExternalSupplierFiles}
        onClose={() => setShowSupplierModal(false)}
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
          <div className="flex items-center justify-between gap-6">
            <div className="flex min-w-0 items-center gap-4">
              <button onClick={() => window.dispatchEvent(new CustomEvent("openMamaluMenu"))} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="hidden lg:block">
                <Image src="/images/0312b1_27732e4abccb4925bca29ff7f349d958~mv2_d_1772_1772_s_2.avif" alt="" width={160} height={160} className="float-gentle opacity-70" />
              </div>
              <div>
                <h1 className="text-2xl" style={{ fontFamily: 'var(--font-mossy), cursive' }}>{pageContent.pageTitle}</h1>
                <p className="text-black text-base" style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 700 }}>
                  {pageContent.pageSubtitle}
                </p>
              </div>
            </div>
            {pageContent.monthlySpecialsPdfUrl && (
              <a
                href={pageContent.monthlySpecialsPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto hidden shrink-0 items-center gap-2 rounded-2xl border-2 border-[#FF8C6B] bg-white px-5 py-2.5 text-sm font-bold text-[#FF8C6B] shadow-sm transition-all hover:bg-[#FF8C6B] hover:text-white sm:inline-flex"
                style={{ fontFamily: 'var(--font-mossy), cursive' }}
              >
                What&apos;s Happening
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
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
                  <h2 className="text-2xl" style={{ fontFamily: 'var(--font-mossy), cursive' }}>Pick your perfect Menu</h2>
                  <p className="text-stone-500 mt-1">{currentConfig.description}</p>
                  {!isMommyAndMe && (
                    <p className="text-base text-stone-400 mt-2">
                      Min: {currentConfig.minGuests} {isBirthday ? "kid(s)" : "guest(s)"} • Max: {currentConfig.maxGuests} {isBirthday ? "kids" : "guests"} • Price per person
                    </p>
                  )}
                </div>

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
                    const isSummerCampSelected = selectedSummerCampMenus.some((item) => item.id === menu.id);
                    return (
                    <Card
                      key={menu.id}
                      className={`cursor-pointer transition-all ${
                        selectedMenu?.id === menu.id || isSummerCampSelected ? "ring-2 ring-[#FF8C6B] shadow-lg" : "hover:shadow-md"
                      }`}
                      onClick={() => {
                        if (activeCategory === "packages" && packageMenuItems[menu.id]?.length > 0) {
                          setPendingPackage(menu);
                          setPendingPackageMenuItems(selectedMenu?.id === menu.id ? selectedPackageMenuItems : []);
                          setShowPackageModal(true);
                        } else {
                          selectMenu(menu);
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
                          {activeCategory === "monthly" && formatMonthlySpecialSchedules(menu) && (
                            <div className="mb-3 flex items-start gap-2 rounded-lg bg-[#FF8C6B]/10 px-3 py-2 text-sm font-bold text-stone-800">
                              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#FF8C6B]" />
                              <span>Available on {formatMonthlySpecialSchedules(menu)}</span>
                            </div>
                          )}
                          {/* Dishes list - hide for packages */}
                          {activeCategory !== "packages" && (
                            <div className="space-y-1 flex-1">
                              {menu.dishes.map((dish, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-base text-stone-600">
                                  <Check className="h-3 w-3 text-[#ff7f5c] flex-shrink-0" />
                                  <span>{dish}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Price in separate box at bottom */}
                        <div className="bg-stone-50 border-t px-4 py-3">
                          {activeCategory === "packages" && selectedMenu?.id === menu.id && selectedPackageMenuItems.length > 0 && (
                            <p className="text-xs text-[#ff7f5c] font-bold mb-1.5">
                              ✓ {selectedPackageMenuItems.length} class{selectedPackageMenuItems.length === 1 ? "" : "es"} selected
                            </p>
                          )}
                          {isSummerCampSelected && (
                            <p className="text-xs text-[#ff7f5c] font-bold mb-1.5">Selected for Summer Camp</p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-base text-stone-500">
                              {activeCategory === "packages"
                                ? "flat rate"
                                : isMommyAndMe
                                ? "mom + 1 child"
                                : isSummerCamp && menu.id === "summer-camp-per-day"
                                ? "per guest per day"
                                : isSummerCamp && menu.id === "summer-camp-per-week"
                                ? "per guest per week"
                                : "per person"}
                            </span>
                            <span className="text-xl font-bold text-stone-900">
                              AED {isMommyAndMe && selectedMenu?.id === menu.id ? getMenuPrice(menu).toLocaleString() : menu.price.toLocaleString()}
                            </span>
                          </div>
                          {isSummerCamp && menu.discount_active && menu.original_price && menu.original_price > menu.price && (
                            <div className="mt-1 flex items-center justify-end gap-2 text-xs">
                              <span className="text-stone-400 line-through">AED {menu.original_price.toLocaleString()}</span>
                              <span className="font-bold text-[#ff7f5c]">{menu.discount_percentage}% off</span>
                            </div>
                          )}
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
                    <div className={`grid gap-4 pb-4 lg:pb-6 ${isSummerCamp ? "" : "sm:grid-cols-2"}`}>
                      <div>
                        <label className="block text-base font-bold text-stone-700 mb-1">
                          <Calendar className="inline h-4 w-4 mr-1" />
                          {isSummerCampPerWeek ? "Camp Batch *" : "Event Date *"}
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
                              unavailableDates={blockedRentalDates}
                              value={eventDate}
                              onChange={(date) => {
                                setEventDate(date);
                                setEventTime("");
                              }}
                              today={today}
                            />
                          )
                        ) : isSummerCamp ? (
                          loadingSummerCampDates ? (
                            <div className="flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-3 text-stone-500">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading camp dates...
                            </div>
                          ) : isSummerCampPerWeek ? (
                            <div className="space-y-2">
                              {summerCampBatches.length > 0 ? (
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {summerCampBatches.map((batch) => {
                                    const isSelected = summerCampSelectedDates.join("|") === batch.dates.join("|");
                                    return (
                                      <button
                                        key={batch.id}
                                        type="button"
                                        onClick={() => handleSummerCampBatchSelect(batch)}
                                        className={`rounded-lg border px-4 py-3 text-left transition-all ${
                                          isSelected
                                            ? "border-[#FF8C6B] bg-[#FF8C6B]/10 ring-2 ring-[#FF8C6B]"
                                            : "border-stone-300 bg-white hover:border-[#FF8C6B]"
                                        }`}
                                      >
                                        <span className="block font-bold text-stone-900">{batch.name}</span>
                                        <span className="block text-sm text-stone-600">{formatSummerCampBatchRange(batch.dates)}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                                  No full summer camp batches are available yet.
                                </div>
                              )}
                            </div>
                          ) : (
                            <MonthlyAvailableDatePicker
                              availableDates={summerCampAvailableDates}
                              unavailableDates={blockedRentalDates}
                              value={eventDate}
                              values={summerCampSelectedDates}
                              onChange={(date) => {
                                if (summerCampRequiredDateCount > 1) {
                                  setEventDate(date);
                                  return;
                                }
                                handleSummerCampDatesChange(date ? [date] : []);
                              }}
                              onValuesChange={handleSummerCampDatesChange}
                              multiple={summerCampRequiredDateCount > 1}
                              maxSelections={summerCampRequiredDateCount}
                              today={today}
                            />
                          )
                        ) : (
                            <MonthlyAvailableDatePicker value={eventDate} onChange={setEventDate} today={today} unavailableDates={blockedRentalDates} restrictToAvailableDates={false} />
                        )}
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
                            {displayedTimeSlots.map((slot) => (
                              <button key={`${slot.start}-${slot.end}`} type="button" onClick={() => setEventTime(slot.start)} className={`px-3 py-2 text-sm rounded-lg border transition-all ${eventTime === slot.start ? "bg-[#FF8C6B] text-white border-[#FF8C6B]" : "border-stone-300 hover:border-[#FF8C6B]"}`}>
                                {slot.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-stone-500 py-2">{timeSlotEmptyMessage}</p>
                        )}
                      </div>
                    </div>
                    {isMommyAndMe && selectedMenu && (
                      <div className="mb-4 rounded-lg border border-[#FF8C6B]/25 bg-[#FF8C6B]/10 px-4 py-3 text-sm text-stone-900">
                        <span className="font-bold">{selectedMenu.name} total:</span> AED {getMenuPrice().toLocaleString()}
                      </div>
                    )}
                    {isSummerCamp && (
                      <div className="mb-4 space-y-3 rounded-lg border border-[#FF8C6B]/25 bg-[#FF8C6B]/10 px-4 py-3 text-sm text-stone-900">
                        <div>
                          <span className="font-bold">Summer Camp:</span> Choose Per Day or Per Week for this camp date.
                          <span className="ml-2 font-bold">{selectedSummerCampMenus.length}/{SUMMER_CAMP_SELECTION_COUNT} selected</span>
                          {selectedSummerCampMenus.length > 0 && (
                            <span className="ml-2 font-bold">
                              Dates: {summerCampSelectedDates.length}/{summerCampRequiredDateCount}
                            </span>
                          )}
                        </div>
                        {isSummerCampPerDay && (
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-bold">How many days?</span>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setSummerCampDayCount(Math.max(1, summerCampDayCount - 1))}
                              disabled={summerCampDayCount <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center text-lg font-bold">{summerCampDayCount}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setSummerCampDayCount(Math.min(5, summerCampDayCount + 1))}
                              disabled={summerCampDayCount >= 5}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <span className="font-bold text-stone-700">
                              AED {((selectedSummerCampMenu?.price || 0) * guestCount * summerCampDayCount).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Desktop Continue Button - Inside Card */}
                    <div className="hidden lg:flex flex-col items-end gap-1 pt-4 border-t">
                      {validationMessage && <p className="text-xs text-red-500 font-bold">{validationMessage}</p>}
                      <Button
                        className={`px-8 ${PRIMARY_BUTTON_CLASS} ${!canProceed() ? "opacity-50 cursor-not-allowed" : ""}`}
                        onClick={() => {
                          if (!canProceed()) { setValidationMessage(getValidationMessage()); return; }
                          setValidationMessage("");
                          goToStep(step + 1);
                        }}
                      >
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

              </div>
            )}

            {/* Step 2: Customize (Birthday only) */}
            {hasExtras && step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-stone-900">Customize Your Party</h2>
                  <p className="text-stone-500 mt-1">Add extras to make it special (optional)</p>
                  <button
                    type="button"
                    onClick={() => setShowSupplierModal(true)}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#FF8C6B] underline decoration-[#FF8C6B]/40 underline-offset-4 hover:text-[#e96f4f]"
                  >
                    <FileText className="h-4 w-4" />
                    External suppliers requirements
                  </button>
                  {(hasExternalSupplierRequirementsStarted(externalSupplierRequirements) || hasExternalSupplierFilesStarted(externalSupplierFiles)) && (!hasCompleteExternalSupplierRequirements(externalSupplierRequirements) || !hasCompleteExternalSupplierFiles(externalSupplierFiles)) && (
                    <p className="mt-2 text-sm font-medium text-red-600">
                      Complete all external supplier fields and files before continuing.
                    </p>
                  )}
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
                                  <CardContent className="p-6">
                                    <div className="flex items-start gap-3">
                                      <div className="flex-shrink-0">
                                        {extra.image ? (
                                          <button
                                            type="button"
                                            onClick={() => setPreviewExtra(extra)}
                                            className="group relative h-40 w-40 overflow-hidden rounded-lg bg-stone-100 focus:outline-none focus:ring-2 focus:ring-[#FF8C6B] focus:ring-offset-2"
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
                                        <p className="text-sm text-stone-900">{extra.description}</p>
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
                    onClick={() => goToStep(step - 1)}
                    className="px-6 font-bold"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    className={`px-8 ${PRIMARY_BUTTON_CLASS}`}
                    onClick={() => goToStep(step + 1)}
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
                      const scheduledDateTime = formatMonthlySpecialSchedules(selectedMenu);
                      if (!cap && !scheduledDateTime) return null;
                      return (
                        <div className="px-4 py-3 rounded-xl bg-[#FF8C6B]/10 border border-[#FF8C6B]/25 space-y-2">
                          {scheduledDateTime && (
                            <p className="flex items-center gap-2 text-sm font-bold text-stone-900">
                              <Calendar className="h-4 w-4 shrink-0 text-[#FF8C6B]" />
                              Available on {scheduledDateTime}
                            </p>
                          )}
                          {cap && (
                            <>
                              <p className="text-sm font-bold text-stone-900">
                                {cap.available === 1 ? "Only 1 spot remaining!" : `${cap.available} spots remaining for this class`}
                              </p>
                              <p className="text-xs text-stone-600 mt-0.5">{cap.booked} of {cap.allowed} spots already booked</p>
                            </>
                          )}
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

                      {false && <div className="grid sm:grid-cols-2 gap-4">
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
                                unavailableDates={blockedRentalDates}
                                value={eventDate}
                                onChange={(date) => {
                                  setEventDate(date);
                                  setEventTime("");
                                }}
                                today={today}
                              />
                            )
                          ) : (
                            <MonthlyAvailableDatePicker
                              value={eventDate}
                              onChange={setEventDate}
                              today={today}
                              unavailableDates={blockedRentalDates}
                              restrictToAvailableDates={false}
                            />
                          )}
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
                      </div>}

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
                    onClick={() => goToStep(step - 1)}
                    className="px-6 font-bold"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    className={`px-8 ${PRIMARY_BUTTON_CLASS}`}
                    onClick={() => goToStep(step + 1)}
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
                      {isSummerCamp && selectedSummerCampMenus.length > 0 && (
                        <div className="sm:col-span-2">
                          <span className="font-bold text-stone-700">Selected Summer Camp Items:</span>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {selectedSummerCampMenus.map((item, index) => (
                              <span key={item.id} className="rounded-full bg-stone-100 px-3 py-1 text-sm font-bold text-stone-700">
                                {index + 1}. {item.name}{item.id === "summer-camp-per-day" ? ` (${summerCampDayCount} day${summerCampDayCount === 1 ? "" : "s"})` : ""}
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
                        <span className="font-bold text-stone-700">{isSummerCamp ? "Dates:" : "Date:"}</span>
                        <span className="ml-2 font-bold text-stone-900">
                          {isSummerCamp ? summerCampSelectedDates.join(", ") : eventDate}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-stone-700">Time:</span>
                        <span className="ml-2 font-bold text-stone-900">{selectedTimeSlotLabel}</span>
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
                                : isSummerCampPerDay
                                ? `${guestCount} guest${guestCount === 1 ? "" : "s"} x ${summerCampDayCount} day${summerCampDayCount === 1 ? "" : "s"} x AED ${selectedMenu?.price.toLocaleString() || 0}`
                                : isSummerCamp
                                ? `${guestCount} guest${guestCount === 1 ? "" : "s"} x AED ${selectedMenu?.price.toLocaleString() || 0}`
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
                    onClick={() => goToStep(step - 1)}
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
                    onClick={() => goToStep(step - 1)}
                    className="px-3 font-bold"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                
                {step < maxStep ? (
                  <div className="flex flex-col items-end gap-1">
                    {validationMessage && <p className="text-xs text-red-500 font-bold text-right max-w-[180px]">{validationMessage}</p>}
                    <Button
                      className={`${PRIMARY_BUTTON_CLASS} ${!canProceed() ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() => {
                        if (!canProceed()) { setValidationMessage(getValidationMessage()); return; }
                        setValidationMessage("");
                        goToStep(step + 1);
                      }}
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
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
