import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/api-auth";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, ["staff", "admin", "super_admin"]);
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

    const fromISO = from.toISOString();
    const toISO = to.toISOString();

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
    });
  } catch (error: any) {
    console.error("Sales report error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
