"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Edit3,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  Package,
  Plus,
  Save,
  Search,
  Settings,
  Star,
  Tags,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

interface ProductCategory {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
  order?: number;
  isActive?: boolean;
}

interface SanityImage {
  _key?: string;
  _type: "image";
  asset: {
    _type?: "reference";
    _ref: string;
  };
  alt?: string;
}

interface Product {
  _id: string;
  title: string;
  slug: { current: string };
  description: string;
  price: number;
  compareAtPrice?: number;
  images?: SanityImage[];
  imageUrl?: string;
  categories?: ProductCategory[];
  tags?: string[];
  inStock: boolean;
  isActive?: boolean;
  stockQuantity?: number;
  sku?: string;
  weight?: number;
  featured?: boolean;
}

interface ProductCartSettings {
  minimumOrderValue: number;
  deliveryFee: number;
}

type ProductDraft = Partial<Product> & {
  categoryIds?: string[];
  imageUrl?: string;
};

type CategoryDraft = Partial<ProductCategory> & {
  slug?: { current: string };
};

const emptyProduct: ProductDraft = {
  title: "",
  slug: { current: "" },
  description: "",
  price: 0,
  compareAtPrice: undefined,
  images: [],
  imageUrl: "",
  categoryIds: [],
  tags: [],
  inStock: true,
  isActive: true,
  stockQuantity: undefined,
  sku: "",
  weight: undefined,
  featured: false,
};

const emptyCategory: CategoryDraft = {
  title: "",
  slug: { current: "" },
  description: "",
  order: 0,
  isActive: true,
};

function currentSlug(value?: { current: string }) {
  return value?.current || "";
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<"products" | "categories" | "settings">("products");
  const [settings, setSettings] = useState<ProductCartSettings>({
    minimumOrderValue: 100,
    deliveryFee: 15,
  });
  const [editingProduct, setEditingProduct] = useState<ProductDraft | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryDraft | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load products");
      setProducts(data.products || []);
      setCategories(data.categories || []);
      if (data.settings) setSettings(data.settings);
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Failed to load products"));
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      if (showFeaturedOnly && !product.featured) return false;
      if (!query) return true;
      return (
        product.title.toLowerCase().includes(query) ||
        (product.description || "").toLowerCase().includes(query) ||
        product.categories?.some((category) => category.title.toLowerCase().includes(query))
      );
    });
  }, [products, search, showFeaturedOnly]);

  const openProductEditor = (product?: Product) => {
    if (!product) {
      setEditingProduct({ ...emptyProduct });
      setIsCreatingProduct(true);
      return;
    }

    setEditingProduct({
      ...product,
      categoryIds: product.categories?.map((category) => category._id) || [],
      tags: product.tags || [],
    });
    setIsCreatingProduct(false);
  };

  const openCategoryEditor = (category?: ProductCategory) => {
    setEditingCategory(category ? { ...category } : { ...emptyCategory });
    setIsCreatingCategory(!category);
  };

  const saveProduct = async () => {
    if (!editingProduct?.title) return;
    setSaving(true);
    try {
      const res = await fetch(
        isCreatingProduct
          ? "/api/admin/products"
          : `/api/admin/products/${editingProduct._id}`,
        {
          method: isCreatingProduct ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingProduct),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save product");
      await fetchProducts();
      setEditingProduct(null);
      setIsCreatingProduct(false);
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Failed to save product"));
    } finally {
      setSaving(false);
    }
  };

  const toggleProductActive = async (product: Product) => {
    try {
      const nextIsActive = product.isActive === false;
      const res = await fetch(`/api/admin/products/${product._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...product,
          categoryIds: product.categories?.map((category) => category._id) || [],
          tags: product.tags || [],
          isActive: nextIsActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update product");
      setProducts((current) =>
        current.map((item) => item._id === product._id ? { ...item, isActive: nextIsActive } : item)
      );
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Failed to update product"));
    }
  };

  const saveCategory = async () => {
    if (!editingCategory?.title) return;
    setSaving(true);
    try {
      const res = await fetch(
        isCreatingCategory
          ? "/api/admin/product-categories"
          : `/api/admin/product-categories/${editingCategory._id}`,
        {
          method: isCreatingCategory ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingCategory),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save category");
      await fetchProducts();
      setEditingCategory(null);
      setIsCreatingCategory(false);
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Failed to save category"));
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      setSettings(data.settings || settings);
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  };

  const toggleCategoryActive = async (category: ProductCategory) => {
    try {
      const nextIsActive = category.isActive === false;
      const res = await fetch(`/api/admin/product-categories/${category._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...category,
          isActive: nextIsActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update category");
      setCategories((current) =>
        current.map((item) => item._id === category._id ? { ...item, isActive: nextIsActive } : item)
      );
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Failed to update category"));
    }
  };

  const deleteCategory = async (category: ProductCategory) => {
    if (!confirm(`Delete ${category.title}? Products using this category may block deletion.`)) return;
    try {
      const res = await fetch(`/api/admin/product-categories/${category._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete category");
      setCategories((current) => current.filter((item) => item._id !== category._id));
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Failed to delete category"));
    }
  };

  const uploadProductImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/products/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image upload failed");
      setEditingProduct((current) => ({
        ...current,
        images: [data.image],
        imageUrl: data.asset?.url || current?.imageUrl || "",
      }));
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Image upload failed"));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const toggleProductCategory = (categoryId: string) => {
    setEditingProduct((current) => {
      const existing = current?.categoryIds || [];
      const next = existing.includes(categoryId)
        ? existing.filter((id) => id !== categoryId)
        : [...existing, categoryId];
      return { ...current, categoryIds: next };
    });
  };

  const stats = {
    products: products.length,
    active: products.filter((product) => product.isActive !== false).length,
    categories: categories.filter((category) => category.isActive !== false).length,
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              <Package className="h-7 w-7" />
              Products
            </h1>
            <p className="text-stone-500 mt-1">Manage the products and categories shown on the public products page</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openCategoryEditor()}>
              <Tags className="h-4 w-4 mr-2" />
              Add Category
            </Button>
            <Button onClick={() => openProductEditor()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-gradient-to-br from-stone-600 to-stone-800 p-5 text-white">
            <p className="text-3xl font-bold">{stats.products}</p>
            <p className="text-sm opacity-80 mt-1">Total Products</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-5 text-white">
            <p className="text-3xl font-bold">{stats.active}</p>
            <p className="text-sm opacity-80 mt-1">Active Products</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-5 text-white">
            <p className="text-3xl font-bold">{stats.categories}</p>
            <p className="text-sm opacity-80 mt-1">Categories</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex bg-white border border-stone-200 rounded-lg p-1">
            <button
              className={`px-4 py-2 rounded-md text-sm ${activeTab === "products" ? "bg-stone-900 text-white" : "text-stone-600"}`}
              onClick={() => setActiveTab("products")}
            >
              Products
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm ${activeTab === "categories" ? "bg-stone-900 text-white" : "text-stone-600"}`}
              onClick={() => setActiveTab("categories")}
            >
              Categories
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm ${activeTab === "settings" ? "bg-stone-900 text-white" : "text-stone-600"}`}
              onClick={() => setActiveTab("settings")}
            >
              Settings
            </button>
          </div>

          {activeTab === "products" && (
            <div className="flex w-full max-w-2xl items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFeaturedOnly((current) => !current)}
                className={`flex h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors ${
                  showFeaturedOnly
                    ? "border-amber-400 bg-amber-50 text-amber-800"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                }`}
              >
                <Star className={`h-4 w-4 ${showFeaturedOnly ? "fill-amber-400 text-amber-500" : "text-stone-400"}`} />
                Featured
              </button>
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {activeTab === "products" ? (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Product</th>
                  <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Price</th>
                  <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Categories</th>
                  <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Status</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProducts.map((product) => (
                  <tr key={product._id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                          {product.imageUrl ? (
                            <Image src={product.imageUrl} alt={product.title} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-stone-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-stone-900">{product.title}</p>
                          <p className="text-xs text-stone-500">{currentSlug(product.slug)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-stone-900">{formatPrice(product.price || 0)}</p>
                      {product.compareAtPrice ? (
                        <p className="text-xs text-stone-400 line-through">{formatPrice(product.compareAtPrice)}</p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {(product.categories || []).map((category) => (
                          <Badge key={category._id} variant="secondary" className="bg-amber-100 text-amber-800">
                            {category.title}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={product.inStock ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-600"}>
                        {product.inStock ? "In Stock" : "Sold Out"}
                      </Badge>
                      <Badge className={product.isActive !== false ? "ml-2 bg-blue-100 text-blue-700" : "ml-2 bg-stone-100 text-stone-600"}>
                        {product.isActive !== false ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openProductEditor(product)} className="p-2 rounded-lg hover:bg-stone-100">
                          <Edit3 className="h-4 w-4 text-stone-600" />
                        </button>
                        <button
                          onClick={() => toggleProductActive(product)}
                          className="p-2 rounded-lg hover:bg-stone-100"
                          title={product.isActive !== false ? "Set inactive" : "Set active"}
                        >
                          {product.isActive !== false ? (
                            <EyeOff className="h-4 w-4 text-stone-600" />
                          ) : (
                            <Eye className="h-4 w-4 text-green-600" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === "categories" ? (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Category</th>
                  <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Slug</th>
                  <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Order</th>
                  <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider px-6 py-4">Status</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {categories.map((category) => (
                  <tr key={category._id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-stone-900">{category.title}</p>
                      <p className="text-sm text-stone-500">{category.description}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600">{currentSlug(category.slug)}</td>
                    <td className="px-6 py-4 text-sm text-stone-600">{category.order || 0}</td>
                    <td className="px-6 py-4">
                      <Badge className={category.isActive !== false ? "bg-blue-100 text-blue-700" : "bg-stone-100 text-stone-600"}>
                        {category.isActive !== false ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openCategoryEditor(category)} className="p-2 rounded-lg hover:bg-stone-100">
                          <Edit3 className="h-4 w-4 text-stone-600" />
                        </button>
                        <button
                          onClick={() => toggleCategoryActive(category)}
                          className="p-2 rounded-lg hover:bg-stone-100"
                          title={category.isActive !== false ? "Set inactive" : "Set active"}
                        >
                          {category.isActive !== false ? (
                            <EyeOff className="h-4 w-4 text-stone-600" />
                          ) : (
                            <Eye className="h-4 w-4 text-green-600" />
                          )}
                        </button>
                        <button onClick={() => deleteCategory(category)} className="p-2 rounded-lg hover:bg-red-50">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Cart Settings
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Control the minimum product order amount and delivery fee shown in the cart.
                </p>
              </div>
              <Button onClick={saveSettings} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Settings
              </Button>
            </div>

            <div className="grid max-w-3xl grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Minimum Delivery Amount AED</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.minimumOrderValue}
                  onChange={(event) => setSettings((current) => ({
                    ...current,
                    minimumOrderValue: Number(event.target.value),
                  }))}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Delivery Fee AED</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.deliveryFee}
                  onChange={(event) => setSettings((current) => ({
                    ...current,
                    deliveryFee: Number(event.target.value),
                  }))}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-stone-900">{isCreatingProduct ? "Add Product" : "Edit Product"}</h2>
              <button onClick={() => setEditingProduct(null)}>
                <X className="h-5 w-5 text-stone-400 hover:text-stone-600" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
              <div>
                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-stone-100 border border-stone-200">
                  {editingProduct.imageUrl ? (
                    <Image src={editingProduct.imageUrl} alt={editingProduct.title || "Product image"} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-10 w-10 text-stone-400" />
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-3"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Upload Image
                </Button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={uploadProductImage}
                />
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
                    <input
                      value={editingProduct.title || ""}
                      onChange={(event) => setEditingProduct((current) => ({ ...current, title: event.target.value }))}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Slug</label>
                    <input
                      value={currentSlug(editingProduct.slug)}
                      onChange={(event) => setEditingProduct((current) => ({ ...current, slug: { current: event.target.value } }))}
                      placeholder="Generated from title if blank"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Short Description</label>
                  <textarea
                    value={editingProduct.description || ""}
                    onChange={(event) => setEditingProduct((current) => ({ ...current, description: event.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Price AED</label>
                    <input
                      type="number"
                      value={editingProduct.price ?? 0}
                      onChange={(event) => setEditingProduct((current) => ({ ...current, price: Number(event.target.value) }))}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Compare At Price AED</label>
                    <input
                      type="number"
                      value={editingProduct.compareAtPrice ?? ""}
                      onChange={(event) => setEditingProduct((current) => ({ ...current, compareAtPrice: event.target.value ? Number(event.target.value) : undefined }))}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Categories</label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((category) => {
                      const checked = editingProduct.categoryIds?.includes(category._id);
                      return (
                        <label
                          key={category._id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${checked ? "border-stone-900 bg-stone-50" : "border-stone-200"}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked || false}
                            onChange={() => toggleProductCategory(category._id)}
                            className="rounded"
                          />
                          <span className="text-sm text-stone-700">{category.title}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Tags</label>
                  <input
                    value={(editingProduct.tags || []).join(", ")}
                    onChange={(event) => setEditingProduct((current) => ({
                      ...current,
                      tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean),
                    }))}
                    placeholder="Frozen, snacks, kids"
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">SKU</label>
                    <input
                      value={editingProduct.sku || ""}
                      onChange={(event) => setEditingProduct((current) => ({ ...current, sku: event.target.value }))}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Stock Quantity</label>
                    <input
                      type="number"
                      value={editingProduct.stockQuantity ?? ""}
                      onChange={(event) => setEditingProduct((current) => ({ ...current, stockQuantity: event.target.value ? Number(event.target.value) : undefined }))}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Weight Grams</label>
                    <input
                      type="number"
                      value={editingProduct.weight ?? ""}
                      onChange={(event) => setEditingProduct((current) => ({ ...current, weight: event.target.value ? Number(event.target.value) : undefined }))}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                    />
                  </div>
                </div>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProduct.inStock !== false}
                      onChange={(event) => setEditingProduct((current) => ({ ...current, inStock: event.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm text-stone-700">In Stock</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProduct.isActive !== false}
                      onChange={(event) => setEditingProduct((current) => ({ ...current, isActive: event.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm text-stone-700">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProduct.featured || false}
                      onChange={(event) => setEditingProduct((current) => ({ ...current, featured: event.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm text-stone-700">Featured</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditingProduct(null)}>Cancel</Button>
              <Button onClick={saveProduct} disabled={saving || !editingProduct.title}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {isCreatingProduct ? "Create" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-stone-900">{isCreatingCategory ? "Add Category" : "Edit Category"}</h2>
              <button onClick={() => setEditingCategory(null)}>
                <X className="h-5 w-5 text-stone-400 hover:text-stone-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
                <input
                  value={editingCategory.title || ""}
                  onChange={(event) => setEditingCategory((current) => ({ ...current, title: event.target.value }))}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Slug</label>
                <input
                  value={currentSlug(editingCategory.slug)}
                  onChange={(event) => setEditingCategory((current) => ({ ...current, slug: { current: event.target.value } }))}
                  placeholder="Generated from title if blank"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                <textarea
                  value={editingCategory.description || ""}
                  onChange={(event) => setEditingCategory((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Display Order</label>
                <input
                  type="number"
                  value={editingCategory.order || 0}
                  onChange={(event) => setEditingCategory((current) => ({ ...current, order: Number(event.target.value) }))}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingCategory.isActive !== false}
                  onChange={(event) => setEditingCategory((current) => ({ ...current, isActive: event.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-stone-700">Active</span>
              </label>
            </div>

            <div className="border-t px-6 py-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditingCategory(null)}>Cancel</Button>
              <Button onClick={saveCategory} disabled={saving || !editingCategory.title}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {isCreatingCategory ? "Create" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
