"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Edit3,
  Save,
  X,
  Upload,
  Image as ImageIcon,
  UtensilsCrossed,
  Search,
  Loader2,
  FileSpreadsheet,
  Download,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import * as XLSX from "xlsx";

interface MenuItem {
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
  scheduled_date: string | null;
  allowed_persons: number | null;
  metadata: {
    monthly_special_end_time?: string;
    monthly_special_schedules?: MonthlySpecialSchedule[];
    [key: string]: unknown;
  } | null;
  created_at: string;
}

interface MonthlySpecialTimeRange {
  start: string;
  end: string;
}

interface MonthlySpecialSchedule {
  date: string;
  times: MonthlySpecialTimeRange[];
}

const CATEGORIES = [
  { id: "all", name: "All" },
  { id: "birthday", name: "Kids Birthday" },
  { id: "classics_mini", name: "Our Classics (Mini Chef)" },
  { id: "classics_big", name: "Our Classics (Big Chef)" },
  { id: "monthly_mini", name: "Monthly Specials (Mini Chef)" },
  { id: "monthly_big", name: "Monthly Specials (Big Chef)" },
  { id: "mommy_me", name: "Mommy & Me" },
  { id: "summer_camp", name: "Summer Camp" },
  { id: "corporate", name: "Corporate/Private" },
  { id: "nanny", name: "Nanny Classes" },
  { id: "teenagers", name: "Teenager Course" },
  { id: "walkin", name: "Walk-In Menu" },
  { id: "extras_food", name: "Food Add-ons" },
  { id: "extras_merch", name: "Merch Add-ons" },
];

const CATEGORY_COLORS: Record<string, string> = {
  birthday: "bg-pink-100 text-pink-700",
  classics_mini: "bg-sky-100 text-sky-700",
  classics_big: "bg-blue-100 text-blue-700",
  monthly_mini: "bg-teal-100 text-teal-700",
  monthly_big: "bg-cyan-100 text-cyan-700",
  mommy_me: "bg-rose-100 text-rose-700",
  summer_camp: "bg-orange-100 text-orange-700",
  corporate: "bg-indigo-100 text-indigo-700",
  nanny: "bg-green-100 text-green-700",
  teenagers: "bg-orange-100 text-orange-700",
  walkin: "bg-amber-100 text-amber-700",
  extras_food: "bg-red-100 text-red-700",
  extras_merch: "bg-purple-100 text-purple-700",
};

const emptyItem: Partial<MenuItem> = {
  name: "",
  description: "",
  price: 0,
  price_unit: "per item",
  categories: [],
  image_url: null,
  emoji: "",
  is_active: true,
  is_popular: false,
  sort_order: 0,
  scheduled_date: null,
  allowed_persons: null,
  metadata: {},
};

// Helper to check if a category requires a scheduled date
const isMonthlySpecialCategory = (categoryId: string) => 
  categoryId === "monthly_mini" || categoryId === "monthly_big";

// Helper to check if item has any monthly special categories
const hasMonthlySpecialCategories = (categories: string[]) =>
  categories.some(isMonthlySpecialCategory);

const toLocalParts = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString();
};

const toDateInputValue = (value?: string | null) => toLocalParts(value).slice(0, 10);

const toTimeInputValue = (value?: string | null) => toLocalParts(value).slice(11, 16);

const fromDateAndTimeInputs = (dateValue: string, timeValue: string) => {
  if (!dateValue || !timeValue) return null;
  const date = new Date(`${dateValue}T${timeValue}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const getMonthlySpecialEndTime = (item: Partial<MenuItem>) =>
  typeof item.metadata?.monthly_special_end_time === "string"
    ? item.metadata.monthly_special_end_time
    : "";

const emptyMonthlySchedule = (): MonthlySpecialSchedule => ({
  date: "",
  times: [{ start: "", end: "" }],
});

const getMonthlySpecialSchedules = (item: Partial<MenuItem>): MonthlySpecialSchedule[] => {
  const schedules = item.metadata?.monthly_special_schedules;
  if (Array.isArray(schedules) && schedules.length > 0) {
    return schedules.map((schedule) => ({
      date: typeof schedule.date === "string" ? schedule.date : "",
      times: Array.isArray(schedule.times) && schedule.times.length > 0
        ? schedule.times.map((time) => ({
          start: typeof time.start === "string" ? time.start : "",
          end: typeof time.end === "string" ? time.end : "",
        }))
        : [{ start: "", end: "" }],
    }));
  }

  const legacyDate = toDateInputValue(item.scheduled_date);
  const legacyStart = toTimeInputValue(item.scheduled_date);
  const legacyEnd = getMonthlySpecialEndTime(item);
  if (legacyDate || legacyStart || legacyEnd) {
    return [{ date: legacyDate, times: [{ start: legacyStart, end: legacyEnd }] }];
  }

  return [emptyMonthlySchedule()];
};

const normalizeMonthlySpecialSchedules = (schedules: MonthlySpecialSchedule[]) =>
  schedules
    .map((schedule) => ({
      date: schedule.date,
      times: schedule.times.filter((time) => time.start && time.end),
    }))
    .filter((schedule) => schedule.date || schedule.times.length > 0);

const withMonthlySpecialSchedules = (
  item: Partial<MenuItem> | null | undefined,
  schedules: MonthlySpecialSchedule[]
) => {
  const normalizedSchedules = normalizeMonthlySpecialSchedules(schedules);
  const firstSchedule = normalizedSchedules.find((schedule) => schedule.date && schedule.times[0]?.start && schedule.times[0]?.end);
  const firstTime = firstSchedule?.times[0];
  return {
    ...item,
    scheduled_date: firstSchedule && firstTime
      ? fromDateAndTimeInputs(firstSchedule.date, firstTime.start)
      : null,
    metadata: {
      ...(item?.metadata || {}),
      monthly_special_end_time: firstTime?.end || "",
      monthly_special_schedules: schedules,
    },
  };
};

const prepareMenuItemForSave = (item: Partial<MenuItem>) => {
  if (!hasMonthlySpecialCategories(item.categories || [])) return item;

  const normalizedSchedules = normalizeMonthlySpecialSchedules(getMonthlySpecialSchedules(item));
  const firstSchedule = normalizedSchedules.find((schedule) => schedule.date && schedule.times[0]?.start && schedule.times[0]?.end);
  const firstTime = firstSchedule?.times[0];

  return {
    ...item,
    scheduled_date: firstSchedule && firstTime
      ? fromDateAndTimeInputs(firstSchedule.date, firstTime.start)
      : null,
    metadata: {
      ...(item.metadata || {}),
      monthly_special_end_time: firstTime?.end || "",
      monthly_special_schedules: normalizedSchedules,
    },
  };
};

interface UploadResult {
  inserted: number;
  skipped: number;
  errors: { row: number; message: string }[];
  total: number;
}

export default function AdminMenuItemsPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);

  // Bulk category update state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false);
  const [bulkCategoriesToAdd, setBulkCategoriesToAdd] = useState<Set<string>>(new Set());
  const [bulkCategoriesToRemove, setBulkCategoriesToRemove] = useState<Set<string>>(new Set());
  const [savingBulkCategories, setSavingBulkCategories] = useState(false);

  // Sort order state
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortCategory, setSortCategory] = useState("classics_mini");
  const [sortItems, setSortItems] = useState<MenuItem[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/menu-items");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error("Error fetching menu items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingItem?.name) return;
    setSaving(true);
    try {
      const url = isCreating
        ? "/api/admin/menu-items"
        : `/api/admin/menu-items/${editingItem.id}`;
      const method = isCreating ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prepareMenuItemForSave(editingItem)),
      });

      if (res.ok) {
        await fetchItems();
        setEditingItem(null);
        setIsCreating(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save");
      }
    } catch {
      alert("Failed to save menu item");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: MenuItem) => {
    try {
      const res = await fetch(`/api/admin/menu-items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      if (res.ok)
        setItems(items.map((i) => (i.id === item.id ? { ...i, is_active: !i.is_active } : i)));
    } catch {
      alert("Failed to update item");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (editingItem?.id) formData.append("menuItemId", editingItem.id);

      const res = await fetch("/api/admin/menu-items/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setEditingItem((prev) => ({ ...prev, image_url: data.url }));
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

  const toggleCategory = (catId: string) => {
    setEditingItem((prev) => {
      const current = prev?.categories || [];
      const next = current.includes(catId)
        ? current.filter((c) => c !== catId)
        : [...current, catId];
      return { ...prev, categories: next };
    });
  };

  const handleBulkUpload = async () => {
    if (!uploadFile) return;
    setBulkUploading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);

      const res = await fetch("/api/admin/menu-items/bulk-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setUploadResult(data);
      await fetchItems();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Bulk upload failed");
    } finally {
      setBulkUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        name: "Grilled Chicken Salad",
        description: "Fresh greens with grilled chicken",
        price: 45,
        price_unit: "per item",
        categories: "walkin,corporate",
        emoji: "🥗",
        image_url: "",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Menu Items");
    XLSX.writeFile(wb, "menu-items-template.xlsx");
  };

  const openSortModal = (cat: string) => {
    const catItems = items
      .filter((i) => (i.categories || []).includes(cat))
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
    setSortCategory(cat);
    setSortItems(catItems);
    setShowSortModal(true);
  };

  const moveSortItem = (index: number, direction: -1 | 1) => {
    const next = [...sortItems];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= next.length) return;
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    setSortItems(next);
  };

  const saveSortOrder = async () => {
    setSavingOrder(true);
    try {
      const payload = sortItems.map((item, idx) => ({ id: item.id, sort_order: idx }));
      const res = await fetch("/api/admin/menu-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save order");
      setItems((prev) =>
        prev.map((item) => {
          const updated = payload.find((p) => p.id === item.id);
          return updated ? { ...item, sort_order: updated.sort_order } : item;
        })
      );
      setShowSortModal(false);
    } catch {
      alert("Failed to save sort order");
    } finally {
      setSavingOrder(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedItems);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedItems(next);
  };

  const openBulkCategoryModal = () => {
    setBulkCategoriesToAdd(new Set());
    setBulkCategoriesToRemove(new Set());
    setShowBulkCategoryModal(true);
  };

  const toggleBulkCategory = (catId: string, action: 'add' | 'remove') => {
    if (action === 'add') {
      const next = new Set(bulkCategoriesToAdd);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
        // Remove from remove set if it's there
        const removeSet = new Set(bulkCategoriesToRemove);
        removeSet.delete(catId);
        setBulkCategoriesToRemove(removeSet);
      }
      setBulkCategoriesToAdd(next);
    } else {
      const next = new Set(bulkCategoriesToRemove);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
        // Remove from add set if it's there
        const addSet = new Set(bulkCategoriesToAdd);
        addSet.delete(catId);
        setBulkCategoriesToAdd(addSet);
      }
      setBulkCategoriesToRemove(next);
    }
  };

  const saveBulkCategories = async () => {
    setSavingBulkCategories(true);
    try {
      const updates = Array.from(selectedItems).map((itemId) => {
        const item = items.find((i) => i.id === itemId);
        if (!item) return null;
        
        let newCategories = [...(item.categories || [])];
        
        // Add categories
        bulkCategoriesToAdd.forEach((cat) => {
          if (!newCategories.includes(cat)) {
            newCategories.push(cat);
          }
        });
        
        // Remove categories
        bulkCategoriesToRemove.forEach((cat) => {
          newCategories = newCategories.filter((c) => c !== cat);
        });
        
        return {
          id: itemId,
          categories: newCategories,
        };
      }).filter(Boolean);

      // Update each item
      await Promise.all(
        updates.map((update) =>
          fetch(`/api/admin/menu-items/${update!.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categories: update!.categories }),
          })
        )
      );

      await fetchItems();
      setSelectedItems(new Set());
      setShowBulkCategoryModal(false);
    } catch {
      alert("Failed to update categories");
    } finally {
      setSavingBulkCategories(false);
    }
  };

  const adminVisibleItems = items.filter((i) => !(i.categories || []).includes("party_extras"));

  const filteredItems = adminVisibleItems.filter((i) => {
    const matchesSearch =
      !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || (i.categories || []).includes(categoryFilter);
    return matchesSearch && matchesCategory;
  });

  const uniqueCategoryCount = new Set(adminVisibleItems.flatMap((i) => i.categories || [])).size;

  const stats = {
    total: adminVisibleItems.length,
    active: adminVisibleItems.filter((i) => i.is_active).length,
    categories: uniqueCategoryCount,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-0 bg-stone-50 p-0 sm:p-6">
      <div className="mx-auto max-w-7xl min-w-0">
        {/* Header */}
        <div className="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              <UtensilsCrossed className="h-7 w-7" />
              Menu Items
            </h1>
            <p className="text-stone-500 mt-1">Manage your restaurant menu items</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {selectedItems.size > 0 && (
              <Button variant="outline" className="bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100" onClick={openBulkCategoryModal}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Update Categories ({selectedItems.size})
              </Button>
            )}
            <Button variant="outline" onClick={() => openSortModal(categoryFilter === "all" ? "classics_mini" : categoryFilter)}>
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Sort Order
            </Button>
            <Button variant="outline" onClick={() => setShowUploadModal(true)}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Upload Excel
            </Button>
            <Button
              onClick={() => {
                setEditingItem({ ...emptyItem });
                setIsCreating(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Total Items", value: stats.total, color: "from-stone-500 to-stone-600" },
            { label: "Active Items", value: stats.active, color: "from-green-500 to-emerald-600" },
            { label: "Categories Used", value: stats.categories, color: "from-amber-500 to-orange-500" },
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
              placeholder="Search menu items..."
              className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 bg-white"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 bg-white text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm md:block">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="px-6 py-4 w-12">
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && selectedItems.size === filteredItems.length}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Item</th>
                <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Description</th>
                <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Price</th>
                <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Categories</th>
                <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Status</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-stone-50 group transition-colors">
                  {/* Checkbox */}
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleSelectItem(item.id)}
                      className="rounded"
                    />
                  </td>
                  {/* Image + Name */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 flex items-center justify-center shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : item.emoji ? (
                          <span className="text-2xl">{item.emoji}</span>
                        ) : (
                          <ImageIcon className="h-5 w-5 text-stone-300" />
                        )}
                      </div>
                      <span className="font-medium text-stone-900 text-sm">{item.name}</span>
                    </div>
                  </td>
                  {/* Description */}
                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-sm text-stone-500 truncate">{item.description || "—"}</p>
                  </td>
                  {/* Price */}
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-stone-900">{formatPrice(item.price)}</p>
                    <p className="text-xs text-stone-400">{item.price_unit}</p>
                  </td>
                  {/* Categories - multi-badge */}
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(item.categories || []).length === 0 ? (
                        <span className="text-xs text-stone-400">—</span>
                      ) : (
                        (item.categories || []).map((catId) => (
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
                  {/* Status */}
                  <td className="px-6 py-4">
                    <Badge
                      className={
                        item.is_active
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-stone-100 text-stone-500 border-stone-200"
                      }
                      variant="outline"
                    >
                      {item.is_active ? "Active" : "Hidden"}
                    </Badge>
                  </td>
                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
                        title={item.is_active ? "Hide" : "Show"}
                      >
                        {item.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => { setEditingItem({ ...item }); setIsCreating(false); }}
                        className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-stone-500">
                    <UtensilsCrossed className="h-10 w-10 mx-auto mb-3 text-stone-300" />
                    <p className="font-medium">No menu items found</p>
                    <p className="text-sm mt-1">
                      {search || categoryFilter !== "all"
                        ? "Try adjusting your filters"
                        : 'Click "Add Item" to create your first menu item'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 md:hidden">
          {filteredItems.map((item) => (
            <div key={item.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex min-w-0 items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={() => toggleSelectItem(item.id)}
                  className="mt-4 rounded"
                  aria-label={`Select ${item.name}`}
                />
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-stone-100 flex items-center justify-center">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                  ) : item.emoji ? (
                    <span className="text-2xl">{item.emoji}</span>
                  ) : (
                    <ImageIcon className="h-5 w-5 text-stone-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-900">{item.name}</p>
                      <p className="mt-1 text-sm text-stone-500 line-clamp-2">{item.description || "No description"}</p>
                    </div>
                    <Badge
                      className={
                        item.is_active
                          ? "shrink-0 bg-green-100 text-green-700 border-green-200"
                          : "shrink-0 bg-stone-100 text-stone-500 border-stone-200"
                      }
                      variant="outline"
                    >
                      {item.is_active ? "Active" : "Hidden"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-700">
                      {formatPrice(item.price)}
                    </span>
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-500">
                      {item.price_unit}
                    </span>
                    {(item.categories || []).map((catId) => (
                      <span
                        key={catId}
                        className={`text-xs px-2 py-1 rounded-full ${CATEGORY_COLORS[catId] || "bg-stone-100 text-stone-600"}`}
                      >
                        {CATEGORIES.find((c) => c.id === catId)?.name || catId}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end gap-1 border-t border-stone-100 pt-3">
                    <button
                      onClick={() => handleToggleActive(item)}
                      className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
                      title={item.is_active ? "Hide" : "Show"}
                    >
                      {item.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => { setEditingItem({ ...item }); setIsCreating(false); }}
                      className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
                      title="Edit"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="rounded-2xl border border-stone-200 bg-white px-6 py-12 text-center text-stone-500 shadow-sm">
              <UtensilsCrossed className="h-10 w-10 mx-auto mb-3 text-stone-300" />
              <p className="font-medium">No menu items found</p>
              <p className="text-sm mt-1">
                {search || categoryFilter !== "all"
                  ? "Try adjusting your filters"
                  : 'Click "Add Item" to create your first menu item'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-stone-900">
                {isCreating ? "Add Menu Item" : "Edit Menu Item"}
              </h2>
              <button onClick={() => { setEditingItem(null); setIsCreating(false); }}>
                <X className="h-5 w-5 text-stone-400 hover:text-stone-600" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Image</label>
                <div className="flex items-center gap-4">
                  <div
                    className="relative w-28 h-28 rounded-xl bg-stone-100 flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-stone-300 hover:border-amber-400 transition-colors"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    {editingItem.image_url ? (
                      <img src={editingItem.image_url} alt="" className="w-full h-full object-cover" />
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
                    {editingItem.image_url && (
                      <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700" onClick={() => setEditingItem((p) => ({ ...p, image_url: null }))}>
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
                  value={editingItem.name || ""}
                  onChange={(e) => setEditingItem((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Grilled Chicken Salad"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                <textarea
                  value={editingItem.description || ""}
                  onChange={(e) => setEditingItem((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Short description of the item..."
                  rows={3}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                />
              </div>

              {/* Price + Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Price (AED) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingItem.price ?? ""}
                    onChange={(e) => setEditingItem((p) => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Unit</label>
                  <select
                    value={editingItem.price_unit || "per item"}
                    onChange={(e) => setEditingItem((p) => ({ ...p, price_unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                  >
                    <option value="per item">Per Item</option>
                    <option value="per person">Per Person</option>
                    <option value="per portion">Per Portion</option>
                    <option value="per bag">Per Bag</option>
                    <option value="flat rate">Flat Rate</option>
                  </select>
                </div>
              </div>

              {/* Categories – multi-checkbox */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Categories
                  {(editingItem.categories || []).length > 0 && (
                    <span className="ml-2 text-xs text-stone-400">
                      ({(editingItem.categories || []).length} selected)
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.filter((c) => c.id !== "all").map((cat) => {
                    const checked = (editingItem.categories || []).includes(cat.id);
                    return (
                      <label
                        key={cat.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          checked
                            ? "border-stone-900 bg-stone-50"
                            : "border-stone-200 hover:border-stone-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCategory(cat.id)}
                          className="rounded"
                        />
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[cat.id] || "bg-stone-100 text-stone-600"}`}>
                          {cat.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Monthly special settings */}
              {hasMonthlySpecialCategories(editingItem.categories || []) && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-amber-800 mb-1">
                      <CalendarClock className="h-4 w-4" />
                      Available Dates
                    </label>
                    <p className="text-xs text-amber-600 mb-2">
                      Shown on the Mini Chef / Big Chef page when this monthly special is selected.
                    </p>
                    <div className="space-y-3">
                      {getMonthlySpecialSchedules(editingItem).map((schedule, scheduleIndex, schedules) => (
                        <div key={scheduleIndex} className="rounded-lg border border-amber-200 bg-white p-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={schedule.date}
                              onChange={(e) => {
                                const next = schedules.map((item, index) =>
                                  index === scheduleIndex ? { ...item, date: e.target.value } : item
                                );
                                setEditingItem((p) => withMonthlySpecialSchedules(p, next));
                              }}
                              className="min-w-0 flex-1 px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                            />
                            {schedules.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = schedules.filter((_, index) => index !== scheduleIndex);
                                  setEditingItem((p) => withMonthlySpecialSchedules(p, next));
                                }}
                                className="p-2 rounded-lg text-amber-700 hover:bg-amber-100"
                                title="Remove date"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <div className="mt-3 space-y-2">
                            {schedule.times.map((time, timeIndex) => (
                              <div key={timeIndex} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                                <input
                                  type="time"
                                  value={time.start}
                                  onChange={(e) => {
                                    const next = schedules.map((item, index) => index === scheduleIndex
                                      ? {
                                        ...item,
                                        times: item.times.map((timeItem, tIndex) =>
                                          tIndex === timeIndex ? { ...timeItem, start: e.target.value } : timeItem
                                        ),
                                      }
                                      : item);
                                    setEditingItem((p) => withMonthlySpecialSchedules(p, next));
                                  }}
                                  className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                                  aria-label="Start time"
                                />
                                <input
                                  type="time"
                                  value={time.end}
                                  onChange={(e) => {
                                    const next = schedules.map((item, index) => index === scheduleIndex
                                      ? {
                                        ...item,
                                        times: item.times.map((timeItem, tIndex) =>
                                          tIndex === timeIndex ? { ...timeItem, end: e.target.value } : timeItem
                                        ),
                                      }
                                      : item);
                                    setEditingItem((p) => withMonthlySpecialSchedules(p, next));
                                  }}
                                  className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                                  aria-label="End time"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = schedules.map((item, index) => index === scheduleIndex
                                      ? { ...item, times: item.times.filter((_, tIndex) => tIndex !== timeIndex) }
                                      : item);
                                    setEditingItem((p) => withMonthlySpecialSchedules(p, next));
                                  }}
                                  disabled={schedule.times.length === 1}
                                  className="p-2 rounded-lg text-amber-700 hover:bg-amber-100 disabled:opacity-40 disabled:hover:bg-transparent"
                                  title="Remove time"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const next = schedules.map((item, index) => index === scheduleIndex
                                ? { ...item, times: [...item.times, { start: "", end: "" }] }
                                : item);
                              setEditingItem((p) => withMonthlySpecialSchedules(p, next));
                            }}
                            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-900"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add time
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const schedules = getMonthlySpecialSchedules(editingItem);
                        setEditingItem((p) => withMonthlySpecialSchedules(p, [...schedules, emptyMonthlySchedule()]));
                      }}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-900"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add date
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-amber-800 mb-1">
                      Allowed Persons
                    </label>
                    <p className="text-xs text-amber-600 mb-2">
                      Maximum number of persons allowed for this monthly special
                    </p>
                    <input
                      type="number"
                      min="1"
                      value={editingItem.allowed_persons ?? (isCreating ? 25 : "")}
                      onChange={(e) => setEditingItem((p) => ({ 
                        ...p, 
                        allowed_persons: e.target.value ? parseInt(e.target.value) : null
                      }))}
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Toggles */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.is_active !== false}
                    onChange={(e) => setEditingItem((p) => ({ ...p, is_active: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-stone-700">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.is_popular || false}
                    onChange={(e) => setEditingItem((p) => ({ ...p, is_popular: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-stone-700">Popular</span>
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setEditingItem(null); setIsCreating(false); }}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !editingItem.name}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {isCreating ? "Create" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sort Order Modal */}
      {showSortModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-bold text-stone-900">Sort Menu Items</h2>
                <p className="text-sm text-stone-500 mt-0.5">Drag up/down to reorder how items appear on the booking pages</p>
              </div>
              <button onClick={() => setShowSortModal(false)}>
                <X className="h-5 w-5 text-stone-400 hover:text-stone-600" />
              </button>
            </div>

            {/* Category picker */}
            <div className="px-6 pt-4">
              <label className="block text-sm font-medium text-stone-700 mb-2">Category</label>
              <select
                value={sortCategory}
                onChange={(e) => openSortModal(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 text-sm"
              >
                {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Sortable list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {sortItems.length === 0 ? (
                <p className="text-center text-stone-400 py-8">No items in this category</p>
              ) : (
                sortItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3">
                    <span className="text-sm font-bold text-stone-400 w-6 text-center">{idx + 1}</span>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-200 shrink-0">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">
                          {item.emoji || "🍽️"}
                        </div>
                      )}
                    </div>
                    <span className="flex-1 text-sm font-medium text-stone-900">{item.name}</span>
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveSortItem(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-stone-200 disabled:opacity-20 transition-colors"
                      >
                        <ChevronUp className="h-4 w-4 text-stone-600" />
                      </button>
                      <button
                        onClick={() => moveSortItem(idx, 1)}
                        disabled={idx === sortItems.length - 1}
                        className="p-1 rounded hover:bg-stone-200 disabled:opacity-20 transition-colors"
                      >
                        <ChevronDown className="h-4 w-4 text-stone-600" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSortModal(false)}>Cancel</Button>
              <Button onClick={saveSortOrder} disabled={savingOrder || sortItems.length === 0}>
                {savingOrder ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Order
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Category Update Modal */}
      {showBulkCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-bold text-stone-900">Bulk Update Categories</h2>
                <p className="text-sm text-stone-500 mt-0.5">
                  Update categories for {selectedItems.size} selected item{selectedItems.size !== 1 ? 's' : ''}
                </p>
              </div>
              <button onClick={() => setShowBulkCategoryModal(false)}>
                <X className="h-5 w-5 text-stone-400 hover:text-stone-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Add Categories Section */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-3">
                  Add Categories
                  {bulkCategoriesToAdd.size > 0 && (
                    <span className="ml-2 text-xs text-green-600">
                      ({bulkCategoriesToAdd.size} to add)
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.filter((c) => c.id !== "all").map((cat) => {
                    const checked = bulkCategoriesToAdd.has(cat.id);
                    return (
                      <label
                        key={cat.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          checked
                            ? "border-green-500 bg-green-50"
                            : "border-stone-200 hover:border-stone-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleBulkCategory(cat.id, 'add')}
                          className="rounded"
                        />
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[cat.id] || "bg-stone-100 text-stone-600"}`}>
                          {cat.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-stone-500 mt-2">
                  These categories will be added to all selected items (if not already present)
                </p>
              </div>

              {/* Divider */}
              <div className="border-t border-stone-200"></div>

              {/* Remove Categories Section */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-3">
                  Remove Categories
                  {bulkCategoriesToRemove.size > 0 && (
                    <span className="ml-2 text-xs text-red-600">
                      ({bulkCategoriesToRemove.size} to remove)
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.filter((c) => c.id !== "all").map((cat) => {
                    const checked = bulkCategoriesToRemove.has(cat.id);
                    return (
                      <label
                        key={cat.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          checked
                            ? "border-red-500 bg-red-50"
                            : "border-stone-200 hover:border-stone-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleBulkCategory(cat.id, 'remove')}
                          className="rounded"
                        />
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[cat.id] || "bg-stone-100 text-stone-600"}`}>
                          {cat.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-stone-500 mt-2">
                  These categories will be removed from all selected items (if present)
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowBulkCategoryModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={saveBulkCategories} 
                disabled={savingBulkCategories || (bulkCategoriesToAdd.size === 0 && bulkCategoriesToRemove.size === 0)}
              >
                {savingBulkCategories ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Update {selectedItems.size} Item{selectedItems.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-stone-900">Upload via Excel</h2>
              <button onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadResult(null); }}>
                <X className="h-5 w-5 text-stone-400 hover:text-stone-600" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-medium text-amber-900 mb-1">Need the template?</p>
                <p className="text-xs text-amber-700 mb-3">Download the Excel template with the correct column headers.</p>
                <Button size="sm" variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>

              <div className="text-sm text-stone-600 space-y-1">
                <p className="font-medium text-stone-800">Required columns:</p>
                <ul className="list-disc list-inside text-xs text-stone-500 space-y-0.5">
                  <li><span className="font-mono bg-stone-100 px-1 rounded">name</span></li>
                  <li><span className="font-mono bg-stone-100 px-1 rounded">price</span> — numeric, AED</li>
                </ul>
                <p className="font-medium text-stone-800 mt-2">Optional columns:</p>
                <ul className="list-disc list-inside text-xs text-stone-500 space-y-0.5">
                  <li><span className="font-mono bg-stone-100 px-1 rounded">description</span></li>
                  <li><span className="font-mono bg-stone-100 px-1 rounded">categories</span> — comma-separated, e.g. <span className="font-mono">birthday,corporate</span></li>
                  <li><span className="font-mono bg-stone-100 px-1 rounded">price_unit</span></li>
                  <li><span className="font-mono bg-stone-100 px-1 rounded">image_url</span></li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Select File</label>
                <div
                  className="border-2 border-dashed border-stone-300 rounded-xl p-6 text-center cursor-pointer hover:border-amber-400 transition-colors"
                  onClick={() => excelInputRef.current?.click()}
                >
                  <FileSpreadsheet className="h-8 w-8 mx-auto text-stone-400 mb-2" />
                  {uploadFile ? (
                    <p className="text-sm font-medium text-stone-700">{uploadFile.name}</p>
                  ) : (
                    <>
                      <p className="text-sm text-stone-500">Click to select file</p>
                      <p className="text-xs text-stone-400 mt-1">.xlsx, .xls, or .csv</p>
                    </>
                  )}
                  <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => { setUploadFile(e.target.files?.[0] || null); setUploadResult(null); }}
                  />
                </div>
              </div>

              {uploadResult && (
                <div className="rounded-xl border p-4 space-y-2">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">{uploadResult.inserted} item{uploadResult.inserted !== 1 ? "s" : ""} uploaded</span>
                  </div>
                  {uploadResult.skipped > 0 && (
                    <div className="flex items-center gap-2 text-amber-700">
                      <AlertCircle className="h-5 w-5" />
                      <span className="text-sm">{uploadResult.skipped} rows skipped</span>
                    </div>
                  )}
                  {uploadResult.errors.length > 0 && (
                    <ul className="text-xs text-red-600 space-y-0.5 mt-2">
                      {uploadResult.errors.map((e, i) => (
                        <li key={i}>Row {e.row}: {e.message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadResult(null); }}>
                {uploadResult ? "Close" : "Cancel"}
              </Button>
              {!uploadResult && (
                <Button onClick={handleBulkUpload} disabled={!uploadFile || bulkUploading}>
                  {bulkUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Upload
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
