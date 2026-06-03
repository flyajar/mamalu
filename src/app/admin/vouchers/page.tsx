"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  Search,
  Loader2,
  Tag,
  DollarSign,
  Copy,
  Check,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface Voucher {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_value: number | null;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

const emptyForm = {
  code: "",
  discount_type: "fixed" as "percentage" | "fixed",
  discount_value: 0,
  is_active: true,
};

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [editing, setEditing] = useState<typeof emptyForm & { id?: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/vouchers");
      if (res.ok) {
        const data = await res.json();
        setVouchers(data.vouchers || []);
      }
    } catch (error) {
      console.error("Error fetching vouchers:", error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing({ ...emptyForm, code: generateCode() });
    setIsCreating(true);
  };

  const openEdit = (v: Voucher) => {
    setEditing({
      id: v.id,
      code: v.code,
      discount_type: "fixed",
      discount_value: v.discount_value,
      is_active: v.is_active,
    });
    setIsCreating(false);
  };

  const closeModal = () => {
    setEditing(null);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!editing?.code || !editing.discount_value) return;
    setSaving(true);
    try {
      const url = isCreating ? "/api/admin/vouchers" : `/api/admin/vouchers/${editing.id}`;
      const method = isCreating ? "POST" : "PUT";

      const payload = {
        ...editing,
        discount_type: "fixed",
        discount_value: Number(editing.discount_value),
        min_order_value: null,
        max_uses: null,
        valid_from: null,
        valid_until: null,
        description: null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchVouchers();
        closeModal();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save");
      }
    } catch {
      alert("Failed to save voucher");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this voucher? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/vouchers/${id}`, { method: "DELETE" });
      if (res.ok) setVouchers((prev) => prev.filter((v) => v.id !== id));
      else alert("Failed to delete voucher");
    } catch {
      alert("Failed to delete voucher");
    }
  };

  const handleToggleActive = async (v: Voucher) => {
    try {
      const res = await fetch(`/api/admin/vouchers/${v.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !v.is_active }),
      });
      if (res.ok) {
        setVouchers((prev) => prev.map((item) => item.id === v.id ? { ...item, is_active: !v.is_active } : item));
      }
    } catch {
      alert("Failed to update voucher");
    }
  };

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const isExpired = (v: Voucher) => v.valid_until && new Date(v.valid_until) < new Date();
  const isExhausted = (v: Voucher) => v.max_uses !== null && v.used_count >= v.max_uses;

  const getStatusBadge = (v: Voucher) => {
    if (!v.is_active) return { label: "Inactive", className: "bg-stone-100 text-stone-500" };
    if (isExpired(v)) return { label: "Expired", className: "bg-red-100 text-red-600" };
    if (isExhausted(v)) return { label: "Used up", className: "bg-orange-100 text-orange-600" };
    return { label: "Active", className: "bg-green-100 text-green-700" };
  };

  const filteredVouchers = vouchers.filter((v) => {
    const matchesSearch =
      !search ||
      v.code.toLowerCase().includes(search.toLowerCase()) ||
      (v.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && v.is_active) ||
      (filterStatus === "inactive" && !v.is_active);
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: vouchers.length,
    active: vouchers.filter((v) => v.is_active && !isExpired(v) && !isExhausted(v)).length,
    totalUses: vouchers.reduce((sum, v) => sum + v.used_count, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-2">
            <Tag className="h-8 w-8" />
            Vouchers
          </h1>
          <p className="text-stone-500 mt-1">Create and manage gift card vouchers</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Voucher
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Vouchers", value: stats.total, color: "from-violet-500 to-purple-600" },
          { label: "Currently Active", value: stats.active, color: "from-green-500 to-emerald-600" },
          { label: "Total Redemptions", value: stats.totalUses, color: "from-[#FF8C6B] to-[#ff7a54]" },
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
            placeholder="Search by code or description..."
            className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 bg-white text-sm"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="px-3 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 bg-white text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Code</th>
              <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Discount</th>
              <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Usage</th>
              <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Validity</th>
              <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Status</th>
              <th className="px-6 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredVouchers.map((v) => {
              const badge = getStatusBadge(v);
              return (
                <tr key={v.id} className="hover:bg-stone-50 group transition-colors">
                  {/* Code */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-stone-900 tracking-wider">{v.code}</span>
                      <button
                        onClick={() => copyCode(v.id, v.code)}
                        className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
                        title="Copy code"
                      >
                        {copiedId === v.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    {v.description && (
                      <p className="text-xs text-stone-400 mt-0.5 max-w-xs truncate">{v.description}</p>
                    )}
                  </td>
                  {/* Discount */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-emerald-500" />
                      <span className="font-semibold text-stone-900">AED {v.discount_value}</span>
                    </div>
                  </td>
                  {/* Usage */}
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-stone-900">
                      {v.used_count}
                      {v.max_uses !== null && (
                        <span className="text-stone-400 font-normal"> / {v.max_uses}</span>
                      )}
                    </p>
                    <p className="text-xs text-stone-400">redemptions</p>
                  </td>
                  {/* Validity */}
                  <td className="px-6 py-4">
                    {v.valid_from || v.valid_until ? (
                      <div className="text-xs text-stone-600 space-y-0.5">
                        {v.valid_from && <p>From: {formatDate(v.valid_from)}</p>}
                        {v.valid_until && <p>Until: {formatDate(v.valid_until)}</p>}
                      </div>
                    ) : (
                      <span className="text-xs text-stone-400">No expiry</span>
                    )}
                  </td>
                  {/* Status */}
                  <td className="px-6 py-4">
                    <Badge className={badge.className} variant="outline">
                      {badge.label}
                    </Badge>
                  </td>
                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button
                        onClick={() => handleToggleActive(v)}
                        className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
                        title={v.is_active ? "Deactivate" : "Activate"}
                      >
                        {v.is_active
                          ? <ToggleRight className="h-4 w-4 text-green-500" />
                          : <ToggleLeft className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => openEdit(v)}
                        className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredVouchers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-stone-500">
                  <Tag className="h-10 w-10 mx-auto mb-3 text-stone-300" />
                  <p className="font-medium">No vouchers found</p>
                  <p className="text-sm mt-1">
                    {search || filterStatus !== "all"
                      ? "Try adjusting your filters"
                      : 'Click "Add Voucher" to create your first gift card'}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
              <h2 className="text-xl font-bold text-stone-900">
                {isCreating ? "Create Gift Card" : "Edit Gift Card"}
              </h2>
              <button onClick={closeModal}>
                <X className="h-5 w-5 text-stone-400 hover:text-stone-600" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Code <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editing.code}
                    onChange={(e) => setEditing((p) => p ? { ...p, code: e.target.value.toUpperCase() } : p)}
                    placeholder="e.g. GIFT2025"
                    className="flex-1 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 font-mono uppercase"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing((p) => p ? { ...p, code: generateCode() } : p)}
                    type="button"
                  >
                    Generate
                  </Button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Amount (AED) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">AED</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editing.discount_value || ""}
                    onChange={(e) => setEditing((p) => p ? { ...p, discount_value: parseFloat(e.target.value) || 0 } : p)}
                    placeholder="0"
                    className="w-full pl-14 pr-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                  />
                </div>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.is_active}
                  onChange={(e) => setEditing((p) => p ? { ...p, is_active: e.target.checked } : p)}
                  className="rounded"
                />
                <span className="text-sm text-stone-700">Active</span>
              </label>
            </div>

            {/* Modal footer */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={saving || !editing.code || !editing.discount_value}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {isCreating ? "Create Gift Card" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
