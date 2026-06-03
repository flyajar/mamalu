"use client";

import { useCallback, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  RefreshCw,
  Plus,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Link as LinkIcon,
  ExternalLink,
  Search,
  Trash2,
  Download,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDate } from "@/lib/utils";

interface Extra {
  name: string;
  price: number;
  quantity: number;
}

interface PaymentLink {
  id: string;
  link_code: string;
  title: string;
  description: string | null;
  amount: number;
  price_per_person: number | null;
  number_of_people: number;
  extras: Extra[];
  extras_total: number;
  currency: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  stripe_payment_link_url: string | null;
  stripe_payment_intent_id: string | null;
  status: string;
  single_use: boolean;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  paid_at: string | null;
  paid_amount: number | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  lead_id: string | null;
  creator: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  lead: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
  } | null;
}

interface LeadSearchResult {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  source: string;
}

interface PaymentExtraOption {
  id: string;
  name: string;
  price: number;
}

export default function AdminPaymentLinksPage() {
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [exportEndDate, setExportEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [exportLoading, setExportLoading] = useState(false);
  const [showUnpaidModal, setShowUnpaidModal] = useState(false);
  const [selectedLinkForUnpaid, setSelectedLinkForUnpaid] = useState<PaymentLink | null>(null);
  const [unpaidReason, setUnpaidReason] = useState("");
  
  // Lead assignment
  const [showAssignLeadModal, setShowAssignLeadModal] = useState(false);
  const [selectedLinkForAssign, setSelectedLinkForAssign] = useState<PaymentLink | null>(null);
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [leadSearchResults, setLeadSearchResults] = useState<LeadSearchResult[]>([]);
  const [searchingLeads, setSearchingLeads] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 100;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  // New payment link form
  const [newLink, setNewLink] = useState({
    title: "",
    description: "",
    amount: "",
    numberOfPeople: 1,
    extras: [] as Extra[],
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    singleUse: true,
    notes: "",
  });

  // Available extras options (fetched from database)
  const [availableExtras, setAvailableExtras] = useState<PaymentExtraOption[]>([]);

  const fetchPaymentLinks = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', pageSize.toString());
      params.set('offset', ((currentPage - 1) * pageSize).toString());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/payment-links?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPaymentLinks(data.paymentLinks || []);
        setTotalCount(data.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch payment links:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, endDate, startDate, statusFilter]);

  const fetchAvailableExtras = async () => {
    try {
      const res = await fetch("/api/admin/payment-extras?activeOnly=true");
      if (res.ok) {
        const data = await res.json();
        setAvailableExtras(
          ((data.extras || []) as PaymentExtraOption[]).map((e) => ({
            id: e.id,
            name: e.name,
            price: e.price,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch available extras:", error);
    }
  };

  useEffect(() => {
    fetchPaymentLinks();
  }, [fetchPaymentLinks]);

  useEffect(() => {
    fetchAvailableExtras();
  }, []);

  // Data is already filtered server-side
  const filteredLinks = paymentLinks;

  const setQuickDateRange = (range: string) => {
    const today = new Date();
    const start = new Date();

    switch (range) {
      case "today":
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
      default:
        return;
    }

    setCurrentPage(1);
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
  };

  const createPaymentLink = async () => {
    if (!newLink.title || !newLink.amount) {
      alert("Please fill in required fields");
      return;
    }

    setActionLoading("create");
    try {
      const pricePerPerson = parseFloat(newLink.amount);
      const baseTotalAmount = pricePerPerson * newLink.numberOfPeople;
      
      // Calculate extras total
      const extrasTotal = newLink.extras.reduce((sum, extra) => sum + (extra.price * extra.quantity), 0);
      const totalAmount = baseTotalAmount + extrasTotal;
      
      const res = await fetch("/api/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newLink.title,
          description: newLink.description || null,
          amount: totalAmount,
          pricePerPerson,
          numberOfPeople: newLink.numberOfPeople,
          extras: newLink.extras,
          customerName: newLink.customerName || null,
          customerEmail: newLink.customerEmail || null,
          customerPhone: newLink.customerPhone || null,
          singleUse: newLink.singleUse,
          notes: newLink.notes || null,
          createdBy: currentUserId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setShowCreateModal(false);
        setNewLink({
          title: "",
          description: "",
          amount: "",
          numberOfPeople: 1,
          extras: [] as Extra[],
          customerName: "",
          customerEmail: "",
          customerPhone: "",
          singleUse: true,
          notes: "",
        });
        fetchPaymentLinks();
        
        // Copy new link to clipboard
        if (data.stripeUrl) {
          navigator.clipboard.writeText(data.stripeUrl);
          alert(`Payment link created and copied to clipboard!\n\n${data.stripeUrl}`);
        }
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create payment link");
      }
    } catch (error) {
      console.error("Failed to create payment link:", error);
      alert("Failed to create payment link");
    } finally {
      setActionLoading(null);
    }
  };

  const cancelPaymentLink = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this payment link?")) return;

    setActionLoading(id);
    try {
      const res = await fetch(`/api/payment-links/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchPaymentLinks();
      }
    } catch (error) {
      console.error("Failed to cancel payment link:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const markAsPaid = async (id: string, amount: number) => {
    if (!confirm("Mark this payment link as manually paid?")) return;

    setActionLoading(id);
    try {
      const res = await fetch(`/api/payment-links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid", paidAmount: amount }),
      });
      if (res.ok) {
        fetchPaymentLinks();
      }
    } catch (error) {
      console.error("Failed to mark as paid:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const openUnpaidModal = (link: PaymentLink) => {
    setSelectedLinkForUnpaid(link);
    setUnpaidReason("");
    setShowUnpaidModal(true);
  };

  const markAsUnpaid = async () => {
    if (!selectedLinkForUnpaid || !currentUserId) return;
    
    if (!unpaidReason.trim()) {
      alert("Please provide a reason for marking this as unpaid");
      return;
    }

    setActionLoading(selectedLinkForUnpaid.id);
    try {
      const res = await fetch(`/api/payment-links/${selectedLinkForUnpaid.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "active", 
          changedBy: currentUserId,
          changeReason: unpaidReason.trim()
        }),
      });
      
      if (res.ok) {
        setShowUnpaidModal(false);
        setSelectedLinkForUnpaid(null);
        setUnpaidReason("");
        fetchPaymentLinks();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to mark as unpaid");
      }
    } catch (error) {
      console.error("Failed to mark as unpaid:", error);
      alert("Failed to mark as unpaid");
    } finally {
      setActionLoading(null);
    }
  };

  // Lead assignment functions
  const openAssignLeadModal = (link: PaymentLink) => {
    setSelectedLinkForAssign(link);
    setLeadSearchQuery("");
    setLeadSearchResults([]);
    setShowAssignLeadModal(true);
  };

  const searchLeads = async (query: string) => {
    if (query.length < 2) {
      setLeadSearchResults([]);
      return;
    }
    
    setSearchingLeads(true);
    try {
      const res = await fetch(`/api/leads/search?q=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setLeadSearchResults(data.leads || []);
      }
    } catch (error) {
      console.error("Failed to search leads:", error);
    } finally {
      setSearchingLeads(false);
    }
  };

  // Debounce lead search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (leadSearchQuery) {
        searchLeads(leadSearchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [leadSearchQuery]);

  const assignLeadToPaymentLink = async (leadId: string | null) => {
    if (!selectedLinkForAssign) return;

    setActionLoading(selectedLinkForAssign.id);
    try {
      const res = await fetch(`/api/payment-links/${selectedLinkForAssign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      
      if (res.ok) {
        setShowAssignLeadModal(false);
        setSelectedLinkForAssign(null);
        setLeadSearchQuery("");
        setLeadSearchResults([]);
        fetchPaymentLinks();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to assign lead");
      }
    } catch (error) {
      console.error("Failed to assign lead:", error);
      alert("Failed to assign lead");
    } finally {
      setActionLoading(null);
    }
  };

  const copyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-700";
      case "active":
        return "bg-blue-100 text-blue-700";
      case "expired":
        return "bg-[#FF8C6B]/20 text-[#FF8C6B]";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-stone-100 text-stone-700";
    }
  };

  // Export transactions to PDF - Stripe-inspired design
  const exportToPDF = (links: PaymentLink[], title: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Stripe brand colors
    const stripeBlurple = [99, 91, 255]; // Stripe's signature purple
    const stripeDark = [50, 50, 93]; // Dark blue-gray
    const stripeGray = [107, 114, 128]; // Text gray
    const stripeLight = [249, 250, 251]; // Light background
    
    // Header bar - Stripe blurple
    doc.setFillColor(stripeBlurple[0], stripeBlurple[1], stripeBlurple[2]);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    // Logo/Title in header
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Mamalu Kitchen", 14, 18);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Payment Links Report", 14, 28);
    
    // Report info on right side of header
    doc.setFontSize(9);
    doc.text(new Date().toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    }), pageWidth - 14, 18, { align: "right" });
    doc.text(title, pageWidth - 14, 28, { align: "right" });

    // Summary cards section
    const paidLinks = links.filter(l => l.status === "paid");
    const activeLinks = links.filter(l => l.status === "active");
    const totalCollected = paidLinks.reduce((sum, l) => sum + (l.paid_amount || l.amount), 0);
    
    // Card backgrounds
    const cardY = 45;
    const cardHeight = 28;
    const cardWidth = 42;
    const cardGap = 6;
    
    // Card 1 - Total
    doc.setFillColor(stripeLight[0], stripeLight[1], stripeLight[2]);
    doc.roundedRect(14, cardY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(stripeGray[0], stripeGray[1], stripeGray[2]);
    doc.setFontSize(8);
    doc.text("TOTAL LINKS", 18, cardY + 10);
    doc.setTextColor(stripeDark[0], stripeDark[1], stripeDark[2]);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(links.length.toString(), 18, cardY + 22);
    
    // Card 2 - Paid
    doc.setFillColor(stripeLight[0], stripeLight[1], stripeLight[2]);
    doc.roundedRect(14 + cardWidth + cardGap, cardY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(stripeGray[0], stripeGray[1], stripeGray[2]);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("PAID", 18 + cardWidth + cardGap, cardY + 10);
    doc.setTextColor(22, 163, 74); // green
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(paidLinks.length.toString(), 18 + cardWidth + cardGap, cardY + 22);
    
    // Card 3 - Active
    doc.setFillColor(stripeLight[0], stripeLight[1], stripeLight[2]);
    doc.roundedRect(14 + (cardWidth + cardGap) * 2, cardY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(stripeGray[0], stripeGray[1], stripeGray[2]);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("ACTIVE", 18 + (cardWidth + cardGap) * 2, cardY + 10);
    doc.setTextColor(59, 130, 246); // blue
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(activeLinks.length.toString(), 18 + (cardWidth + cardGap) * 2, cardY + 22);
    
    // Card 4 - Total Collected
    doc.setFillColor(stripeLight[0], stripeLight[1], stripeLight[2]);
    doc.roundedRect(14 + (cardWidth + cardGap) * 3, cardY, cardWidth + 10, cardHeight, 3, 3, 'F');
    doc.setTextColor(stripeGray[0], stripeGray[1], stripeGray[2]);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("COLLECTED", 18 + (cardWidth + cardGap) * 3, cardY + 10);
    doc.setTextColor(22, 163, 74); // green
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`AED ${totalCollected.toLocaleString()}`, 18 + (cardWidth + cardGap) * 3, cardY + 22);

    // Table
    const tableData = links.map(link => [
      link.link_code,
      link.title.length > 18 ? link.title.substring(0, 18) + "..." : link.title,
      link.customer_name || "—",
      `AED ${link.amount.toLocaleString()}`,
      link.status.charAt(0).toUpperCase() + link.status.slice(1),
      link.paid_at ? new Date(link.paid_at).toLocaleDateString() : "—",
      link.stripe_payment_intent_id ? link.stripe_payment_intent_id.replace('pi_', '').substring(0, 12) : "—",
      link.creator?.full_name?.split(" ")[0] || link.creator?.email?.split("@")[0] || "—"
    ]);

    autoTable(doc, {
      startY: cardY + cardHeight + 10,
      head: [["Code", "Description", "Customer", "Amount", "Status", "Paid", "Stripe Txn", "By"]],
      body: tableData,
      styles: { 
        fontSize: 7, 
        cellPadding: 3,
        font: "helvetica",
        textColor: [50, 50, 93],
      },
      headStyles: { 
        fillColor: [stripeBlurple[0], stripeBlurple[1], stripeBlurple[2]], 
        textColor: 255,
        fontStyle: "bold",
        fontSize: 7,
      },
      alternateRowStyles: { 
        fillColor: [stripeLight[0], stripeLight[1], stripeLight[2]] 
      },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: "bold" },
        1: { cellWidth: 32 },
        2: { cellWidth: 24 },
        3: { cellWidth: 20, halign: "right" },
        4: { cellWidth: 16 },
        5: { cellWidth: 20 },
        6: { cellWidth: 26, fontStyle: "bold", textColor: [99, 91, 255] },
        7: { cellWidth: 18 },
      },
      didParseCell: (data) => {
        // Color code status
        if (data.column.index === 4 && data.section === 'body') {
          const status = data.cell.raw?.toString().toLowerCase();
          if (status === 'paid') {
            data.cell.styles.textColor = [22, 163, 74]; // green
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'active') {
            data.cell.styles.textColor = [59, 130, 246]; // blue
          } else if (status === 'expired' || status === 'cancelled') {
            data.cell.styles.textColor = [239, 68, 68]; // red
          }
        }
      },
    });

    // Footer on each page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Footer line
      doc.setDrawColor(stripeBlurple[0], stripeBlurple[1], stripeBlurple[2]);
      doc.setLineWidth(0.5);
      doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
      
      // Footer text
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(stripeGray[0], stripeGray[1], stripeGray[2]);
      doc.text("Powered by Stripe", 14, pageHeight - 8);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - 14,
        pageHeight - 8,
        { align: "right" }
      );
    }

    return doc;
  };

  const exportToday = () => {
    const today = new Date().toISOString().split("T")[0];
    const todayLinks = paymentLinks.filter(link => {
      const createdDate = link.created_at.split("T")[0];
      const paidDate = link.paid_at?.split("T")[0];
      return createdDate === today || paidDate === today;
    });

    if (todayLinks.length === 0) {
      alert("No transactions found for today.");
      return;
    }

    const doc = exportToPDF(todayLinks, `Daily Report - ${new Date().toLocaleDateString()}`);
    doc.save(`payment-links-${today}.pdf`);
  };

  const exportDateRange = async () => {
    setExportLoading(true);
    try {
      const startDate = new Date(exportStartDate);
      const endDate = new Date(exportEndDate);
      endDate.setHours(23, 59, 59, 999);

      const filteredLinks = paymentLinks.filter(link => {
        const createdDate = new Date(link.created_at);
        const paidDate = link.paid_at ? new Date(link.paid_at) : null;
        return (
          (createdDate >= startDate && createdDate <= endDate) ||
          (paidDate && paidDate >= startDate && paidDate <= endDate)
        );
      });

      if (filteredLinks.length === 0) {
        alert("No transactions found for the selected date range.");
        return;
      }

      const doc = exportToPDF(
        filteredLinks,
        `Report: ${new Date(exportStartDate).toLocaleDateString()} - ${new Date(exportEndDate).toLocaleDateString()}`
      );
      doc.save(`payment-links-${exportStartDate}-to-${exportEndDate}.pdf`);
      setShowExportModal(false);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export report.");
    } finally {
      setExportLoading(false);
    }
  };

  const stats = {
    total: paymentLinks.length,
    active: paymentLinks.filter((l) => l.status === "active").length,
    paid: paymentLinks.filter((l) => l.status === "paid").length,
    totalCollected: paymentLinks
      .filter((l) => l.status === "paid")
      .reduce((sum, l) => sum + (l.paid_amount || l.amount), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Payment Links</h1>
          <p className="text-stone-500 mt-1">
            Create and manage custom payment links
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToday} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Today
          </Button>
          <Button onClick={() => setShowExportModal(true)} variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Date Range
          </Button>
          <Button onClick={fetchPaymentLinks} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Payment Link
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-violet-100">
              <LinkIcon className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">{stats.total}</p>
              <p className="text-sm text-stone-500">Total Links</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">{stats.active}</p>
              <p className="text-sm text-stone-500">Active</p>
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
                {formatPrice(stats.totalCollected)}
              </p>
              <p className="text-sm text-stone-500">Collected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="min-w-0 flex-1 basis-full sm:basis-52">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search payment links..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-stone-200 rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paid">Paid</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
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
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg"
              />
              <span className="text-stone-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    setCurrentPage(1);
                  }}
                  className="text-stone-400 hover:text-stone-600"
                  title="Clear date range"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Links Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="p-8 text-center">
              <LinkIcon className="h-12 w-12 text-stone-300 mx-auto mb-4" />
              <h3 className="font-semibold text-stone-900 mb-2">
                No payment links found
              </h3>
              <p className="text-stone-500">Create your first payment link to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-stone-500">
                      Link
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-stone-500">
                      Created By
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-stone-500">
                      Lead
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-stone-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredLinks.map((link) => (
                    <tr key={link.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-medium text-stone-900">
                          {link.link_code}
                        </div>
                        <div className="text-sm text-stone-700">{link.title}</div>
                        {link.description && (
                          <div className="text-xs text-stone-500 truncate max-w-[200px]">
                            {link.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {link.customer_name ? (
                          <>
                            <div className="font-medium text-stone-900">
                              {link.customer_name}
                            </div>
                            <div className="text-sm text-stone-500">
                              {link.customer_email}
                            </div>
                          </>
                        ) : (
                          <span className="text-stone-400 text-sm">Not specified</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-stone-900">
                          {formatPrice(link.amount)}
                        </div>
                        {(link.number_of_people || 1) > 1 && (
                          <div className="text-xs text-stone-500">
                            {link.number_of_people} people × {formatPrice(link.price_per_person || link.amount / link.number_of_people)}
                          </div>
                        )}
                        {link.paid_amount && link.paid_amount !== link.amount && (
                          <div className="text-xs text-green-600">
                            Paid: {formatPrice(link.paid_amount)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusBadge(link.status)}>
                          {link.status}
                        </Badge>
                        {link.single_use && (
                          <div className="text-xs text-stone-400 mt-1">Single use</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-stone-900">
                          {formatDate(link.created_at)}
                        </div>
                        {link.paid_at && (
                          <div className="text-xs text-green-600">
                            Paid: {formatDate(link.paid_at)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {link.creator ? (
                          <div className="text-sm text-stone-900">
                            {link.creator.full_name || link.creator.email || "Unknown"}
                          </div>
                        ) : (
                          <span className="text-stone-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {link.lead ? (
                          <div>
                            <div className="text-sm font-medium text-stone-900">
                              {link.lead.name}
                            </div>
                            <div className="text-xs text-stone-500">
                              {link.lead.email || link.lead.phone || link.lead.company}
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openAssignLeadModal(link)}
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 -ml-2"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Assign Lead
                          </Button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {link.stripe_payment_link_url && link.status === "active" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  copyLink(link.stripe_payment_link_url!, link.id)
                                }
                                title="Copy payment link"
                              >
                                {copiedLink === link.id ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                              <a
                                href={link.stripe_payment_link_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button size="sm" variant="ghost" title="Open payment link">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </a>
                            </>
                          )}
                          {link.status === "active" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markAsPaid(link.id, link.amount)}
                                disabled={actionLoading === link.id}
                                title="Mark as paid manually"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => cancelPaymentLink(link.id)}
                                disabled={actionLoading === link.id}
                                title="Cancel payment link"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </>
                          )}
                          {link.status === "paid" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openUnpaidModal(link)}
                              disabled={actionLoading === link.id}
                              title="Mark as unpaid"
                            >
                              <XCircle className="h-4 w-4 text-[#FF8C6B]" />
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t border-stone-200">
              <div className="text-sm text-stone-500">
                Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount} payment links
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Payment Link Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-stone-900">
                  Create Payment Link
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
                  Title *
                </label>
                <input
                  type="text"
                  value={newLink.title}
                  onChange={(e) =>
                    setNewLink({ ...newLink, title: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g., Private Cooking Session"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Price Per Person (AED) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newLink.amount}
                  onChange={(e) =>
                    setNewLink({ ...newLink, amount: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Number of People *
                </label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={newLink.numberOfPeople}
                  onChange={(e) =>
                    setNewLink({ ...newLink, numberOfPeople: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Number of people (1-40)"
                />
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-stone-700 mb-3">
                  Extras (Optional)
                </label>
                <div className="space-y-2">
                  {availableExtras.map((extra, index) => {
                    const existingExtra = newLink.extras.find(e => e.name === extra.name);
                    return (
                      <div key={index} className="flex items-center gap-3 p-2 border border-stone-200 rounded-lg">
                        <input
                          type="checkbox"
                          id={`extra-${index}`}
                          checked={!!existingExtra}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewLink({
                                ...newLink,
                                extras: [...newLink.extras, { name: extra.name, price: extra.price, quantity: 1 }]
                              });
                            } else {
                              setNewLink({
                                ...newLink,
                                extras: newLink.extras.filter(e => e.name !== extra.name)
                              });
                            }
                          }}
                          className="h-4 w-4 text-amber-600"
                        />
                        <label htmlFor={`extra-${index}`} className="flex-1 text-sm text-stone-700">
                          {extra.name} - AED {extra.price.toFixed(2)}
                        </label>
                        {existingExtra && (
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={existingExtra.quantity}
                            onChange={(e) => {
                              const qty = parseInt(e.target.value) || 1;
                              setNewLink({
                                ...newLink,
                                extras: newLink.extras.map(ex => 
                                  ex.name === extra.name ? { ...ex, quantity: qty } : ex
                                )
                              });
                            }}
                            className="w-20 px-2 py-1 border border-stone-300 rounded text-sm"
                            placeholder="Qty"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {newLink.amount && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-800">Price per person:</span>
                    <span className="font-medium text-amber-900">AED {parseFloat(newLink.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-amber-800">Number of people:</span>
                    <span className="font-medium text-amber-900">{newLink.numberOfPeople}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-amber-800">Subtotal:</span>
                    <span className="font-medium text-amber-900">AED {(parseFloat(newLink.amount) * newLink.numberOfPeople).toFixed(2)}</span>
                  </div>
                  {newLink.extras.length > 0 && (
                    <>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-amber-800">Extras:</span>
                        <span className="font-medium text-amber-900">AED {newLink.extras.reduce((sum, extra) => sum + (extra.price * extra.quantity), 0).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-sm mt-2 pt-2 border-t border-amber-300">
                    <span className="text-amber-800 font-medium">Total amount:</span>
                    <span className="font-bold text-amber-900">AED {(
                      (parseFloat(newLink.amount) * newLink.numberOfPeople) +
                      newLink.extras.reduce((sum, extra) => sum + (extra.price * extra.quantity), 0)
                    ).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newLink.description}
                  onChange={(e) =>
                    setNewLink({ ...newLink, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  rows={2}
                  placeholder="Payment description..."
                />
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-stone-700 mb-3">
                  Customer Info (Optional)
                </p>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newLink.customerName}
                    onChange={(e) =>
                      setNewLink({ ...newLink, customerName: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Customer name"
                  />
                  <input
                    type="email"
                    value={newLink.customerEmail}
                    onChange={(e) =>
                      setNewLink({ ...newLink, customerEmail: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="customer@email.com"
                  />
                  <input
                    type="tel"
                    value={newLink.customerPhone}
                    onChange={(e) =>
                      setNewLink({ ...newLink, customerPhone: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="+971 XX XXX XXXX"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="singleUse"
                  checked={newLink.singleUse}
                  onChange={(e) =>
                    setNewLink({ ...newLink, singleUse: e.target.checked })
                  }
                  className="rounded border-stone-300"
                />
                <label htmlFor="singleUse" className="text-sm text-stone-700">
                  Single use (deactivate after one payment)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Internal Notes
                </label>
                <textarea
                  value={newLink.notes}
                  onChange={(e) =>
                    setNewLink({ ...newLink, notes: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  rows={2}
                  placeholder="Notes for internal reference..."
                />
              </div>
            </div>

            <div className="p-6 border-t bg-stone-50 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={createPaymentLink}
                disabled={actionLoading === "create"}
              >
                {actionLoading === "create" ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create & Copy Link
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Unpaid Modal */}
      {showUnpaidModal && selectedLinkForUnpaid && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-stone-900">
                  Mark as Unpaid
                </h2>
                <button
                  onClick={() => setShowUnpaidModal(false)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-[#FF8C6B]/10 border border-[#FF8C6B]/30 rounded-lg p-4">
                <p className="text-sm text-[#FF8C6B] font-medium mb-2">
                  You are about to mark this payment link as unpaid:
                </p>
                <p className="text-sm text-stone-700">
                  <strong>{selectedLinkForUnpaid.title}</strong>
                </p>
                <p className="text-sm text-stone-600">
                  Code: {selectedLinkForUnpaid.link_code}
                </p>
                <p className="text-sm text-stone-600">
                  Amount: {formatPrice(selectedLinkForUnpaid.paid_amount || selectedLinkForUnpaid.amount)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Reason for marking as unpaid *
                </label>
                <textarea
                  value={unpaidReason}
                  onChange={(e) => setUnpaidReason(e.target.value)}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  rows={4}
                  placeholder="Please provide a detailed reason for reverting this payment status..."
                />
              </div>

              <div className="bg-stone-50 rounded-lg p-4">
                <p className="text-xs text-stone-600">
                  This action will be logged with your user ID and the reason provided.
                  The payment link will be reactivated and can be used again.
                </p>
              </div>
            </div>

            <div className="p-6 border-t bg-stone-50 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowUnpaidModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={markAsUnpaid}
                disabled={actionLoading === selectedLinkForUnpaid.id || !unpaidReason.trim()}
                className="bg-[#FF8C6B] hover:bg-[#ff7a54]"
              >
                {actionLoading === selectedLinkForUnpaid.id ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Mark as Unpaid
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Export Date Range Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <FileText className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-stone-900">Export Report</h2>
                  <p className="text-sm text-stone-500">Select date range for PDF export</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="bg-stone-50 rounded-lg p-4">
                <p className="text-sm text-stone-600">
                  This will export all payment links created or paid within the selected date range.
                </p>
              </div>
            </div>

            <div className="p-6 border-t bg-stone-50 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowExportModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={exportDateRange}
                disabled={exportLoading}
              >
                {exportLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Lead Modal */}
      {showAssignLeadModal && selectedLinkForAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-stone-900">Assign Lead</h2>
                  <p className="text-sm text-stone-500 mt-1">
                    Link <span className="font-mono">{selectedLinkForAssign.link_code}</span> to a lead
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAssignLeadModal(false);
                    setSelectedLinkForAssign(null);
                    setLeadSearchQuery("");
                    setLeadSearchResults([]);
                  }}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Search Input */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Search for a lead
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    value={leadSearchQuery}
                    onChange={(e) => setLeadSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Search by name, email, phone, or company..."
                    autoFocus
                  />
                  {searchingLeads && (
                    <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500 animate-spin" />
                  )}
                </div>
              </div>

              {/* Search Results */}
              <div className="border border-stone-200 rounded-lg max-h-64 overflow-y-auto">
                {leadSearchResults.length === 0 ? (
                  <div className="p-4 text-center text-stone-500 text-sm">
                    {leadSearchQuery.length < 2
                      ? "Type at least 2 characters to search"
                      : searchingLeads
                      ? "Searching..."
                      : "No leads found"}
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {leadSearchResults.map((lead) => (
                      <button
                        key={lead.id}
                        onClick={() => assignLeadToPaymentLink(lead.id)}
                        disabled={actionLoading === selectedLinkForAssign.id}
                        className="w-full p-3 text-left hover:bg-amber-50 transition-colors flex items-center gap-3"
                      >
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#ffa891] to-[#FF8C6B] flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {lead.name?.charAt(0) || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-stone-900 truncate">
                            {lead.name}
                          </div>
                          <div className="text-sm text-stone-500 truncate">
                            {lead.email || lead.phone || lead.company || "No contact info"}
                          </div>
                        </div>
                        <Badge className="flex-shrink-0 text-xs">
                          {lead.status}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Current Assignment */}
              {selectedLinkForAssign.lead && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-sm font-semibold">
                        {selectedLinkForAssign.lead.name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <div className="font-medium text-amber-900">
                          Currently assigned to: {selectedLinkForAssign.lead.name}
                        </div>
                        <div className="text-xs text-amber-700">
                          {selectedLinkForAssign.lead.email || selectedLinkForAssign.lead.phone}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => assignLeadToPaymentLink(null)}
                      disabled={actionLoading === selectedLinkForAssign.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-stone-50 flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssignLeadModal(false);
                  setSelectedLinkForAssign(null);
                  setLeadSearchQuery("");
                  setLeadSearchResults([]);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
