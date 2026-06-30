import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { 
  Users, 
  Calendar, 
  ShoppingBag, 
  Utensils,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  Target,
  Zap,
  Activity,
  BarChart3,
} from "lucide-react";

type SupabaseQueryResult<T> = { data: T[] | null; error: { message: string } | null };
type CountResult = { count: number | null; error: { message: string } | null };

type StatTrend = {
  current: number;
  previous: number;
  change: number;
  sparkline: number[];
};

type DashboardData = {
  stats: {
    totalUsers: number;
    totalBookings: number;
    totalOrders: number;
    totalLeads: number;
  };
  trends: {
    users: StatTrend;
    bookings: StatTrend;
    orders: StatTrend;
    leads: StatTrend;
  };
  monthlyRevenue: Array<{
    month: string;
    classes: number;
    services: number;
    products: number;
  }>;
  revenuePeriod: RevenuePeriod;
  recentActivity: Array<{
    action: string;
    user: string;
    time: string;
    icon: typeof Calendar;
    color: string;
    href: string;
  }>;
  topProducts: Array<{
    name: string;
    count: number;
    revenue: number;
    fill: number;
  }>;
};

type RevenuePeriod = "month" | "quarter" | "year";

const currencyFormatter = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  maximumFractionDigits: 0,
});

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const NON_UNPAID_STATUS_FILTER = "status.is.null,status.neq.unpaid";
const NON_UNPAID_PAYMENT_STATUS_FILTER = "payment_status.is.null,payment_status.neq.unpaid";
const revenuePeriods: Array<{ label: string; value: RevenuePeriod }> = [
  { label: "Month", value: "month" },
  { label: "Quarter", value: "quarter" },
  { label: "Year", value: "year" },
];

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(amount: number) {
  return currencyFormatter.format(amount).replace("AED", "AED ");
}

function getRowDate(row: Record<string, unknown>, columns: string[]) {
  for (const column of columns) {
    const value = row[column];
    if (value) return String(value);
  }
  return null;
}

function getRevenueRange(period: RevenuePeriod) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "month") {
    start.setDate(1);
  } else if (period === "quarter") {
    start.setMonth(Math.floor(now.getMonth() / 3) * 3, 1);
  } else {
    start.setMonth(0, 1);
  }

  const end = new Date(start);
  if (period === "month") {
    end.setMonth(end.getMonth() + 1);
  } else if (period === "quarter") {
    end.setMonth(end.getMonth() + 3);
  } else {
    end.setFullYear(end.getFullYear() + 1);
  }

  return { start, end, from: start.toISOString(), to: end.toISOString() };
}

function getAnalyticsWeekRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 7);
  return { from: from.toISOString(), to: to.toISOString() };
}

function getRevenueBuckets(period: RevenuePeriod, range: { start: Date; end: Date }) {
  if (period === "month") {
    const days = Math.round((range.end.getTime() - range.start.getTime()) / 86400000);
    return Array.from({ length: days }, (_, index) => {
      const start = new Date(range.start);
      start.setDate(start.getDate() + index);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return {
        label: String(start.getDate()),
        start,
        end,
        classes: 0,
        services: 0,
        products: 0,
      };
    });
  }

  if (period === "quarter") {
    return Array.from({ length: 3 }, (_, index) => {
      const start = new Date(range.start);
      start.setMonth(start.getMonth() + index);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      return {
        label: monthLabels[start.getMonth()],
        start,
        end,
        classes: 0,
        services: 0,
        products: 0,
      };
    });
  }

  return monthLabels.map((label, index) => {
    const start = new Date(range.start.getFullYear(), index, 1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    return { label, start, end, classes: 0, services: 0, products: 0 };
  });
}

function addRevenueToBucket(
  buckets: ReturnType<typeof getRevenueBuckets>,
  row: Record<string, unknown>,
  dateColumns: string[]
) {
  const rawDate = getRowDate(row, dateColumns);
  if (!rawDate) return null;

  const date = new Date(String(rawDate));
  if (Number.isNaN(date.getTime())) return null;

  const bucket = buckets.find((item) => date >= item.start && date < item.end);
  if (bucket) return bucket;
  return null;
}

function isRevenueExcluded(row: Record<string, unknown>) {
  return ["unpaid", "cancelled", "refunded", "failed"].includes(String(row.status || ""))
    || ["unpaid", "refunded", "failed"].includes(String(row.payment_status || ""));
}

function relativeTime(value?: string | null) {
  if (!value) return "Recently";
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function monthWindow(monthsAgo: number) {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  start.setMonth(start.getMonth() - monthsAgo);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

async function safeCount(query: PromiseLike<CountResult>) {
  const result = await query;
  if (result.error) return 0;
  return result.count || 0;
}

async function safeData<T>(query: PromiseLike<SupabaseQueryResult<T>>) {
  const result = await query;
  if (result.error) return [] as T[];
  return result.data || [];
}

async function getTrend(
  table: string,
  column = "created_at",
  activeLeadsOnly = false,
  excludeUnpaidBookings = false,
  role?: string
): Promise<StatTrend> {
  const supabase = createAdminClient();
  if (!supabase) return { current: 0, previous: 0, change: 0, sparkline: [0, 0, 0, 0, 0, 0] };

  const windows = Array.from({ length: 6 }, (_, index) => monthWindow(5 - index));
  const counts = await Promise.all(windows.map((window) => {
    let query = supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .gte(column, window.from)
      .lt(column, window.to);
    if (activeLeadsOnly) query = query.not("status", "in", "(won,lost)");
    if (role) query = query.eq("role", role);
    if (excludeUnpaidBookings) {
      query = query
        .or(NON_UNPAID_STATUS_FILTER)
        .or(NON_UNPAID_PAYMENT_STATUS_FILTER);
    }
    return safeCount(query);
  }));

  const current = counts.at(-1) || 0;
  const previous = counts.at(-2) || 0;
  return {
    current,
    previous,
    change: percentChange(current, previous),
    sparkline: counts,
  };
}

async function getStats() {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const [users, classBookings, serviceBookings, productOrders, legacyOrders, activeLeads] = await Promise.all([
    safeCount(supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "customer")),
    safeCount(supabase.from("class_bookings").select("*", { count: "exact", head: true })),
    safeCount(supabase
      .from("service_bookings")
      .select("*", { count: "exact", head: true })
      .or(NON_UNPAID_STATUS_FILTER)
      .or(NON_UNPAID_PAYMENT_STATUS_FILTER)),
    safeCount(supabase.from("product_orders").select("*", { count: "exact", head: true })),
    safeCount(supabase.from("orders").select("*", { count: "exact", head: true })),
    safeCount(supabase.from("leads").select("*", { count: "exact", head: true }).not("status", "in", "(won,lost)")),
  ]);

  return {
    totalUsers: users,
    totalBookings: classBookings + serviceBookings,
    totalOrders: productOrders || legacyOrders,
    totalLeads: activeLeads,
  };
}

async function getDashboardData(revenuePeriod: RevenuePeriod): Promise<DashboardData | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const revenueRange = getRevenueRange(revenuePeriod);
  const analyticsWeekRange = getAnalyticsWeekRange();

  const [
    stats,
    userTrend,
    classTrend,
    serviceTrend,
    productOrderTrend,
    legacyOrderTrend,
    leadTrend,
    classRevenueRows,
    serviceRevenueRows,
    productRevenueRows,
    recentClassBookings,
    recentServiceBookings,
    recentOrders,
    recentLeads,
    topProductRows,
  ] = await Promise.all([
    getStats(),
    getTrend("profiles", "created_at", false, false, "customer"),
    getTrend("class_bookings"),
    getTrend("service_bookings", "created_at", false, true),
    getTrend("product_orders", "created_at"),
    getTrend("orders", "created_at"),
    getTrend("leads", "created_at", true),
    safeData<Record<string, unknown>>(supabase
      .from("class_bookings")
      .select("created_at,total_amount,status,payment_status")
      .eq("status", "completed")
      .gte("created_at", revenueRange.from)
      .lt("created_at", revenueRange.to)),
    safeData<Record<string, unknown>>(supabase
      .from("service_bookings")
      .select("created_at,event_date,total_amount,status,payment_status")
      .eq("status", "completed")
      .gte("event_date", revenueRange.from.slice(0, 10))
      .lt("event_date", revenueRange.to.slice(0, 10))),
    safeData<Record<string, unknown>>(supabase
      .from("product_orders")
      .select("created_at,delivered_at,total_amount,status,payment_status")
      .eq("status", "delivered")
      .gte("created_at", revenueRange.from)
      .lt("created_at", revenueRange.to)),
    safeData<Record<string, unknown>>(supabase
      .from("class_bookings")
      .select("id,booking_number,class_title,attendee_name,created_at")
      .order("created_at", { ascending: false })
      .limit(5)),
    safeData<Record<string, unknown>>(supabase
      .from("service_bookings")
      .select("id,booking_number,service_name,customer_name,created_at")
      .or(NON_UNPAID_STATUS_FILTER)
      .or(NON_UNPAID_PAYMENT_STATUS_FILTER)
      .order("created_at", { ascending: false })
      .limit(5)),
    safeData<Record<string, unknown>>(supabase
      .from("product_orders")
      .select("id,order_number,customer_name,created_at")
      .order("created_at", { ascending: false })
      .limit(5)),
    safeData<Record<string, unknown>>(supabase
      .from("leads")
      .select("id,name,lead_type,created_at")
      .order("created_at", { ascending: false })
      .limit(5)),
    safeData<Record<string, unknown>>(supabase
      .from("product_orders")
      .select("items,total_amount,status,payment_status,paid_at")
      .eq("payment_status", "paid")
      .gte("paid_at", analyticsWeekRange.from)
      .lte("paid_at", analyticsWeekRange.to)),
  ]);

  const monthlyRevenue = getRevenueBuckets(revenuePeriod, revenueRange);
  classRevenueRows.forEach((row) => {
    if (isRevenueExcluded(row)) return;
    const bucket = addRevenueToBucket(monthlyRevenue, row, ["created_at"]);
    if (bucket) bucket.classes += toNumber(row.total_amount);
  });
  serviceRevenueRows.forEach((row) => {
    if (isRevenueExcluded(row)) return;
    const bucket = addRevenueToBucket(monthlyRevenue, row, ["event_date", "created_at"]);
    if (bucket) bucket.services += toNumber(row.total_amount);
  });
  productRevenueRows.forEach((row) => {
    if (isRevenueExcluded(row)) return;
    const amount = toNumber(row.total_amount);
    const bucket = addRevenueToBucket(monthlyRevenue, row, ["delivered_at", "created_at"]);
    if (bucket) bucket.products += amount;
  });

  const recentActivity = [
    ...recentClassBookings.map((item) => ({
      action: `Class booking ${item.booking_number ? `#${item.booking_number}` : ""}`.trim(),
      user: String(item.attendee_name || item.class_title || "Class customer"),
      time: relativeTime(String(item.created_at || "")),
      date: String(item.created_at || ""),
      icon: Calendar,
      color: "bg-emerald-100 text-emerald-600",
      href: "/admin/bookings",
    })),
    ...recentServiceBookings.map((item) => ({
      action: String(item.service_name || "Service booking"),
      user: String(item.customer_name || item.booking_number || "Booking customer"),
      time: relativeTime(String(item.created_at || "")),
      date: String(item.created_at || ""),
      icon: Utensils,
      color: "bg-purple-100 text-purple-600",
      href: "/admin/bookings",
    })),
    ...recentOrders.map((item) => ({
      action: `Product order ${item.order_number ? `#${item.order_number}` : ""}`.trim(),
      user: String(item.customer_name || "Order customer"),
      time: relativeTime(String(item.created_at || "")),
      date: String(item.created_at || ""),
      icon: ShoppingBag,
      color: "bg-amber-100 text-amber-600",
      href: "/admin/orders",
    })),
    ...recentLeads.map((item) => ({
      action: String(item.lead_type || "New lead"),
      user: String(item.name || "Lead"),
      time: relativeTime(String(item.created_at || "")),
      date: String(item.created_at || ""),
      icon: Target,
      color: "bg-blue-100 text-blue-600",
      href: `/admin/leads/${item.id}`,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const topProductMap = new Map<string, { count: number; revenue: number }>();
  topProductRows
    .filter((row) => !["cancelled", "refunded"].includes(String(row.status || "").toLowerCase()))
    .forEach((row) => {
      const products = (Array.isArray(row.items) ? row.items : []).map((item) => {
        const value = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return {
          name: String(value.title || value.name || value.product_name || "Product"),
          quantity: toNumber(value.quantity) || 1,
        };
      });
      const orderUnits = products.reduce((sum, product) => sum + product.quantity, 0) || 1;
      products.forEach((product) => {
        const existing = topProductMap.get(product.name) || { count: 0, revenue: 0 };
        existing.count += product.quantity;
        existing.revenue += toNumber(row.total_amount) * (product.quantity / orderUnits);
        topProductMap.set(product.name, existing);
      });
  });
  const maxProductUnits = Math.max(...Array.from(topProductMap.values()).map((item) => item.count), 1);
  const topProducts = Array.from(topProductMap.entries())
    .map(([name, value]) => ({
      name,
      count: value.count,
      revenue: value.revenue,
      fill: Math.max(5, Math.round((value.count / maxProductUnits) * 100)),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  return {
    stats: stats || { totalUsers: 0, totalBookings: 0, totalOrders: 0, totalLeads: 0 },
    trends: {
      users: userTrend,
      bookings: {
        current: classTrend.current + serviceTrend.current,
        previous: classTrend.previous + serviceTrend.previous,
        change: percentChange(classTrend.current + serviceTrend.current, classTrend.previous + serviceTrend.previous),
        sparkline: classTrend.sparkline.map((value, index) => value + (serviceTrend.sparkline[index] || 0)),
      },
      orders: productOrderTrend.current || productOrderTrend.previous || productOrderTrend.sparkline.some(Boolean) ? productOrderTrend : legacyOrderTrend,
      leads: leadTrend,
    },
    monthlyRevenue: monthlyRevenue.map((item) => ({
      month: item.label,
      classes: item.classes,
      services: item.services,
      products: item.products,
    })),
    revenuePeriod,
    recentActivity,
    topProducts,
  };
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams?: Promise<{ revenuePeriod?: string }> | { revenuePeriod?: string };
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedRevenuePeriod = revenuePeriods.some((period) => period.value === resolvedSearchParams.revenuePeriod)
    ? resolvedSearchParams.revenuePeriod as RevenuePeriod
    : "month";
  const dashboard = await getDashboardData(selectedRevenuePeriod);
  const stats = dashboard?.stats || { totalUsers: 0, totalBookings: 0, totalOrders: 0, totalLeads: 0 };
  const trends = dashboard?.trends;
  const revenuePeriod = dashboard?.revenuePeriod || selectedRevenuePeriod;
  const monthlyRevenue = dashboard?.monthlyRevenue || getRevenueBuckets(revenuePeriod, getRevenueRange(revenuePeriod)).map((item) => ({
    month: item.label,
    classes: 0,
    services: 0,
    products: 0,
  }));
  const maxMonthlyRevenue = Math.max(...monthlyRevenue.map((item) => item.classes + item.services + item.products), 1);
  const hasMonthlyRevenue = monthlyRevenue.some((item) => item.classes + item.services + item.products > 0);
  const revenueChartPoints = monthlyRevenue.map((item, index) => {
    const x = monthlyRevenue.length > 1 ? (index / (monthlyRevenue.length - 1)) * 100 : 50;
    const point = (value: number) => `${x},${92 - (value / maxMonthlyRevenue) * 78}`;

    return {
      ...item,
      x,
      total: item.classes + item.services + item.products,
      classesPoint: point(item.classes),
      servicesPoint: point(item.services),
      productsPoint: point(item.products),
      totalPoint: point(item.classes + item.services + item.products),
    };
  });
  const revenueLine = (key: "classesPoint" | "servicesPoint" | "productsPoint" | "totalPoint") =>
    revenueChartPoints.map((item) => item[key]).join(" ");
  const revenueSubtitle = revenuePeriod === "month"
    ? "Daily performance this month"
    : revenuePeriod === "quarter"
      ? "Monthly performance this quarter"
      : "Monthly performance this year";
  const emptyRevenueMessage = revenuePeriod === "month"
    ? "No completed booking or delivered order revenue recorded this month yet."
    : revenuePeriod === "quarter"
      ? "No completed booking or delivered order revenue recorded this quarter yet."
      : "No completed booking or delivered order revenue recorded this year yet.";

  const quickActions = [
    { label: "Process Order", icon: ShoppingBag, color: "from-[#FF8C6B] to-[#ff7a54]", href: "/admin/orders" },
    { label: "Add Customer", icon: Users, color: "from-emerald-500 to-teal-500", href: "/admin/users/new" },
    { label: "View Analytics", icon: BarChart3, color: "from-blue-500 to-cyan-500", href: "/admin/analytics" },
    { label: "Send Campaign", icon: Zap, color: "from-fuchsia-500 to-purple-500", href: "/admin/marketing" },
  ];

  const recentActivity = dashboard?.recentActivity || [];
  const topProducts = dashboard?.topProducts || [];
  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      trend: trends?.users,
      icon: Users,
      gradient: "from-violet-500 to-purple-600",
      shadow: "hover:shadow-purple-500/20",
    },
    {
      label: "Total Bookings",
      value: stats.totalBookings,
      trend: trends?.bookings,
      icon: Calendar,
      gradient: "from-emerald-500 to-teal-600",
      shadow: "hover:shadow-emerald-500/20",
    },
    {
      label: "Paid Orders",
      value: stats.totalOrders,
      trend: trends?.orders,
      icon: ShoppingBag,
      gradient: "from-[#FF8C6B] to-[#ff7a54]",
      shadow: "hover:shadow-amber-500/20",
    },
    {
      label: "CRM",
      value: stats.totalLeads,
      trend: trends?.leads,
      icon: Target,
      gradient: "from-rose-500 to-pink-600",
      shadow: "hover:shadow-rose-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-stone-900 via-stone-700 to-stone-900 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-stone-500 mt-1">Welcome back! Here&apos;s your business overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-xl bg-white border border-stone-200 hover:border-amber-300 hover:shadow-md transition-all">
            <Bell className="h-5 w-5 text-stone-600" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card) => {
          const maxSparkline = Math.max(...(card.trend?.sparkline || [0]), 1);
          const isPositive = (card.trend?.change || 0) >= 0;
          const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;
          return (
            <div key={card.label} className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-6 text-white shadow-lg hover:shadow-xl ${card.shadow} transition-all duration-300`}>
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <span className={`flex items-center text-sm font-medium ${isPositive ? "text-green-200" : "text-red-200"}`}>
                    <TrendIcon className="h-4 w-4 mr-1" />
                    {Math.abs(card.trend?.change || 0)}%
                  </span>
                </div>
                <p className="text-3xl font-bold">{card.value}</p>
                <p className="text-sm text-white/70 mt-1">{card.label}</p>
                <div className="flex items-end gap-1 mt-4 h-8">
                  {(card.trend?.sparkline || [0, 0, 0, 0, 0, 0]).map((value, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-white/30 rounded-t-sm group-hover:bg-white/40 transition-all"
                      style={{ height: `${Math.max((value / maxSparkline) * 100, value > 0 ? 12 : 4)}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-stone-900">Revenue Overview</h3>
                <p className="text-sm text-stone-500">{revenueSubtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                {revenuePeriods.map((period) => {
                  const isActive = period.value === revenuePeriod;
                  return (
                    <Link
                      key={period.value}
                      href={period.value === "month" ? "/admin" : `/admin?revenuePeriod=${period.value}`}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? "text-amber-600 bg-amber-50"
                          : "text-stone-500 hover:bg-stone-50"
                      }`}
                    >
                      {period.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="p-6">
            {hasMonthlyRevenue ? (
              <div className="h-48">
                <div className="relative h-40">
                  <svg className="h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Revenue line chart">
                    {[14, 40, 66, 92].map((y) => (
                      <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#e7e5e4" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                    ))}
                    <polyline points={revenueLine("totalPoint")} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                    <polyline points={revenueLine("servicesPoint")} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                    <polyline points={revenueLine("productsPoint")} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  </svg>
                  {revenueChartPoints.map((item) => (
                    <div
                      key={item.month}
                      className="group absolute top-0 h-full -translate-x-1/2"
                      style={{ left: `${item.x}%` }}
                    >
                      <div className="h-full w-px bg-transparent group-hover:bg-stone-200" />
                      <div
                        className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-amber-500 shadow"
                        style={{ top: `${92 - (item.total / maxMonthlyRevenue) * 78}%` }}
                        title={`${item.month}: ${formatCurrency(item.total)}`}
                      />
                      <div
                        className="pointer-events-none absolute left-1/2 z-10 hidden -translate-x-1/2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-lg group-hover:block"
                        style={{ top: `${Math.max(0, 92 - (item.total / maxMonthlyRevenue) * 78 - 28)}%` }}
                      >
                        <p className="whitespace-nowrap font-semibold text-stone-900">{item.month}: {formatCurrency(item.total)}</p>
                        <p className="whitespace-nowrap text-stone-500">Services {formatCurrency(item.services)}</p>
                        <p className="whitespace-nowrap text-stone-500">Products {formatCurrency(item.products)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between">
                  {revenueChartPoints.map((item) => (
                    <span key={item.month} className="text-xs text-stone-400">{item.month}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50 text-sm text-stone-500">
                {emptyRevenueMessage}
              </div>
            )}
            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-stone-600">Service Bookings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-sm text-stone-600">Product Sales</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-sm text-stone-600">Total Revenue</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100">
            <h3 className="font-semibold text-stone-900">Quick Actions</h3>
          </div>
          <div className="p-4 space-y-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-stone-50 transition-all group"
              >
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${action.color} text-white shadow-lg`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <span className="flex-1 text-sm font-medium text-stone-700 group-hover:text-stone-900">{action.label}</span>
                <ArrowUpRight className="h-4 w-4 text-stone-400 group-hover:text-amber-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#FF8C6B] to-[#ff7a54] text-white">
                <Activity className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-stone-900">Recent Activity</h3>
            </div>
            <Link href="/admin/bookings" className="text-sm text-amber-600 hover:text-amber-700 font-medium">View all</Link>
          </div>
          <div className="divide-y divide-stone-100">
            {recentActivity.length === 0 ? (
              <p className="p-6 text-sm text-stone-500">No recent activity yet.</p>
            ) : recentActivity.map((item, i) => (
              <Link key={i} href={item.href} className="block p-4 hover:bg-stone-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl ${item.color}`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{item.action}</p>
                    <p className="text-xs text-stone-500">{item.user}</p>
                  </div>
                  <span className="text-xs text-stone-400 whitespace-nowrap">{item.time}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Easy Freezy */}
        <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 text-white">
                <ShoppingBag className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-stone-900">Easy Freezy</h3>
            </div>
            <Link href="/admin/analytics" className="text-sm text-amber-600 hover:text-amber-700 font-medium">View all</Link>
          </div>
          <div className="p-4 space-y-4">
            {topProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-stone-500">No classes sold in this period.</p>
            ) : topProducts.map((product, i) => (
              <div key={i} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-stone-900 group-hover:text-amber-600 transition-colors">{i + 1}. {product.name}</p>
                    <p className="text-xs text-stone-500">{product.count} units</p>
                  </div>
                  <span className="text-sm font-semibold text-stone-700">est. {formatCurrency(product.revenue)}</span>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all group-hover:bg-blue-400"
                    style={{ width: `${product.fill}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
