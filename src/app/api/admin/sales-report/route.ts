import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/api-auth";

const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000;

type ScheduledItem = {
  name?: string;
  quantity?: number;
  event_date?: string;
  event_time?: string;
  time_label?: string;
  camp_dates?: string[];
  camp_date_statuses?: Record<string, string> | null;
  packageId?: string;
  packageName?: string;
  session?: number;
  status?: string | null;
};

type DailyBooking = {
  id: string;
  bookingNumber: string;
  invoiceNumber: string;
  date: string;
  time: string | null;
  customerName: string;
  customerEmail: string;
  bookingType: "service" | "class";
  serviceType: string;
  bookedItems: Array<{ name: string; quantity: number }>;
  status: "confirmed" | "completed";
  paymentStatus: string;
  paidAt: string | null;
  guests: number;
  allocatedAmount: number;
  amountCollected: number;
  outstandingBalance: number;
};

type DailyProductOrder = {
  id: string;
  orderNumber: string;
  invoiceNumber: string;
  date: string;
  paidAt: string;
  customerName: string;
  customerEmail: string;
  products: Array<{ name: string; quantity: number }>;
  subtotal: number;
  shipping: number;
  totalPaid: number;
  fulfillmentStatus: string;
};

type FinanceCreditNote = {
  id: string;
  creditNoteNumber: string;
  sourceType: string;
  sourceReference: string;
  originalInvoiceNumber: string;
  customerName: string;
  customerEmail: string;
  createdDate: string;
  createdAt: string;
  subtotalAmount: number;
  vatAmount: number;
  totalCreditAmount: number;
};

type MonthlyTargetBooking = {
  id: string;
  bookingNumber: string;
  createdDate: string;
  createdAt: string;
  customerName: string;
  bookingType: "service" | "class";
  serviceType: string;
  status: "partial" | "paid" | "completed";
  guests: number;
  bookingValue: number;
  amountCollected: number;
};

type AnalyticsRanking = {
  name: string;
  count: number;
  revenue: number;
};

function dubaiDateString(date: Date) {
  return new Date(date.getTime() + DUBAI_OFFSET_MS).toISOString().slice(0, 10);
}

function dubaiRange(startDate: string, endDate: string) {
  return {
    from: new Date(`${startDate}T00:00:00+04:00`),
    to: new Date(`${endDate}T23:59:59.999+04:00`),
  };
}

function enumerateDates(from: string, to: string) {
  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function amountCollected(booking: Record<string, unknown>) {
  const total = Number(booking.total_amount) || 0;
  if (booking.payment_status === "paid" || booking.payment_status === "fully_paid" || booking.balance_paid) {
    return total;
  }
  if (booking.deposit_paid || booking.payment_status === "deposit_paid") {
    return Number(booking.deposit_amount) || 0;
  }
  return 0;
}

function monthlyTargetStatus(booking: Record<string, unknown>): MonthlyTargetBooking["status"] | null {
  if (booking.status === "completed") return "completed";
  if (
    booking.payment_status === "paid" ||
    booking.payment_status === "fully_paid" ||
    booking.balance_paid ||
    booking.paid_at
  ) {
    return "paid";
  }
  if (
    booking.payment_status === "partial" ||
    booking.payment_status === "partially_paid" ||
    booking.payment_status === "deposit_paid" ||
    booking.deposit_paid
  ) {
    return "partial";
  }
  return null;
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, ["staff", "admin", "super_admin", "mall", "accountant"]);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    // Calculate date range
    const now = new Date();
    let from: Date;
    let to: Date = new Date(now);

    if (startDate && endDate) {
      from = new Date(startDate);
      to = new Date(endDate);
    } else {
      switch (period) {
        case "week":
          from = new Date(now);
          from.setDate(from.getDate() - 7);
          break;
        case "quarter":
          from = new Date(now);
          from.setMonth(from.getMonth() - 3);
          break;
        case "year":
          from = new Date(now);
          from.setFullYear(from.getFullYear() - 1);
          break;
        case "month":
        default:
          from = new Date(now);
          from.setMonth(from.getMonth() - 1);
          break;
      }
    }

    const requestedFromDate = startDate || dubaiDateString(from);
    const requestedToDate = endDate || dubaiDateString(to);
    const reportRange = dubaiRange(requestedFromDate, requestedToDate);
    const fromISO = reportRange.from.toISOString();
    const toISO = reportRange.to.toISOString();

    // Get service bookings
    const { data: bookings } = await supabase
      .from("service_bookings")
      .select("*")
      .gte("created_at", fromISO)
      .lte("created_at", toISO);

    // Also get class bookings for combined report
    const { data: classBookings } = await supabase
      .from("class_bookings")
      .select("*")
      .gte("created_at", fromISO)
      .lte("created_at", toISO);

    // Also get payment links (with menu item names)
    const { data: paymentLinks } = await supabase
      .from("payment_links")
      .select("*, menu_items(id, name)")
      .gte("created_at", fromISO)
      .lte("created_at", toISO);

    // Get voucher purchases
    const { data: voucherPurchases } = await supabase
      .from("voucher_purchases")
      .select("*, vouchers(id, name, type)")
      .gte("created_at", fromISO)
      .lte("created_at", toISO);

    // Get menu items for name lookups
    const { data: menuItems } = await supabase
      .from("menu_items")
      .select("id, name, categories");

    const [{ data: dailyServiceBookings }, { data: dailyClassBookings }, { data: productOrders }] = await Promise.all([
      supabase
        .from("service_bookings")
        .select("*")
        .in("status", ["confirmed", "completed"]),
      supabase
        .from("class_bookings")
        .select("*")
        .eq("status", "completed")
        .gte("start_date", fromISO)
        .lte("start_date", toISO),
      supabase
        .from("product_orders")
        .select("*")
        .eq("payment_status", "paid")
        .gte("paid_at", fromISO)
        .lte("paid_at", toISO),
    ]);

    const [{ data: financeServiceBookings }, { data: financeClassBookings }, { data: creditNotes }] = await Promise.all([
      supabase
        .from("service_bookings")
        .select("*")
        .or(`paid_at.gte.${fromISO},deposit_paid_at.gte.${fromISO},balance_paid_at.gte.${fromISO}`),
      supabase
        .from("class_bookings")
        .select("*")
        .gte("paid_at", fromISO)
        .lte("paid_at", toISO),
      supabase
        .from("credit_notes")
        .select("*")
        .gte("created_at", fromISO)
        .lte("created_at", toISO)
        .order("created_at", { ascending: true }),
    ]);

    const isPackageBookingItem = (
      item: unknown,
      booking: { package_name?: unknown }
    ) => {
      if (!item || typeof item !== "object") return false;

      const value = item as {
        packageId?: unknown;
        packageName?: unknown;
        session?: unknown;
      };

      return Boolean(
        value.packageId ||
        value.packageName ||
        (typeof value.session === "number" && booking.package_name)
      );
    };

    const getPackageBookingItems = (booking: { items?: unknown; package_name?: unknown }) => {
      const items = Array.isArray(booking.items) ? booking.items : [];
      return items.filter((item) => isPackageBookingItem(item, booking));
    };

    const getServiceSaleItems = (booking: {
      items?: unknown;
      package_name?: unknown;
      service_name?: unknown;
      total_amount?: unknown;
    }) => {
      const packageItems = getPackageBookingItems(booking);

      if (packageItems.length > 0) {
        const itemRevenue = (Number(booking.total_amount) || 0) / packageItems.length;

        return packageItems.map((item) => {
          const value = item as { name?: unknown };
          return {
            name: typeof value.name === "string" && value.name.trim() ? value.name : "Package Item",
            count: 1,
            revenue: itemRevenue,
          };
        });
      }

      return [{
        name: String(booking.package_name || booking.service_name || "Other"),
        count: 1,
        revenue: Number(booking.total_amount) || 0,
      }];
    };

    const getServiceBookingCount = (booking: { items?: unknown; package_name?: unknown }) => {
      const packageItemCount = getPackageBookingItems(booking).length;
      return packageItemCount > 0 ? packageItemCount : 1;
    };

    // Calculate service sales by type
    const serviceSales: Record<string, { 
      count: number; 
      revenue: number; 
      guests: number;
      items: Record<string, { count: number; revenue: number }>;
    }> = {};

    bookings?.forEach((booking: any) => {
      const type = booking.service_type || "unknown";
      if (!serviceSales[type]) {
        serviceSales[type] = { count: 0, revenue: 0, guests: 0, items: {} };
      }
      
      if (booking.status === "confirmed" || booking.status === "completed") {
        serviceSales[type].count += getServiceBookingCount(booking);
        serviceSales[type].revenue += booking.total_amount || 0;
        serviceSales[type].guests += booking.guest_count || 1;

        // Track individual selected package items instead of the package wrapper.
        getServiceSaleItems(booking).forEach((item) => {
          if (!serviceSales[type].items[item.name]) {
            serviceSales[type].items[item.name] = { count: 0, revenue: 0 };
          }
          serviceSales[type].items[item.name].count += item.count;
          serviceSales[type].items[item.name].revenue += item.revenue;
        });
      }
    });

    // Calculate best sellers from all sources
    const bestSellers: Array<{
      name: string;
      type: string;
      count: number;
      revenue: number;
    }> = [];

    // Add service bookings items
    Object.entries(serviceSales).forEach(([type, data]) => {
      Object.entries(data.items).forEach(([name, item]) => {
        bestSellers.push({
          name,
          type,
          count: item.count,
          revenue: item.revenue,
        });
      });
    });

    // Add class bookings to best sellers
    const classItems: Record<string, { count: number; revenue: number }> = {};
    classBookings?.forEach((booking: any) => {
      if (booking.status !== "confirmed" && booking.status !== "completed") return;
      const itemName = booking.class_name || booking.menu_name || booking.service_name || "Class Booking";
      if (!classItems[itemName]) {
        classItems[itemName] = { count: 0, revenue: 0 };
      }
      classItems[itemName].count++;
      classItems[itemName].revenue += booking.total_amount || 0;
    });
    Object.entries(classItems).forEach(([name, item]) => {
      bestSellers.push({
        name,
        type: "class_booking",
        count: item.count,
        revenue: item.revenue,
      });
    });

    // Add payment links to best sellers (use menu item name if linked, else title/description)
    const paymentItems: Record<string, { count: number; revenue: number; type: string }> = {};
    paymentLinks?.forEach((payment: any) => {
      if (payment.status !== "paid") return;
      // If linked to a menu item, use that name and categorize appropriately
      const menuItem = payment.menu_items;
      const itemName = menuItem?.name || payment.title || payment.description || payment.customer_name || "Payment Link";
      const itemType = menuItem ? "menu_item" : "payment_link";
      const key = `${itemType}:${itemName}`;
      if (!paymentItems[key]) {
        paymentItems[key] = { count: 0, revenue: 0, type: itemType };
      }
      paymentItems[key].count++;
      paymentItems[key].revenue += payment.paid_amount || payment.amount || 0;
    });
    Object.entries(paymentItems).forEach(([key, item]) => {
      const name = key.split(":").slice(1).join(":");
      bestSellers.push({
        name,
        type: item.type,
        count: item.count,
        revenue: item.revenue,
      });
    });

    // Add voucher purchases to best sellers
    const voucherItems: Record<string, { count: number; revenue: number }> = {};
    voucherPurchases?.forEach((purchase: any) => {
      if (purchase.status !== "paid") return;
      const voucher = purchase.vouchers;
      const itemName = voucher?.name || `Gift Card (AED ${purchase.amount})`;
      if (!voucherItems[itemName]) {
        voucherItems[itemName] = { count: 0, revenue: 0 };
      }
      voucherItems[itemName].count++;
      voucherItems[itemName].revenue += purchase.amount || 0;
    });
    Object.entries(voucherItems).forEach(([name, item]) => {
      bestSellers.push({
        name,
        type: "voucher",
        count: item.count,
        revenue: item.revenue,
      });
    });

    // Sort by count (best sellers)
    bestSellers.sort((a, b) => b.count - a.count);

    // Calculate totals
    const totalServiceRevenue = Object.values(serviceSales).reduce(
      (sum, s) => sum + s.revenue,
      0
    );
    const totalServiceBookings = Object.values(serviceSales).reduce(
      (sum, s) => sum + s.count,
      0
    );
    const totalGuests = Object.values(serviceSales).reduce(
      (sum, s) => sum + s.guests,
      0
    );

    // Class bookings summary
    const classStats = {
      count: classBookings?.filter((b: any) => 
        b.status === "confirmed" || b.status === "completed"
      ).length || 0,
      revenue: classBookings
        ?.filter((b: any) => b.status === "confirmed" || b.status === "completed")
        .reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0) || 0,
    };

    // Payment links summary
    const paymentLinkStats = {
      count: paymentLinks?.filter((p: any) => p.status === "paid").length || 0,
      revenue: paymentLinks
        ?.filter((p: any) => p.status === "paid")
        .reduce((sum: number, p: any) => sum + (p.paid_amount || p.amount || 0), 0) || 0,
    };

    // Voucher purchases summary
    const voucherStats = {
      count: voucherPurchases?.filter((p: any) => p.status === "paid").length || 0,
      revenue: voucherPurchases
        ?.filter((p: any) => p.status === "paid")
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0,
    };

    // Daily breakdown - include all sources and fill all dates
    const dailyRevenue: Record<string, { date: string; revenue: number; bookings: number }> = {};
    
    // First, initialize all dates in range with zero values
    const startD = new Date(from);
    const endD = new Date(to);
    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      dailyRevenue[dateStr] = { date: dateStr, revenue: 0, bookings: 0 };
    }
    
    // Add service bookings
    bookings?.forEach((booking: any) => {
      if (booking.status !== "confirmed" && booking.status !== "completed") return;
      const date = new Date(booking.paid_at || booking.created_at).toISOString().split("T")[0];
      if (dailyRevenue[date]) {
        dailyRevenue[date].revenue += booking.total_amount || 0;
        dailyRevenue[date].bookings += getServiceBookingCount(booking);
      }
    });

    // Add class bookings
    classBookings?.forEach((booking: any) => {
      if (booking.status !== "confirmed" && booking.status !== "completed") return;
      const date = new Date(booking.paid_at || booking.created_at).toISOString().split("T")[0];
      if (dailyRevenue[date]) {
        dailyRevenue[date].revenue += booking.total_amount || 0;
        dailyRevenue[date].bookings++;
      }
    });

    // Add payment links
    paymentLinks?.forEach((payment: any) => {
      if (payment.status !== "paid") return;
      const date = new Date(payment.paid_at || payment.created_at).toISOString().split("T")[0];
      if (dailyRevenue[date]) {
        dailyRevenue[date].revenue += payment.paid_amount || payment.amount || 0;
        dailyRevenue[date].bookings++;
      }
    });

    // Add voucher purchases
    voucherPurchases?.forEach((purchase: any) => {
      if (purchase.status !== "paid") return;
      const date = new Date(purchase.paid_at || purchase.created_at).toISOString().split("T")[0];
      if (dailyRevenue[date]) {
        dailyRevenue[date].revenue += purchase.amount || 0;
        dailyRevenue[date].bookings++;
      }
    });

    const dailyData = Object.values(dailyRevenue).sort((a, b) => 
      a.date.localeCompare(b.date)
    );

    // Format service type names
    const formatServiceType = (type: string) => {
      const names: Record<string, string> = {
        birthday_deck: "Birthdays",
        corporate_deck: "Corporate",
        nanny_class: "Nanny Class",
        walkin_menu: "Walk-in Menu",
        class_booking: "Classes",
        payment_link: "Payment Links",
        menu_item: "Menu Items",
        voucher: "Vouchers/Gift Cards",
      };
      return names[type] || type;
    };

    // Get user profiles for created_by lookup
    const userIds = new Set<string>();
    bookings?.forEach((b: any) => { if (b.created_by) userIds.add(b.created_by); });
    classBookings?.forEach((b: any) => { if (b.created_by) userIds.add(b.created_by); });
    
    let userMap: Record<string, string> = {};
    if (userIds.size > 0) {
      const { data: users } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", Array.from(userIds));
      users?.forEach((u: any) => {
        userMap[u.id] = u.full_name || u.email || "Unknown";
      });
    }

    // Determine booking source
    const getBookingSource = (booking: any) => {
      if (booking.payment_link_id) return "payment_link";
      if (booking.created_by) return "admin";
      if (booking.stripe_checkout_session_id) return "website";
      return "website";
    };

    // Format bookings for Depachika report
    const formattedBookings = (bookings || [])
      .filter((b: any) => b.status === "confirmed" || b.status === "completed")
      .map((b: any) => ({
        id: b.id,
        booking_number: b.booking_number,
        service_type: b.service_type,
        service_name: b.service_name,
        menu_name: b.menu_name,
        customer_name: b.customer_name,
        customer_email: b.customer_email,
        event_date: b.event_date,
        created_at: b.created_at,
        paid_at: b.paid_at,
        guest_count: b.guest_count || 1,
        base_amount: b.base_amount || b.total_amount || 0,
        extras_amount: b.extras_amount || 0,
        total_amount: b.total_amount || 0,
        payment_status: b.payment_status,
        status: b.status,
        special_requests: b.special_requests,
        stripe_checkout_session_id: b.stripe_checkout_session_id || null,
        is_deposit_payment: b.is_deposit_payment || false,
        deposit_amount: b.deposit_amount || null,
        balance_amount: b.balance_amount || null,
        deposit_paid: b.deposit_paid || false,
        balance_paid: b.balance_paid || false,
        age_range: b.age_range || null,
        booking_source: getBookingSource(b),
        created_by_name: b.created_by ? userMap[b.created_by] || "Admin" : null,
      }))
      .sort((a: any, b: any) => new Date(a.event_date || a.created_at).getTime() - new Date(b.event_date || b.created_at).getTime());

    const dailyBookings: DailyBooking[] = [];

    (dailyServiceBookings || []).forEach((booking: Record<string, unknown>) => {
      const items = Array.isArray(booking.items) ? booking.items as ScheduledItem[] : [];
      const packageItems = getPackageBookingItems(booking) as ScheduledItem[];
      const allocatableItems = packageItems.length > 0 ? packageItems : items;
      const hasCampDateSchedule = allocatableItems.some((item) =>
        Array.isArray(item.camp_dates) && item.camp_dates.filter(Boolean).length > 0
      );
      const scheduledItems = allocatableItems.flatMap((item) => {
        const campDates = Array.isArray(item.camp_dates) ? item.camp_dates.filter(Boolean) : [];
        if (campDates.length > 0) {
          return [...new Set(campDates)].sort().map((date) => ({
            ...item,
            event_date: date,
            status: item.camp_date_statuses?.[date] || item.status,
          }));
        }

        return item.event_date ? [item] : [];
      });
      const allocationDivisor = Math.max(
        hasCampDateSchedule ? scheduledItems.length : packageItems.length > 0 ? packageItems.length : scheduledItems.length,
        1
      );
      const matchingItems = scheduledItems.filter(
        (item) => item.event_date && item.event_date >= requestedFromDate && item.event_date <= requestedToDate
      );
      const occurrences = scheduledItems.length > 0
        ? matchingItems.map((item) => ({
            date: item.event_date as string,
            time: item.event_time || item.time_label || null,
            items: [{ name: item.name || "Package Item", quantity: Number(item.quantity) || 1 }],
            divisor: allocationDivisor,
            status: item.status === "completed" ? "completed" as const : "confirmed" as const,
          }))
        : booking.event_date && String(booking.event_date) >= requestedFromDate && String(booking.event_date) <= requestedToDate
          ? [{
              date: String(booking.event_date),
              time: booking.event_time ? String(booking.event_time) : null,
              items: items.length > 0
                ? items.map((item) => ({ name: item.name || "Booked Item", quantity: Number(item.quantity) || 1 }))
                : [{ name: String(booking.package_name || booking.service_name || "Service Booking"), quantity: 1 }],
              divisor: 1,
              status: booking.status === "completed" ? "completed" as const : "confirmed" as const,
            }]
          : [];

      const total = Number(booking.total_amount) || 0;
      const collected = amountCollected(booking);
      occurrences.forEach((occurrence) => {
        if (occurrence.status !== "completed") return;

        dailyBookings.push({
          id: `${booking.id}-${occurrence.date}-${occurrence.time || ""}`,
          bookingNumber: String(booking.booking_number || ""),
          invoiceNumber: String(booking.invoice_number || ""),
          date: occurrence.date,
          time: occurrence.time,
          customerName: String(booking.customer_name || "Unknown"),
          customerEmail: String(booking.customer_email || ""),
          bookingType: "service",
          serviceType: String(booking.service_name || booking.service_type || "Service"),
          bookedItems: occurrence.items,
          status: occurrence.status,
          paymentStatus: String(booking.payment_status || "pending"),
          paidAt: booking.paid_at ? String(booking.paid_at) : null,
          guests: Number(booking.guest_count) || 1,
          allocatedAmount: total / occurrence.divisor,
          amountCollected: collected / occurrence.divisor,
          outstandingBalance: Math.max(total - collected, 0) / occurrence.divisor,
        });
      });
    });

    (dailyClassBookings || []).forEach((booking: Record<string, unknown>) => {
      if (!booking.start_date) return;
      const date = dubaiDateString(new Date(String(booking.start_date)));
      const total = Number(booking.total_amount) || 0;
      const collected = amountCollected(booking);
      dailyBookings.push({
        id: String(booking.id),
        bookingNumber: String(booking.booking_number || ""),
        invoiceNumber: String(booking.invoice_number || ""),
        date,
        time: new Date(String(booking.start_date)).toLocaleTimeString("en-GB", {
          timeZone: "Asia/Dubai",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        customerName: String(booking.attendee_name || "Unknown"),
        customerEmail: String(booking.attendee_email || ""),
        bookingType: "class",
        serviceType: String(booking.class_title || booking.class_type || "Class"),
        bookedItems: [{
          name: String(booking.class_title || "Class Booking"),
          quantity: Number(booking.sessions_booked) || 1,
        }],
        status: "completed",
        paymentStatus: booking.paid_at ? "paid" : String(booking.payment_status || "pending"),
        paidAt: booking.paid_at ? String(booking.paid_at) : null,
        guests: Number(booking.number_of_guests) || 1,
        allocatedAmount: total,
        amountCollected: collected || (booking.paid_at ? total : 0),
        outstandingBalance: Math.max(total - (collected || (booking.paid_at ? total : 0)), 0),
      });
    });

    const dailyProductOrders: DailyProductOrder[] = (productOrders || [])
      .filter((order: Record<string, unknown>) => !["cancelled", "refunded"].includes(String(order.status || "").toLowerCase()))
      .map((order: Record<string, unknown>) => ({
        id: String(order.id),
        orderNumber: String(order.order_number || ""),
        invoiceNumber: String(order.invoice_number || ""),
        date: dubaiDateString(new Date(String(order.paid_at))),
        paidAt: String(order.paid_at),
        customerName: String(order.customer_name || "Unknown"),
        customerEmail: String(order.customer_email || ""),
        products: (Array.isArray(order.items) ? order.items : []).map((item: unknown) => {
          const value = item && typeof item === "object" ? item as Record<string, unknown> : {};
          return {
            name: String(value.title || value.name || value.product_name || "Product"),
            quantity: Number(value.quantity) || 1,
          };
        }),
        subtotal: Number(order.subtotal) || 0,
        shipping: Number(order.shipping_cost) || 0,
        totalPaid: Number(order.total_amount) || 0,
        fulfillmentStatus: String(order.status || "processing"),
      }));

    dailyBookings.sort((a, b) => `${a.date}${a.time || ""}`.localeCompare(`${b.date}${b.time || ""}`));
    dailyProductOrders.sort((a, b) => a.paidAt.localeCompare(b.paidAt));

    const financeBookings: DailyBooking[] = [
      ...(financeServiceBookings || []).flatMap((booking: Record<string, unknown>) => {
        const paymentDate = booking.paid_at
          ? dubaiDateString(new Date(String(booking.paid_at)))
          : booking.balance_paid_at
            ? dubaiDateString(new Date(String(booking.balance_paid_at)))
            : booking.deposit_paid_at
              ? dubaiDateString(new Date(String(booking.deposit_paid_at)))
              : booking.deposit_paid || booking.balance_paid
                ? dubaiDateString(new Date(String(booking.updated_at || booking.created_at)))
                : null;
        if (!paymentDate || paymentDate < requestedFromDate || paymentDate > requestedToDate) return [];

        const total = Number(booking.total_amount) || 0;
        const collected = amountCollected(booking);
        if (collected <= 0) return [];

        const items = Array.isArray(booking.items) ? booking.items as ScheduledItem[] : [];
        return [{
          id: String(booking.id),
          bookingNumber: String(booking.booking_number || ""),
          invoiceNumber: String(booking.invoice_number || ""),
          date: paymentDate,
          time: booking.event_time ? String(booking.event_time) : null,
          customerName: String(booking.customer_name || "Unknown"),
          customerEmail: String(booking.customer_email || ""),
          bookingType: "service" as const,
          serviceType: String(booking.service_name || booking.service_type || "Service"),
          bookedItems: items.length > 0
            ? items.map((item) => ({ name: item.name || "Booked Item", quantity: Number(item.quantity) || 1 }))
            : [{ name: String(booking.package_name || booking.service_name || "Service Booking"), quantity: 1 }],
          status: booking.status === "completed" ? "completed" as const : "confirmed" as const,
          paymentStatus: String(booking.payment_status || (booking.deposit_paid ? "deposit_paid" : "paid")),
          paidAt: booking.paid_at ? String(booking.paid_at) : null,
          guests: Number(booking.guest_count) || 1,
          allocatedAmount: total,
          amountCollected: collected,
          outstandingBalance: Math.max(total - collected, 0),
        }];
      }),
      ...(financeClassBookings || []).flatMap((booking: Record<string, unknown>) => {
        const paymentDate = booking.paid_at ? dubaiDateString(new Date(String(booking.paid_at))) : null;
        if (!paymentDate || paymentDate < requestedFromDate || paymentDate > requestedToDate) return [];

        const total = Number(booking.total_amount) || 0;
        const collected = booking.paid_at ? total : amountCollected(booking);
        if (collected <= 0) return [];

        return [{
          id: String(booking.id),
          bookingNumber: String(booking.booking_number || ""),
          invoiceNumber: String(booking.invoice_number || ""),
          date: paymentDate,
          time: booking.start_date
            ? new Date(String(booking.start_date)).toLocaleTimeString("en-GB", {
                timeZone: "Asia/Dubai",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
            : null,
          customerName: String(booking.attendee_name || "Unknown"),
          customerEmail: String(booking.attendee_email || ""),
          bookingType: "class" as const,
          serviceType: String(booking.class_title || booking.class_type || "Class"),
          bookedItems: [{
            name: String(booking.class_title || "Class Booking"),
            quantity: Number(booking.sessions_booked) || 1,
          }],
          status: booking.status === "completed" ? "completed" as const : "confirmed" as const,
          paymentStatus: String(booking.payment_status || "paid"),
          paidAt: booking.paid_at ? String(booking.paid_at) : null,
          guests: Number(booking.number_of_guests) || 1,
          allocatedAmount: total,
          amountCollected: collected,
          outstandingBalance: Math.max(total - collected, 0),
        }];
      }),
    ].sort((a, b) => `${a.date}${a.time || ""}`.localeCompare(`${b.date}${b.time || ""}`));

    const financeCreditNotes: FinanceCreditNote[] = (creditNotes || []).map((note: Record<string, unknown>) => ({
      id: String(note.id),
      creditNoteNumber: String(note.credit_note_number || ""),
      sourceType: String(note.source_type || ""),
      sourceReference: String(note.source_reference || ""),
      originalInvoiceNumber: String(note.original_invoice_number || ""),
      customerName: String(note.customer_name || "Unknown"),
      customerEmail: String(note.customer_email || ""),
      createdDate: dubaiDateString(new Date(String(note.created_at))),
      createdAt: String(note.created_at),
      subtotalAmount: Number(note.subtotal_amount) || 0,
      vatAmount: Number(note.vat_amount) || 0,
      totalCreditAmount: Number(note.total_credit_amount) || 0,
    }));

    const dailyTotals = enumerateDates(requestedFromDate, requestedToDate).map((date) => {
      const dateBookings = dailyBookings.filter((booking) => booking.date === date);
      const dateOrders = dailyProductOrders.filter((order) => order.date === date);
      const actualBookingRevenue = dateBookings
        .filter((booking) => booking.status === "completed")
        .reduce((sum, booking) => sum + booking.allocatedAmount, 0);
      const projectedBookingValue = dateBookings
        .reduce((sum, booking) => sum + booking.allocatedAmount, 0);
      const productRevenue = dateOrders.reduce((sum, order) => sum + order.totalPaid, 0);
      return {
        date,
        actualBookingRevenue,
        projectedBookingValue,
        productRevenue,
        guests: dateBookings.reduce((sum, booking) => sum + booking.guests, 0),
        bookings: dateBookings.length,
        orders: dateOrders.length,
        combinedActualSales: actualBookingRevenue + productRevenue,
      };
    });

    const dailyReportSummary = dailyTotals.reduce((summary, day) => ({
      actualSales: summary.actualSales + day.combinedActualSales,
      projectedBookings: summary.projectedBookings + day.projectedBookingValue,
      productSales: summary.productSales + day.productRevenue,
      totalGuests: summary.totalGuests + day.guests,
      bookingCount: summary.bookingCount + day.bookings,
      productOrderCount: summary.productOrderCount + day.orders,
    }), {
      actualSales: 0,
      projectedBookings: 0,
      productSales: 0,
      totalGuests: 0,
      bookingCount: 0,
      productOrderCount: 0,
    });

    const financeDailyTotals = enumerateDates(requestedFromDate, requestedToDate).map((date) => {
      const dateBookings = financeBookings.filter((booking) => booking.date === date);
      const dateOrders = dailyProductOrders.filter((order) => order.date === date);
      const bookingRevenue = dateBookings.reduce((sum, booking) => sum + booking.amountCollected, 0);
      const productRevenue = dateOrders.reduce((sum, order) => sum + order.totalPaid, 0);
      return {
        date,
        actualBookingRevenue: bookingRevenue,
        projectedBookingValue: bookingRevenue,
        productRevenue,
        guests: dateBookings.reduce((sum, booking) => sum + booking.guests, 0),
        bookings: dateBookings.length,
        orders: dateOrders.length,
        combinedActualSales: bookingRevenue + productRevenue,
      };
    });

    const financeDailySummary = financeDailyTotals.reduce((summary, day) => ({
      actualSales: summary.actualSales + day.combinedActualSales,
      projectedBookings: summary.projectedBookings + day.projectedBookingValue,
      productSales: summary.productSales + day.productRevenue,
      totalGuests: summary.totalGuests + day.guests,
      bookingCount: summary.bookingCount + day.bookings,
      productOrderCount: summary.productOrderCount + day.orders,
    }), {
      actualSales: 0,
      projectedBookings: 0,
      productSales: 0,
      totalGuests: 0,
      bookingCount: 0,
      productOrderCount: 0,
    });

    const monthlyTargetBookings: MonthlyTargetBooking[] = [
      ...(bookings || []).flatMap((booking: Record<string, unknown>) => {
        const status = monthlyTargetStatus(booking);
        if (!status || !booking.created_at) return [];
        return [{
          id: String(booking.id),
          bookingNumber: String(booking.booking_number || ""),
          createdDate: dubaiDateString(new Date(String(booking.created_at))),
          createdAt: String(booking.created_at),
          customerName: String(booking.customer_name || "Unknown"),
          bookingType: "service" as const,
          serviceType: String(booking.service_name || booking.service_type || "Service"),
          status,
          guests: Number(booking.guest_count) || 1,
          bookingValue: Number(booking.total_amount) || 0,
          amountCollected: amountCollected(booking),
        }];
      }),
      ...(classBookings || []).flatMap((booking: Record<string, unknown>) => {
        const status = monthlyTargetStatus(booking);
        if (!status || !booking.created_at) return [];
        const total = Number(booking.total_amount) || 0;
        return [{
          id: String(booking.id),
          bookingNumber: String(booking.booking_number || ""),
          createdDate: dubaiDateString(new Date(String(booking.created_at))),
          createdAt: String(booking.created_at),
          customerName: String(booking.attendee_name || "Unknown"),
          bookingType: "class" as const,
          serviceType: String(booking.class_title || booking.class_type || "Class"),
          status,
          guests: Number(booking.number_of_guests) || 1,
          bookingValue: total,
          amountCollected: booking.paid_at ? total : amountCollected(booking),
        }];
      }),
    ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const monthlyTotals = Array.from(new Set([
      ...monthlyTargetBookings.map((booking) => booking.createdDate.slice(0, 7)),
      ...dailyProductOrders.map((order) => order.date.slice(0, 7)),
    ])).sort().map((month) => {
      const monthBookings = monthlyTargetBookings.filter((booking) => booking.createdDate.startsWith(month));
      const monthOrders = dailyProductOrders.filter((order) => order.date.startsWith(month));
      return {
        month,
        bookingValue: monthBookings.reduce((sum, booking) => sum + booking.bookingValue, 0),
        amountCollected: monthBookings.reduce((sum, booking) => sum + booking.amountCollected, 0),
        productSales: monthOrders.reduce((sum, order) => sum + order.totalPaid, 0),
        totalSales: monthBookings.reduce((sum, booking) => sum + booking.amountCollected, 0)
          + monthOrders.reduce((sum, order) => sum + order.totalPaid, 0),
        guests: monthBookings.reduce((sum, booking) => sum + booking.guests, 0),
        bookings: monthBookings.length,
        productOrders: monthOrders.length,
        partialBookings: monthBookings.filter((booking) => booking.status === "partial").length,
        paidBookings: monthBookings.filter((booking) => booking.status === "paid").length,
        completedBookings: monthBookings.filter((booking) => booking.status === "completed").length,
      };
    });

    const completedAnalyticsBookings = dailyBookings.filter((booking) => booking.status === "completed");
    const completedBookingRevenue = completedAnalyticsBookings.reduce((sum, booking) => sum + booking.allocatedAmount, 0);
    const projectedBookingRevenue = dailyBookings
      .filter((booking) => booking.status === "confirmed")
      .reduce((sum, booking) => sum + booking.allocatedAmount, 0);
    const productRevenue = dailyProductOrders.reduce((sum, order) => sum + order.totalPaid, 0);
    const grossSales = completedBookingRevenue + productRevenue;
    const totalTransactions = completedAnalyticsBookings.length + dailyProductOrders.length;
    const totalUnitsSold = dailyProductOrders.reduce(
      (sum, order) => sum + order.products.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    );
    const customerTransactions = new Map<string, number>();
    [...completedAnalyticsBookings.map((booking) => booking.customerEmail), ...dailyProductOrders.map((order) => order.customerEmail)]
      .filter(Boolean)
      .forEach((email) => customerTransactions.set(email.toLowerCase(), (customerTransactions.get(email.toLowerCase()) || 0) + 1));
    const repeatCustomers = Array.from(customerTransactions.values()).filter((count) => count > 1).length;

    const topServiceMap = new Map<string, AnalyticsRanking>();
    dailyBookings.forEach((booking) => {
      const current = topServiceMap.get(booking.serviceType) || { name: booking.serviceType, count: 0, revenue: 0 };
      current.count += 1;
      current.revenue += booking.allocatedAmount;
      topServiceMap.set(booking.serviceType, current);
    });

    const topBookingItemMap = new Map<string, AnalyticsRanking>();
    dailyBookings.forEach((booking) => {
      const totalQuantity = booking.bookedItems.reduce((sum, item) => sum + item.quantity, 0) || 1;
      booking.bookedItems.forEach((item) => {
        const current = topBookingItemMap.get(item.name) || { name: item.name, count: 0, revenue: 0 };
        current.count += item.quantity;
        current.revenue += booking.allocatedAmount * (item.quantity / totalQuantity);
        topBookingItemMap.set(item.name, current);
      });
    });

    const timeSlotMap = new Map<string, AnalyticsRanking>();
    dailyBookings.forEach((booking) => {
      if (!booking.time) return;
      const timeSlot = booking.time.slice(0, 5);
      const current = timeSlotMap.get(timeSlot) || { name: timeSlot, count: 0, revenue: 0 };
      current.count += 1;
      current.revenue += booking.allocatedAmount;
      timeSlotMap.set(timeSlot, current);
    });

    const topProductMap = new Map<string, AnalyticsRanking>();
    dailyProductOrders.forEach((order) => {
      const orderUnits = order.products.reduce((sum, product) => sum + product.quantity, 0) || 1;
      order.products.forEach((product) => {
        const current = topProductMap.get(product.name) || { name: product.name, count: 0, revenue: 0 };
        current.count += product.quantity;
        current.revenue += order.totalPaid * (product.quantity / orderUnits);
        topProductMap.set(product.name, current);
      });
    });

    const fulfillmentMap = new Map<string, number>();
    dailyProductOrders.forEach((order) => {
      fulfillmentMap.set(order.fulfillmentStatus, (fulfillmentMap.get(order.fulfillmentStatus) || 0) + 1);
    });

    const analytics = {
      summary: {
        grossSales,
        completedBookingRevenue,
        projectedBookingRevenue,
        productRevenue,
        amountCollected: dailyBookings.reduce((sum, booking) => sum + booking.amountCollected, 0) + productRevenue,
        outstandingBalance: dailyBookings.reduce((sum, booking) => sum + booking.outstandingBalance, 0),
        averageTransactionValue: totalTransactions > 0 ? grossSales / totalTransactions : 0,
        averageBookingValue: completedAnalyticsBookings.length > 0 ? completedBookingRevenue / completedAnalyticsBookings.length : 0,
        averageProductOrderValue: dailyProductOrders.length > 0 ? productRevenue / dailyProductOrders.length : 0,
        completedBookings: completedAnalyticsBookings.length,
        confirmedBookings: dailyBookings.filter((booking) => booking.status === "confirmed").length,
        productOrders: dailyProductOrders.length,
        totalGuests: completedAnalyticsBookings.reduce((sum, booking) => sum + booking.guests, 0),
        averageGuestsPerBooking: completedAnalyticsBookings.length > 0
          ? completedAnalyticsBookings.reduce((sum, booking) => sum + booking.guests, 0) / completedAnalyticsBookings.length
          : 0,
        unitsSold: totalUnitsSold,
        uniqueCustomers: customerTransactions.size,
        repeatCustomerRate: customerTransactions.size > 0 ? (repeatCustomers / customerTransactions.size) * 100 : 0,
        bookingCompletionRate: dailyBookings.length > 0 ? (completedAnalyticsBookings.length / dailyBookings.length) * 100 : 0,
        shippingRevenue: dailyProductOrders.reduce((sum, order) => sum + order.shipping, 0),
      },
      revenueMix: [
        { name: "Completed Bookings", value: completedBookingRevenue },
        { name: "Product Orders", value: productRevenue },
      ],
      fulfillment: Array.from(fulfillmentMap.entries()).map(([name, value]) => ({ name, value })),
      topServices: Array.from(topServiceMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      topBookingItems: Array.from(topBookingItemMap.values()).sort((a, b) => b.count - a.count).slice(0, 10),
      topTimeSlots: Array.from(timeSlotMap.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 10),
      topProducts: Array.from(topProductMap.values()).sort((a, b) => b.count - a.count).slice(0, 10),
      trend: dailyTotals.map((day) => ({
        date: day.date,
        sales: day.combinedActualSales,
        bookingRevenue: day.actualBookingRevenue,
        productRevenue: day.productRevenue,
        transactions: day.bookings + day.orders,
      })),
    };

    return NextResponse.json({
      period: { from: fromISO, to: toISO },
      summary: {
        totalRevenue: totalServiceRevenue + classStats.revenue + paymentLinkStats.revenue + voucherStats.revenue,
        serviceRevenue: totalServiceRevenue,
        classRevenue: classStats.revenue,
        paymentLinkRevenue: paymentLinkStats.revenue,
        voucherRevenue: voucherStats.revenue,
        totalBookings: totalServiceBookings + classStats.count + paymentLinkStats.count + voucherStats.count,
        serviceBookings: totalServiceBookings,
        classBookings: classStats.count,
        paymentLinks: paymentLinkStats.count,
        voucherPurchases: voucherStats.count,
        totalGuests,
      },
      serviceSales: Object.entries(serviceSales).map(([type, data]) => ({
        type,
        name: formatServiceType(type),
        ...data,
        items: Object.entries(data.items).map(([name, item]) => ({
          name,
          ...item,
        })).sort((a, b) => b.count - a.count),
      })),
      bestSellers: bestSellers.slice(0, 10).map((item) => ({
        ...item,
        typeName: formatServiceType(item.type),
      })),
      dailyData,
      bookings: formattedBookings,
      dailyReport: {
        period: { from: requestedFromDate, to: requestedToDate, timeZone: "Asia/Dubai" },
        summary: dailyReportSummary,
        bookings: dailyBookings,
        productOrders: dailyProductOrders,
        dailyTotals,
      },
      financeDailyReport: {
        period: { from: requestedFromDate, to: requestedToDate, timeZone: "Asia/Dubai" },
        summary: financeDailySummary,
        bookings: financeBookings,
        productOrders: dailyProductOrders,
        dailyTotals: financeDailyTotals,
        creditNotes: financeCreditNotes,
      },
      monthlyTargetReport: {
        period: { from: requestedFromDate, to: requestedToDate, timeZone: "Asia/Dubai" },
        bookings: monthlyTargetBookings,
        productOrders: dailyProductOrders,
        monthlyTotals,
      },
      analytics,
    });
  } catch (error: any) {
    console.error("Sales report error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
