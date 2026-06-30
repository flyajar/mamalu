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
  dailyReport: {
    period: { from: string; to: string; timeZone: string };
    summary: {
      actualSales: number;
      projectedBookings: number;
      productSales: number;
      totalGuests: number;
      bookingCount: number;
      productOrderCount: number;
    };
    bookings: DailyReportBooking[];
    productOrders: DailyReportProductOrder[];
    dailyTotals: DailyReportTotal[];
  };
  financeDailyReport: {
    period: { from: string; to: string; timeZone: string };
    summary: SalesData["dailyReport"]["summary"];
    bookings: DailyReportBooking[];
    productOrders: DailyReportProductOrder[];
    dailyTotals: DailyReportTotal[];
    creditNotes: FinanceCreditNote[];
  };
  monthlyTargetReport: {
    period: { from: string; to: string; timeZone: string };
    bookings: MonthlyTargetBooking[];
    productOrders: DailyReportProductOrder[];
    monthlyTotals: MonthlyTargetTotal[];
  };
  analytics: SalesAnalytics;
}

interface DailyReportBooking {
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
}

interface DailyReportProductOrder {
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
}

interface DailyReportTotal {
  date: string;
  actualBookingRevenue: number;
  projectedBookingValue: number;
  productRevenue: number;
  guests: number;
  bookings: number;
  orders: number;
  combinedActualSales: number;
}

interface FinanceCreditNote {
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
}

interface MonthlyTargetBooking {
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
}

interface MonthlyTargetTotal {
  month: string;
  bookingValue: number;
  amountCollected: number;
  productSales: number;
  totalSales: number;
  guests: number;
  bookings: number;
  productOrders: number;
  partialBookings: number;
  paidBookings: number;
  completedBookings: number;
}

interface SalesAnalytics {
  summary: {
    grossSales: number;
    completedBookingRevenue: number;
    projectedBookingRevenue: number;
    productRevenue: number;
    amountCollected: number;
    outstandingBalance: number;
    averageTransactionValue: number;
    averageBookingValue: number;
    averageProductOrderValue: number;
    completedBookings: number;
    confirmedBookings: number;
    productOrders: number;
    totalGuests: number;
    averageGuestsPerBooking: number;
    unitsSold: number;
    uniqueCustomers: number;
    repeatCustomerRate: number;
    bookingCompletionRate: number;
    shippingRevenue: number;
  };
  revenueMix: Array<{ name: string; value: number }>;
  bookingMix: Array<{ name: string; value: number }>;
  fulfillment: Array<{ name: string; value: number }>;
  topServices: Array<{ name: string; count: number; revenue: number }>;
  topProducts: Array<{ name: string; count: number; revenue: number }>;
  trend: Array<{
    date: string;
    sales: number;
    bookingRevenue: number;
    productRevenue: number;
    transactions: number;
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
  const currentDubaiMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
  }).format(new Date()).slice(0, 7);
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("week");
  const [activeTab, setActiveTab] = useState<"overview" | "management" | "finance-daily" | "monthly-sales" | "finance-monthly" | "monthly-target" | "analytics" | "depachika">("management");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "completed" | "deposit_paid" | "pending">("all");
  const [error, setError] = useState("");
  const [monthlyTargetMonth, setMonthlyTargetMonth] = useState(currentDubaiMonth);
  const [monthlyTargetData, setMonthlyTargetData] = useState<SalesData["monthlyTargetReport"] | null>(null);
  const [monthlyTargetLoading, setMonthlyTargetLoading] = useState(false);
  const [monthlyTargetError, setMonthlyTargetError] = useState("");
  const [monthlySalesMonth, setMonthlySalesMonth] = useState(currentDubaiMonth);
  const [monthlySalesData, setMonthlySalesData] = useState<SalesData["dailyReport"] | null>(null);
  const [monthlySalesLoading, setMonthlySalesLoading] = useState(false);
  const [monthlySalesError, setMonthlySalesError] = useState("");
  const [financeMonthlyMonth, setFinanceMonthlyMonth] = useState(currentDubaiMonth);
  const [financeMonthlyData, setFinanceMonthlyData] = useState<SalesData["financeDailyReport"] | null>(null);
  const [financeMonthlyLoading, setFinanceMonthlyLoading] = useState(false);
  const [financeMonthlyError, setFinanceMonthlyError] = useState("");

  useEffect(() => {
    fetchSalesData();
  }, [period]);

  useEffect(() => {
    if (activeTab !== "monthly-target") return;

    const fetchMonthlyTargetData = async () => {
      const [year, month] = monthlyTargetMonth.split("-").map(Number);
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const start = `${monthlyTargetMonth}-01`;
      const end = `${monthlyTargetMonth}-${String(lastDay).padStart(2, "0")}`;

      try {
        setMonthlyTargetLoading(true);
        setMonthlyTargetError("");
        const response = await fetch(`/api/admin/sales-report?start_date=${start}&end_date=${end}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load monthly target report");
        setMonthlyTargetData(data.monthlyTargetReport);
      } catch (fetchError) {
        setMonthlyTargetError(fetchError instanceof Error ? fetchError.message : "Failed to load monthly target report");
      } finally {
        setMonthlyTargetLoading(false);
      }
    };

    fetchMonthlyTargetData();
  }, [activeTab, monthlyTargetMonth]);

  useEffect(() => {
    if (activeTab !== "monthly-sales") return;

    const fetchMonthlySalesData = async () => {
      const [year, month] = monthlySalesMonth.split("-").map(Number);
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const start = `${monthlySalesMonth}-01`;
      const end = `${monthlySalesMonth}-${String(lastDay).padStart(2, "0")}`;

      try {
        setMonthlySalesLoading(true);
        setMonthlySalesError("");
        const response = await fetch(`/api/admin/sales-report?start_date=${start}&end_date=${end}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load monthly sales report");
        setMonthlySalesData(data.dailyReport);
      } catch (fetchError) {
        setMonthlySalesError(fetchError instanceof Error ? fetchError.message : "Failed to load monthly sales report");
      } finally {
        setMonthlySalesLoading(false);
      }
    };

    fetchMonthlySalesData();
  }, [activeTab, monthlySalesMonth]);

  useEffect(() => {
    if (activeTab !== "finance-monthly") return;

    const fetchFinanceMonthlyData = async () => {
      const [year, month] = financeMonthlyMonth.split("-").map(Number);
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const start = `${financeMonthlyMonth}-01`;
      const end = `${financeMonthlyMonth}-${String(lastDay).padStart(2, "0")}`;

      try {
        setFinanceMonthlyLoading(true);
        setFinanceMonthlyError("");
        const response = await fetch(`/api/admin/sales-report?start_date=${start}&end_date=${end}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load finance monthly report");
        setFinanceMonthlyData(data.financeDailyReport);
      } catch (fetchError) {
        setFinanceMonthlyError(fetchError instanceof Error ? fetchError.message : "Failed to load finance monthly report");
      } finally {
        setFinanceMonthlyLoading(false);
      }
    };

    fetchFinanceMonthlyData();
  }, [activeTab, financeMonthlyMonth]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      setError("");
      let url = `/api/admin/sales-report?period=${period}`;
      if (startDate && endDate) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sales report");
      setSalesData(data);
    } catch (error) {
      console.error("Failed to fetch sales data:", error);
      setError(error instanceof Error ? error.message : "Failed to load sales report");
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

  const formatPaymentDate = (dateStr: string | null) => {
    return dateStr ? new Date(dateStr).toLocaleDateString() : "-";
  };

  const renderDateFilters = () => (
    <div className="flex flex-wrap items-end gap-3 rounded-lg bg-stone-50 p-4 xl:flex-nowrap">
      <Button
        variant={period === "today" ? "default" : "outline"}
        size="sm"
        className="h-10"
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
        onChange={(event) => {
          setPeriod(event.target.value);
          setStartDate("");
          setEndDate("");
        }}
        className="h-10 rounded-lg border border-stone-200 bg-white px-4"
      >
        <option value="week">This Week</option>
        <option value="month">This Month</option>
        <option value="quarter">Last 3 Months</option>
        <option value="year">Last Year</option>
      </select>
      <label className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-stone-600">
        From
        <input
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          className="h-10 rounded-lg border bg-white px-3 text-sm"
        />
      </label>
      <label className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-stone-600">
        To
        <input
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          className="h-10 rounded-lg border bg-white px-3 text-sm"
        />
      </label>
      <Button className="h-10 whitespace-nowrap" onClick={fetchWithDateRange} disabled={!startDate || !endDate}>
        Apply Date Range
      </Button>
      {(startDate || endDate) && (
        <Button className="h-10" variant="ghost" onClick={() => { setStartDate(""); setEndDate(""); setPeriod("week"); }}>
          Clear
        </Button>
      )}
      <Button className="h-10 xl:ml-auto" variant="outline" onClick={fetchSalesData}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Refresh
      </Button>
    </div>
  );

  const exportManagementReport = () => {
    if (!salesData?.dailyReport) return;

    const wb = XLSX.utils.book_new();
    const report = salesData.dailyReport;
    const summaryData = [
      ["MAMALU KITCHEN - MANAGEMENT DAILY REPORT"],
      [`Dubai business dates: ${report.period.from} to ${report.period.to}`],
      [],
      ["Metric", "Value"],
      ["Actual Sales", report.summary.actualSales],
      ["Projected Bookings", report.summary.projectedBookings],
      ["Product Sales", report.summary.productSales],
      ["Total Guests", report.summary.totalGuests],
      ["Booking Count", report.summary.bookingCount],
      ["Product Order Count", report.summary.productOrderCount],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    const bookingData = [
      ["Date", "Payment Date", "Time", "Booking Number", "Invoice #", "Customer", "Email", "Type", "Service/Class", "Booked Items", "Status", "Payment Status", "Guests", "Allocated Amount", "Amount Collected", "Outstanding"],
      ...report.bookings.map((booking) => [
        booking.date, formatPaymentDate(booking.paidAt), booking.time || "", booking.bookingNumber, booking.invoiceNumber, booking.customerName,
        booking.customerEmail, booking.bookingType, booking.serviceType,
        booking.bookedItems.map((item) => `${item.name} x${item.quantity}`).join(", "),
        booking.status, booking.paymentStatus, booking.guests, booking.allocatedAmount,
        booking.amountCollected, booking.outstandingBalance,
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bookingData), "Bookings");

    const orderData = [
      ["Paid Date", "Paid Time (Dubai)", "Order Number", "Invoice #", "Customer", "Email", "Products", "Subtotal", "Shipping", "Total Paid", "Fulfillment Status"],
      ...report.productOrders.map((order) => [
        order.date,
        new Date(order.paidAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Dubai", hour: "2-digit", minute: "2-digit" }),
        order.orderNumber, order.invoiceNumber, order.customerName, order.customerEmail,
        order.products.map((item) => `${item.name} x${item.quantity}`).join(", "),
        order.subtotal, order.shipping, order.totalPaid, order.fulfillmentStatus,
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(orderData), "Product Orders");

    const totalsData = [
      ["Date", "Actual Booking Revenue", "Projected Booking Value", "Product Revenue", "Combined Actual Sales", "Guests", "Bookings", "Orders"],
      ...report.dailyTotals.map((day) => [
        day.date, day.actualBookingRevenue, day.projectedBookingValue, day.productRevenue,
        day.combinedActualSales, day.guests, day.bookings, day.orders,
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(totalsData), "Daily Totals");

    XLSX.writeFile(wb, `Management-Daily-Report-${report.period.from}-to-${report.period.to}.xlsx`);
  };

  const appendTaxCreditNoteSheet = (wb: XLSX.WorkBook, creditNotes: FinanceCreditNote[] = []) => {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Created Date", "Created Time (Dubai)", "Tax Credit Note #", "Source Type", "Source Reference", "Original Invoice #", "Customer", "Email", "Subtotal", "VAT", "Total Credit"],
      ...creditNotes.map((note) => [
        note.createdDate,
        new Date(note.createdAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Dubai", hour: "2-digit", minute: "2-digit" }),
        note.creditNoteNumber,
        note.sourceType,
        note.sourceReference,
        note.originalInvoiceNumber,
        note.customerName,
        note.customerEmail,
        note.subtotalAmount,
        note.vatAmount,
        note.totalCreditAmount,
      ]),
    ]), "Tax Credit Note");
  };

  const exportFinanceReport = (
    report: SalesData["financeDailyReport"],
    fileName: string,
    title: string,
  ) => {
    const wb = XLSX.utils.book_new();
    const bookingSales = report.bookings.reduce((sum, booking) => sum + booking.amountCollected, 0);
    const productSales = report.productOrders.reduce((sum, order) => sum + order.totalPaid, 0);

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      [title],
      [`Dubai payment dates: ${report.period.from} to ${report.period.to}`],
      [],
      ["Metric", "Value"],
      ["Booking Payments / Deposits", bookingSales],
      ["Product Sales", productSales],
      ["Total Collected", bookingSales + productSales],
      ["Paid / Deposit Bookings", report.bookings.length],
      ["Product Orders", report.productOrders.length],
      ["Guests", report.bookings.reduce((sum, booking) => sum + booking.guests, 0)],
      ["Tax Credit Notes", report.creditNotes.length],
      ["Tax Credit Total", report.creditNotes.reduce((sum, note) => sum + note.totalCreditAmount, 0)],
    ]), "Summary");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Payment Date", "Payment Time (Dubai)", "Booking Number", "Invoice #", "Customer", "Email", "Type", "Service/Class", "Booked Items", "Status", "Payment Status", "Guests", "Booking Value", "Amount Collected", "Outstanding"],
      ...report.bookings.map((booking) => [
        booking.date,
        booking.paidAt ? new Date(booking.paidAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Dubai", hour: "2-digit", minute: "2-digit" }) : "",
        booking.bookingNumber,
        booking.invoiceNumber,
        booking.customerName,
        booking.customerEmail,
        booking.bookingType,
        booking.serviceType,
        booking.bookedItems.map((item) => `${item.name} x${item.quantity}`).join(", "),
        booking.status,
        booking.paymentStatus,
        booking.guests,
        booking.allocatedAmount,
        booking.amountCollected,
        booking.outstandingBalance,
      ]),
    ]), "Bookings");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Paid Date", "Paid Time (Dubai)", "Order Number", "Invoice #", "Customer", "Email", "Products", "Subtotal", "Shipping", "Total Paid", "Fulfillment Status"],
      ...report.productOrders.map((order) => [
        order.date,
        new Date(order.paidAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Dubai", hour: "2-digit", minute: "2-digit" }),
        order.orderNumber,
        order.invoiceNumber,
        order.customerName,
        order.customerEmail,
        order.products.map((item) => `${item.name} x${item.quantity}`).join(", "),
        order.subtotal,
        order.shipping,
        order.totalPaid,
        order.fulfillmentStatus,
      ]),
    ]), "Product Orders");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Date", "Booking Payments / Deposits", "Product Revenue", "Combined Collected", "Guests", "Bookings", "Orders"],
      ...report.dailyTotals.map((day) => [
        day.date,
        day.actualBookingRevenue,
        day.productRevenue,
        day.combinedActualSales,
        day.guests,
        day.bookings,
        day.orders,
      ]),
    ]), "Daily Totals");

    appendTaxCreditNoteSheet(wb, report.creditNotes);
    XLSX.writeFile(wb, fileName);
  };

  const exportFinanceDailyReport = () => {
    if (!salesData?.financeDailyReport) return;
    const report = salesData.financeDailyReport;
    exportFinanceReport(
      report,
      `Finance-Daily-Report-${report.period.from}-to-${report.period.to}.xlsx`,
      "MAMALU KITCHEN - FINANCE DAILY REPORT",
    );
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

  const exportMonthlyTargetReport = () => {
    if (!monthlyTargetData) return;
    const report = monthlyTargetData;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Month", "Booking Value", "Amount Collected", "Product Sales", "Total Sales", "Guests", "Bookings", "Product Orders", "Partial", "Paid", "Completed"],
      ...report.monthlyTotals.map((month) => [
        month.month, month.bookingValue, month.amountCollected, month.productSales,
        month.totalSales, month.guests, month.bookings, month.productOrders,
        month.partialBookings, month.paidBookings, month.completedBookings,
      ]),
    ]), "Monthly Totals");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Created Date", "Created Time (Dubai)", "Booking Number", "Customer", "Type", "Service/Class", "Status", "Guests", "Booking Value", "Amount Collected"],
      ...report.bookings.map((booking) => [
        booking.createdDate,
        new Date(booking.createdAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Dubai", hour: "2-digit", minute: "2-digit" }),
        booking.bookingNumber, booking.customerName, booking.bookingType,
        booking.serviceType, booking.status, booking.guests,
        booking.bookingValue, booking.amountCollected,
      ]),
    ]), "Bookings");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Paid Date", "Order Number", "Customer", "Products", "Subtotal", "Shipping", "Total Paid", "Fulfillment"],
      ...report.productOrders.map((order) => [
        order.date, order.orderNumber, order.customerName,
        order.products.map((item) => `${item.name} x${item.quantity}`).join(", "),
        order.subtotal, order.shipping, order.totalPaid, order.fulfillmentStatus,
      ]),
    ]), "Product Sales");
    XLSX.writeFile(wb, `Monthly-Target-Report-${report.period.from}-to-${report.period.to}.xlsx`);
  };

  const exportMonthlySalesReport = () => {
    if (!monthlySalesData) return;
    const completedBookings = monthlySalesData.bookings.filter((booking) => booking.status === "completed");
    const wb = XLSX.utils.book_new();
    const bookingSales = completedBookings.reduce((sum, booking) => sum + booking.allocatedAmount, 0);
    const productSales = monthlySalesData.productOrders.reduce((sum, order) => sum + order.totalPaid, 0);

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["MAMALU KITCHEN - MONTHLY SALES REPORT"],
      [`Dubai business dates: ${monthlySalesData.period.from} to ${monthlySalesData.period.to}`],
      [],
      ["Metric", "Value"],
      ["Completed Booking Sales", bookingSales],
      ["Product Sales", productSales],
      ["Total Sales", bookingSales + productSales],
      ["Completed Bookings", completedBookings.length],
      ["Product Orders", monthlySalesData.productOrders.length],
      ["Guests", completedBookings.reduce((sum, booking) => sum + booking.guests, 0)],
    ]), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Date", "Time", "Booking Number", "Invoice #", "Customer", "Type", "Service/Class", "Booked Items", "Guests", "Amount"],
      ...completedBookings.map((booking) => [
        booking.date, booking.time || "", booking.bookingNumber, booking.invoiceNumber, booking.customerName,
        booking.bookingType, booking.serviceType,
        booking.bookedItems.map((item) => `${item.name} x${item.quantity}`).join(", "),
        booking.guests, booking.allocatedAmount,
      ]),
    ]), "Completed Bookings");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Paid Date", "Order Number", "Invoice #", "Customer", "Products", "Subtotal", "Shipping", "Total Paid", "Fulfillment"],
      ...monthlySalesData.productOrders.map((order) => [
        order.date, order.orderNumber, order.invoiceNumber, order.customerName,
        order.products.map((item) => `${item.name} x${item.quantity}`).join(", "),
        order.subtotal, order.shipping, order.totalPaid, order.fulfillmentStatus,
      ]),
    ]), "Product Orders");
    XLSX.writeFile(wb, `Monthly-Sales-Report-${monthlySalesMonth}.xlsx`);
  };

  const exportFinanceMonthlyReport = () => {
    if (!financeMonthlyData) return;
    exportFinanceReport(
      financeMonthlyData,
      `Finance-Monthly-Report-${financeMonthlyMonth}.xlsx`,
      "MAMALU KITCHEN - FINANCE MONTHLY REPORT",
    );
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
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("management")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "management"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <ClipboardList className="h-4 w-4 inline mr-2" />
          Management Daily Report
        </button>
        <button
          onClick={() => setActiveTab("finance-daily")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "finance-daily"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <DollarSign className="h-4 w-4 inline mr-2" />
          Finance Daily Report
        </button>
        <button
          onClick={() => setActiveTab("monthly-sales")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "monthly-sales"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <Calendar className="h-4 w-4 inline mr-2" />
          Monthly Sales Report
        </button>
        <button
          onClick={() => setActiveTab("finance-monthly")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "finance-monthly"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4 inline mr-2" />
          Finance Monthly Report
        </button>
        <button
          onClick={() => setActiveTab("monthly-target")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "monthly-target"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <TrendingUp className="h-4 w-4 inline mr-2" />
          Monthly Target Report
        </button>
      </div>

      {/* Management Daily Report Tab */}
      {activeTab === "management" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-stone-900">Management Daily Report</h2>
              <p className="text-sm text-stone-500">Dubai business dates. Completed bookings are actual; confirmed bookings are projected.</p>
            </div>
            <Button onClick={exportManagementReport} className="bg-green-600 hover:bg-green-700" disabled={!salesData?.dailyReport}>
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
          {renderDateFilters()}

          {error ? (
            <Card><CardContent className="py-10 text-center text-red-600">{error}</CardContent></Card>
          ) : salesData?.dailyReport ? (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                {[
                  ["Actual Sales", formatCurrency(salesData.dailyReport.summary.actualSales)],
                  ["Projected Bookings", formatCurrency(salesData.dailyReport.summary.projectedBookings)],
                  ["Product Sales", formatCurrency(salesData.dailyReport.summary.productSales)],
                  ["Total Guests", salesData.dailyReport.summary.totalGuests],
                  ["Bookings", salesData.dailyReport.summary.bookingCount],
                  ["Product Orders", salesData.dailyReport.summary.productOrderCount],
                ].map(([label, value]) => (
                  <Card key={label}><CardContent className="p-4"><p className="text-xs text-stone-500">{label}</p><p className="mt-1 text-xl font-bold text-stone-900">{value}</p></CardContent></Card>
                ))}
              </div>

              {salesData.dailyReport.dailyTotals.map((day) => {
                const dayBookings = salesData.dailyReport.bookings.filter((booking) => booking.date === day.date);
                const dayOrders = salesData.dailyReport.productOrders.filter((order) => order.date === day.date);
                return (
                  <Card key={day.date}>
                    <CardHeader>
                      <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span>{new Date(`${day.date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                        <span className="text-sm font-normal text-stone-500">Actual {formatCurrency(day.combinedActualSales)} · Projected {formatCurrency(day.projectedBookingValue)}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h3 className="mb-3 font-semibold">Bookings</h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-[1200px] w-full text-sm">
                            <thead><tr className="bg-stone-100 text-left">
                              {["Time", "Booking #", "Invoice #", "Customer", "Type", "Booked Items", "Status", "Payment", "Payment Date", "Guests", "Allocated", "Collected", "Outstanding"].map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}
                            </tr></thead>
                            <tbody>
                              {dayBookings.map((booking) => (
                                <tr key={booking.id} className="border-b border-stone-100">
                                  <td className="px-3 py-3">{booking.time || "-"}</td><td className="px-3 py-3 font-medium">{booking.bookingNumber}</td><td className="px-3 py-3">{booking.invoiceNumber || "-"}</td>
                                  <td className="px-3 py-3"><div>{booking.customerName}</div><div className="text-xs text-stone-400">{booking.customerEmail}</div></td>
                                  <td className="px-3 py-3">{booking.serviceType}</td>
                                  <td className="px-3 py-3">{booking.bookedItems.map((item) => `${item.name} x${item.quantity}`).join(", ")}</td>
                                  <td className="px-3 py-3"><Badge className={booking.status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>{booking.status}</Badge></td>
                                  <td className="px-3 py-3">{booking.paymentStatus}</td><td className="px-3 py-3">{formatPaymentDate(booking.paidAt)}</td><td className="px-3 py-3 text-right">{booking.guests}</td>
                                  <td className="px-3 py-3 text-right">{formatCurrency(booking.allocatedAmount)}</td><td className="px-3 py-3 text-right">{formatCurrency(booking.amountCollected)}</td><td className="px-3 py-3 text-right">{formatCurrency(booking.outstandingBalance)}</td>
                                </tr>
                              ))}
                              {dayBookings.length === 0 && <tr><td colSpan={13} className="px-3 py-8 text-center text-stone-500">No bookings scheduled for this day.</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div>
                        <h3 className="mb-3 font-semibold">Product Orders</h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-[900px] w-full text-sm">
                            <thead><tr className="bg-stone-100 text-left">
                              {["Paid Time", "Order #", "Invoice #", "Customer", "Products", "Subtotal", "Shipping", "Total Paid", "Fulfillment"].map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}
                            </tr></thead>
                            <tbody>
                              {dayOrders.map((order) => (
                                <tr key={order.id} className="border-b border-stone-100">
                                  <td className="px-3 py-3">{new Date(order.paidAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Dubai", hour: "2-digit", minute: "2-digit" })}</td>
                                  <td className="px-3 py-3 font-medium">{order.orderNumber}</td><td className="px-3 py-3">{order.invoiceNumber || "-"}</td><td className="px-3 py-3"><div>{order.customerName}</div><div className="text-xs text-stone-400">{order.customerEmail}</div></td>
                                  <td className="px-3 py-3">{order.products.map((item) => `${item.name} x${item.quantity}`).join(", ")}</td>
                                  <td className="px-3 py-3 text-right">{formatCurrency(order.subtotal)}</td><td className="px-3 py-3 text-right">{formatCurrency(order.shipping)}</td><td className="px-3 py-3 text-right font-medium">{formatCurrency(order.totalPaid)}</td><td className="px-3 py-3">{order.fulfillmentStatus}</td>
                                </tr>
                              ))}
                              {dayOrders.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-stone-500">No paid product orders for this day.</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          ) : (
            <Card><CardContent className="py-10 text-center text-stone-500">No report data available.</CardContent></Card>
          )}
        </div>
      )}

      {/* Finance Daily Report Tab */}
      {activeTab === "finance-daily" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-stone-900">Finance Daily Report</h2>
              <p className="text-sm text-stone-500">Dubai payment dates. Includes bookings with paid/deposit collection and paid product orders.</p>
            </div>
            <Button onClick={exportFinanceDailyReport} className="bg-green-600 hover:bg-green-700" disabled={!salesData?.financeDailyReport}>
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
          {renderDateFilters()}

          {error ? (
            <Card><CardContent className="py-10 text-center text-red-600">{error}</CardContent></Card>
          ) : salesData?.financeDailyReport ? (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                {[
                  ["Total Collected", formatCurrency(salesData.financeDailyReport.summary.actualSales)],
                  ["Booking Payments", formatCurrency(salesData.financeDailyReport.summary.projectedBookings)],
                  ["Product Sales", formatCurrency(salesData.financeDailyReport.summary.productSales)],
                  ["Total Guests", salesData.financeDailyReport.summary.totalGuests],
                  ["Bookings", salesData.financeDailyReport.summary.bookingCount],
                  ["Tax Credit Notes", salesData.financeDailyReport.creditNotes.length],
                ].map(([label, value]) => (
                  <Card key={label}><CardContent className="p-4"><p className="text-xs text-stone-500">{label}</p><p className="mt-1 text-xl font-bold text-stone-900">{value}</p></CardContent></Card>
                ))}
              </div>

              {salesData.financeDailyReport.dailyTotals.map((day) => {
                const dayBookings = salesData.financeDailyReport.bookings.filter((booking) => booking.date === day.date);
                const dayOrders = salesData.financeDailyReport.productOrders.filter((order) => order.date === day.date);
                const dayCreditNotes = salesData.financeDailyReport.creditNotes.filter((note) => note.createdDate === day.date);
                return (
                  <Card key={day.date}>
                    <CardHeader>
                      <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span>{new Date(`${day.date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                        <span className="text-sm font-normal text-stone-500">Collected {formatCurrency(day.combinedActualSales)}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h3 className="mb-3 font-semibold">Bookings</h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-[1200px] w-full text-sm">
                            <thead><tr className="bg-stone-100 text-left">
                              {["Payment Date", "Booking #", "Invoice #", "Customer", "Type", "Booked Items", "Status", "Payment", "Guests", "Value", "Collected", "Outstanding"].map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}
                            </tr></thead>
                            <tbody>
                              {dayBookings.map((booking) => (
                                <tr key={booking.id} className="border-b border-stone-100">
                                  <td className="px-3 py-3">{formatPaymentDate(booking.paidAt) || booking.date}</td><td className="px-3 py-3 font-medium">{booking.bookingNumber}</td><td className="px-3 py-3">{booking.invoiceNumber || "-"}</td>
                                  <td className="px-3 py-3"><div>{booking.customerName}</div><div className="text-xs text-stone-400">{booking.customerEmail}</div></td>
                                  <td className="px-3 py-3">{booking.serviceType}</td>
                                  <td className="px-3 py-3">{booking.bookedItems.map((item) => `${item.name} x${item.quantity}`).join(", ")}</td>
                                  <td className="px-3 py-3"><Badge className={booking.status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>{booking.status}</Badge></td>
                                  <td className="px-3 py-3">{booking.paymentStatus}</td><td className="px-3 py-3 text-right">{booking.guests}</td>
                                  <td className="px-3 py-3 text-right">{formatCurrency(booking.allocatedAmount)}</td><td className="px-3 py-3 text-right">{formatCurrency(booking.amountCollected)}</td><td className="px-3 py-3 text-right">{formatCurrency(booking.outstandingBalance)}</td>
                                </tr>
                              ))}
                              {dayBookings.length === 0 && <tr><td colSpan={12} className="px-3 py-8 text-center text-stone-500">No booking payments or deposits for this day.</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div>
                        <h3 className="mb-3 font-semibold">Product Orders</h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-[900px] w-full text-sm">
                            <thead><tr className="bg-stone-100 text-left">
                              {["Paid Time", "Order #", "Invoice #", "Customer", "Products", "Subtotal", "Shipping", "Total Paid", "Fulfillment"].map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}
                            </tr></thead>
                            <tbody>
                              {dayOrders.map((order) => (
                                <tr key={order.id} className="border-b border-stone-100">
                                  <td className="px-3 py-3">{new Date(order.paidAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Dubai", hour: "2-digit", minute: "2-digit" })}</td>
                                  <td className="px-3 py-3 font-medium">{order.orderNumber}</td><td className="px-3 py-3">{order.invoiceNumber || "-"}</td><td className="px-3 py-3">{order.customerName}</td>
                                  <td className="px-3 py-3">{order.products.map((item) => `${item.name} x${item.quantity}`).join(", ")}</td>
                                  <td className="px-3 py-3 text-right">{formatCurrency(order.subtotal)}</td><td className="px-3 py-3 text-right">{formatCurrency(order.shipping)}</td><td className="px-3 py-3 text-right font-medium">{formatCurrency(order.totalPaid)}</td><td className="px-3 py-3">{order.fulfillmentStatus}</td>
                                </tr>
                              ))}
                              {dayOrders.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-stone-500">No paid product orders for this day.</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div>
                        <h3 className="mb-3 font-semibold">Tax Credit Note</h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-[900px] w-full text-sm">
                            <thead><tr className="bg-stone-100 text-left">
                              {["Credit Note #", "Source", "Reference", "Invoice #", "Customer", "Subtotal", "VAT", "Total Credit"].map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}
                            </tr></thead>
                            <tbody>
                              {dayCreditNotes.map((note) => (
                                <tr key={note.id} className="border-b border-stone-100">
                                  <td className="px-3 py-3 font-medium">{note.creditNoteNumber}</td><td className="px-3 py-3">{note.sourceType}</td><td className="px-3 py-3">{note.sourceReference}</td><td className="px-3 py-3">{note.originalInvoiceNumber || "-"}</td>
                                  <td className="px-3 py-3"><div>{note.customerName}</div><div className="text-xs text-stone-400">{note.customerEmail}</div></td>
                                  <td className="px-3 py-3 text-right">{formatCurrency(note.subtotalAmount)}</td><td className="px-3 py-3 text-right">{formatCurrency(note.vatAmount)}</td><td className="px-3 py-3 text-right font-medium">{formatCurrency(note.totalCreditAmount)}</td>
                                </tr>
                              ))}
                              {dayCreditNotes.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-stone-500">No tax credit notes for this day.</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          ) : (
            <Card><CardContent className="py-10 text-center text-stone-500">No finance report data available.</CardContent></Card>
          )}
        </div>
      )}

      {/* Monthly Sales Report Tab */}
      {activeTab === "monthly-sales" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-stone-900">Monthly Sales Report</h2>
              <p className="text-sm text-stone-500">Completed bookings and paid product orders for the selected Dubai calendar month.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-sm font-medium text-stone-600">
                Month
                <input
                  type="month"
                  value={monthlySalesMonth}
                  onChange={(event) => setMonthlySalesMonth(event.target.value)}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-stone-900"
                />
              </label>
              <Button onClick={exportMonthlySalesReport} className="bg-green-600 hover:bg-green-700" disabled={!monthlySalesData || monthlySalesLoading}>
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>

          {monthlySalesLoading ? (
            <Card><CardContent className="flex items-center justify-center gap-2 py-10 text-stone-500"><RefreshCw className="h-5 w-5 animate-spin" />Loading monthly sales...</CardContent></Card>
          ) : monthlySalesError ? (
            <Card><CardContent className="py-10 text-center text-red-600">{monthlySalesError}</CardContent></Card>
          ) : monthlySalesData ? (() => {
            const completedBookings = monthlySalesData.bookings.filter((booking) => booking.status === "completed");
            const bookingSales = completedBookings.reduce((sum, booking) => sum + booking.allocatedAmount, 0);
            const productSales = monthlySalesData.productOrders.reduce((sum, order) => sum + order.totalPaid, 0);

            return (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                  {[
                    ["Total Sales", formatCurrency(bookingSales + productSales)],
                    ["Completed Booking Sales", formatCurrency(bookingSales)],
                    ["Product Sales", formatCurrency(productSales)],
                    ["Completed Bookings", completedBookings.length],
                    ["Product Orders", monthlySalesData.productOrders.length],
                  ].map(([label, value]) => (
                    <Card key={label}><CardContent className="p-4"><p className="text-xs text-stone-500">{label}</p><p className="mt-1 text-xl font-bold text-stone-900">{value}</p></CardContent></Card>
                  ))}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>{new Date(`${monthlySalesMonth}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="mb-3 font-semibold">Completed Bookings</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-[1100px] w-full text-sm">
                          <thead><tr className="bg-stone-100 text-left">
                            {["Date", "Time", "Booking #", "Invoice #", "Customer", "Type", "Booked Items", "Guests", "Amount", "Collected"].map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}
                          </tr></thead>
                          <tbody>
                            {completedBookings.map((booking) => (
                              <tr key={booking.id} className="border-b border-stone-100">
                                <td className="px-3 py-3">{booking.date}</td><td className="px-3 py-3">{booking.time || "-"}</td>
                                <td className="px-3 py-3 font-medium">{booking.bookingNumber}</td><td className="px-3 py-3">{booking.invoiceNumber || "-"}</td>
                                <td className="px-3 py-3"><div>{booking.customerName}</div><div className="text-xs text-stone-400">{booking.customerEmail}</div></td>
                                <td className="px-3 py-3">{booking.serviceType}</td><td className="px-3 py-3">{booking.bookedItems.map((item) => `${item.name} x${item.quantity}`).join(", ")}</td>
                                <td className="px-3 py-3 text-right">{booking.guests}</td><td className="px-3 py-3 text-right">{formatCurrency(booking.allocatedAmount)}</td><td className="px-3 py-3 text-right">{formatCurrency(booking.amountCollected)}</td>
                              </tr>
                            ))}
                            {completedBookings.length === 0 && <tr><td colSpan={10} className="px-3 py-8 text-center text-stone-500">No completed bookings for this month.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <h3 className="mb-3 font-semibold">Product Orders</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-[950px] w-full text-sm">
                          <thead><tr className="bg-stone-100 text-left">
                            {["Paid Date", "Paid Time", "Order #", "Invoice #", "Customer", "Products", "Subtotal", "Shipping", "Total Paid", "Fulfillment"].map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}
                          </tr></thead>
                          <tbody>
                            {monthlySalesData.productOrders.map((order) => (
                              <tr key={order.id} className="border-b border-stone-100">
                                <td className="px-3 py-3">{order.date}</td><td className="px-3 py-3">{new Date(order.paidAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Dubai", hour: "2-digit", minute: "2-digit" })}</td>
                                <td className="px-3 py-3 font-medium">{order.orderNumber}</td><td className="px-3 py-3">{order.invoiceNumber || "-"}</td><td className="px-3 py-3">{order.customerName}</td>
                                <td className="px-3 py-3">{order.products.map((item) => `${item.name} x${item.quantity}`).join(", ")}</td>
                                <td className="px-3 py-3 text-right">{formatCurrency(order.subtotal)}</td><td className="px-3 py-3 text-right">{formatCurrency(order.shipping)}</td>
                                <td className="px-3 py-3 text-right font-medium">{formatCurrency(order.totalPaid)}</td><td className="px-3 py-3">{order.fulfillmentStatus}</td>
                              </tr>
                            ))}
                            {monthlySalesData.productOrders.length === 0 && <tr><td colSpan={10} className="px-3 py-8 text-center text-stone-500">No paid product orders for this month.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            );
          })() : (
            <Card><CardContent className="py-10 text-center text-stone-500">Select a month to load the report.</CardContent></Card>
          )}
        </div>
      )}

      {/* Finance Monthly Report Tab */}
      {activeTab === "finance-monthly" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-stone-900">Finance Monthly Report</h2>
              <p className="text-sm text-stone-500">Bookings and product orders assigned by Dubai payment date for the selected month.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-sm font-medium text-stone-600">
                Month
                <input
                  type="month"
                  value={financeMonthlyMonth}
                  onChange={(event) => setFinanceMonthlyMonth(event.target.value)}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-stone-900"
                />
              </label>
              <Button onClick={exportFinanceMonthlyReport} className="bg-green-600 hover:bg-green-700" disabled={!financeMonthlyData || financeMonthlyLoading}>
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>

          {financeMonthlyLoading ? (
            <Card><CardContent className="flex items-center justify-center gap-2 py-10 text-stone-500"><RefreshCw className="h-5 w-5 animate-spin" />Loading finance monthly report...</CardContent></Card>
          ) : financeMonthlyError ? (
            <Card><CardContent className="py-10 text-center text-red-600">{financeMonthlyError}</CardContent></Card>
          ) : financeMonthlyData ? (() => {
            const bookingSales = financeMonthlyData.bookings.reduce((sum, booking) => sum + booking.amountCollected, 0);
            const productSales = financeMonthlyData.productOrders.reduce((sum, order) => sum + order.totalPaid, 0);
            const creditTotal = financeMonthlyData.creditNotes.reduce((sum, note) => sum + note.totalCreditAmount, 0);

            return (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                  {[
                    ["Total Collected", formatCurrency(bookingSales + productSales)],
                    ["Booking Payments", formatCurrency(bookingSales)],
                    ["Product Sales", formatCurrency(productSales)],
                    ["Paid / Deposit Bookings", financeMonthlyData.bookings.length],
                    ["Product Orders", financeMonthlyData.productOrders.length],
                    ["Tax Credit Notes", `${financeMonthlyData.creditNotes.length} / ${formatCurrency(creditTotal)}`],
                  ].map(([label, value]) => (
                    <Card key={label}><CardContent className="p-4"><p className="text-xs text-stone-500">{label}</p><p className="mt-1 text-xl font-bold text-stone-900">{value}</p></CardContent></Card>
                  ))}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>{new Date(`${financeMonthlyMonth}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="mb-3 font-semibold">Paid / Deposit Bookings</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-[1150px] w-full text-sm">
                          <thead><tr className="bg-stone-100 text-left">
                            {["Payment Date", "Booking #", "Invoice #", "Customer", "Type", "Booked Items", "Payment", "Guests", "Value", "Collected", "Outstanding"].map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}
                          </tr></thead>
                          <tbody>
                            {financeMonthlyData.bookings.map((booking) => (
                              <tr key={booking.id} className="border-b border-stone-100">
                                <td className="px-3 py-3">{booking.date}</td><td className="px-3 py-3 font-medium">{booking.bookingNumber}</td><td className="px-3 py-3">{booking.invoiceNumber || "-"}</td>
                                <td className="px-3 py-3"><div>{booking.customerName}</div><div className="text-xs text-stone-400">{booking.customerEmail}</div></td>
                                <td className="px-3 py-3">{booking.serviceType}</td><td className="px-3 py-3">{booking.bookedItems.map((item) => `${item.name} x${item.quantity}`).join(", ")}</td>
                                <td className="px-3 py-3">{booking.paymentStatus}</td><td className="px-3 py-3 text-right">{booking.guests}</td>
                                <td className="px-3 py-3 text-right">{formatCurrency(booking.allocatedAmount)}</td><td className="px-3 py-3 text-right">{formatCurrency(booking.amountCollected)}</td><td className="px-3 py-3 text-right">{formatCurrency(booking.outstandingBalance)}</td>
                              </tr>
                            ))}
                            {financeMonthlyData.bookings.length === 0 && <tr><td colSpan={11} className="px-3 py-8 text-center text-stone-500">No booking payments or deposits for this month.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <h3 className="mb-3 font-semibold">Product Orders</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-[950px] w-full text-sm">
                          <thead><tr className="bg-stone-100 text-left">
                            {["Paid Date", "Paid Time", "Order #", "Invoice #", "Customer", "Products", "Subtotal", "Shipping", "Total Paid", "Fulfillment"].map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}
                          </tr></thead>
                          <tbody>
                            {financeMonthlyData.productOrders.map((order) => (
                              <tr key={order.id} className="border-b border-stone-100">
                                <td className="px-3 py-3">{order.date}</td><td className="px-3 py-3">{new Date(order.paidAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Dubai", hour: "2-digit", minute: "2-digit" })}</td>
                                <td className="px-3 py-3 font-medium">{order.orderNumber}</td><td className="px-3 py-3">{order.invoiceNumber || "-"}</td><td className="px-3 py-3">{order.customerName}</td>
                                <td className="px-3 py-3">{order.products.map((item) => `${item.name} x${item.quantity}`).join(", ")}</td>
                                <td className="px-3 py-3 text-right">{formatCurrency(order.subtotal)}</td><td className="px-3 py-3 text-right">{formatCurrency(order.shipping)}</td>
                                <td className="px-3 py-3 text-right font-medium">{formatCurrency(order.totalPaid)}</td><td className="px-3 py-3">{order.fulfillmentStatus}</td>
                              </tr>
                            ))}
                            {financeMonthlyData.productOrders.length === 0 && <tr><td colSpan={10} className="px-3 py-8 text-center text-stone-500">No paid product orders for this month.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <h3 className="mb-3 font-semibold">Tax Credit Note</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-[900px] w-full text-sm">
                          <thead><tr className="bg-stone-100 text-left">
                            {["Created Date", "Credit Note #", "Source", "Reference", "Invoice #", "Customer", "Subtotal", "VAT", "Total Credit"].map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}
                          </tr></thead>
                          <tbody>
                            {financeMonthlyData.creditNotes.map((note) => (
                              <tr key={note.id} className="border-b border-stone-100">
                                <td className="px-3 py-3">{note.createdDate}</td><td className="px-3 py-3 font-medium">{note.creditNoteNumber}</td><td className="px-3 py-3">{note.sourceType}</td><td className="px-3 py-3">{note.sourceReference}</td><td className="px-3 py-3">{note.originalInvoiceNumber || "-"}</td>
                                <td className="px-3 py-3"><div>{note.customerName}</div><div className="text-xs text-stone-400">{note.customerEmail}</div></td>
                                <td className="px-3 py-3 text-right">{formatCurrency(note.subtotalAmount)}</td><td className="px-3 py-3 text-right">{formatCurrency(note.vatAmount)}</td><td className="px-3 py-3 text-right font-medium">{formatCurrency(note.totalCreditAmount)}</td>
                              </tr>
                            ))}
                            {financeMonthlyData.creditNotes.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-stone-500">No tax credit notes for this month.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            );
          })() : (
            <Card><CardContent className="py-10 text-center text-stone-500">Select a month to load the finance report.</CardContent></Card>
          )}
        </div>
      )}

      {/* Monthly Target Report Tab */}
      {activeTab === "monthly-target" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-stone-900">Monthly Target Report</h2>
              <p className="text-sm text-stone-500">Bookings are assigned by their Dubai creation date. Product sales are assigned by paid date.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-sm font-medium text-stone-600">
                Month
                <input
                  type="month"
                  value={monthlyTargetMonth}
                  onChange={(event) => setMonthlyTargetMonth(event.target.value)}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-stone-900"
                />
              </label>
              <Button onClick={exportMonthlyTargetReport} className="bg-green-600 hover:bg-green-700" disabled={!monthlyTargetData || monthlyTargetLoading}>
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>

          {monthlyTargetLoading ? (
            <Card><CardContent className="flex items-center justify-center gap-2 py-10 text-stone-500"><RefreshCw className="h-5 w-5 animate-spin" />Loading monthly report...</CardContent></Card>
          ) : monthlyTargetError ? (
            <Card><CardContent className="py-10 text-center text-red-600">{monthlyTargetError}</CardContent></Card>
          ) : monthlyTargetData?.monthlyTotals.length ? (
            monthlyTargetData.monthlyTotals.map((month) => {
              const monthBookings = monthlyTargetData.bookings.filter((booking) => booking.createdDate.startsWith(month.month));
              const monthOrders = monthlyTargetData.productOrders.filter((order) => order.date.startsWith(month.month));
              return (
                <Card key={month.month}>
                  <CardHeader>
                    <CardTitle>{new Date(`${month.month}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                      {[
                        ["Total Sales", formatCurrency(month.totalSales)],
                        ["Booking Value", formatCurrency(month.bookingValue)],
                        ["Collected", formatCurrency(month.amountCollected)],
                        ["Product Sales", formatCurrency(month.productSales)],
                        ["Bookings", month.bookings],
                        ["Product Orders", month.productOrders],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg bg-stone-50 p-4">
                          <p className="text-xs text-stone-500">{label}</p>
                          <p className="mt-1 text-lg font-bold text-stone-900">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-amber-100 text-amber-700">Partial {month.partialBookings}</Badge>
                      <Badge className="bg-blue-100 text-blue-700">Paid {month.paidBookings}</Badge>
                      <Badge className="bg-green-100 text-green-700">Completed {month.completedBookings}</Badge>
                      <Badge className="bg-violet-100 text-violet-700">Guests {month.guests}</Badge>
                    </div>

                    <div>
                      <h3 className="mb-3 font-semibold">Bookings Created This Month</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-[1000px] w-full text-sm">
                          <thead><tr className="bg-stone-100 text-left">
                            {["Created", "Booking #", "Customer", "Type", "Service/Class", "Status", "Guests", "Booking Value", "Collected"].map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}
                          </tr></thead>
                          <tbody>
                            {monthBookings.map((booking) => (
                              <tr key={booking.id} className="border-b border-stone-100">
                                <td className="px-3 py-3">{booking.createdDate} {new Date(booking.createdAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Dubai", hour: "2-digit", minute: "2-digit" })}</td>
                                <td className="px-3 py-3 font-medium">{booking.bookingNumber}</td>
                                <td className="px-3 py-3">{booking.customerName}</td>
                                <td className="px-3 py-3 capitalize">{booking.bookingType}</td>
                                <td className="px-3 py-3">{booking.serviceType}</td>
                                <td className="px-3 py-3"><Badge className={booking.status === "completed" ? "bg-green-100 text-green-700" : booking.status === "paid" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}>{booking.status}</Badge></td>
                                <td className="px-3 py-3 text-right">{booking.guests}</td>
                                <td className="px-3 py-3 text-right">{formatCurrency(booking.bookingValue)}</td>
                                <td className="px-3 py-3 text-right">{formatCurrency(booking.amountCollected)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-3 font-semibold">Product Sales This Month</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-[850px] w-full text-sm">
                          <thead><tr className="bg-stone-100 text-left">
                            {["Paid Date", "Order #", "Customer", "Products", "Subtotal", "Shipping", "Total Paid", "Fulfillment"].map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}
                          </tr></thead>
                          <tbody>
                            {monthOrders.map((order) => (
                              <tr key={order.id} className="border-b border-stone-100">
                                <td className="px-3 py-3">{order.date}</td><td className="px-3 py-3 font-medium">{order.orderNumber}</td>
                                <td className="px-3 py-3">{order.customerName}</td><td className="px-3 py-3">{order.products.map((item) => `${item.name} x${item.quantity}`).join(", ")}</td>
                                <td className="px-3 py-3 text-right">{formatCurrency(order.subtotal)}</td><td className="px-3 py-3 text-right">{formatCurrency(order.shipping)}</td>
                                <td className="px-3 py-3 text-right font-medium">{formatCurrency(order.totalPaid)}</td><td className="px-3 py-3">{order.fulfillmentStatus}</td>
                              </tr>
                            ))}
                            {monthOrders.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-stone-500">No paid product orders for this month.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card><CardContent className="py-10 text-center text-stone-500">No partial, paid, or completed bookings and no paid product orders in this period.</CardContent></Card>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">Sales Analytics</h2>
            <p className="text-sm text-stone-500">Booking and product commerce performance for the active date range.</p>
          </div>
          {renderDateFilters()}

          {error ? (
            <Card><CardContent className="py-10 text-center text-red-600">{error}</CardContent></Card>
          ) : salesData?.analytics ? (() => {
            const analytics = salesData.analytics;
            const maxTrend = Math.max(...analytics.trend.map((day) => day.sales), 1);
            const maxServiceRevenue = Math.max(...analytics.topServices.map((item) => item.revenue), 1);
            const maxProductUnits = Math.max(...analytics.topProducts.map((item) => item.count), 1);

            return (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    ["Gross Sales", formatCurrency(analytics.summary.grossSales)],
                    ["Collected", formatCurrency(analytics.summary.amountCollected)],
                    ["Outstanding", formatCurrency(analytics.summary.outstandingBalance)],
                    ["Projected Bookings", formatCurrency(analytics.summary.projectedBookingRevenue)],
                    ["Avg Transaction", formatCurrency(analytics.summary.averageTransactionValue)],
                    ["Avg Booking", formatCurrency(analytics.summary.averageBookingValue)],
                    ["Avg Product Order", formatCurrency(analytics.summary.averageProductOrderValue)],
                    ["Repeat Customer Rate", `${analytics.summary.repeatCustomerRate.toFixed(1)}%`],
                  ].map(([label, value]) => (
                    <Card key={label}><CardContent className="p-4"><p className="text-xs text-stone-500">{label}</p><p className="mt-1 text-xl font-bold text-stone-900">{value}</p></CardContent></Card>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
                  {[
                    ["Completed", analytics.summary.completedBookings],
                    ["Confirmed", analytics.summary.confirmedBookings],
                    ["Product Orders", analytics.summary.productOrders],
                    ["Units Sold", analytics.summary.unitsSold],
                    ["Guests", analytics.summary.totalGuests],
                    ["Avg Guests", analytics.summary.averageGuestsPerBooking.toFixed(1)],
                    ["Customers", analytics.summary.uniqueCustomers],
                    ["Completion Rate", `${analytics.summary.bookingCompletionRate.toFixed(1)}%`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-stone-200 bg-white p-4">
                      <p className="text-xs text-stone-500">{label}</p>
                      <p className="mt-1 text-lg font-bold text-stone-900">{value}</p>
                    </div>
                  ))}
                </div>

                <Card>
                  <CardHeader><CardTitle>Sales Trend</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex h-52 items-end gap-1 border-b border-stone-200">
                      {analytics.trend.map((day) => (
                        <div key={day.date} className="group relative flex h-full min-w-0 flex-1 items-end">
                          <div className="w-full rounded-t bg-stone-700" style={{ height: `${Math.max((day.sales / maxTrend) * 100, day.sales > 0 ? 2 : 0)}%` }} />
                          <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-stone-900 px-3 py-2 text-xs text-white group-hover:block">
                            <div>{day.date}</div>
                            <div>{formatCurrency(day.sales)} · {day.transactions} transactions</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-between text-xs text-stone-500">
                      <span>{analytics.trend[0]?.date || ""}</span>
                      <span>{analytics.trend.at(-1)?.date || ""}</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-3">
                  <Card>
                    <CardHeader><CardTitle>Revenue Mix</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {analytics.revenueMix.map((item) => {
                        const percentage = analytics.summary.grossSales > 0 ? (item.value / analytics.summary.grossSales) * 100 : 0;
                        return <div key={item.name}><div className="mb-1 flex justify-between text-sm"><span>{item.name}</span><span>{formatCurrency(item.value)} ({percentage.toFixed(1)}%)</span></div><div className="h-2 rounded bg-stone-100"><div className="h-2 rounded bg-amber-500" style={{ width: `${percentage}%` }} /></div></div>;
                      })}
                      <div className="border-t border-stone-100 pt-3 text-sm">
                        <div className="flex justify-between"><span>Shipping Revenue</span><span>{formatCurrency(analytics.summary.shippingRevenue)}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Booking Mix</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {analytics.bookingMix.map((item) => (
                        <div key={item.name} className="flex items-center justify-between rounded-lg bg-stone-50 p-3"><span>{item.name}</span><span className="font-bold">{item.value}</span></div>
                      ))}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Order Fulfillment</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {analytics.fulfillment.map((item) => (
                        <div key={item.name} className="flex items-center justify-between rounded-lg bg-stone-50 p-3"><span className="capitalize">{item.name}</span><span className="font-bold">{item.value}</span></div>
                      ))}
                      {analytics.fulfillment.length === 0 && <p className="py-4 text-center text-stone-500">No product orders in this period.</p>}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle>Top Booking Services</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {analytics.topServices.map((item, index) => (
                        <div key={item.name}>
                          <div className="mb-1 flex justify-between text-sm"><span>{index + 1}. {item.name}</span><span>{item.count} bookings · {formatCurrency(item.revenue)}</span></div>
                          <div className="h-2 rounded bg-stone-100"><div className="h-2 rounded bg-pink-400" style={{ width: `${(item.revenue / maxServiceRevenue) * 100}%` }} /></div>
                        </div>
                      ))}
                      {analytics.topServices.length === 0 && <p className="py-4 text-center text-stone-500">No completed bookings in this period.</p>}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Top Products</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {analytics.topProducts.map((item, index) => (
                        <div key={item.name}>
                          <div className="mb-1 flex justify-between text-sm"><span>{index + 1}. {item.name}</span><span>{item.count} units · est. {formatCurrency(item.revenue)}</span></div>
                          <div className="h-2 rounded bg-stone-100"><div className="h-2 rounded bg-blue-500" style={{ width: `${(item.count / maxProductUnits) * 100}%` }} /></div>
                        </div>
                      ))}
                      {analytics.topProducts.length === 0 && <p className="py-4 text-center text-stone-500">No products sold in this period.</p>}
                    </CardContent>
                  </Card>
                </div>
              </>
            );
          })() : (
            <Card><CardContent className="py-10 text-center text-stone-500">No analytics data available.</CardContent></Card>
          )}
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
