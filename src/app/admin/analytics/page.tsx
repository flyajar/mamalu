"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SalesAnalytics {
  summary: {
    grossSales: number;
    projectedBookingRevenue: number;
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
  fulfillment: Array<{ name: string; value: number }>;
  topServices: Array<{ name: string; count: number; revenue: number }>;
  topBookingItems: Array<{ name: string; count: number; revenue: number }>;
  topTimeSlots: Array<{ name: string; count: number; revenue: number }>;
  topProducts: Array<{ name: string; count: number; revenue: number }>;
  trend: Array<{ date: string; sales: number; transactions: number }>;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("week");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      let url = `/api/admin/sales-report?period=${period}`;
      if (startDate && endDate) url += `&start_date=${startDate}&end_date=${endDate}`;
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load sales analytics");
      setAnalytics(data.analytics);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load sales analytics");
    } finally {
      setLoading(false);
    }
  }, [endDate, period, startDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatCurrency = (amount: number) => `AED ${amount.toLocaleString()}`;
  const maxTrend = Math.max(...(analytics?.trend.map((day) => day.sales) || []), 1);
  const maxServiceRevenue = Math.max(...(analytics?.topServices.map((item) => item.revenue) || []), 1);
  const maxBookingItemCount = Math.max(...(analytics?.topBookingItems.map((item) => item.count) || []), 1);
  const maxTimeSlotCount = Math.max(...(analytics?.topTimeSlots.map((item) => item.count) || []), 1);
  const maxProductUnits = Math.max(...(analytics?.topProducts.map((item) => item.count) || []), 1);
  const formatTimeSlot = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2000, 0, 1, hours, minutes)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Sales Analytics</h1>
        <p className="mt-1 text-stone-500">Booking and product commerce performance for the active date range.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg bg-stone-50 p-4 xl:flex-nowrap">
        <Button variant={period === "today" ? "default" : "outline"} size="sm" className="h-10" onClick={() => {
          const today = new Date().toISOString().split("T")[0];
          setStartDate(today);
          setEndDate(today);
          setPeriod("today");
        }}>Today</Button>
        <select value={period} onChange={(event) => {
          setPeriod(event.target.value);
          setStartDate("");
          setEndDate("");
        }} className="h-10 rounded-lg border border-stone-200 bg-white px-4">
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">Last 3 Months</option>
          <option value="year">Last Year</option>
        </select>
        <label className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-stone-600">
          From
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-10 rounded-lg border bg-white px-3 text-sm" />
        </label>
        <label className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-stone-600">
          To
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-10 rounded-lg border bg-white px-3 text-sm" />
        </label>
        <Button className="h-10 whitespace-nowrap" onClick={fetchAnalytics} disabled={!startDate || !endDate}>Apply Date Range</Button>
        {(startDate || endDate) && <Button variant="ghost" className="h-10" onClick={() => {
          setStartDate("");
          setEndDate("");
          setPeriod("week");
        }}>Clear</Button>}
        <Button variant="outline" className="h-10 xl:ml-auto" onClick={fetchAnalytics}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error ? (
        <Card><CardContent className="py-10 text-center text-red-600">{error}</CardContent></Card>
      ) : loading ? (
        <Card><CardContent className="flex items-center justify-center py-16"><RefreshCw className="h-8 w-8 animate-spin text-stone-400" /></CardContent></Card>
      ) : analytics ? (
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

          <div className="grid gap-6 lg:grid-cols-2">
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
              <CardHeader><CardTitle>Order Fulfillment</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {analytics.fulfillment.map((item) => <div key={item.name} className="flex items-center justify-between rounded-lg bg-stone-50 p-3"><span className="capitalize">{item.name}</span><span className="font-bold">{item.value}</span></div>)}
                {analytics.fulfillment.length === 0 && <p className="py-4 text-center text-stone-500">No product orders in this period.</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Top Booking Services</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {analytics.topServices.map((item, index) => <div key={item.name}>
                  <div className="mb-1 flex justify-between text-sm"><span>{index + 1}. {item.name}</span><span>{item.count} bookings · {formatCurrency(item.revenue)}</span></div>
                  <div className="h-2 rounded bg-stone-100"><div className="h-2 rounded bg-pink-400" style={{ width: `${(item.revenue / maxServiceRevenue) * 100}%` }} /></div>
                </div>)}
                {analytics.topServices.length === 0 && <p className="py-4 text-center text-stone-500">No completed bookings in this period.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Top Booked Classes & Menus</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {analytics.topBookingItems.map((item, index) => <div key={item.name}>
                  <div className="mb-1 flex justify-between text-sm"><span>{index + 1}. {item.name}</span><span>{item.count} bookings · {formatCurrency(item.revenue)}</span></div>
                  <div className="h-2 rounded bg-stone-100"><div className="h-2 rounded bg-amber-500" style={{ width: `${(item.count / maxBookingItemCount) * 100}%` }} /></div>
                </div>)}
                {analytics.topBookingItems.length === 0 && <p className="py-4 text-center text-stone-500">No classes or menus booked in this period.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Top Products</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {analytics.topProducts.map((item, index) => <div key={item.name}>
                  <div className="mb-1 flex justify-between text-sm"><span>{index + 1}. {item.name}</span><span>{item.count} units · est. {formatCurrency(item.revenue)}</span></div>
                  <div className="h-2 rounded bg-stone-100"><div className="h-2 rounded bg-blue-500" style={{ width: `${(item.count / maxProductUnits) * 100}%` }} /></div>
                </div>)}
                {analytics.topProducts.length === 0 && <p className="py-4 text-center text-stone-500">No products sold in this period.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Most Booked Time Slots</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {analytics.topTimeSlots.map((item, index) => <div key={item.name}>
                  <div className="mb-1 flex justify-between text-sm"><span>{index + 1}. {formatTimeSlot(item.name)}</span><span>{item.count} bookings · {formatCurrency(item.revenue)}</span></div>
                  <div className="h-2 rounded bg-stone-100"><div className="h-2 rounded bg-violet-500" style={{ width: `${(item.count / maxTimeSlotCount) * 100}%` }} /></div>
                </div>)}
                {analytics.topTimeSlots.length === 0 && <p className="py-4 text-center text-stone-500">No booking time slots in this period.</p>}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card><CardContent className="py-10 text-center text-stone-500">No analytics data available.</CardContent></Card>
      )}
    </div>
  );
}
