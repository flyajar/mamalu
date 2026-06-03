"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";
import {
  RefreshCw,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Award,
  Cake,
  Briefcase,
  ChefHat,
  Coffee,
  ArrowUp,
  ArrowDown,
  Download,
  FileSpreadsheet,
  BarChart3,
  ClipboardList,
  Gift,
  UtensilsCrossed,
} from "lucide-react";

interface SalesData {
  period: { from: string; to: string };
  summary: {
    totalRevenue: number;
    serviceRevenue: number;
    classRevenue: number;
    paymentLinkRevenue: number;
    voucherRevenue: number;
    totalBookings: number;
    serviceBookings: number;
    classBookings: number;
    paymentLinks: number;
    voucherPurchases: number;
    totalGuests: number;
  };
  serviceSales: Array<{
    type: string;
    name: string;
    count: number;
    revenue: number;
    guests: number;
    items: Array<{ name: string; count: number; revenue: number }>;
  }>;
  bestSellers: Array<{
    name: string;
    type: string;
    typeName: string;
    count: number;
    revenue: number;
  }>;
  dailyData: Array<{ date: string; revenue: number; bookings: number }>;
  bookings: Array<{
    id: string;
    booking_number: string;
    service_type: string;
    service_name: string;
    menu_name: string;
    customer_name: string;
    customer_email: string;
    event_date: string;
    created_at: string;
    paid_at: string;
    guest_count: number;
    base_amount: number;
    extras_amount: number;
    total_amount: number;
    payment_status: string;
    status: string;
    special_requests: string;
    stripe_checkout_session_id: string | null;
    is_deposit_payment: boolean;
    deposit_amount: number | null;
    balance_amount: number | null;
    deposit_paid: boolean;
    balance_paid: boolean;
    age_range: string | null;
  }>;
  monthlyBreakdown: Array<{
    month: string;
    foods: number;
    drinks: number;
    addons: number;
    total: number;
  }>;
}

const serviceIcons: Record<string, any> = {
  birthday_deck: Cake,
  corporate_deck: Briefcase,
  nanny_class: ChefHat,
  walkin_menu: Coffee,
  class_booking: Users,
  payment_link: DollarSign,
  menu_item: UtensilsCrossed,
  voucher: Gift,
};

const serviceColors: Record<string, string> = {
  birthday_deck: "bg-pink-100 text-pink-700",
  corporate_deck: "bg-indigo-100 text-indigo-700",
  nanny_class: "bg-emerald-100 text-emerald-700",
  walkin_menu: "bg-amber-100 text-amber-700",
  class_booking: "bg-blue-100 text-blue-700",
  payment_link: "bg-violet-100 text-violet-700",
  menu_item: "bg-orange-100 text-orange-700",
  voucher: "bg-rose-100 text-rose-700",
};

export default function AdminSalesPage() {
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("week");
  const [activeTab, setActiveTab] = useState<"overview" | "management" | "depachika">("overview");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "completed" | "deposit_paid" | "pending">("all");

  useEffect(() => {
    fetchSalesData();
  }, [period]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      let url = `/api/admin/sales-report?period=${period}`;
      if (startDate && endDate) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSalesData(data);
      }
    } catch (error) {
      console.error("Failed to fetch sales data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWithDateRange = () => {
    if (startDate && endDate) {
      fetchSalesData();
    }
  };

  const formatCurrency = (amount: number) => {
    return `AED ${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const exportManagementReport = () => {
    if (!salesData) return;

    const wb = XLSX.utils.book_new();

    // Sales Summary Sheet
    const summaryData = [
      ["MAMALU KITCHEN - MANAGEMENT REPORT"],
      [`Period: ${new Date(salesData.period.from).toLocaleDateString()} - ${new Date(salesData.period.to).toLocaleDateString()}`],
      [],
      ["SALES SUMMARY"],
      ["Category", "Amount (AED)"],
      ["Service Bookings", salesData.summary.serviceRevenue],
      ["Class Bookings", salesData.summary.classRevenue],
      ["Payment Links", salesData.summary.paymentLinkRevenue],
      ["TOTAL REVENUE", salesData.summary.totalRevenue],
      [],
      ["BOOKING STATISTICS"],
      ["Metric", "Count"],
      ["Total Bookings", salesData.summary.totalBookings],
      ["Service Bookings", salesData.summary.serviceBookings],
      ["Class Bookings", salesData.summary.classBookings],
      ["Payment Links", salesData.summary.paymentLinks],
      ["Total Guests", salesData.summary.totalGuests],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Sales Summary");

    // Daily Sales Sheet
    const dailyData = [
      ["DAILY SALES REPORT"],
      [],
      ["Date", "Revenue (AED)", "Bookings"],
      ...(salesData.dailyData?.map(day => [
        new Date(day.date).toLocaleDateString(),
        day.revenue,
        day.bookings
      ]) || []),
    ];
    const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
    XLSX.utils.book_append_sheet(wb, dailySheet, "Daily Sales");

    // Sales by Service Type Sheet
    const serviceData = [
      ["SALES BY SERVICE TYPE"],
      [],
      ["Service Type", "Bookings", "Revenue (AED)", "Guests"],
      ...(salesData.serviceSales?.map(service => [
        service.name,
        service.count,
        service.revenue,
        service.guests
      ]) || []),
    ];
    const serviceSheet = XLSX.utils.aoa_to_sheet(serviceData);
    XLSX.utils.book_append_sheet(wb, serviceSheet, "By Service Type");

    // Top Sellers Sheet
    const topData = [
      ["TOP 10 BEST SELLERS"],
      [],
      ["Rank", "Item Name", "Service Type", "Orders", "Revenue (AED)"],
      ...(salesData.bestSellers?.slice(0, 10).map((item, idx) => [
        idx + 1,
        item.name,
        item.typeName,
        item.count,
        item.revenue
      ]) || []),
    ];
    const topSheet = XLSX.utils.aoa_to_sheet(topData);
    XLSX.utils.book_append_sheet(wb, topSheet, "Top 10 Sellers");

    XLSX.writeFile(wb, `Management-Report-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportDepachikaReport = () => {
    if (!salesData?.bookings) return;

    const wb = XLSX.utils.book_new();

    const reportData = [
      ["DEPACHIKA MONTHLY REPORT - MAMALU KITCHEN"],
      [`Period: ${new Date(salesData.period.from).toLocaleDateString()} - ${new Date(salesData.period.to).toLocaleDateString()}`],
      [],
      ["#", "Event Date", "Class Type", "Payment Date", "Customer Name", "Price/Person", "Walk-in", "Price Calc", "Attendees", "Base Amount", "Extras", "Total Amount", "Notes"],
      ...salesData.bookings.map((booking, idx) => [
        idx + 1,
        booking.event_date ? new Date(booking.event_date).toLocaleDateString() : "-",
        booking.service_name || booking.service_type,
        booking.paid_at ? new Date(booking.paid_at).toLocaleDateString() : "-",
        booking.customer_name,
        booking.guest_count > 0 ? Math.round(booking.base_amount / booking.guest_count) : booking.base_amount,
        booking.service_type === "walkin_menu" ? 1 : "",
        `=${booking.base_amount}`,
        booking.guest_count,
        booking.base_amount,
        booking.extras_amount || 0,
        booking.total_amount,
        booking.special_requests || ""
      ]),
      [],
      ["", "", "", "", "", "", "", "", "TOTALS:", 
        salesData.bookings.reduce((sum, b) => sum + (b.base_amount || 0), 0),
        salesData.bookings.reduce((sum, b) => sum + (b.extras_amount || 0), 0),
        salesData.bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0),
        ""
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(reportData);
    
    // Set column widths
    ws["!cols"] = [
      { wch: 5 }, { wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 20 },
      { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
      { wch: 10 }, { wch: 12 }, { wch: 30 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, new Date().toLocaleString("default", { month: "long", year: "numeric" }).toUpperCase());

    XLSX.writeFile(wb, `Depachika-Report-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportToCSV = () => {
    if (!salesData) return;

    const rows = [
      ["Service Type", "Package/Item", "Bookings", "Revenue", "Guests"],
      ...salesData.serviceSales.flatMap((service) =>
        service.items.map((item) => [
          service.name,
          item.name,
          item.count.toString(),
          item.revenue.toString(),
          "",
        ])
      ),
    ];

    const csvContent = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${period}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Sales & Reports</h1>
          <p className="text-stone-500 mt-1">
            Track revenue, bookings, and generate exportable reports
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant={period === "today" ? "default" : "outline"} 
            size="sm"
            onClick={() => {
              const today = new Date().toISOString().split("T")[0];
              setStartDate(today);
              setEndDate(today);
              setPeriod("today");
            }}
          >
            Today
          </Button>
          <select
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              setStartDate("");
              setEndDate("");
            }}
            className="px-4 py-2 border border-stone-200 rounded-lg bg-white"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">Last 3 Months</option>
            <option value="year">Last Year</option>
          </select>
          <Button variant="outline" onClick={fetchSalesData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Custom Date Range */}
      <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-lg">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-stone-600">From:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-stone-600">To:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <Button onClick={fetchWithDateRange} disabled={!startDate || !endDate}>
          Apply Date Range
        </Button>
        {(startDate || endDate) && (
          <Button variant="ghost" onClick={() => { setStartDate(""); setEndDate(""); setPeriod("week"); }}>
            Clear
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "overview"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <BarChart3 className="h-4 w-4 inline mr-2" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab("management")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "management"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <ClipboardList className="h-4 w-4 inline mr-2" />
          Management Report
        </button>
        <button
          onClick={() => setActiveTab("depachika")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "depachika"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4 inline mr-2" />
          Depachika Report
        </button>
      </div>

      {/* Management Report Tab */}
      {activeTab === "management" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Management Report</CardTitle>
              <Button onClick={exportManagementReport} className="bg-green-600 hover:bg-green-700">
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-stone-500 mb-6">
                Monthly sales breakdown with daily reports, service type analysis, and top sellers.
              </p>

              {/* Sales Summary Table */}
              <div className="mb-8">
                <h3 className="font-semibold text-lg mb-4">Sales Summary</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-stone-100">
                        <th className="border border-stone-200 px-4 py-2 text-left">Category</th>
                        <th className="border border-stone-200 px-4 py-2 text-right">Amount (AED)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-stone-200 px-4 py-2">Service Bookings</td>
                        <td className="border border-stone-200 px-4 py-2 text-right">{formatCurrency(salesData?.summary.serviceRevenue || 0)}</td>
                      </tr>
                      <tr>
                        <td className="border border-stone-200 px-4 py-2">Class Bookings</td>
                        <td className="border border-stone-200 px-4 py-2 text-right">{formatCurrency(salesData?.summary.classRevenue || 0)}</td>
                      </tr>
                      <tr>
                        <td className="border border-stone-200 px-4 py-2">Payment Links</td>
                        <td className="border border-stone-200 px-4 py-2 text-right">{formatCurrency(salesData?.summary.paymentLinkRevenue || 0)}</td>
                      </tr>
                      <tr className="bg-stone-50 font-bold">
                        <td className="border border-stone-200 px-4 py-2">TOTAL REVENUE</td>
                        <td className="border border-stone-200 px-4 py-2 text-right">{formatCurrency(salesData?.summary.totalRevenue || 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Daily Sales Table */}
              <div className="mb-8">
                <h3 className="font-semibold text-lg mb-4">Daily Sales Report</h3>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0">
                      <tr className="bg-stone-100">
                        <th className="border border-stone-200 px-4 py-2 text-left">Date</th>
                        <th className="border border-stone-200 px-4 py-2 text-right">Revenue (AED)</th>
                        <th className="border border-stone-200 px-4 py-2 text-right">Bookings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData?.dailyData?.map((day, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-stone-50"}>
                          <td className="border border-stone-200 px-4 py-2">{new Date(day.date).toLocaleDateString()}</td>
                          <td className="border border-stone-200 px-4 py-2 text-right">{formatCurrency(day.revenue)}</td>
                          <td className="border border-stone-200 px-4 py-2 text-right">{day.bookings}</td>
                        </tr>
                      ))}
                      {(!salesData?.dailyData || salesData.dailyData.length === 0) && (
                        <tr>
                          <td colSpan={3} className="border border-stone-200 px-4 py-8 text-center text-stone-500">
                            No daily data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top 10 Sellers */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Top 10 Best Sellers</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-stone-100">
                        <th className="border border-stone-200 px-4 py-2 text-center">Rank</th>
                        <th className="border border-stone-200 px-4 py-2 text-left">Item Name</th>
                        <th className="border border-stone-200 px-4 py-2 text-left">Service Type</th>
                        <th className="border border-stone-200 px-4 py-2 text-right">Orders</th>
                        <th className="border border-stone-200 px-4 py-2 text-right">Revenue (AED)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData?.bestSellers?.slice(0, 10).map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-stone-50"}>
                          <td className="border border-stone-200 px-4 py-2 text-center font-bold">#{idx + 1}</td>
                          <td className="border border-stone-200 px-4 py-2">{item.name}</td>
                          <td className="border border-stone-200 px-4 py-2">
                            <Badge className={serviceColors[item.type] || "bg-stone-100 text-stone-700"}>
                              {item.typeName}
                            </Badge>
                          </td>
                          <td className="border border-stone-200 px-4 py-2 text-right">{item.count}</td>
                          <td className="border border-stone-200 px-4 py-2 text-right">{formatCurrency(item.revenue)}</td>
                        </tr>
                      ))}
                      {(!salesData?.bestSellers || salesData.bestSellers.length === 0) && (
                        <tr>
                          <td colSpan={5} className="border border-stone-200 px-4 py-8 text-center text-stone-500">
                            No sales data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Depachika Report Tab */}
      {activeTab === "depachika" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Depachika Monthly Report</CardTitle>
              <Button onClick={exportDepachikaReport} className="bg-green-600 hover:bg-green-700">
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-stone-500 mb-4">
                Detailed booking list with event dates, customer names, pricing breakdown, and totals.
              </p>

              {/* Payment Status Filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { id: "all" as const, label: "All Bookings" },
                  { id: "completed" as const, label: "Completed / Paid" },
                  { id: "deposit_paid" as const, label: "Advance / Deposit Paid" },
                  { id: "pending" as const, label: "Pending" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setPaymentFilter(f.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      paymentFilter === f.id
                        ? "bg-stone-900 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0">
                    <tr className="bg-stone-100">
                      <th className="border border-stone-200 px-3 py-2 text-center">#</th>
                      <th className="border border-stone-200 px-3 py-2 text-left">Event Date</th>
                      <th className="border border-stone-200 px-3 py-2 text-left">Class Type</th>
                      <th className="border border-stone-200 px-3 py-2 text-left">Payment Date</th>
                      <th className="border border-stone-200 px-3 py-2 text-left">Customer Name</th>
                      <th className="border border-stone-200 px-3 py-2 text-right">Price/Person</th>
                      <th className="border border-stone-200 px-3 py-2 text-right">Attendees</th>
                      <th className="border border-stone-200 px-3 py-2 text-right">Total</th>
                      <th className="border border-stone-200 px-3 py-2 text-center">Source</th>
                      <th className="border border-stone-200 px-3 py-2 text-center">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredBookings = (salesData?.bookings || []).filter((b) => {
                        if (paymentFilter === "all") return true;
                        if (paymentFilter === "completed") return b.payment_status === "paid" || b.status === "completed";
                        if (paymentFilter === "deposit_paid") return b.payment_status === "deposit_paid" || b.is_deposit_payment;
                        if (paymentFilter === "pending") return b.payment_status === "pending" || b.payment_status === "deposit_pending";
                        return true;
                      });
                      
                      if (filteredBookings.length === 0) {
                        return (
                          <tr>
                            <td colSpan={12} className="border border-stone-200 px-4 py-8 text-center text-stone-500">
                              No booking data available for this filter
                            </td>
                          </tr>
                        );
                      }
                      
                      return filteredBookings.map((booking, idx) => (
                        <tr key={booking.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-stone-50"}>
                          <td className="border border-stone-200 px-3 py-2 text-center">{idx + 1}</td>
                          <td className="border border-stone-200 px-3 py-2">
                            {booking.event_date ? new Date(booking.event_date).toLocaleDateString() : "-"}
                          </td>
                          <td className="border border-stone-200 px-3 py-2">{booking.service_name || booking.service_type}</td>
                          <td className="border border-stone-200 px-3 py-2">
                            {booking.paid_at ? new Date(booking.paid_at).toLocaleDateString() : "-"}
                          </td>
                          <td className="border border-stone-200 px-3 py-2 font-medium">{booking.customer_name}</td>
                          <td className="border border-stone-200 px-3 py-2 text-right">
                            {booking.guest_count > 0 ? Math.round(booking.base_amount / booking.guest_count) : booking.base_amount}
                          </td>
                          <td className="border border-stone-200 px-3 py-2 text-right">{booking.guest_count}</td>
                          <td className="border border-stone-200 px-3 py-2 text-right font-bold">{booking.total_amount}</td>
                          <td className="border border-stone-200 px-3 py-2 text-center">
                            <Badge className={
                              (booking as any).booking_source === "website" ? "bg-blue-100 text-blue-700" :
                              (booking as any).booking_source === "admin" ? "bg-violet-100 text-violet-700" :
                              (booking as any).booking_source === "payment_link" ? "bg-amber-100 text-amber-700" :
                              "bg-stone-100 text-stone-600"
                            }>
                              {(booking as any).booking_source === "website" ? "Website" :
                               (booking as any).booking_source === "admin" ? (booking as any).created_by_name || "Admin" :
                               (booking as any).booking_source === "payment_link" ? "Payment Link" :
                               "Website"}
                            </Badge>
                          </td>
                          <td className="border border-stone-200 px-3 py-2 text-center">
                            <Badge className={
                              booking.payment_status === "paid" ? "bg-green-100 text-green-700" :
                              booking.payment_status === "deposit_paid" ? "bg-amber-100 text-amber-700" :
                              "bg-stone-100 text-stone-600"
                            }>
                              {booking.payment_status === "paid" ? "Paid" :
                               booking.payment_status === "deposit_paid" ? "Deposit" :
                               booking.payment_status === "deposit_pending" ? "Dep. Pending" :
                               booking.payment_status || "Pending"}
                            </Badge>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                  {salesData?.bookings && salesData.bookings.length > 0 && (
                    <tfoot>
                      <tr className="bg-stone-100 font-bold">
                        <td colSpan={7} className="border border-stone-200 px-3 py-2 text-right">TOTALS:</td>
                        <td className="border border-stone-200 px-3 py-2 text-right">
                          {formatCurrency(salesData.bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0))}
                        </td>
                        <td colSpan={2} className="border border-stone-200 px-3 py-2"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overview Tab (existing content) */}
      {activeTab === "overview" && (
        <>
          {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-500">Total Revenue</p>
                <p className="text-3xl font-bold text-stone-900 mt-1">
                  {formatCurrency(salesData?.summary.totalRevenue || 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-500">Total Bookings</p>
                <p className="text-3xl font-bold text-stone-900 mt-1">
                  {salesData?.summary.totalBookings || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-500">Total Guests</p>
                <p className="text-3xl font-bold text-stone-900 mt-1">
                  {salesData?.summary.totalGuests || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-500">Avg Order Value</p>
                <p className="text-3xl font-bold text-stone-900 mt-1">
                  {formatCurrency(
                    salesData?.summary.totalBookings
                      ? salesData.summary.totalRevenue / salesData.summary.totalBookings
                      : 0
                  )}
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Best Sellers */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Best Sellers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salesData?.bestSellers.slice(0, 5).map((item, idx) => {
                const Icon = serviceIcons[item.type] || Calendar;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-4 p-3 bg-stone-50 rounded-lg"
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-amber-100 text-amber-700 rounded-full font-bold text-sm">
                      #{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-900 truncate">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={serviceColors[item.type] || "bg-stone-100 text-stone-700"}>
                          <Icon className="h-3 w-3 mr-1" />
                          {item.typeName}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-stone-900">{item.count}</p>
                      <p className="text-xs text-stone-500">orders</p>
                    </div>
                  </div>
                );
              })}

              {(!salesData?.bestSellers || salesData.bestSellers.length === 0) && (
                <p className="text-stone-500 text-center py-4">
                  No sales data yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sales by Service Type */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales by Service Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {salesData?.serviceSales.map((service) => {
                const Icon = serviceIcons[service.type] || Calendar;
                return (
                  <div
                    key={service.type}
                    className="p-4 border border-stone-200 rounded-xl"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2 rounded-lg ${serviceColors[service.type] || "bg-stone-100"}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-stone-900">{service.name}</h4>
                        <p className="text-sm text-stone-500">
                          {service.count} bookings • {service.guests} guests
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-bold text-stone-900">
                        {formatCurrency(service.revenue)}
                      </span>
                    </div>

                    {service.items.length > 0 && (
                      <div className="space-y-2 pt-3 border-t border-stone-100">
                        <p className="text-xs text-stone-500 uppercase tracking-wide">
                          Top Packages/Items
                        </p>
                        {service.items.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-stone-600">{item.name}</span>
                            <span className="font-medium text-stone-900">
                              {item.count} ({formatCurrency(item.revenue)})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {(!salesData?.serviceSales || salesData.serviceSales.length === 0) && (
                <div className="col-span-2 text-center py-8 text-stone-500">
                  No service sales data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Daily Revenue Trend</span>
            {salesData?.dailyData && salesData.dailyData.length > 1 && (() => {
              const totalRevenue = salesData.dailyData.reduce((sum, d) => sum + d.revenue, 0);
              const firstHalf = salesData.dailyData.slice(0, Math.floor(salesData.dailyData.length / 2));
              const secondHalf = salesData.dailyData.slice(Math.floor(salesData.dailyData.length / 2));
              const firstHalfRevenue = firstHalf.reduce((sum, d) => sum + d.revenue, 0);
              const secondHalfRevenue = secondHalf.reduce((sum, d) => sum + d.revenue, 0);
              const percentChange = firstHalfRevenue > 0 ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue * 100) : 0;
              const isPositive = percentChange >= 0;
              return (
                <span className={`text-sm font-medium flex items-center gap-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
                  {isPositive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  {Math.abs(percentChange).toFixed(1)}% {isPositive ? "growth" : "decline"}
                </span>
              );
            })()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {salesData?.dailyData && salesData.dailyData.length > 0 ? (
            <div className="space-y-4">
              {/* Chart */}
              <div className="h-48 flex items-end gap-0.5 border-b border-l border-stone-200 relative">
                {/* Y-axis labels */}
                <div className="absolute -left-14 top-0 h-full flex flex-col justify-between text-xs text-stone-400">
                  <span>{formatCurrency(Math.max(...salesData.dailyData.map(d => d.revenue)))}</span>
                  <span>{formatCurrency(Math.max(...salesData.dailyData.map(d => d.revenue)) / 2)}</span>
                  <span>0</span>
                </div>
                {salesData.dailyData.map((day, idx) => {
                  const maxRevenue = Math.max(...salesData.dailyData.map((d) => d.revenue), 1);
                  const height = (day.revenue / maxRevenue) * 100;
                  const prevDay = idx > 0 ? salesData.dailyData[idx - 1] : null;
                  const percentChange = prevDay && prevDay.revenue > 0 
                    ? ((day.revenue - prevDay.revenue) / prevDay.revenue * 100) 
                    : 0;
                  const isPositive = percentChange >= 0;
                  
                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center justify-end group relative"
                    >
                      <div
                        className={`w-full rounded-t transition-all cursor-pointer ${
                          day.revenue > 0 
                            ? "bg-gradient-to-t from-stone-700 to-stone-500 hover:from-stone-600 hover:to-stone-400" 
                            : "bg-stone-200"
                        }`}
                        style={{ height: `${Math.max(height, 2)}%`, minHeight: "2px" }}
                      >
                        {/* Tooltip */}
                        <div className="absolute -top-24 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-lg">
                          <p className="font-semibold">{formatDate(day.date)}</p>
                          <p className="text-stone-300">{formatCurrency(day.revenue)}</p>
                          <p className="text-stone-300">{day.bookings} orders</p>
                          {prevDay && (
                            <p className={`flex items-center gap-1 ${isPositive ? "text-green-400" : "text-red-400"}`}>
                              {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                              {Math.abs(percentChange).toFixed(0)}% vs prev day
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* X-axis labels */}
              <div className="flex justify-between text-xs text-stone-400 px-1">
                {salesData.dailyData.filter((_, idx) => 
                  idx === 0 || 
                  idx === salesData.dailyData.length - 1 || 
                  idx % Math.ceil(salesData.dailyData.length / 6) === 0
                ).map((day) => (
                  <span key={day.date}>{formatDate(day.date)}</span>
                ))}
              </div>
              {/* Summary stats */}
              <div className="grid grid-cols-1 gap-4 border-t border-stone-100 pt-4 sm:grid-cols-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-stone-900">
                    {formatCurrency(salesData.dailyData.reduce((sum, d) => sum + d.revenue, 0))}
                  </p>
                  <p className="text-xs text-stone-500">Total Revenue</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-stone-900">
                    {formatCurrency(salesData.dailyData.reduce((sum, d) => sum + d.revenue, 0) / salesData.dailyData.length)}
                  </p>
                  <p className="text-xs text-stone-500">Daily Average</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-stone-900">
                    {salesData.dailyData.reduce((sum, d) => sum + d.bookings, 0)}
                  </p>
                  <p className="text-xs text-stone-500">Total Orders</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-stone-500">
              No daily data available for this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-4 bg-stone-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-stone-500" />
                <span className="text-sm text-stone-500">Service Bookings</span>
              </div>
              <p className="text-2xl font-bold text-stone-900">
                {formatCurrency(salesData?.summary.serviceRevenue || 0)}
              </p>
              <p className="text-sm text-stone-500">
                {salesData?.summary.serviceBookings || 0} bookings
              </p>
            </div>
            
            <div className="p-4 bg-stone-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <ChefHat className="h-4 w-4 text-stone-500" />
                <span className="text-sm text-stone-500">Class Bookings</span>
              </div>
              <p className="text-2xl font-bold text-stone-900">
                {formatCurrency(salesData?.summary.classRevenue || 0)}
              </p>
              <p className="text-sm text-stone-500">
                {salesData?.summary.classBookings || 0} bookings
              </p>
            </div>
            
            <div className="p-4 bg-stone-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-stone-500" />
                <span className="text-sm text-stone-500">Payment Links</span>
              </div>
              <p className="text-2xl font-bold text-stone-900">
                {formatCurrency(salesData?.summary.paymentLinkRevenue || 0)}
              </p>
              <p className="text-sm text-stone-500">
                {salesData?.summary.paymentLinks || 0} payments
              </p>
            </div>

            <div className="p-4 bg-stone-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="h-4 w-4 text-stone-500" />
                <span className="text-sm text-stone-500">Vouchers/Gift Cards</span>
              </div>
              <p className="text-2xl font-bold text-stone-900">
                {formatCurrency(salesData?.summary.voucherRevenue || 0)}
              </p>
              <p className="text-sm text-stone-500">
                {salesData?.summary.voucherPurchases || 0} purchases
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
