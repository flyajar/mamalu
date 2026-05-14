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

    // Also get payment links
    const { data: paymentLinks } = await supabase
      .from("payment_links")
      .select("*")
      .gte("created_at", fromISO)
      .lte("created_at", toISO);

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
        serviceSales[type].count++;
        serviceSales[type].revenue += booking.total_amount || 0;
        serviceSales[type].guests += booking.guest_count || 1;

        // Track package/service name
        const itemName = booking.package_name || booking.service_name || "Other";
        if (!serviceSales[type].items[itemName]) {
          serviceSales[type].items[itemName] = { count: 0, revenue: 0 };
        }
        serviceSales[type].items[itemName].count++;
        serviceSales[type].items[itemName].revenue += booking.total_amount || 0;
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

    // Add payment links to best sellers (use title or description)
    const paymentItems: Record<string, { count: number; revenue: number }> = {};
    paymentLinks?.forEach((payment: any) => {
      if (payment.status !== "paid") return;
      const itemName = payment.title || payment.description || payment.customer_name || "Payment Link";
      if (!paymentItems[itemName]) {
        paymentItems[itemName] = { count: 0, revenue: 0 };
      }
      paymentItems[itemName].count++;
      paymentItems[itemName].revenue += payment.paid_amount || payment.amount || 0;
    });
    Object.entries(paymentItems).forEach(([name, item]) => {
      bestSellers.push({
        name,
        type: "payment_link",
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

    // Daily breakdown - include all sources
    const dailyRevenue: Record<string, { date: string; revenue: number; bookings: number }> = {};
    
    // Add service bookings
    bookings?.forEach((booking: any) => {
      if (booking.status !== "confirmed" && booking.status !== "completed") return;
      const date = new Date(booking.paid_at || booking.created_at).toISOString().split("T")[0];
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = { date, revenue: 0, bookings: 0 };
      }
      dailyRevenue[date].revenue += booking.total_amount || 0;
      dailyRevenue[date].bookings++;
    });

    // Add class bookings
    classBookings?.forEach((booking: any) => {
      if (booking.status !== "confirmed" && booking.status !== "completed") return;
      const date = new Date(booking.paid_at || booking.created_at).toISOString().split("T")[0];
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = { date, revenue: 0, bookings: 0 };
      }
      dailyRevenue[date].revenue += booking.total_amount || 0;
      dailyRevenue[date].bookings++;
    });

    // Add payment links
    paymentLinks?.forEach((payment: any) => {
      if (payment.status !== "paid") return;
      const date = new Date(payment.paid_at || payment.created_at).toISOString().split("T")[0];
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = { date, revenue: 0, bookings: 0 };
      }
      dailyRevenue[date].revenue += payment.paid_amount || payment.amount || 0;
      dailyRevenue[date].bookings++;
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
        totalRevenue: totalServiceRevenue + classStats.revenue + paymentLinkStats.revenue,
        serviceRevenue: totalServiceRevenue,
        classRevenue: classStats.revenue,
        paymentLinkRevenue: paymentLinkStats.revenue,
        totalBookings: totalServiceBookings + classStats.count + paymentLinkStats.count,
        serviceBookings: totalServiceBookings,
        classBookings: classStats.count,
        paymentLinks: paymentLinkStats.count,
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
