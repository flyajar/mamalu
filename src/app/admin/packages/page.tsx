"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  Upload,
  Image as ImageIcon,
  Package,
  Search,
  Loader2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  price_unit: string;
  categories: string[];
  image_url: string | null;
  emoji: string | null;
}

interface PackageItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  price_unit: string;
  categories: string[];
  image_url: string | null;
  emoji: string | null;
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
  metadata: {
    class_count?: number;
  } | null;
  menu_items: MenuItem[];
  created_at: string;
}

const CATEGORIES = [
  { id: "all", name: "All" },
  { id: "packages", name: "Packages" },
  { id: "birthday", name: "Kids Birthday" },
  { id: "classics_mini", name: "Our Classics (Mini Chef)" },
  { id: "classics_big", name: "Our Classics (Big Chef)" },
  { id: "monthly_mini", name: "Monthly Specials (Mini Chef)" },
  { id: "monthly_big", name: "Monthly Specials (Big Chef)" },
  { id: "mommy_me", name: "Mommy & Me" },
  { id: "corporate", name: "Corporate/Private" },
  { id: "nanny", name: "Nanny Classes" },
  { id: "teenagers", name: "Teenager Course" },
  { id: "walkin", name: "Walk-In Menu" },
  { id: "extras_food", name: "Food Add-ons" },
  { id: "extras_merch", name: "Merch Add-ons" },
];

const CATEGORY_COLORS: Record<string, string> = {
  packages: "bg-yellow-100 text-yellow-700",
  birthday: "bg-pink-100 text-pink-700",
  classics_mini: "bg-sky-100 text-sky-700",
  classics_big: "bg-blue-100 text-blue-700",
  monthly_mini: "bg-teal-100 text-teal-700",
  monthly_big: "bg-cyan-100 text-cyan-700",
  mommy_me: "bg-rose-100 text-rose-700",
  corporate: "bg-indigo-100 text-indigo-700",
  nanny: "bg-green-100 text-green-700",
  teenagers: "bg-orange-100 text-orange-700",
  walkin: "bg-amber-100 text-amber-700",
  extras_food: "bg-red-100 text-red-700",
  extras_merch: "bg-purple-100 text-purple-700",
};

const extractClassCountFromName = (name: string) => {
  const match = name.match(/\b(\d+)\b/);
  return match ? parseInt(match[1], 10) : 0;
};

const emptyPackage = {
  name: "",
  description: "",
  price: 0,
  price_unit: "per person",
  categories: [] as string[],
  image_url: null as string | null,
  emoji: "",
  is_active: true,
  is_popular: false,
  sort_order: 0,
  metadata: {
    class_count: 1,
  },
  menu_item_ids: [] as string[],
};

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingPkg, setEditingPkg] = useState<typeof emptyPackage & { id?: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [itemSearch, setItemSearch] = useState("");
  const [itemCategoryFilter, setItemCategoryFilter] = useState("all");

  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPackages();
    fetchMenuItems();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/packages");
      if (res.ok) {
        const data = await res.json();
        setPackages(data.packages || []);
      }
    } catch (error) {
      console.error("Error fetching packages:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const res = await fetch("/api/admin/menu-items");
      if (res.ok) {
        const data = await res.json();
        setAllMenuItems(data.items || []);
      }
    } catch (error) {
      console.error("Error fetching menu items:", error);
    }
  };

  const openCreate = () => {
    setEditingPkg({ ...emptyPackage, metadata: { ...emptyPackage.metadata }, categories: ["packages"], menu_item_ids: [] });
    setIsCreating(true);
    setItemSearch("");
    setItemCategoryFilter("all");
  };

  const openEdit = (pkg: PackageItem) => {
    setEditingPkg({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description || "",
      price: pkg.price,
      price_unit: pkg.price_unit,
      categories: ["packages"],
      image_url: pkg.image_url,
      emoji: pkg.emoji || "",
      is_active: pkg.is_active,
      is_popular: pkg.is_popular,
      sort_order: pkg.sort_order,
      metadata: {
        ...(pkg.metadata || {}),
        class_count: pkg.metadata?.class_count || extractClassCountFromName(pkg.name) || 1,
      },
      menu_item_ids: pkg.menu_items.map((m) => m.id),
    });
    setIsCreating(false);
    setItemSearch("");
    setItemCategoryFilter("all");
  };

  const handleSave = async () => {
    if (!editingPkg?.name) return;
    setSaving(true);
    try {
      const url = isCreating ? "/api/admin/packages" : `/api/admin/packages/${editingPkg.id}`;
      const method = isCreating ? "POST" : "PUT";
      const payload = {
        ...editingPkg,
        metadata: {
          ...(editingPkg.metadata || {}),
          class_count: Math.max(1, Number(editingPkg.metadata?.class_count) || 1),
        },
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchPackages();
        setEditingPkg(null);
        setIsCreating(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save");
      }
    } catch {
      alert("Failed to save package");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this package? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/packages/${id}`, { method: "DELETE" });
      if (res.ok) setPackages(packages.filter((p) => p.id !== id));
    } catch {
      alert("Failed to delete package");
    }
  };

  const handleToggleActive = async (pkg: PackageItem) => {
    try {
      const res = await fetch(`/api/admin/packages/${pkg.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !pkg.is_active }),
      });
      if (res.ok)
        setPackages(packages.map((p) => (p.id === pkg.id ? { ...p, is_active: !p.is_active } : p)));
    } catch {
      alert("Failed to update package");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (editingPkg?.id) formData.append("menuItemId", editingPkg.id);

      const res = await fetch("/api/admin/menu-items/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setEditingPkg((prev) => prev ? { ...prev, image_url: data.url } : prev);
      } else {
        const err = await res.json();
        alert(err.error || "Upload failed");
      }
    } catch {
      alert("Failed to upload image");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const toggleMenuItem = (itemId: string) => {
    setEditingPkg((prev) => {
      if (!prev) return prev;
      const current = prev.menu_item_ids || [];
      const next = current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId];
      return { ...prev, menu_item_ids: next };
    });
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredPackages = packages.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || (p.categories || []).includes(categoryFilter);
    return matchesSearch && matchesCategory;
  });

  const filteredMenuItems = allMenuItems.filter((item) => {
    const matchesSearch =
      !itemSearch || item.name.toLowerCase().includes(itemSearch.toLowerCase());
    const matchesCategory =
      itemCategoryFilter === "all" || (item.categories || []).includes(itemCategoryFilter);
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: packages.length,
    active: packages.filter((p) => p.is_active).length,
    totalItems: packages.reduce((sum, p) => sum + p.menu_items.length, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              <Package className="h-7 w-7" />
              Packages
            </h1>
            <p className="text-stone-500 mt-1">Curated sets of menu items customers can choose from</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Package
          </Button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Total Packages", value: stats.total, color: "from-stone-500 to-stone-600" },
            { label: "Active", value: stats.active, color: "from-green-500 to-emerald-600" },
            { label: "Total Menu Items Linked", value: stats.totalItems, color: "from-amber-500 to-orange-500" },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl bg-gradient-to-br ${s.color} p-5 text-white`}>
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="text-sm opacity-80 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search packages..."
              className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 bg-white"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 bg-white text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Package</th>
                <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Description</th>
                <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Price</th>
                <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Classes</th>
                <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Categories</th>
                <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Items</th>
                <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Status</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredPackages.map((pkg) => {
                const isExpanded = expandedRows.has(pkg.id);
                return (
                  <>
                    <tr key={pkg.id} className="hover:bg-stone-50 group transition-colors">
                      {/* Image + Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 flex items-center justify-center shrink-0">
                            {pkg.image_url ? (
                              <img src={pkg.image_url} alt={pkg.name} className="w-full h-full object-cover" />
                            ) : pkg.emoji ? (
                              <span className="text-2xl">{pkg.emoji}</span>
                            ) : (
                              <Package className="h-5 w-5 text-stone-300" />
                            )}
                          </div>
                          <span className="font-medium text-stone-900 text-sm">{pkg.name}</span>
                        </div>
                      </td>
                      {/* Description */}
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-sm text-stone-500 truncate">{pkg.description || "—"}</p>
                      </td>
                      {/* Price */}
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-stone-900">{formatPrice(pkg.price)}</p>
                        <p className="text-xs text-stone-400">{pkg.price_unit}</p>
                      </td>
                      {/* Class count */}
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-stone-900">{pkg.metadata?.class_count || extractClassCountFromName(pkg.name) || "—"}</p>
                        <p className="text-xs text-stone-400">selectable</p>
                      </td>
                      {/* Categories */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(pkg.categories || []).length === 0 ? (
                            <span className="text-xs text-stone-400">—</span>
                          ) : (
                            (pkg.categories || []).map((catId) => (
                              <span
                                key={catId}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[catId] || "bg-stone-100 text-stone-600"}`}
                              >
                                {CATEGORIES.find((c) => c.id === catId)?.name || catId}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      {/* Items count */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleRow(pkg.id)}
                          className="flex items-center gap-1.5 text-sm text-stone-700 hover:text-stone-900 transition-colors"
                        >
                          <span className="font-semibold">{pkg.menu_items.length}</span>
                          <span className="text-stone-400">item{pkg.menu_items.length !== 1 ? "s" : ""}</span>
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5 text-stone-400" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
                          )}
                        </button>
                      </td>
                      {/* Status */}
                      <td className="px-6 py-4">
                        <Badge
                          className={
                            pkg.is_active
                              ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-stone-100 text-stone-500 border-stone-200"
                          }
                          variant="outline"
                        >
                          {pkg.is_active ? "Active" : "Hidden"}
                        </Badge>
                      </td>
                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          <button
                            onClick={() => handleToggleActive(pkg)}
                            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
                            title={pkg.is_active ? "Hide" : "Show"}
                          >
                            {pkg.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => openEdit(pkg)}
                            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(pkg.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${pkg.id}-expanded`}>
                        <td colSpan={8} className="px-6 pb-4 pt-0 bg-stone-50">
                          <div className="ml-16 space-y-1.5">
                            {pkg.menu_items.length === 0 ? (
                              <p className="text-sm text-stone-400 italic">No menu items in this package</p>
                            ) : (
                              pkg.menu_items.map((item, idx) => (
                                <div key={item.id} className="flex items-center gap-3 py-1.5 px-3 bg-white rounded-lg border border-stone-100">
                                  <span className="text-xs text-stone-400 w-4">{idx + 1}.</span>
                                  <div className="w-7 h-7 rounded-lg overflow-hidden bg-stone-100 flex items-center justify-center shrink-0">
                                    {item.image_url ? (
                                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                    ) : item.emoji ? (
                                      <span className="text-sm">{item.emoji}</span>
                                    ) : (
                                      <ImageIcon className="h-3.5 w-3.5 text-stone-300" />
                                    )}
                                  </div>
                                  <span className="text-sm font-medium text-stone-800 flex-1">{item.name}</span>
                                  <span className="text-xs text-stone-500">{formatPrice(item.price)}</span>
                                  <div className="flex gap-1">
                                    {(item.categories || []).slice(0, 2).map((catId) => (
                                      <span key={catId} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[catId] || "bg-stone-100 text-stone-600"}`}>
                                        {CATEGORIES.find((c) => c.id === catId)?.name || catId}
                                      </span>
                                    ))}
                                    {(item.categories || []).length > 2 && (
                                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500">
                                        +{item.categories.length - 2}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {filteredPackages.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-stone-500">
                    <Package className="h-10 w-10 mx-auto mb-3 text-stone-300" />
                    <p className="font-medium">No packages found</p>
                    <p className="text-sm mt-1">
                      {search || categoryFilter !== "all"
                        ? "Try adjusting your filters"
                        : 'Click "Add Package" to create your first package'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {editingPkg && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
              <h2 className="text-xl font-bold text-stone-900">
                {isCreating ? "Add Package" : "Edit Package"}
              </h2>
              <button onClick={() => { setEditingPkg(null); setIsCreating(false); }}>
                <X className="h-5 w-5 text-stone-400 hover:text-stone-600" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Image</label>
                <div className="flex items-center gap-4">
                  <div
                    className="relative w-28 h-28 rounded-xl bg-stone-100 flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-stone-300 hover:border-amber-400 transition-colors"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    {editingPkg.image_url ? (
                      <img src={editingPkg.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Upload className="h-6 w-6 mx-auto text-stone-400" />
                        <p className="text-xs text-stone-400 mt-1">Upload</p>
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    )}
                  </div>
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm text-stone-500">Click to upload an image</p>
                    <p className="text-xs text-stone-400">JPG, PNG, WebP — max 5MB</p>
                    {editingPkg.image_url && (
                      <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700"
                        onClick={() => setEditingPkg((p) => p ? { ...p, image_url: null } : p)}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingPkg.name}
                  onChange={(e) => setEditingPkg((p) => p ? { ...p, name: e.target.value } : p)}
                  placeholder="e.g. Birthday Deluxe Package"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                <textarea
                  value={editingPkg.description || ""}
                  onChange={(e) => setEditingPkg((p) => p ? { ...p, description: e.target.value } : p)}
                  placeholder="Describe what's included in this package..."
                  rows={3}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                />
              </div>

              {/* Price + Unit + Class Count */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Price (AED) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingPkg.price ?? ""}
                    onChange={(e) => setEditingPkg((p) => p ? { ...p, price: parseFloat(e.target.value) || 0 } : p)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Unit</label>
                  <select
                    value={editingPkg.price_unit}
                    onChange={(e) => setEditingPkg((p) => p ? { ...p, price_unit: e.target.value } : p)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                  >
                    <option value="per person">Per Person</option>
                    <option value="per item">Per Item</option>
                    <option value="per portion">Per Portion</option>
                    <option value="per bag">Per Bag</option>
                    <option value="flat rate">Flat Rate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Class Count <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editingPkg.metadata?.class_count ?? 1}
                    onChange={(e) => setEditingPkg((p) => p ? {
                      ...p,
                      metadata: {
                        ...(p.metadata || {}),
                        class_count: Math.max(1, parseInt(e.target.value, 10) || 1),
                      },
                    } : p)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                  />
                </div>
              </div>

              {/* Menu Items Selection */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Menu Items
                  {editingPkg.menu_item_ids.length > 0 && (
                    <span className="ml-2 text-xs text-stone-400">({editingPkg.menu_item_ids.length} selected)</span>
                  )}
                </label>
                <p className="text-xs text-stone-400 mb-3">Select which menu items customers can choose from in this package</p>

                {/* Selected items preview */}
                {editingPkg.menu_item_ids.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    {editingPkg.menu_item_ids.map((id) => {
                      const item = allMenuItems.find((m) => m.id === id);
                      if (!item) return null;
                      return (
                        <span key={id} className="flex items-center gap-1 text-xs bg-white border border-amber-300 text-amber-800 px-2 py-1 rounded-full">
                          {item.emoji && <span>{item.emoji}</span>}
                          {item.name}
                          <button onClick={() => toggleMenuItem(id)} className="ml-0.5 hover:text-red-600">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Search + filter for menu items */}
                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                    <input
                      type="text"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Search items..."
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                    />
                  </div>
                  <select
                    value={itemCategoryFilter}
                    onChange={(e) => setItemCategoryFilter(e.target.value)}
                    className="px-2 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Item grid */}
                <div className="border border-stone-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  {filteredMenuItems.length === 0 ? (
                    <p className="text-sm text-stone-400 text-center py-6">No items found</p>
                  ) : (
                    filteredMenuItems.map((item) => {
                      const selected = editingPkg.menu_item_ids.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer border-b border-stone-100 last:border-0 transition-colors ${
                            selected ? "bg-amber-50" : "hover:bg-stone-50"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            selected ? "bg-amber-500 border-amber-500" : "border-stone-300"
                          }`}>
                            {selected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                          </div>
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-stone-100 flex items-center justify-center shrink-0">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : item.emoji ? (
                              <span className="text-base">{item.emoji}</span>
                            ) : (
                              <ImageIcon className="h-4 w-4 text-stone-300" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-800 truncate">{item.name}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-stone-400">{formatPrice(item.price)}</p>
                              <div className="flex gap-1">
                                {(item.categories || []).slice(0, 1).map((catId) => (
                                  <span key={catId} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[catId] || "bg-stone-100 text-stone-600"}`}>
                                    {CATEGORIES.find((c) => c.id === catId)?.name || catId}
                                  </span>
                                ))}
                                {(item.categories || []).length > 1 && (
                                  <span className="text-xs text-stone-400">+{item.categories.length - 1}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleMenuItem(item.id)}
                            className="hidden"
                          />
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPkg.is_active}
                    onChange={(e) => setEditingPkg((p) => p ? { ...p, is_active: e.target.checked } : p)}
                    className="rounded"
                  />
                  <span className="text-sm text-stone-700">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPkg.is_popular}
                    onChange={(e) => setEditingPkg((p) => p ? { ...p, is_popular: e.target.checked } : p)}
                    className="rounded"
                  />
                  <span className="text-sm text-stone-700">Popular</span>
                </label>
              </div>
            </div>

            {/* Modal footer */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
              <Button variant="outline" onClick={() => { setEditingPkg(null); setIsCreating(false); }}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !editingPkg.name}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {isCreating ? "Create Package" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
