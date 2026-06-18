"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Calendar,
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Users,
  Mail,
  Phone,
  Send,
  ExternalLink,
  AlertCircle,
  Plus,
  Copy,
  Cake,
  ChefHat,
  Building2,
  X,
  LinkIcon,
  List,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Ticket,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDate } from "@/lib/utils";
import { DEFAULT_BOOKING_TIME_SLOTS } from "@/lib/booking-time-slots";
import { AdminCreateBookingModal } from "@/components/admin/admin-create-booking-modal";
import { MonthlyAvailableDatePicker } from "@/components/booking/monthly-available-date-picker";

const CALENDAR_HOURS = Array.from({ length: 13 }, (_, index) => {
  const hour = 9 + index;
  const start = `${String(hour).padStart(2, "0")}:00`;
  const end = `${String(hour + 1).padStart(2, "0")}:00`;
  const labelDate = new Date(2000, 0, 1, hour, 0);

  return {
    start,
    end,
    label: labelDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    days: [0, 1, 2, 3, 4, 5, 6],
  };
});

const formatLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const MONTHLY_SLOT_CATEGORY_IDS = new Set(["monthly_mini", "monthly_big"]);

interface ServiceBooking {
  id: string;
  booking_number: string;
  service_id: string | null;
  service_name: string;
  service_type: string | null;
  package_id: string | null;
  package_name: string | null;
  menu_id: string | null;
  menu_name: string | null;
  menu_price: number | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  company_name: string | null;
  event_date: string | null;
  event_time: string | null;
  guest_count: number;
  items?: BookingScheduleItem[];
  extras: any[];
  base_amount: number;
  extras_amount: number;
  total_amount: number;
  is_deposit_payment: boolean;
  deposit_amount: number | null;
  balance_amount: number | null;
  deposit_paid: boolean;
  balance_paid: boolean;
  payment_status: string;
  paid_at: string | null;
  special_requests: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  created_by: string | null;
  payment_link_id: string | null;
  balance_payment_link: string | null;
  balance_due_date: string | null;
  creator: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  payment_link: {
    id: string;
    link_code: string;
    stripe_payment_link_url: string | null;
    status: string;
  } | null;
  // Voucher redemption fields
  is_voucher_redemption?: boolean;
  voucher_code?: string;
  original_price?: number;
  time_label?: string | null;
}

interface BookingScheduleItem {
  id?: string;
  name?: string;
  session?: number;
  packageId?: string;
  packageName?: string;
  camp_dates?: string[] | null;
  event_date?: string | null;
  event_time?: string | null;
  time_label?: string | null;
}

interface BookingTimeSlot {
  id?: string;
  category_id?: string;
  start_time?: string;
  end_time?: string;
  start?: string;
  end?: string;
  label?: string;
  days?: number[];
  active?: boolean;
  is_active?: boolean;
}

interface BookingStats {
  total: number;
  confirmed: number;
  pending: number;
  completed: number;
  cancelled: number;
  fullyPaid: number;
  depositPending: number;
  balancePending: number;
  unpaid: number;
  totalRevenue: number;
  collectedRevenue: number;
}

function inferBookingSlotCategory(booking: ServiceBooking | null) {
  if (!booking) return "";

  const text = [
    booking.service_name,
    booking.package_name,
    booking.menu_name,
    ...(Array.isArray(booking.items) ? booking.items.map((item) => item.name || item.packageName || "") : []),
  ].join(" ").toLowerCase();

  if (text.includes("summer camp")) return "summer_camp";
  if (text.includes("mommy") || text.includes("mummy")) return "mommy_me";
  if (text.includes("birthday")) return "birthday";
  if (text.includes("package")) return "packages";
  if (text.includes("corporate") || text.includes("private")) return "corporate";
  if (text.includes("teenager")) return "teenagers";
  if (text.includes("nanny")) return "nanny";

  const isMiniChef = booking.service_type === "birthday_deck";
  const isBigChef = booking.service_type === "corporate_deck";

  if (text.includes("monthly")) return isBigChef ? "monthly_big" : "monthly_mini";
  if (isBigChef) return "classics_big";
  if (isMiniChef) return "classics_mini";

  return "";
}

const normalizeBookingTime = (value?: string | null) => {
  if (!value) return "";
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return value;

  return `${match[1].padStart(2, "0")}:${match[2]}`;
};

const formatSlotTime = (time?: string | null) => {
  const normalized = normalizeBookingTime(time);
  if (!normalized) return "";

  const [hours, minutes] = normalized.split(":").map(Number);
  return new Date(2000, 0, 1, hours || 0, minutes || 0).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatBookingTimeRange = (
  eventTime?: string | null,
  timeLabel?: string | null,
  slots: BookingTimeSlot[] = []
) => {
  if (timeLabel) return timeLabel;

  const normalizedTime = normalizeBookingTime(eventTime);
  const dynamicSlot = slots.find((item) => normalizeBookingTime(item.start_time || item.start) === normalizedTime);
  if (dynamicSlot?.label) return dynamicSlot.label;
  if (dynamicSlot?.end_time || dynamicSlot?.end) {
    return `${formatSlotTime(dynamicSlot.start_time || dynamicSlot.start)} - ${formatSlotTime(dynamicSlot.end_time || dynamicSlot.end)}`;
  }

  const slot = DEFAULT_BOOKING_TIME_SLOTS.find((item) => item.start === normalizedTime);

  return slot?.label || eventTime || "Time pending";
};

interface Creator {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface Service {
  id: string;
  name: string;
  slug: string;
  category: string;
  service_type: string;
  base_price: number;
  packages: any[];
}

interface Extra {
  id: string;
  name: string;
  price: number;
}

interface BookingInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  description: string | null;
  payment_link: string | null;
}

interface AdminBookingsPageContentProps {
  unpaidOnly?: boolean;
}

export function AdminBookingsPageContent({ unpaidOnly = false }: AdminBookingsPageContentProps) {
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [packageFilter, setPackageFilter] = useState("all");
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [eventDateSort, setEventDateSort] = useState<"asc" | "desc">("asc");
  const [hidePastBookings, setHidePastBookings] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<ServiceBooking | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [scheduleItems, setScheduleItems] = useState<BookingScheduleItem[]>([]);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleTimeLabel, setRescheduleTimeLabel] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState<BookingTimeSlot[]>([]);
  const [rescheduleAllowedDates, setRescheduleAllowedDates] = useState<string[] | null>(null);
  const [rescheduleDatesLoading, setRescheduleDatesLoading] = useState(false);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleSaving, setRescheduleSaving] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [packageTimeSlots, setPackageTimeSlots] = useState<BookingTimeSlot[]>([]);
  const [scheduleSlotOptions, setScheduleSlotOptions] = useState<Record<string, BookingTimeSlot[]>>({});
  const [scheduleSlotsLoading, setScheduleSlotsLoading] = useState<Record<string, boolean>>({});
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [bookingInvoices, setBookingInvoices] = useState<BookingInvoice[]>([]);
  const [bookingInvoicesLoading, setBookingInvoicesLoading] = useState(false);
  const [generatingBalanceLink, setGeneratingBalanceLink] = useState(false);
  const [sendingBalanceLink, setSendingBalanceLink] = useState(false);
  
  // View mode: list or calendar
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month">("week");
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  // Date range filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const todayDateKey = formatLocalDateKey(new Date());

  // Get current user on mount
  useEffect(() => {
    const supabase = createClient();
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          setCurrentUserId(data.user.id);
        }
      });
    }
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (unpaidOnly) {
        params.set("payment_status", "unpaid");
      } else if (paymentFilter !== "all") {
        params.set("payment_status", paymentFilter);
      }
      if (serviceTypeFilter !== "all") params.set("service_type", serviceTypeFilter);
      if (creatorFilter !== "all") params.set("created_by", creatorFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      
      const res = await fetch(`/api/admin/bookings?${params}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
        setStats(data.stats);
        setCreators(data.creators || []);
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [unpaidOnly, statusFilter, paymentFilter, serviceTypeFilter, creatorFilter, startDate, endDate]);

  useEffect(() => {
    const fetchTimeSlots = async () => {
      try {
        const res = await fetch("/api/admin/time-slots");
        if (!res.ok) return;
        const data = await res.json();
        const slots = (data.slots || data.timeSlots || []).filter(
          (slot: BookingTimeSlot) => slot.category_id === "packages" && slot.active !== false && slot.is_active !== false
        );
        setPackageTimeSlots(slots);
      } catch (error) {
        console.error("Failed to fetch package time slots:", error);
      }
    };

    fetchTimeSlots();
  }, []);

  useEffect(() => {
    setScheduleItems(selectedBooking?.items ? selectedBooking.items.map((item) => ({ ...item })) : []);
    setScheduleError(null);
    setRescheduleDate(selectedBooking?.event_date || "");
    setRescheduleTime(normalizeBookingTime(selectedBooking?.event_time));
    setRescheduleTimeLabel(selectedBooking?.time_label || "");
    setRescheduleAllowedDates(null);
    setRescheduleError(null);
    setScheduleSlotOptions({});
    setScheduleSlotsLoading({});
  }, [selectedBooking]);

  useEffect(() => {
    const category = inferBookingSlotCategory(selectedBooking);
    const shouldLoadMonthlyDates = category && MONTHLY_SLOT_CATEGORY_IDS.has(category);
    const shouldLoadSummerCampDates = category === "summer_camp";

    if (!selectedBooking || !showModal || (!shouldLoadMonthlyDates && !shouldLoadSummerCampDates)) {
      setRescheduleAllowedDates(null);
      setRescheduleDatesLoading(false);
      return;
    }

    const fetchAllowedDates = async () => {
      setRescheduleDatesLoading(true);
      try {
        const endpoint = shouldLoadSummerCampDates
          ? "/api/services/summer-camp-dates?option=per-day&days=1"
          : `/api/services/monthly-dates?category=${category}`;
        const res = await fetch(endpoint);
        const data = await res.json();
        const dates = Array.isArray(data.dates) ? data.dates : [];
        setRescheduleAllowedDates(dates);
        if (rescheduleDate && dates.length > 0 && !dates.includes(rescheduleDate)) {
          setRescheduleTime("");
          setRescheduleTimeLabel("");
        }
      } catch (error) {
        console.error("Failed to load reschedule date rules:", error);
        setRescheduleAllowedDates([]);
      } finally {
        setRescheduleDatesLoading(false);
      }
    };

    fetchAllowedDates();
  }, [selectedBooking, showModal, rescheduleDate]);

  useEffect(() => {
    if (!selectedBooking || !showModal || !rescheduleDate || selectedBooking.status === "completed") {
      setRescheduleSlots([]);
      return;
    }

    const category = inferBookingSlotCategory(selectedBooking);
    if (rescheduleAllowedDates && !rescheduleAllowedDates.includes(rescheduleDate)) {
      setRescheduleSlots([]);
      setRescheduleError("This category is not available on the selected date.");
      return;
    }

    const fetchRescheduleSlots = async () => {
      setRescheduleLoading(true);
      setRescheduleError(null);
      try {
        const params = new URLSearchParams({
          date: rescheduleDate,
          excludeBookingId: selectedBooking.id,
        });
        if (category) params.set("category", category);
        const res = await fetch(`/api/services/availability?${params}`);
        const data = await res.json();
        if (!res.ok) {
          setRescheduleError(data.error || "Failed to load available times");
          setRescheduleSlots([]);
          return;
        }
        setRescheduleSlots(data.availableSlots || []);
      } catch {
        setRescheduleError("Failed to load available times");
        setRescheduleSlots([]);
      } finally {
        setRescheduleLoading(false);
      }
    };

    fetchRescheduleSlots();
  }, [rescheduleDate, selectedBooking, showModal, rescheduleAllowedDates]);

  useEffect(() => {
    if (!selectedBooking || !showModal || selectedBooking.status === "completed" || !isPackageBooking(selectedBooking)) {
      setScheduleSlotOptions((current) => Object.keys(current).length > 0 ? {} : current);
      setScheduleSlotsLoading((current) => Object.keys(current).length > 0 ? {} : current);
      return;
    }

    const category = inferBookingSlotCategory(selectedBooking) || "packages";
    const datesToLoad = Array.from(new Set(
      scheduleItems
        .map((item, index) => {
          const original = selectedBooking.items?.[index];
          return original?.event_date && original?.event_time ? null : item.event_date;
        })
        .filter((date): date is string => Boolean(date))
    ));

    datesToLoad.forEach((date) => {
      const key = `${category}|${date}`;
      if (scheduleSlotOptions[key] || scheduleSlotsLoading[key]) return;

      setScheduleSlotsLoading((current) => ({ ...current, [key]: true }));
      fetch(`/api/services/availability?${new URLSearchParams({
        date,
        category,
        excludeBookingId: selectedBooking.id,
      })}`)
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to load available times");
          setScheduleSlotOptions((current) => ({
            ...current,
            [key]: data.availableSlots || [],
          }));
        })
        .catch((error) => {
          console.error("Failed to fetch package schedule slots:", error);
          setScheduleSlotOptions((current) => ({ ...current, [key]: [] }));
        })
        .finally(() => {
          setScheduleSlotsLoading((current) => ({ ...current, [key]: false }));
        });
    });
  }, [scheduleItems, selectedBooking, showModal, scheduleSlotOptions, scheduleSlotsLoading]);

  useEffect(() => {
    const fetchBookingInvoices = async () => {
      if (!selectedBooking || !showModal) {
        setBookingInvoices([]);
        return;
      }

      setBookingInvoicesLoading(true);
      try {
        const params = new URLSearchParams({
          serviceBookingId: selectedBooking.id,
          limit: "20",
        });
        const res = await fetch(`/api/invoices?${params}`);
        if (!res.ok) {
          setBookingInvoices([]);
          return;
        }

        const data = await res.json();
        setBookingInvoices(data.invoices || []);
      } catch (error) {
        console.error("Failed to fetch booking invoices:", error);
        setBookingInvoices([]);
      } finally {
        setBookingInvoicesLoading(false);
      }
    };

    fetchBookingInvoices();
  }, [selectedBooking, showModal]);

  const setQuickDateRange = (range: string) => {
    const today = new Date();
    let start = new Date();
    
    switch (range) {
      case "today":
        start = today;
        break;
      case "week":
        start.setDate(today.getDate() - 7);
        break;
      case "month":
        start.setMonth(today.getMonth() - 1);
        break;
      case "quarter":
        start.setMonth(today.getMonth() - 3);
        break;
      case "year":
        start.setFullYear(today.getFullYear() - 1);
        break;
    }
    
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
  };

  const isPackageBooking = (booking: ServiceBooking) => {
    const serviceText = `${booking.service_name || ""} ${booking.package_name || ""}`.toLowerCase();
    return serviceText.includes("package");
  };

  const filteredBookings = bookings.filter((booking) => {
    if (packageFilter === "with_packages" && !isPackageBooking(booking)) return false;
    if (hidePastBookings && booking.event_date && booking.event_date < todayDateKey) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      booking.booking_number?.toLowerCase().includes(query) ||
      booking.customer_name?.toLowerCase().includes(query) ||
      booking.customer_email?.toLowerCase().includes(query) ||
      booking.service_name?.toLowerCase().includes(query) ||
      booking.company_name?.toLowerCase().includes(query)
    );
  });

  const getBookingEventTime = (booking: ServiceBooking) => {
    if (!booking.event_date) return null;

    const normalizedTime = normalizeBookingTime(booking.event_time);
    const dateTime = normalizedTime ? `${booking.event_date}T${normalizedTime}:00` : `${booking.event_date}T00:00:00`;
    const time = new Date(dateTime).getTime();

    return Number.isNaN(time) ? null : time;
  };

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    const aEventTime = getBookingEventTime(a);
    const bEventTime = getBookingEventTime(b);

    if (aEventTime === null && bEventTime === null) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (aEventTime === null) return 1;
    if (bEventTime === null) return -1;

    return eventDateSort === "asc" ? aEventTime - bEventTime : bEventTime - aEventTime;
  });

  const toggleEventDateSort = () => {
    setEventDateSort((current) => current === "asc" ? "desc" : "asc");
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    setActionLoading(bookingId);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchBookings();
        setShowModal(false);
      }
    } catch (error) {
      console.error("Failed to update booking:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const canSendBalanceReminder = (booking: ServiceBooking) => {
    return (
      booking.is_deposit_payment &&
      booking.deposit_paid &&
      !booking.balance_paid &&
      Number(booking.balance_amount || 0) > 0 &&
      Boolean(booking.customer_email)
    );
  };

  const sendBalanceReminder = async (booking: ServiceBooking) => {
    setActionLoading(`balance-reminder-${booking.id}`);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/send-balance-reminder`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to send balance reminder");
        return;
      }

      alert(`Balance reminder sent to ${booking.customer_email}`);
    } catch (error) {
      console.error("Failed to send balance reminder:", error);
      alert("Failed to send balance reminder");
    } finally {
      setActionLoading(null);
    }
  };

  const copyPaymentLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-amber-100 text-amber-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      case "completed":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-stone-100 text-stone-700";
    }
  };

  const getPaymentStatusBadge = (booking: ServiceBooking) => {
    if (booking.payment_status === "unpaid" || booking.status === "unpaid") {
      return { className: "bg-red-100 text-red-700", label: "Unpaid" };
    }
    if (booking.paid_at || (booking.is_deposit_payment && booking.deposit_paid && booking.balance_paid)) {
      return { className: "bg-green-100 text-green-700", label: "Paid" };
    }
    if (!booking.deposit_paid && !booking.balance_paid) {
      return { className: "bg-amber-100 text-amber-700", label: "Pending" };
    }
    if (booking.is_deposit_payment) {
      if (booking.deposit_paid && !booking.balance_paid) {
        return { className: "bg-blue-100 text-blue-700", label: "Balance Due" };
      }
    }
    return { className: "bg-amber-100 text-amber-700", label: "Pending" };
  };

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-700";
      case "sent":
        return "bg-blue-100 text-blue-700";
      case "pending":
        return "bg-amber-100 text-amber-700";
      case "draft":
        return "bg-stone-100 text-stone-600";
      case "cancelled":
      case "overdue":
        return "bg-red-100 text-red-700";
      default:
        return "bg-stone-100 text-stone-700";
    }
  };

  const isCourseScheduleBooking = (booking: ServiceBooking) => {
    const serviceText = `${booking.service_name || ""} ${booking.package_name || ""}`.toLowerCase();
    return (serviceText.includes("nanny") || serviceText.includes("teenager"))
      && Array.isArray(booking.items)
      && booking.items.length > 0;
  };

  const generateBalancePaymentLink = async (sendEmail = false) => {
    if (!selectedBooking) return;

    if (sendEmail) {
      setSendingBalanceLink(true);
    } else {
      setGeneratingBalanceLink(true);
    }
    try {
      const res = await fetch("/api/admin/payment-tracking/generate-balance-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: selectedBooking.id, sendEmail }),
      });
      const data = await res.json();

      if (!res.ok || !data.paymentLink) {
        alert(data.error || "Failed to generate balance payment link");
        return;
      }

      const updateBooking = (booking: ServiceBooking) =>
        booking.id === selectedBooking.id
          ? {
              ...booking,
              balance_payment_link: data.paymentLink,
              payment_status: "balance_pending",
            }
          : booking;

      setBookings((current) => current.map(updateBooking));
      setSelectedBooking((current) => current ? updateBooking(current) : current);
      if (data.invoice) {
        setBookingInvoices((current) => {
          const withoutInvoice = current.filter((invoice) => invoice.id !== data.invoice.id);
          return [data.invoice, ...withoutInvoice];
        });
      }

      if (sendEmail) {
        if (!data.emailSent) {
          alert(data.emailError || "Payment link was created, but the email could not be sent");
          return;
        }
        alert(`Payment link sent to ${selectedBooking.customer_email}`);
      } else {
        await navigator.clipboard.writeText(data.paymentLink);
        setCopiedLink(selectedBooking.id);
      }
    } catch (error) {
      console.error("Failed to generate balance payment link:", error);
      alert("Failed to generate balance payment link");
    } finally {
      setGeneratingBalanceLink(false);
      setSendingBalanceLink(false);
    }
  };

  const getCourseScheduleItems = (booking: ServiceBooking) => {
    if (!isCourseScheduleBooking(booking)) return [];

    return [...(booking.items || [])]
      .filter((item) => item.name || item.event_date || item.event_time || item.time_label)
      .sort((a, b) => (a.session || 0) - (b.session || 0));
  };

  const getPackageScheduleItems = (booking: ServiceBooking) => {
    if (!isPackageBooking(booking)) return [];
    return [...(booking.items || [])].sort((a, b) => (a.session || 0) - (b.session || 0));
  };

  const getPackageSlotOptions = () => {
    const source: BookingTimeSlot[] = packageTimeSlots.length > 0
      ? packageTimeSlots
      : DEFAULT_BOOKING_TIME_SLOTS.map((slot) => ({
          start: slot.start,
          end: slot.end,
          label: slot.label,
          days: [...slot.days],
        }));
    return source.map((slot) => {
      const start = slot.start || slot.start_time || "";
      const end = slot.end || slot.end_time || "";
      const label = slot.label || `${start}${end ? ` - ${end}` : ""}`;
      return { start, label };
    }).filter((slot) => slot.start);
  };

  const toSlotOption = (slot: BookingTimeSlot) => {
    const start = normalizeBookingTime(slot.start || slot.start_time);
    const end = normalizeBookingTime(slot.end || slot.end_time);
    const label = slot.label || `${start}${end ? ` - ${end}` : ""}`;
    return { start, label };
  };

  const getScheduleSlotKey = (date?: string | null) => {
    if (!selectedBooking || !date) return "";
    return `${inferBookingSlotCategory(selectedBooking) || "packages"}|${date}`;
  };

  const getScheduleSlotOptions = (item: BookingScheduleItem, index: number) => {
    if (!item.event_date) return [];

    const key = getScheduleSlotKey(item.event_date);
    const availableSlots = (scheduleSlotOptions[key] || []).map(toSlotOption).filter((slot) => slot.start);
    const occupiedByCurrentBooking = new Set(
      scheduleItems
        .filter((otherItem, otherIndex) => (
          otherIndex !== index &&
          otherItem.event_date === item.event_date &&
          Boolean(otherItem.event_time)
        ))
        .map((otherItem) => normalizeBookingTime(otherItem.event_time))
    );
    const selectedTime = normalizeBookingTime(item.event_time);

    return availableSlots.filter((slot) => (
      !occupiedByCurrentBooking.has(slot.start) || slot.start === selectedTime
    ));
  };

  const getScheduleSlotLabel = (item: BookingScheduleItem, index: number, value: string) => {
    return getScheduleSlotOptions(item, index).find((slot) => slot.start === value)?.label
      || getPackageSlotOptions().find((slot) => slot.start === value)?.label
      || value
      || null;
  };

  const updateScheduleItem = (index: number, field: "event_date" | "event_time", value: string) => {
    if (isScheduleItemLocked(index)) return;

    setScheduleItems((prev) => prev.map((item, idx) => {
      if (idx !== index) return item;
      const next = { ...item, [field]: value || null };
      if (field === "event_date") {
        next.event_time = null;
        next.time_label = null;
      }
      if (field === "event_time") {
        next.time_label = getScheduleSlotLabel(next, index, value);
      }
      return next;
    }));
    setScheduleError(null);
  };

  const isScheduleItemLocked = (index: number) => {
    const original = selectedBooking?.items?.[index];
    return Boolean(original?.event_date && original?.event_time);
  };

  const hasScheduleChanged = (original: BookingScheduleItem | undefined, next: BookingScheduleItem) => (
    (original?.event_date || null) !== (next.event_date || null) ||
    (original?.event_time || null) !== (next.event_time || null) ||
    (original?.time_label || original?.event_time || null) !== (next.time_label || next.event_time || null)
  );

  const hasEditableScheduleChanges = scheduleItems.some((item, index) => {
    if (isScheduleItemLocked(index)) return false;
    return hasScheduleChanged(selectedBooking?.items?.[index], item) && item.event_date && item.event_time;
  });

  const savePackageSchedule = async () => {
    if (!selectedBooking) return;
    if (!hasEditableScheduleChanges) return;

    setScheduleSaving(true);
    setScheduleError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${selectedBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: scheduleItems }),
      });
      const data = await res.json();

      if (!res.ok) {
        setScheduleError(data.error || "Failed to save schedule");
        return;
      }

      setSelectedBooking(data.booking);
      setBookings((prev) => prev.map((booking) => booking.id === data.booking.id ? data.booking : booking));
      await fetchBookings();
    } catch {
      setScheduleError("Failed to save schedule");
    } finally {
      setScheduleSaving(false);
    }
  };

  const saveReschedule = async () => {
    if (!selectedBooking || selectedBooking.status === "completed") return;
    if (!rescheduleDate || !rescheduleTime) {
      setRescheduleError("Select a booking date and time");
      return;
    }

    setRescheduleSaving(true);
    setRescheduleError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${selectedBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_date: rescheduleDate,
          event_time: rescheduleTime,
          time_label: rescheduleTimeLabel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRescheduleError(data.error || "Failed to reschedule booking");
        return;
      }

      setSelectedBooking(data.booking);
      setBookings((prev) => prev.map((booking) => booking.id === data.booking.id ? data.booking : booking));
      await fetchBookings();
    } catch {
      setRescheduleError("Failed to reschedule booking");
    } finally {
      setRescheduleSaving(false);
    }
  };

  const getServiceTypeIcon = (type: string | null) => {
    switch (type) {
      case "birthday_deck":
        return <Cake className="h-4 w-4" />;
      case "corporate_deck":
        return <Building2 className="h-4 w-4" />;
      case "nanny_class":
        return <ChefHat className="h-4 w-4" />;
      case "voucher":
        return <Ticket className="h-4 w-4 text-green-600" />;
      default:
        return <ChefHat className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">{unpaidOnly ? "Unpaid Bookings" : "Bookings"}</h1>
          <p className="text-stone-500 mt-1">
            {unpaidOnly ? "Manage bookings with unpaid status" : "Manage all service bookings and payments"}
          </p>
        </div>
        <div className="flex gap-3">
          {/* View Toggle */}
          {!unpaidOnly && (
            <div className="flex bg-stone-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 transition-colors ${
                  viewMode === "list" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <List className="h-4 w-4" />
                List
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 transition-colors ${
                  viewMode === "calendar" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <CalendarDays className="h-4 w-4" />
                Calendar
              </button>
            </div>
          )}
          <Button onClick={fetchBookings} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {!unpaidOnly && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Booking
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {!unpaidOnly && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-violet-100">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">{stats?.total || 0}</p>
                <p className="text-sm text-stone-500">Total Bookings</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">{stats?.fullyPaid || 0}</p>
                <p className="text-sm text-stone-500">Fully Paid</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">{stats?.pending || 0}</p>
                <p className="text-sm text-stone-500">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">{stats?.balancePending || 0}</p>
                <p className="text-sm text-stone-500">Balance Due</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-100">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">{formatPrice(stats?.collectedRevenue || 0)}</p>
                <p className="text-sm text-stone-500">Collected</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Search and Status Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="min-w-0 flex-1 basis-full sm:basis-52">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            {!unpaidOnly && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-stone-200 rounded-lg"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            )}
            {!unpaidOnly && (
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-4 py-2 border border-stone-200 rounded-lg"
              >
                <option value="all">All Payments</option>
                <option value="pending">Pending</option>
                <option value="deposit_paid">Balance Due</option>
                <option value="paid">Fully Paid</option>
              </select>
            )}
            <select
              value={serviceTypeFilter}
              onChange={(e) => setServiceTypeFilter(e.target.value)}
              className="px-4 py-2 border border-stone-200 rounded-lg"
            >
              <option value="all">All Types</option>
              <option value="birthday_deck">Birthday</option>
              <option value="corporate_deck">Corporate</option>
              <option value="nanny_class">Nanny Class</option>
              <option value="voucher">Voucher</option>
            </select>
            <select
              value={packageFilter}
              onChange={(e) => setPackageFilter(e.target.value)}
              className="px-4 py-2 border border-stone-200 rounded-lg"
            >
              <option value="all">All Packages</option>
              <option value="with_packages">Package Bookings</option>
            </select>
            <select
              value={creatorFilter}
              onChange={(e) => setCreatorFilter(e.target.value)}
              className="px-4 py-2 border border-stone-200 rounded-lg"
            >
              <option value="all">All Staff</option>
              {creators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name || c.email}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={toggleEventDateSort}
              className="inline-flex items-center gap-2 px-4 py-2 border border-stone-200 rounded-lg text-sm text-stone-700 hover:bg-stone-50"
              title={`Sort by event date ${eventDateSort === "asc" ? "latest first" : "earliest first"}`}
            >
              Event Date
              {eventDateSort === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </button>
            <label className="inline-flex items-center gap-2 px-4 py-2 border border-stone-200 rounded-lg text-sm text-stone-700 hover:bg-stone-50">
              <input
                type="checkbox"
                checked={hidePastBookings}
                onChange={(e) => setHidePastBookings(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              />
              Hide past events
            </label>
          </div>

          {/* Date Range */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-stone-500" />
              <span className="text-sm font-medium text-stone-700">Date Range:</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setQuickDateRange("today")}
                className="px-3 py-1 text-sm border border-stone-200 rounded-lg hover:bg-stone-50"
              >
                Today
              </button>
              <button
                onClick={() => setQuickDateRange("week")}
                className="px-3 py-1 text-sm border border-stone-200 rounded-lg hover:bg-stone-50"
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setQuickDateRange("month")}
                className="px-3 py-1 text-sm border border-stone-200 rounded-lg hover:bg-stone-50"
              >
                Last Month
              </button>
              <button
                onClick={() => setQuickDateRange("quarter")}
                className="px-3 py-1 text-sm border border-stone-200 rounded-lg hover:bg-stone-50"
              >
                Last Quarter
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg"
              />
              <span className="text-stone-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(""); setEndDate(""); }}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <Card>
          <CardContent className="p-4">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const d = new Date(calendarDate);
                  if (calendarView === "day") d.setDate(d.getDate() - 1);
                  else if (calendarView === "week") d.setDate(d.getDate() - 7);
                  else d.setMonth(d.getMonth() - 1);
                  setCalendarDate(d);
                }}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCalendarDate(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const d = new Date(calendarDate);
                  if (calendarView === "day") d.setDate(d.getDate() + 1);
                  else if (calendarView === "week") d.setDate(d.getDate() + 7);
                  else d.setMonth(d.getMonth() + 1);
                  setCalendarDate(d);
                }}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold ml-4">
                  {calendarView === "day" && calendarDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  {calendarView === "week" && `Week of ${calendarDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                  {calendarView === "month" && calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </h2>
              </div>
              <div className="flex bg-stone-100 rounded-lg p-1">
                {(["day", "week", "month"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setCalendarView(v)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      calendarView === v ? "bg-white shadow-sm text-stone-900" : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar Grid */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : (
              <CalendarGrid
                bookings={sortedBookings}
                date={calendarDate}
                view={calendarView}
                timeSlots={CALENDAR_HOURS}
                onSelectBooking={(b) => { setSelectedBooking(b); setShowModal(true); }}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Bookings Table */}
      {viewMode === "list" && (
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : sortedBookings.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-stone-300 mx-auto mb-4" />
              <h3 className="font-semibold text-stone-900 mb-2">No bookings found</h3>
              <p className="text-stone-500 mb-4">
                {unpaidOnly ? "No unpaid bookings match your filters" : "Try adjusting your filters or create a new booking"}
              </p>
              {!unpaidOnly && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Booking
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-stone-500">Booking</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-stone-500">Customer</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-stone-500">Service</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-stone-500">
                      <button
                        type="button"
                        onClick={toggleEventDateSort}
                        className="inline-flex items-center gap-1 hover:text-stone-900"
                        title={`Sort by event date ${eventDateSort === "asc" ? "latest first" : "earliest first"}`}
                      >
                        Event
                        {eventDateSort === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-stone-500">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-stone-500">Payment</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-stone-500">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-stone-500">Created By</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-stone-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {sortedBookings.map((booking) => {
                    const paymentStatus = getPaymentStatusBadge(booking);
                    return (
                      <tr key={booking.id} className="hover:bg-stone-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-stone-900">{booking.booking_number}</div>
                          <div className="text-xs text-stone-500">{formatDate(booking.created_at)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-stone-900">{booking.customer_name}</div>
                          <div className="text-sm text-stone-500">{booking.customer_email}</div>
                          {booking.company_name && (
                            <div className="text-xs text-stone-400">{booking.company_name}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getServiceTypeIcon(booking.service_type)}
                            <div>
                              <div className="text-stone-900">{booking.service_name}</div>
                              {booking.is_voucher_redemption && booking.voucher_code && (
                                <Badge className="bg-green-100 text-green-700 text-xs">
                                  Voucher: {booking.voucher_code}
                                </Badge>
                              )}
                              {!booking.is_voucher_redemption && booking.menu_name && (
                                <div className="text-xs text-stone-500">{booking.menu_name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {booking.event_date ? (
                            <div>
                              <div className="text-stone-900">{formatDate(booking.event_date)}</div>
                              <div className="text-xs text-stone-500">{booking.event_time || ""} • {booking.guest_count} guests</div>
                            </div>
                          ) : (
                            <span className="text-stone-400">Not scheduled</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {booking.is_voucher_redemption ? (
                            <div>
                              <div className="font-medium text-green-600">FREE</div>
                              <div className="text-xs text-stone-500 line-through">
                                {formatPrice(booking.original_price || 0)}
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="font-medium text-stone-900">{formatPrice(booking.total_amount)}</div>
                              {booking.is_deposit_payment && (
                                <div className="text-xs text-stone-500">
                                  Deposit: {formatPrice(booking.deposit_amount || 0)}
                                </div>
                              )}
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={paymentStatus.className}>
                            {paymentStatus.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={getStatusBadge(booking.status)}>
                            {booking.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {booking.creator ? (
                            <span className="text-sm text-stone-600">
                              {booking.creator.full_name || booking.creator.email}
                            </span>
                          ) : (
                            <span className="text-sm text-stone-400">Customer</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedBooking(booking);
                                setShowModal(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {booking.payment_link?.stripe_payment_link_url && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyPaymentLink(booking.payment_link!.stripe_payment_link_url!, booking.id)}
                                title="Copy Payment Link"
                              >
                                {copiedLink === booking.id ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            {canSendBalanceReminder(booking) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => sendBalanceReminder(booking)}
                                disabled={actionLoading === `balance-reminder-${booking.id}`}
                                title="Email Balance Payment Link"
                              >
                                {actionLoading === `balance-reminder-${booking.id}` ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Booking Detail Modal */}
      {showModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-stone-900">
                  Booking Details
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Booking Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-stone-500">Booking Number</p>
                  <p className="font-medium">{selectedBooking.booking_number}</p>
                </div>
                <div>
                  <p className="text-sm text-stone-500">Status</p>
                  <Badge className={getStatusBadge(selectedBooking.status)}>
                    {selectedBooking.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-stone-500">Created</p>
                  <p className="font-medium">{formatDate(selectedBooking.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-stone-500">Total Amount</p>
                  <p className="font-medium text-lg">{formatPrice(selectedBooking.total_amount)}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Customer</h3>
                <div className="space-y-2">
                  <p className="font-medium">{selectedBooking.customer_name}</p>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-stone-400" />
                    <span>{selectedBooking.customer_email}</span>
                  </div>
                  {selectedBooking.customer_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-stone-400" />
                      <span>{selectedBooking.customer_phone}</span>
                    </div>
                  )}
                  {selectedBooking.company_name && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-stone-400" />
                      <span>{selectedBooking.company_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Service Info */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Service Details</h3>
                <div className="space-y-2">
                  <p className="text-stone-900">{selectedBooking.service_name}</p>
                  {selectedBooking.menu_name && (
                    <p className="text-sm text-stone-600">Menu: {selectedBooking.menu_name}</p>
                  )}
                  {(() => {
                    const courseScheduleItems = getCourseScheduleItems(selectedBooking);
                    const packageScheduleItems = getPackageScheduleItems(selectedBooking);

                    if (courseScheduleItems.length > 0) {
                      return (
                        <div className="space-y-2">
                          <p className="text-sm text-stone-500">{selectedBooking.guest_count} guest(s)</p>
                          <div className="rounded-lg border border-stone-200 overflow-hidden">
                            {courseScheduleItems.map((item, idx) => (
                              <div
                                key={`${item.id || item.name || "session"}-${idx}`}
                                className="flex flex-col gap-1 border-b border-stone-100 p-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between"
                              >
                                <div>
                                  <p className="text-sm font-medium text-stone-900">
                                    Session {item.session || idx + 1}: {item.name || "Cooking Class"}
                                  </p>
                                  {item.event_date && (
                                    <p className="text-xs text-stone-500">{formatDate(item.event_date)}</p>
                                  )}
                                </div>
                                <p className="text-sm text-stone-700">
                                  {formatBookingTimeRange(item.event_time, item.time_label, packageTimeSlots)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (packageScheduleItems.length > 0) {
                      return (
                        <div className="space-y-3">
                          <p className="text-sm text-stone-500">{selectedBooking.guest_count} guest(s)</p>
                          <div className="rounded-lg border border-stone-200 overflow-hidden">
                            {scheduleItems.map((item, idx) => {
                              const locked = isScheduleItemLocked(idx);
                              const slotOptions = locked ? getPackageSlotOptions() : getScheduleSlotOptions(item, idx);
                              const slotsLoading = Boolean(scheduleSlotsLoading[getScheduleSlotKey(item.event_date)]);
                              const disableTimeSelect = locked || !item.event_date || slotsLoading;

                              return (
                                <div
                                  key={`${item.id || item.name || "menu"}-${idx}`}
                                  className={`grid gap-3 border-b border-stone-100 p-3 last:border-b-0 sm:grid-cols-[1fr_150px_190px] ${locked ? "bg-stone-50" : ""}`}
                                >
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-medium text-stone-900">
                                        {item.session ? `Menu ${item.session}: ` : ""}{item.name || "Package Menu"}
                                      </p>
                                      {locked && (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600">
                                          <Lock className="h-3 w-3" />
                                          Confirmed
                                        </span>
                                      )}
                                    </div>
                                    {item.packageName && (
                                      <p className="text-xs text-stone-500">{item.packageName}</p>
                                    )}
                                  </div>
                                  <input
                                    type="date"
                                    value={item.event_date || ""}
                                    onChange={(e) => updateScheduleItem(idx, "event_date", e.target.value)}
                                    disabled={locked}
                                    className={`h-10 rounded-lg border border-stone-200 px-3 text-sm ${locked ? "bg-stone-100 text-stone-500" : ""}`}
                                  />
                                  <select
                                    value={item.event_time || ""}
                                    onChange={(e) => updateScheduleItem(idx, "event_time", e.target.value)}
                                    disabled={disableTimeSelect}
                                    className={`h-10 rounded-lg border border-stone-200 px-3 text-sm ${disableTimeSelect ? "bg-stone-100 text-stone-500" : ""}`}
                                  >
                                    <option value="">
                                      {slotsLoading ? "Loading times..." : "Select time"}
                                    </option>
                                    {slotOptions.map((slot) => (
                                      <option key={slot.start} value={slot.start}>
                                        {slot.label}
                                      </option>
                                    ))}
                                  </select>
                                  {!locked && item.event_date && !slotsLoading && slotOptions.length === 0 && (
                                    <p className="text-xs text-amber-700 sm:col-start-3">No slots available</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {scheduleError && (
                            <p className="text-sm text-red-600">{scheduleError}</p>
                          )}
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              onClick={savePackageSchedule}
                              disabled={scheduleSaving || !hasEditableScheduleChanges}
                            >
                              {scheduleSaving ? "Saving..." : "Save Schedule"}
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <p className="text-sm text-stone-500">
                        {selectedBooking.guest_count} guest(s)
                        {selectedBooking.event_date && ` • ${formatDate(selectedBooking.event_date)}`}
                        {selectedBooking.event_time && ` at ${formatBookingTimeRange(selectedBooking.event_time, selectedBooking.time_label, [...rescheduleSlots, ...packageTimeSlots])}`}
                      </p>
                    );
                  })()}
                  {selectedBooking.status !== "completed" && !isCourseScheduleBooking(selectedBooking) && !isPackageBooking(selectedBooking) && (
                    <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
                      <p className="mb-3 text-sm font-medium text-stone-900">Reschedule booking</p>
                      {rescheduleAllowedDates !== null && (
                        <p className="mb-3 text-xs text-stone-500">
                          {rescheduleDatesLoading
                            ? "Loading category date rules..."
                            : rescheduleAllowedDates.length > 0
                              ? `Available dates: ${rescheduleAllowedDates.map(formatDate).join(", ")}`
                              : "No dates are currently available for this category."}
                        </p>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <MonthlyAvailableDatePicker
                          value={rescheduleDate}
                          onChange={(date) => {
                            setRescheduleDate(date);
                            setRescheduleTime("");
                            setRescheduleTimeLabel("");
                          }}
                          today={todayDateKey}
                          availableDates={rescheduleAllowedDates || []}
                          restrictToAvailableDates={rescheduleAllowedDates !== null}
                        />
                        <select
                          value={rescheduleTime}
                          onChange={(e) => {
                            const slot = rescheduleSlots.find((item) => item.start === e.target.value);
                            setRescheduleTime(e.target.value);
                            setRescheduleTimeLabel(slot?.label || e.target.value);
                          }}
                          disabled={!rescheduleDate || rescheduleLoading || rescheduleDatesLoading || (rescheduleAllowedDates !== null && !rescheduleAllowedDates.includes(rescheduleDate))}
                          className="h-10 rounded-lg border border-stone-200 bg-white px-3 text-sm disabled:bg-stone-100"
                        >
                          <option value="">
                            {rescheduleLoading || rescheduleDatesLoading ? "Loading times..." : "Select time"}
                          </option>
                          {rescheduleSlots.map((slot) => (
                            <option key={slot.start} value={slot.start}>
                              {slot.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {rescheduleDate && !rescheduleLoading && !rescheduleDatesLoading && rescheduleSlots.length === 0 && !rescheduleError && (
                        <p className="mt-2 text-sm text-amber-700">No slots available for this date</p>
                      )}
                      {rescheduleError && <p className="mt-2 text-sm text-red-600">{rescheduleError}</p>}
                      <div className="mt-3 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={saveReschedule}
                          disabled={
                            rescheduleSaving ||
                            rescheduleDatesLoading ||
                            !rescheduleDate ||
                            !rescheduleTime ||
                            (rescheduleAllowedDates !== null && !rescheduleAllowedDates.includes(rescheduleDate)) ||
                            (
                              rescheduleDate === (selectedBooking.event_date || "") &&
                              rescheduleTime === normalizeBookingTime(selectedBooking.event_time)
                            )
                          }
                        >
                          {rescheduleSaving ? "Saving..." : "Save New Schedule"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Info */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Payment</h3>
                <div className="space-y-2">
                  {(() => {
                    const paymentStatus = getPaymentStatusBadge(selectedBooking);
                    return (
                      <Badge className={paymentStatus.className}>
                        {paymentStatus.label}
                      </Badge>
                    );
                  })()}
                  {selectedBooking.is_deposit_payment && (
                    <div className="bg-stone-50 p-3 rounded-lg text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Deposit (50%):</span>
                        <span className={selectedBooking.deposit_paid ? "text-green-600" : ""}>
                          {formatPrice(selectedBooking.deposit_amount || 0)} {selectedBooking.deposit_paid && "✓"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Balance:</span>
                        <span className={selectedBooking.balance_paid ? "text-green-600" : ""}>
                          {formatPrice(selectedBooking.balance_amount || 0)} {selectedBooking.balance_paid && "✓"}
                        </span>
                      </div>
                    </div>
                  )}
                  {selectedBooking.is_deposit_payment &&
                    selectedBooking.deposit_paid &&
                    !selectedBooking.balance_paid &&
                    (selectedBooking.balance_amount || 0) > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        {selectedBooking.balance_payment_link ? (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-stone-900">Balance payment link ready</p>
                              <p className="text-xs text-stone-500">
                                {formatPrice(selectedBooking.balance_amount || 0)} balance due
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <a
                                href={selectedBooking.balance_payment_link}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button size="sm" variant="outline">
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Open
                                </Button>
                              </a>
                              <Button
                                size="sm"
                                onClick={() =>
                                  copyPaymentLink(selectedBooking.balance_payment_link!, selectedBooking.id)
                                }
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                {copiedLink === selectedBooking.id ? "Copied" : "Copy Link"}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => generateBalancePaymentLink(true)}
                                disabled={sendingBalanceLink || !selectedBooking.customer_email}
                              >
                                {sendingBalanceLink ? (
                                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Mail className="mr-2 h-4 w-4" />
                                )}
                                {sendingBalanceLink ? "Sending..." : "Send via Email"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-stone-900">Collect remaining balance</p>
                              <p className="text-xs text-stone-500">
                                Generate a {formatPrice(selectedBooking.balance_amount || 0)} payment link.
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => generateBalancePaymentLink(false)}
                              disabled={generatingBalanceLink}
                            >
                              {generatingBalanceLink ? (
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <LinkIcon className="mr-2 h-4 w-4" />
                              )}
                              {generatingBalanceLink ? "Generating..." : "Generate Payment Link"}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  {selectedBooking.payment_link?.stripe_payment_link_url && (
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4 text-stone-400" />
                      <a
                        href={selectedBooking.payment_link.stripe_payment_link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Payment Link <ExternalLink className="h-3 w-3" />
                      </a>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyPaymentLink(selectedBooking.payment_link!.stripe_payment_link_url!, selectedBooking.id)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Invoices */}
              <div className="border-t pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Invoices</h3>
                  {bookingInvoices.length > 0 && (
                    <Link
                      href={`/admin/invoices?booking=${selectedBooking.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View all
                    </Link>
                  )}
                </div>
                {bookingInvoicesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-stone-500">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading invoices...
                  </div>
                ) : bookingInvoices.length === 0 ? (
                  <p className="text-sm text-stone-500">No invoices attached to this booking.</p>
                ) : (
                  <div className="rounded-lg border border-stone-200 overflow-hidden">
                    {bookingInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex flex-col gap-3 border-b border-stone-100 p-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-stone-900">{invoice.invoice_number}</p>
                            <Badge className={getInvoiceStatusBadge(invoice.status)}>
                              {invoice.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-stone-500">
                            {invoice.description || "Booking invoice"} • Created {formatDate(invoice.created_at)}
                          </p>
                          {invoice.paid_at && (
                            <p className="text-xs text-green-700">Paid {formatDate(invoice.paid_at)}</p>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <p className="font-medium text-stone-900">{formatPrice(invoice.amount)}</p>
                          <div className="flex items-center gap-1">
                            {invoice.payment_link && invoice.status !== "paid" && (
                              <>
                                <a
                                  href={invoice.payment_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                                  title="Open payment link"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => copyPaymentLink(invoice.payment_link!, invoice.id)}
                                  className="rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                                  title="Copy payment link"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            <Link
                              href={`/admin/invoices?invoice=${invoice.invoice_number}`}
                              className="rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                              title="Open invoice"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Extras */}
              {selectedBooking.extras && selectedBooking.extras.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Extras</h3>
                  <div className="space-y-1">
                    {selectedBooking.extras.map((extra: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{extra.name} × {extra.quantity || 1}</span>
                        <span>{formatPrice(extra.price * (extra.quantity || 1))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Requests */}
              {selectedBooking.special_requests && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Special Requests</h3>
                  <p className="text-sm text-stone-600">{selectedBooking.special_requests}</p>
                </div>
              )}

              {/* Notes */}
              {selectedBooking.notes && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-stone-600">{selectedBooking.notes}</p>
                </div>
              )}

              {/* Created By */}
              {selectedBooking.creator && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Created By</h3>
                  <p className="text-sm text-stone-600">
                    {selectedBooking.creator.full_name || selectedBooking.creator.email}
                  </p>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="p-6 border-t bg-stone-50 flex gap-2 justify-end">
              {selectedBooking.status === "pending" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => updateBookingStatus(selectedBooking.id, "cancelled")}
                    disabled={actionLoading === selectedBooking.id}
                  >
                    Cancel Booking
                  </Button>
                  <Button
                    onClick={() => updateBookingStatus(selectedBooking.id, "confirmed")}
                    disabled={actionLoading === selectedBooking.id}
                  >
                    Confirm Booking
                  </Button>
                </>
              )}
              {selectedBooking.status === "confirmed" && (
                <Button
                  onClick={() => updateBookingStatus(selectedBooking.id, "completed")}
                  disabled={actionLoading === selectedBooking.id}
                >
                  Mark as Completed
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Booking Modal */}
      {showCreateModal && (
        <AdminCreateBookingModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchBookings();
          }}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}

export default function AdminBookingsPage() {
  return <AdminBookingsPageContent />;
}

// Create Booking Modal Component
interface CreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserId: string | null;
}

function CreateBookingModal({ isOpen, onClose, onSuccess, currentUserId }: CreateBookingModalProps) {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [availableExtras, setAvailableExtras] = useState<Extra[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<any>(null);
  const [guestCount, setGuestCount] = useState(6);
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});
  const [generatePaymentLink, setGeneratePaymentLink] = useState(true);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Menus
  const corporateMenus = [
    { id: "spirit_of_thailand", name: "Spirit of Thailand", price: 300 },
    { id: "la_cucina_italiana", name: "La Cucina Italiana", price: 425 },
    { id: "the_mexican_table", name: "The Mexican Table", price: 450 },
    { id: "the_art_of_sushi", name: "The Art Of Sushi", price: 450 },
    { id: "pan_asian_feast", name: "Pan Asian Feast", price: 475 },
    { id: "le_petit_menu", name: "Le Petit Menu", price: 500 },
    { id: "umami_house", name: "Umami House", price: 550 },
    { id: "mystery_box", name: "Mystery Box Challenge", price: 550 },
  ];

  const birthdayMenus = [
    { id: "texas_roadhouse", name: "Texas Roadhouse", price: 275 },
    { id: "little_italy", name: "Little Italy", price: 250 },
    { id: "funtastic", name: "Funtastic", price: 180 },
    { id: "kung_fu_panda", name: "Kung Fu Panda", price: 275 },
    { id: "cupcake_masterclass", name: "Cupcake Masterclass", price: 275 },
    { id: "dream_diner", name: "Dream Diner", price: 200 },
    { id: "hola_amigos", name: "Hola Amigos", price: 250 },
    { id: "healthylicious", name: "Healthylicious", price: 225 },
  ];

  // Service extras
  const serviceExtrasMap: Record<string, Extra[]> = {
    birthday_deck: [
      { id: "custom_apron", name: "Custom Apron", price: 80 },
      { id: "custom_chef_hat", name: "Custom Chef Hat", price: 60 },
      { id: "custom_cake_10", name: "Birthday Cake (10 people)", price: 575 },
      { id: "custom_cake_20", name: "Birthday Cake (20 people)", price: 700 },
      { id: "balloons", name: "Balloon Bundle", price: 260 },
      { id: "table_setting_10", name: "Table Setting (10 people)", price: 300 },
      { id: "cupcake_goodie_bag", name: "Cupcake Goodie Bag", price: 80 },
      { id: "mini_pizzas", name: "Mini Pizzas (12 pcs)", price: 50 },
      { id: "chicken_tenders", name: "Chicken Tenders (12 pcs)", price: 60 },
      { id: "soft_drinks", name: "Soft Drinks (per piece)", price: 15 },
    ],
    corporate_deck: [
      { id: "custom_apron", name: "Custom Apron", price: 80 },
      { id: "custom_chef_hat", name: "Custom Chef Hat", price: 60 },
      { id: "custom_cake_20", name: "Custom Cake (20 people)", price: 700 },
      { id: "balloons", name: "Balloon Bundle", price: 260 },
      { id: "mini_pizzas", name: "Mini Pizzas (12 pcs)", price: 50 },
      { id: "chicken_tenders", name: "Chicken Tenders (12 pcs)", price: 60 },
      { id: "soft_drinks", name: "Soft Drinks (per piece)", price: 15 },
    ],
  };

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (selectedService) {
      setAvailableExtras(serviceExtrasMap[selectedService.service_type] || []);
    }
  }, [selectedService]);

  useEffect(() => {
    if (eventDate) {
      fetchAvailability();
    }
  }, [eventDate]);

  const fetchServices = async () => {
    try {
      const res = await fetch("/api/services");
      if (res.ok) {
        const data = await res.json();
        const allServices = [
          ...(data.kids || []),
          ...(data.adults || []),
          ...(data.walkin || []),
        ];
        setServices(allServices);
      }
    } catch (error) {
      console.error("Failed to fetch services:", error);
    }
  };

  const fetchAvailability = async () => {
    if (!eventDate) return;
    setLoadingSlots(true);
    try {
      const res = await fetch(`/api/services/availability?date=${eventDate}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableTimeSlots(data.availableSlots || []);
      }
    } catch (error) {
      console.error("Failed to fetch availability:", error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const isCorporate = selectedService?.service_type === "corporate_deck";
  const isBirthday = selectedService?.service_type === "birthday_deck";
  const hasMenuSelection = isCorporate || isBirthday;
  const menus = isCorporate ? corporateMenus : isBirthday ? birthdayMenus : [];

  const extrasTotal = Object.entries(selectedExtras).reduce((sum, [id, qty]) => {
    const extra = availableExtras.find(e => e.id === id);
    return sum + (extra ? extra.price * qty : 0);
  }, 0);

  const baseAmount = selectedMenu 
    ? selectedMenu.price * guestCount 
    : (selectedService?.base_price || 0) * guestCount;
  
  const totalAmount = baseAmount + extrasTotal;
  const isDepositPayment = isCorporate;
  const depositAmount = isDepositPayment ? Math.ceil(totalAmount * 0.5) : totalAmount;

  const handleSubmit = async () => {
    if (!selectedService || !customerName || !customerEmail) {
      alert("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          serviceType: selectedService.service_type,
          menuId: selectedMenu?.id || null,
          menuName: selectedMenu?.name || null,
          menuPrice: selectedMenu?.price || null,
          customerName,
          customerEmail,
          customerPhone: customerPhone || null,
          companyName: companyName || null,
          eventDate: eventDate || null,
          eventTime: eventTime || null,
          guestCount,
          extras: Object.entries(selectedExtras)
            .filter(([_, qty]) => qty > 0)
            .map(([id, qty]) => {
              const extra = availableExtras.find(e => e.id === id);
              return { id, name: extra?.name, price: extra?.price, quantity: qty };
            }),
          baseAmount,
          extrasAmount: extrasTotal,
          totalAmount,
          isDepositPayment,
          depositAmount: isDepositPayment ? depositAmount : null,
          balanceAmount: isDepositPayment ? totalAmount - depositAmount : null,
          specialRequests: specialRequests || null,
          notes: notes || null,
          createdBy: currentUserId,
          generatePaymentLink,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.paymentLink?.stripeUrl) {
          navigator.clipboard.writeText(data.paymentLink.stripeUrl);
          alert(`Booking created! Payment link copied to clipboard:\n\n${data.paymentLink.stripeUrl}`);
        } else {
          alert("Booking created successfully!");
        }
        onSuccess();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create booking");
      }
    } catch (error) {
      console.error("Failed to create booking:", error);
      alert("Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-stone-900">Create New Booking</h2>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full ${step >= s ? "bg-amber-500" : "bg-stone-200"}`}
              />
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: Service Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-stone-900">Select Service</h3>
              <div className="grid gap-3">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => {
                      setSelectedService(service);
                      setSelectedMenu(null);
                      setSelectedExtras({});
                    }}
                    className={`p-4 border rounded-lg text-left transition-all ${
                      selectedService?.id === service.id
                        ? "border-amber-500 bg-amber-50"
                        : "border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {service.service_type === "birthday_deck" && <Cake className="h-5 w-5 text-pink-500" />}
                      {service.service_type === "corporate_deck" && <Building2 className="h-5 w-5 text-blue-500" />}
                      {service.service_type === "nanny_class" && <ChefHat className="h-5 w-5 text-amber-500" />}
                      <div>
                        <p className="font-medium text-stone-900">{service.name}</p>
                        <p className="text-sm text-stone-500">{service.category}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {hasMenuSelection && selectedService && (
                <div className="mt-6">
                  <h3 className="font-semibold text-stone-900 mb-3">Select Menu</h3>
                  <div className="grid gap-2">
                    {menus.map((menu) => (
                      <button
                        key={menu.id}
                        onClick={() => setSelectedMenu(menu)}
                        className={`p-3 border rounded-lg text-left flex justify-between items-center ${
                          selectedMenu?.id === menu.id
                            ? "border-amber-500 bg-amber-50"
                            : "border-stone-200 hover:border-stone-300"
                        }`}
                      >
                        <span>{menu.name}</span>
                        <span className="text-stone-600">AED {menu.price}/person</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Event Details */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-stone-900">Event Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Event Date</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => {
                      setEventDate(e.target.value);
                      setEventTime("");
                    }}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-2 border border-stone-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Number of Guests</label>
                  <input
                    type="number"
                    value={guestCount}
                    onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    max={40}
                    className="w-full px-4 py-2 border border-stone-200 rounded-lg"
                  />
                </div>
              </div>

              {eventDate && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Time Slot</label>
                  {loadingSlots ? (
                    <p className="text-stone-500">Loading available slots...</p>
                  ) : availableTimeSlots.length === 0 ? (
                    <p className="text-amber-600">No slots available for this date</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {availableTimeSlots.map((slot) => (
                        <button
                          key={slot.start}
                          onClick={() => setEventTime(slot.start)}
                          className={`p-3 border rounded-lg text-sm ${
                            eventTime === slot.start
                              ? "border-amber-500 bg-amber-50"
                              : "border-stone-200 hover:border-stone-300"
                          }`}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {availableExtras.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold text-stone-900 mb-3">Add Extras</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableExtras.map((extra) => (
                      <div key={extra.id} className="flex items-center justify-between p-2 border border-stone-200 rounded-lg">
                        <div>
                          <span className="text-stone-900">{extra.name}</span>
                          <span className="text-stone-500 ml-2">AED {extra.price}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedExtras(prev => ({
                              ...prev,
                              [extra.id]: Math.max(0, (prev[extra.id] || 0) - 1)
                            }))}
                            className="p-1 border rounded"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{selectedExtras[extra.id] || 0}</span>
                          <button
                            onClick={() => setSelectedExtras(prev => ({
                              ...prev,
                              [extra.id]: (prev[extra.id] || 0) + 1
                            }))}
                            className="p-1 border rounded"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Customer Details */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-stone-900">Customer Details</h3>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg"
                  placeholder="Full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg"
                  placeholder="email@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg"
                  placeholder="+971 XX XXX XXXX"
                />
              </div>

              {isCorporate && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-2 border border-stone-200 rounded-lg"
                    placeholder="Company name"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Special Requests</label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg"
                  rows={2}
                  placeholder="Any special requests or dietary requirements..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Internal Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg"
                  rows={2}
                  placeholder="Notes for internal reference..."
                />
              </div>

              {/* Order Summary */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-stone-900 mb-2">Order Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>{selectedService?.name}</span>
                    <span>AED {baseAmount.toFixed(2)}</span>
                  </div>
                  {selectedMenu && (
                    <div className="flex justify-between text-stone-600">
                      <span>Menu: {selectedMenu.name} × {guestCount}</span>
                    </div>
                  )}
                  {extrasTotal > 0 && (
                    <div className="flex justify-between">
                      <span>Extras</span>
                      <span>AED {extrasTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-2 border-t border-amber-300">
                    <span>Total</span>
                    <span>AED {totalAmount.toFixed(2)}</span>
                  </div>
                  {isDepositPayment && (
                    <div className="text-amber-700 pt-2">
                      <p>50% Deposit: AED {depositAmount.toFixed(2)}</p>
                      <p className="text-xs">Balance due 48 hours before event</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="generatePaymentLink"
                  checked={generatePaymentLink}
                  onChange={(e) => setGeneratePaymentLink(e.target.checked)}
                  className="rounded border-stone-300"
                />
                <label htmlFor="generatePaymentLink" className="text-sm text-stone-700">
                  Generate payment link
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-stone-50 flex justify-between">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
          >
            {step > 1 ? "Back" : "Cancel"}
          </Button>
          
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !selectedService}
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting || !customerName || !customerEmail}
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Booking
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Calendar Grid Component
interface CalendarGridProps {
  bookings: ServiceBooking[];
  date: Date;
  view: "day" | "week" | "month";
  timeSlots: typeof CALENDAR_HOURS;
  onSelectBooking: (booking: ServiceBooking) => void;
}

function CalendarGrid({ bookings, date, view, timeSlots, onSelectBooking }: CalendarGridProps) {
  type CalendarEvent = {
    id: string;
    booking: ServiceBooking;
    title: string;
    date: string;
    start: string;
    end: string | null;
    label: string;
  };
  type PositionedCalendarEvent = CalendarEvent & {
    column: number;
    columnCount: number;
  };

  const normalizeTime = (value?: string | null) => {
    return normalizeBookingTime(value);
  };

  const getEndTimeFromLabel = (label?: string | null) => {
    if (!label?.includes("-")) return null;
    const endLabel = label.split("-").pop()?.trim();
    if (!endLabel) return null;

    const parsed = new Date(`2000-01-01 ${endLabel}`);
    if (Number.isNaN(parsed.getTime())) return normalizeTime(endLabel) || null;

    return `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
  };

  const getEventRange = (startValue?: string | null, label?: string | null) => {
    const start = normalizeTime(startValue);
    const bookingSlot = DEFAULT_BOOKING_TIME_SLOTS.find((s) => s.start === start);
    const slot = timeSlots.find((s) => s.start === start);
    return {
      start,
      end: getEndTimeFromLabel(label) || bookingSlot?.end || slot?.end || null,
      label: label || bookingSlot?.label || slot?.label || start,
    };
  };

  const getScheduleItemDates = (item: BookingScheduleItem) => {
    const dates = Array.isArray(item.camp_dates) && item.camp_dates.length > 0
      ? item.camp_dates
      : item.event_date
      ? [item.event_date]
      : [];

    return [...new Set(dates.filter(Boolean))].sort();
  };

  const calendarEvents: CalendarEvent[] = bookings.flatMap((booking) => {
    const scheduledItems = Array.isArray(booking.items)
      ? booking.items.filter((item) => getScheduleItemDates(item).length > 0 && item.event_time)
      : [];

    if (scheduledItems.length > 0) {
      return scheduledItems.flatMap((item, index) => {
        const range = getEventRange(item.event_time, item.time_label);
        return getScheduleItemDates(item).map((itemDate) => ({
          id: `${booking.id}-${item.id || index}-${itemDate}`,
          booking,
          title: item.name || booking.customer_name,
          date: itemDate,
          ...range,
        }));
      });
    }

    if (!booking.event_date || !booking.event_time) return [];

    const range = getEventRange(booking.event_time, booking.time_label);
    return [{
      id: booking.id,
      booking,
      title: booking.customer_name,
      date: booking.event_date,
      ...range,
    }];
  });

  const getWeekDates = (d: Date) => {
    const start = new Date(d);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  };

  const getMonthDates = (d: Date) => {
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const startPad = firstDay.getDay();
    const dates: Date[] = [];
    
    for (let i = startPad - 1; i >= 0; i--) {
      const day = new Date(firstDay);
      day.setDate(day.getDate() - i - 1);
      dates.push(day);
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      dates.push(new Date(d.getFullYear(), d.getMonth(), i));
    }
    const remaining = 42 - dates.length;
    for (let i = 1; i <= remaining; i++) {
      dates.push(new Date(lastDay.getFullYear(), lastDay.getMonth() + 1, i));
    }
    return dates;
  };

  const getBookingsForDate = (d: Date) => {
    const dateStr = formatLocalDateKey(d);
    return calendarEvents.filter((event) => event.date === dateStr);
  };

  const getEventsForDate = (d: Date) => {
    const dateStr = formatLocalDateKey(d);
    return calendarEvents.filter((event) => event.date === dateStr && event.start);
  };

  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };

  const getPositionedEventsForDate = (d: Date): PositionedCalendarEvent[] => {
    const events = getEventsForDate(d).sort((a, b) => {
      const startDiff = timeToMinutes(a.start) - timeToMinutes(b.start);
      if (startDiff !== 0) return startDiff;
      return timeToMinutes(a.end || a.start) - timeToMinutes(b.end || b.start);
    });

    const positionedEvents: PositionedCalendarEvent[] = [];
    let activeCluster: CalendarEvent[] = [];
    let activeClusterEnd = -1;

    const positionCluster = (cluster: CalendarEvent[]) => {
      const columnEnds: number[] = [];
      const positionedCluster = cluster.map((event) => {
        const start = timeToMinutes(event.start);
        const end = Math.max(timeToMinutes(event.end || event.start), start + 30);
        const column = columnEnds.findIndex((columnEnd) => columnEnd <= start);
        const targetColumn = column === -1 ? columnEnds.length : column;
        columnEnds[targetColumn] = end;
        return { ...event, column: targetColumn, columnCount: 1 };
      });
      const columnCount = Math.max(columnEnds.length, 1);
      positionedCluster.forEach((event) => {
        positionedEvents.push({ ...event, columnCount });
      });
    };

    events.forEach((event) => {
      const start = timeToMinutes(event.start);
      const end = Math.max(timeToMinutes(event.end || event.start), start + 30);

      if (activeCluster.length > 0 && start >= activeClusterEnd) {
        positionCluster(activeCluster);
        activeCluster = [];
        activeClusterEnd = -1;
      }

      activeCluster.push(event);
      activeClusterEnd = Math.max(activeClusterEnd, end);
    });

    if (activeCluster.length > 0) {
      positionCluster(activeCluster);
    }

    return positionedEvents;
  };

  const calendarStartMinutes = timeToMinutes(timeSlots[0]?.start || "09:00");
  const calendarEndMinutes = timeToMinutes(timeSlots[timeSlots.length - 1]?.end || "22:00");
  const rowHeight = 72;
  const pixelsPerMinute = rowHeight / 60;
  const calendarBodyHeight = ((calendarEndMinutes - calendarStartMinutes) / 60) * rowHeight;

  const getTimedEventStyle = (event: PositionedCalendarEvent) => {
    const startMinutes = timeToMinutes(event.start);
    const endMinutes = event.end ? timeToMinutes(event.end) : startMinutes + 60;
    const clampedStart = Math.max(startMinutes, calendarStartMinutes);
    const clampedEnd = Math.min(Math.max(endMinutes, clampedStart + 30), calendarEndMinutes);
    const gap = 4;
    const width = `calc(${100 / event.columnCount}% - ${gap}px)`;

    return {
      top: `${(clampedStart - calendarStartMinutes) * pixelsPerMinute + 4}px`,
      height: `${Math.max((clampedEnd - clampedStart) * pixelsPerMinute - 8, 32)}px`,
      left: `calc(${(100 / event.columnCount) * event.column}% + ${gap / 2}px)`,
      width,
    };
  };

  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  const isCurrentMonth = (d: Date) => d.getMonth() === date.getMonth();

  const getServiceColor = (type: string | null) => {
    switch (type) {
      case "birthday_deck": return "bg-pink-100 border-pink-300 text-pink-800";
      case "corporate_deck": return "bg-indigo-100 border-indigo-300 text-indigo-800";
      case "nanny_class": return "bg-emerald-100 border-emerald-300 text-emerald-800";
      case "voucher": return "bg-green-100 border-green-300 text-green-800";
      default: return "bg-amber-100 border-amber-300 text-amber-800";
    }
  };

  // Day View
  if (view === "day") {
    const dayEvents = getPositionedEventsForDate(date);
    return (
      <div className="border rounded-lg overflow-hidden">
        <div className={`p-3 text-center font-medium ${isToday(date) ? "bg-amber-50" : "bg-stone-50"}`}>
          {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <div className="relative" style={{ height: calendarBodyHeight }}>
          {timeSlots.map((slot) => {
            const isAvailable = slot.days.includes(date.getDay());
            return (
              <div key={slot.start} className={`flex border-b ${!isAvailable ? "bg-stone-100" : ""}`} style={{ height: rowHeight }}>
                <div className="w-28 p-3 text-sm text-stone-500 border-r bg-stone-50 flex-shrink-0">
                  {slot.label.split(" - ")[0]}
                </div>
                <div className="flex-1 p-2">
                  {!isAvailable ? (
                    <span className="text-xs text-stone-400">Not available</span>
                  ) : (
                    <span className="text-xs text-green-600">Available</span>
                  )}
                </div>
              </div>
            );
          })}
          <div className="absolute left-28 right-2 top-0 bottom-0 pointer-events-none">
            {dayEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => onSelectBooking(event.booking)}
                className={`absolute z-10 p-2 rounded border cursor-pointer hover:shadow-md transition-shadow pointer-events-auto overflow-hidden ${getServiceColor(event.booking.service_type)}`}
                style={getTimedEventStyle(event)}
              >
                <div className="font-medium text-sm truncate">{event.booking.customer_name}</div>
                <div className="text-xs truncate">{event.label}</div>
                <div className="text-xs truncate">{event.title} - {event.booking.guest_count} guests</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Week View
  if (view === "week") {
    const weekDates = getWeekDates(date);
    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-8 bg-stone-50 border-b">
          <div className="p-2 border-r text-xs text-stone-500">Time</div>
          {weekDates.map((d) => (
            <div key={formatLocalDateKey(d)} className={`p-2 text-center text-sm ${isToday(d) ? "bg-amber-50 font-bold" : ""}`}>
              <div>{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
              <div className={`text-lg ${isToday(d) ? "text-amber-600" : ""}`}>{d.getDate()}</div>
            </div>
          ))}
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          <div className="flex relative" style={{ height: calendarBodyHeight }}>
            <div className="w-[12.5%] flex-shrink-0">
              {timeSlots.map((slot) => (
                <div key={slot.start} className="p-2 text-xs text-stone-500 border-r border-b bg-stone-50" style={{ height: rowHeight }}>
                  {slot.label.split(" - ")[0]}
                </div>
              ))}
            </div>
            {weekDates.map((d) => {
              const dayEvents = getPositionedEventsForDate(d);
              return (
                <div key={formatLocalDateKey(d)} className="relative flex-1 border-r">
                  {timeSlots.map((slot) => {
                    const isAvailable = slot.days.includes(d.getDay());
                    return (
                      <div key={slot.start} className={`border-b ${!isAvailable ? "bg-stone-100" : ""}`} style={{ height: rowHeight }} />
                    );
                  })}
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => onSelectBooking(event.booking)}
                      className={`absolute z-10 p-1 rounded text-xs cursor-pointer hover:shadow-md overflow-hidden ${getServiceColor(event.booking.service_type)}`}
                      style={getTimedEventStyle(event)}
                    >
                      <div className="font-medium truncate">{event.booking.customer_name}</div>
                      <div className="truncate">{event.label}</div>
                      <div className="truncate">{event.booking.guest_count}g</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Month View
  const monthDates = getMonthDates(date);
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 bg-stone-50 border-b">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-stone-600">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthDates.map((d, i) => {
          const dayBookings = getBookingsForDate(d);
          return (
            <div
              key={i}
              className={`min-h-[100px] p-1 border-b border-r ${!isCurrentMonth(d) ? "bg-stone-50" : ""} ${isToday(d) ? "bg-amber-50" : ""}`}
            >
              <div className={`text-sm mb-1 ${isToday(d) ? "font-bold text-amber-600" : isCurrentMonth(d) ? "text-stone-900" : "text-stone-400"}`}>
                {d.getDate()}
              </div>
              <div className="space-y-1">
                {dayBookings.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    onClick={() => onSelectBooking(event.booking)}
                    className={`p-1 rounded text-xs cursor-pointer truncate ${getServiceColor(event.booking.service_type)}`}
                  >
                    {event.start} {event.booking.customer_name}
                  </div>
                ))}
                {dayBookings.length > 3 && (
                  <div className="text-xs text-stone-500">+{dayBookings.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

