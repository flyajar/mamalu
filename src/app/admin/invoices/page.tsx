"use client";

import { useState, useEffect, useRef } from "react";
import {
  RefreshCw,
  Send,
  Eye,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  ExternalLink,
  Plus,
  Search,
  Download,
  Calendar,
  Filter,
  Printer,
  X,
  Building2,
  Cake,
  ChefHat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDate } from "@/lib/utils";

interface Invoice {
  id: string;
  invoice_number: string;
  booking_id: string | null;
  service_booking_id: string | null;
  payment_link_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  amount: number;
  base_amount: number | null;
  extras_amount: number | null;
  currency: string;
  description: string | null;
  line_items: any[] | null;
  service_name: string | null;
  service_type: string | null;
  event_date: string | null;
  guest_count: number | null;
  status: string;
  payment_link: string | null;
  due_date: string | null;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  notes: string | null;
  service_booking?: {
    id: string;
    booking_number: string;
    service_name: string;
    service_type: string;
    customer_name: string;
    event_date: string;
    event_time: string;
    guest_count: number;
  } | null;
  payment_link_ref?: {
    id: string;
    link_code: string;
    title: string;
    stripe_payment_link_url: string;
  } | null;
  creator?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0, draft: 0, sent: 0, paid: 0, cancelled: 0,
    totalAmount: 0, paidAmount: 0,
  });

  // Date range filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // New invoice form
  const [newInvoice, setNewInvoice] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    amount: "",
    description: "",
    dueDate: "",
  });

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (serviceTypeFilter !== "all") params.set("serviceType", serviceTypeFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/invoices?${params}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, serviceTypeFilter, startDate, endDate]);

  const filteredInvoices = invoices.filter((invoice) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      invoice.invoice_number.toLowerCase().includes(query) ||
      invoice.customer_name.toLowerCase().includes(query) ||
      invoice.customer_email.toLowerCase().includes(query) ||
      (invoice.service_name?.toLowerCase().includes(query) || false)
    );
  });

  const createInvoice = async () => {
    if (!newInvoice.customerName || !newInvoice.customerEmail || !newInvoice.amount) {
      alert("Please fill in required fields");
      return;
    }

    setActionLoading("create");
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: newInvoice.customerName,
          customerEmail: newInvoice.customerEmail,
          customerPhone: newInvoice.customerPhone || null,
          amount: parseFloat(newInvoice.amount),
          description: newInvoice.description || null,
          dueDate: newInvoice.dueDate || null,
          sendImmediately: false,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewInvoice({
          customerName: "",
          customerEmail: "",
          customerPhone: "",
          amount: "",
          description: "",
          dueDate: "",
        });
        fetchInvoices();
      }
    } catch (error) {
      console.error("Failed to create invoice:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const sendInvoice = async (invoiceId: string) => {
    setActionLoading(invoiceId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
      });
      if (res.ok) {
        fetchInvoices();
      }
    } catch (error) {
      console.error("Failed to send invoice:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const updateInvoiceStatus = async (invoiceId: string, status: string) => {
    setActionLoading(invoiceId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchInvoices();
      }
    } catch (error) {
      console.error("Failed to update invoice:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const copyPaymentLink = (link: string, invoiceId: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(invoiceId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Export to Excel
  const exportToExcel = () => {
    const headers = [
      "Invoice #", "Date", "Customer Name", "Email", "Phone",
      "Service", "Service Type", "Event Date", "Guests",
      "Base Amount", "Extras", "Total Amount", "Status", "Paid At"
    ];

    const rows = filteredInvoices.map(inv => [
      inv.invoice_number,
      new Date(inv.created_at).toLocaleDateString(),
      inv.customer_name,
      inv.customer_email,
      inv.customer_phone || "",
      inv.service_name || inv.description || "",
      inv.service_type || "",
      inv.event_date ? new Date(inv.event_date).toLocaleDateString() : "",
      inv.guest_count || "",
      inv.base_amount || inv.amount,
      inv.extras_amount || 0,
      inv.amount,
      inv.status,
      inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `invoices_${startDate || "all"}_${endDate || "all"}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export individual invoice to PDF
  const exportToPdf = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPdfPreview(true);
  };

  const printInvoice = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-700";
      case "sent":
        return "bg-blue-100 text-blue-700";
      case "pending":
        return "bg-amber-100 text-amber-700";
      case "draft":
        return "bg-stone-100 text-stone-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      case "overdue":
        return "bg-gradient-to-r from-[#FF8C6B] to-[#ff7a54]";
      default:
        return "bg-stone-100 text-stone-700";
    }
  };

  const getServiceIcon = (type: string | null) => {
    switch (type) {
      case "birthday_deck":
        return <Cake className="h-4 w-4 text-pink-500" />;
      case "corporate_deck":
        return <Building2 className="h-4 w-4 text-blue-500" />;
      default:
        return <ChefHat className="h-4 w-4 text-amber-500" />;
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Invoices</h1>
          <p className="text-stone-500 mt-1">
            Create and manage payment invoices
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchInvoices} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-violet-100">
              <FileText className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">{stats.total}</p>
              <p className="text-sm text-stone-500">Total Invoices</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-stone-100">
              <Clock className="h-5 w-5 text-stone-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">{stats.draft}</p>
              <p className="text-sm text-stone-500">Drafts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100">
              <Send className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">{stats.sent}</p>
              <p className="text-sm text-stone-500">Sent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">{stats.paid}</p>
              <p className="text-sm text-stone-500">Paid</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-100">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">
                {formatPrice(stats.paidAmount)}
              </p>
              <p className="text-sm text-stone-500">Collected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Search and Status */}
          <div className="flex flex-wrap gap-4">
            <div className="min-w-0 flex-1 basis-full sm:basis-52">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-stone-200 rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={serviceTypeFilter}
              onChange={(e) => setServiceTypeFilter(e.target.value)}
              className="px-4 py-2 border border-stone-200 rounded-lg"
            >
              <option value="all">All Services</option>
              <option value="birthday_deck">Birthday Parties</option>
              <option value="corporate_deck">Corporate Events</option>
              <option value="nanny_class">Nanny Classes</option>
            </select>
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
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToExcel}>
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-stone-300 mx-auto mb-4" />
              <h3 className="font-semibold text-stone-900 mb-2">
                No invoices found
              </h3>
              <p className="text-stone-500">Create your first invoice to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-stone-500">
                      Invoice
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-stone-500">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-stone-500">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-stone-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-stone-500">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-stone-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getServiceIcon(invoice.service_type)}
                          <div>
                            <div className="font-medium text-stone-900">
                              {invoice.invoice_number}
                            </div>
                            <div className="text-xs text-stone-500 truncate max-w-[200px]">
                              {invoice.service_name || invoice.description || "Custom Invoice"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-stone-900">
                          {invoice.customer_name}
                        </div>
                        <div className="text-sm text-stone-500">
                          {invoice.customer_email}
                        </div>
                        {invoice.event_date && (
                          <div className="text-xs text-amber-600">
                            Event: {new Date(invoice.event_date).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-stone-900">
                          {formatPrice(invoice.amount)}
                        </div>
                        {invoice.extras_amount && invoice.extras_amount > 0 && (
                          <div className="text-xs text-stone-500">
                            (incl. {formatPrice(invoice.extras_amount)} extras)
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusBadge(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-stone-900">
                          {formatDate(invoice.created_at)}
                        </div>
                        {invoice.paid_at && (
                          <div className="text-xs text-green-600">
                            Paid: {formatDate(invoice.paid_at)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => exportToPdf(invoice)}
                            title="Export PDF"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          {invoice.payment_link && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                copyPaymentLink(invoice.payment_link!, invoice.id)
                              }
                              title="Copy payment link"
                            >
                              {copiedLink === invoice.id ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {invoice.payment_link && (
                            <a
                              href={invoice.payment_link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button size="sm" variant="ghost" title="Open payment link">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                          {invoice.status === "draft" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => sendInvoice(invoice.id)}
                              disabled={actionLoading === invoice.id}
                              title="Send invoice"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {invoice.status === "sent" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateInvoiceStatus(invoice.id, "paid")}
                              disabled={actionLoading === invoice.id}
                              title="Mark as paid"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-stone-900">
                  Create Invoice
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={newInvoice.customerName}
                  onChange={(e) =>
                    setNewInvoice({ ...newInvoice, customerName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Customer Email *
                </label>
                <input
                  type="email"
                  value={newInvoice.customerEmail}
                  onChange={(e) =>
                    setNewInvoice({ ...newInvoice, customerEmail: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="customer@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={newInvoice.customerPhone}
                  onChange={(e) =>
                    setNewInvoice({ ...newInvoice, customerPhone: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="+971 XX XXX XXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Amount (AED) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newInvoice.amount}
                  onChange={(e) =>
                    setNewInvoice({ ...newInvoice, amount: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newInvoice.description}
                  onChange={(e) =>
                    setNewInvoice({ ...newInvoice, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  rows={3}
                  placeholder="Invoice description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newInvoice.dueDate}
                  onChange={(e) =>
                    setNewInvoice({ ...newInvoice, dueDate: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="p-6 border-t bg-stone-50 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={createInvoice}
                disabled={actionLoading === "create"}
              >
                {actionLoading === "create" ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Invoice
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPdfPreview && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between print:hidden">
              <h2 className="text-lg font-bold text-stone-900">Invoice Preview</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={printInvoice}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print / Save PDF
                </Button>
                <button
                  onClick={() => setShowPdfPreview(false)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Printable Invoice */}
            <div className="p-8 print:p-0" id="invoice-print">
              {/* Header with Logo */}
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <img
                    src="/graphics/mamalu-logo.avif"
                    alt="Mamalu Kitchen"
                    className="h-20 w-20 object-contain"
                  />
                  <div>
                    <h1 className="text-2xl font-bold text-stone-900">MAMALU KITCHEN</h1>
                    <p className="text-stone-500">Culinary Experiences & Events</p>
                    <p className="text-sm text-stone-500">Dubai, UAE</p>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-3xl font-bold text-amber-600">INVOICE</h2>
                  <p className="text-lg font-medium text-stone-900 mt-1">
                    {selectedInvoice.invoice_number}
                  </p>
                  <p className="text-sm text-stone-500">
                    Date: {new Date(selectedInvoice.created_at).toLocaleDateString()}
                  </p>
                  {selectedInvoice.due_date && (
                    <p className="text-sm text-stone-500">
                      Due: {new Date(selectedInvoice.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div className="mb-6">
                <Badge className={`${getStatusBadge(selectedInvoice.status)} text-sm px-3 py-1`}>
                  {selectedInvoice.status.toUpperCase()}
                </Badge>
              </div>

              {/* Bill To */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-sm font-semibold text-stone-500 uppercase mb-2">Bill To</h3>
                  <p className="font-medium text-stone-900">{selectedInvoice.customer_name}</p>
                  <p className="text-stone-600">{selectedInvoice.customer_email}</p>
                  {selectedInvoice.customer_phone && (
                    <p className="text-stone-600">{selectedInvoice.customer_phone}</p>
                  )}
                </div>
                {selectedInvoice.event_date && (
                  <div>
                    <h3 className="text-sm font-semibold text-stone-500 uppercase mb-2">Event Details</h3>
                    <p className="text-stone-900">
                      <span className="font-medium">Date:</span>{" "}
                      {new Date(selectedInvoice.event_date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    {selectedInvoice.guest_count && (
                      <p className="text-stone-900">
                        <span className="font-medium">Guests:</span> {selectedInvoice.guest_count}
                      </p>
                    )}
                    {selectedInvoice.service_type && (
                      <p className="text-stone-900">
                        <span className="font-medium">Type:</span>{" "}
                        {selectedInvoice.service_type === "birthday_deck"
                          ? "Birthday Party"
                          : selectedInvoice.service_type === "corporate_deck"
                          ? "Corporate Event"
                          : "Class"}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Line Items */}
              <div className="border rounded-lg overflow-hidden mb-8">
                <table className="w-full">
                  <thead className="bg-stone-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-stone-700">Description</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-stone-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-3">
                        <p className="font-medium text-stone-900">
                          {selectedInvoice.service_name || selectedInvoice.description || "Services"}
                        </p>
                        {selectedInvoice.guest_count && (
                          <p className="text-sm text-stone-500">
                            {selectedInvoice.guest_count} guests
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-stone-900">
                        {formatPrice(selectedInvoice.base_amount || selectedInvoice.amount)}
                      </td>
                    </tr>
                    {selectedInvoice.line_items?.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-3">
                          <p className="text-stone-900">{item.name}</p>
                          {item.quantity > 1 && (
                            <p className="text-sm text-stone-500">Qty: {item.quantity}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-stone-900">
                          {formatPrice(item.price * (item.quantity || 1))}
                        </td>
                      </tr>
                    ))}
                    {selectedInvoice.extras_amount && selectedInvoice.extras_amount > 0 && !selectedInvoice.line_items && (
                      <tr>
                        <td className="px-4 py-3 text-stone-900">Extras & Add-ons</td>
                        <td className="px-4 py-3 text-right text-stone-900">
                          {formatPrice(selectedInvoice.extras_amount)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-amber-50">
                    <tr>
                      <td className="px-4 py-4 text-right font-bold text-stone-900">Total</td>
                      <td className="px-4 py-4 text-right text-xl font-bold text-amber-600">
                        {formatPrice(selectedInvoice.amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Payment Info */}
              {selectedInvoice.payment_link && selectedInvoice.status !== "paid" && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
                  <h3 className="font-semibold text-amber-800 mb-2">Payment Link</h3>
                  <p className="text-sm text-amber-700 break-all">{selectedInvoice.payment_link}</p>
                </div>
              )}

              {selectedInvoice.paid_at && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
                  <h3 className="font-semibold text-green-800 mb-1">Payment Received</h3>
                  <p className="text-sm text-green-700">
                    Paid on {new Date(selectedInvoice.paid_at).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              )}

              {/* Notes */}
              {selectedInvoice.notes && (
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-stone-500 uppercase mb-2">Notes</h3>
                  <p className="text-stone-600">{selectedInvoice.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="border-t pt-6 mt-8 text-center text-sm text-stone-500">
                <p>Thank you for choosing Mamalu Kitchen!</p>
                <p className="mt-1">For questions, contact us at info@mamalukitchen.com</p>
                <p className="mt-4 text-xs">
                  Mamalu Kitchen • Dubai, UAE • www.mamalukitchen.com
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-print,
          #invoice-print * {
            visibility: visible;
          }
          #invoice-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20mm;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
