"use client";

import { useCallback, useState, useEffect } from "react";
import {
  Gift,
  Loader2,
  Search,
  Copy,
  Check,
  Mail,
  MailCheck,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPrice } from "@/lib/utils";

interface Purchase {
  id: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  voucher_code: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  status: "pending" | "paid" | "failed" | "refunded";
  email_sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  is_claimed?: boolean;
}

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-600",
  refunded: "bg-stone-100 text-stone-500",
  claimed: "bg-purple-100 text-purple-700",
};

export default function VoucherPurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sendingFollowUpId, setSendingFollowUpId] = useState<string | null>(null);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/voucher-purchases?status=${filterStatus}`);
      const data = await res.json();
      setPurchases(data.purchases || []);
    } catch {
      console.error("Failed to fetch purchases");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const sendFollowUp = async (id: string) => {
    setSendingFollowUpId(id);
    try {
      const res = await fetch(`/api/admin/voucher-purchases/${id}/send-follow-up`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send follow-up email");
      }

      alert("Follow-up email sent.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to send follow-up email");
    } finally {
      setSendingFollowUpId(null);
    }
  };

  const filtered = purchases.filter(
    (p) =>
      !search ||
      p.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      p.customer_email.toLowerCase().includes(search.toLowerCase()) ||
      (p.voucher_code || "").toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: purchases.length,
    paid: purchases.filter((p) => p.status === "paid").length,
    revenue: purchases
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-2">
          <Gift className="h-8 w-8" />
          Gift Card Purchases
        </h1>
        <p className="text-stone-500 mt-1">Track all customer gift card purchases</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Orders", value: stats.total, color: "from-violet-500 to-purple-600" },
          { label: "Paid", value: stats.paid, color: "from-green-500 to-emerald-600" },
          { label: "Revenue", value: formatPrice(stats.revenue), color: "from-[#FF8C6B] to-[#ff7a54]" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl bg-gradient-to-br ${s.color} p-5 text-white`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-sm opacity-80 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or code…"
            className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 bg-white text-sm"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 bg-white text-sm"
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="claimed">Claimed</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-stone-300" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                {["Customer", "Amount", "Code", "Status", "Email Sent", "Date", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                  {/* Customer */}
                  <td className="px-6 py-4">
                    <p className="font-medium text-stone-900 text-sm">{p.customer_name}</p>
                    <p className="text-xs text-stone-400">{p.customer_email}</p>
                  </td>
                  {/* Amount */}
                  <td className="px-6 py-4">
                    <span className="font-bold text-stone-900">{formatPrice(p.amount)}</span>
                  </td>
                  {/* Code */}
                  <td className="px-6 py-4">
                    {p.voucher_code ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-stone-800 tracking-wider text-sm">
                          {p.voucher_code}
                        </span>
                        <button
                          onClick={() => copyCode(p.id, p.voucher_code!)}
                          className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
                          title="Copy code"
                        >
                          {copiedId === p.id ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-stone-400">—</span>
                    )}
                  </td>
                  {/* Status */}
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      <Badge
                        className={STATUS_STYLE[p.status] || "bg-stone-100 text-stone-500"}
                        variant="outline"
                      >
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </Badge>
                      {p.is_claimed && (
                        <Badge className={STATUS_STYLE.claimed} variant="outline">
                          Claimed
                        </Badge>
                      )}
                    </div>
                  </td>
                  {/* Email */}
                  <td className="px-6 py-4">
                    {p.email_sent_at ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <MailCheck className="h-4 w-4" />
                        <span className="text-xs">{formatDate(p.email_sent_at)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-stone-400">
                        <Mail className="h-4 w-4" />
                        <span className="text-xs">Not sent</span>
                      </div>
                    )}
                  </td>
                  {/* Date */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-stone-600">{formatDate(p.created_at)}</span>
                    {p.paid_at && (
                      <p className="text-xs text-stone-400">Paid {formatDate(p.paid_at)}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {p.status === "pending" ? (
                      <button
                        onClick={() => sendFollowUp(p.id)}
                        disabled={sendingFollowUpId === p.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Send follow-up email"
                      >
                        {sendingFollowUpId === p.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        Follow up
                      </button>
                    ) : (
                      <span className="text-xs text-stone-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-stone-500">
                    <Gift className="h-10 w-10 mx-auto mb-3 text-stone-300" />
                    <p className="font-medium">No purchases found</p>
                    <p className="text-sm mt-1">
                      {search || filterStatus !== "all"
                        ? "Try adjusting your filters"
                        : "Gift card purchases will appear here"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
