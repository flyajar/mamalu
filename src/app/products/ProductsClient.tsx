"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingBag, Search, X, SlidersHorizontal, ShoppingCart, CheckCircle, Minus, Plus } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export interface Category {
  _id: string;
  title: string;
  slug: { current: string };
}

export interface Product {
  _id: string;
  title: string;
  slug: { current: string };
  description: string;
  price: number;
  compareAtPrice?: number;
  images?: { asset: { _ref: string }; alt?: string }[];
  imageUrl?: string | null;
  previewImageUrl?: string | null;
  categories?: Category[];
  inStock: boolean;
  featured?: boolean;
}

interface ProductsClientProps {
  products: Product[];
  categories: Category[];
}

type SortOption = "latest" | "a-z" | "z-a" | "price-low" | "price-high";

export default function ProductsClient({
  products,
  categories,
}: ProductsClientProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [cartNotice, setCartNotice] = useState<{ id: number; title: string } | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const allCategories = [
    { _id: "all", title: "All", slug: { current: "all" } },
    ...categories,
  ];

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "latest", label: "Latest" },
    { value: "a-z", label: "A-Z" },
    { value: "z-a", label: "Z-A" },
    { value: "price-low", label: "Price (Low to High)" },
    { value: "price-high", label: "Price (High to Low)" },
  ];

  const filteredAndSortedProducts = useMemo(() => {
    let result = products;

    // Filter by category
    if (activeCategory !== "all") {
      result = result.filter((p) =>
        p.categories?.some((c) => c.slug.current === activeCategory)
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case "a-z":
        result = [...result].sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "z-a":
        result = [...result].sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "price-low":
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result = [...result].sort((a, b) => b.price - a.price);
        break;
    }

    return result;
  }, [products, activeCategory, searchQuery, sortBy]);

  useEffect(() => {
    if (!cartNotice) return;

    const timeout = window.setTimeout(() => {
      setCartNotice(null);
    }, 2600);

    return () => window.clearTimeout(timeout);
  }, [cartNotice]);

  useEffect(() => {
    if (!selectedProduct) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedProduct(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedProduct]);

  const getQuantity = (productId: string) => quantities[productId] ?? 1;

  const setProductQuantity = (productId: string, quantity: number) => {
    const normalizedQuantity = Number.isFinite(quantity) ? Math.floor(quantity) : 1;

    setQuantities((current) => ({
      ...current,
      [productId]: Math.max(1, normalizedQuantity),
    }));
  };

  const addToCart = (product: Product, quantity = getQuantity(product._id)) => {
    const addQuantity = Math.max(1, Math.floor(quantity));
    const cart = JSON.parse(localStorage.getItem("mamalu_cart") || "[]");
    const existingItem = cart.find((item: { id: string }) => item.id === product._id);
    
    if (existingItem) {
      existingItem.quantity += addQuantity;
    } else {
      cart.push({
        id: product._id,
        title: product.title,
        price: product.price,
        quantity: addQuantity,
        imageUrl: product.imageUrl,
      });
    }
    
    localStorage.setItem("mamalu_cart", JSON.stringify(cart));
    // Trigger storage event for other components
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("cartUpdated"));
    setCartNotice({ id: Date.now(), title: `${addQuantity} x ${product.title}` });
  };

  const Sidebar = () => (
    <div className="space-y-8">
      {/* Categories */}
      <div>
        <h3 className="text-lg font-bold text-stone-900 mb-4">Categories</h3>
        <div className="space-y-2">
          {allCategories.map((category) => (
            <button
              key={category._id}
              onClick={() => setActiveCategory(category.slug.current)}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                activeCategory === category.slug.current
                  ? "bg-[#fff5eb] text-stone-900 font-bold"
                  : "text-stone-600 font-bold hover:bg-[#fff5eb] hover:text-stone-900"
              }`}
            >
              {category.title}
            </button>
          ))}
        </div>
      </div>

      {/* Sort By */}
      <div>
        <h3 className="text-lg font-bold text-stone-900 mb-4">Sort by</h3>
        <div className="space-y-2">
          {sortOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <input
                type="radio"
                name="sort"
                value={option.value}
                checked={sortBy === option.value}
                onChange={() => setSortBy(option.value)}
                className="w-4 h-4 text-[#ff7f5c] border-stone-300 focus:ring-[#ff7f5c]"
              />
              <span className={`text-sm font-bold ${sortBy === option.value ? "text-[#ff7f5c]" : "text-stone-600 group-hover:text-[#ff7f5c]"}`}>
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <section className="py-12">
      {cartNotice && (
        <div
          key={cartNotice.id}
          role="status"
          aria-live="polite"
          className="fixed left-4 right-4 top-20 z-[80] mx-auto flex max-w-sm items-start gap-3 rounded-2xl border border-[#ff7f5c]/30 bg-[#ff7f5c] px-4 py-3 text-white shadow-2xl shadow-[#ff7f5c]/25 sm:left-auto sm:right-6 sm:mx-0"
        >
          <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <p className="text-sm font-extrabold">Added to cart</p>
            <p className="text-sm leading-snug text-white/90">{cartNotice.title}</p>
          </div>
        </div>
      )}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-preview-title"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-lg transition-colors hover:bg-stone-100"
              aria-label="Close product preview"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid gap-6 md:grid-cols-[minmax(240px,320px)_1fr]">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-stone-50">
                {selectedProduct.previewImageUrl || selectedProduct.imageUrl ? (
                  <Image
                    src={selectedProduct.previewImageUrl || selectedProduct.imageUrl || ""}
                    alt={selectedProduct.images?.[0]?.alt || selectedProduct.title}
                    fill
                    sizes="(min-width: 768px) 320px, calc(100vw - 4rem)"
                    className="object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ShoppingBag className="h-20 w-20 text-[#ff7f5c]/40" />
                  </div>
                )}
                {!selectedProduct.inStock && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white">
                      Sold Out
                    </span>
                  </div>
                )}
              </div>

              <div className="flex min-h-full flex-col pt-2 md:pr-10">
                <div className="mb-4 flex flex-wrap gap-2">
                  {selectedProduct.categories?.map((category) => (
                    <Badge key={category._id} className="bg-[#ff7f5c]/10 text-[#ff7f5c] hover:bg-[#ff7f5c]/10">
                      {category.title}
                    </Badge>
                  ))}
                  {selectedProduct.featured && (
                    <Badge className="bg-stone-900 text-white hover:bg-stone-900">Featured</Badge>
                  )}
                </div>

                <h2 id="product-preview-title" className="mb-4 text-3xl font-bold leading-tight text-stone-900 sm:text-4xl">
                  {selectedProduct.title}
                </h2>

                <div className="mb-5 flex items-center gap-3">
                  <span className="text-2xl font-bold text-gradient">
                    {formatPrice(selectedProduct.price)}
                  </span>
                  {selectedProduct.compareAtPrice && selectedProduct.compareAtPrice > selectedProduct.price && (
                    <span className="text-base text-stone-400 line-through">
                      {formatPrice(selectedProduct.compareAtPrice)}
                    </span>
                  )}
                </div>

                {selectedProduct.description && (
                  <p className="mb-8 text-sm font-bold leading-7 text-stone-600 sm:text-base">
                    {selectedProduct.description}
                  </p>
                )}

                <div className="mt-auto space-y-4 pt-2">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-bold uppercase tracking-wide text-stone-500">Quantity</span>
                    <div className="flex h-12 w-36 items-center rounded-full border border-stone-200 bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => setProductQuantity(selectedProduct._id, getQuantity(selectedProduct._id) - 1)}
                        className="flex h-full w-10 items-center justify-center rounded-l-full text-stone-600 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-300"
                        disabled={!selectedProduct.inStock || getQuantity(selectedProduct._id) <= 1}
                        aria-label={`Decrease ${selectedProduct.title} quantity`}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={getQuantity(selectedProduct._id)}
                        onChange={(event) => setProductQuantity(selectedProduct._id, Number(event.target.value))}
                        className="h-full w-16 border-x border-stone-200 bg-transparent text-center text-sm font-bold text-stone-900 outline-none [appearance:textfield] disabled:text-stone-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        disabled={!selectedProduct.inStock}
                      />
                      <button
                        type="button"
                        onClick={() => setProductQuantity(selectedProduct._id, getQuantity(selectedProduct._id) + 1)}
                        className="flex h-full w-10 items-center justify-center rounded-r-full text-stone-600 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-300"
                        disabled={!selectedProduct.inStock}
                        aria-label={`Increase ${selectedProduct.title} quantity`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={() => addToCart(selectedProduct)}
                    className="h-12 w-full rounded-full text-sm font-bold text-white gradient-peach-glow"
                    disabled={!selectedProduct.inStock}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add to Cart
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-28 glass-card rounded-2xl p-6">
              <Sidebar />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Search and Mobile Filter Toggle */}
            <div className="flex flex-row gap-3 sm:gap-4 mb-6">
              {/* Search */}
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#ff7f5c]" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-12 h-14 glass rounded-full focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
                  style={{ borderColor: "rgba(255, 127, 92, 0.7)" }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Mobile Filter Button */}
              <Button
                variant="outline"
                className="lg:hidden shrink-0 flex items-center gap-2 glass border-0 rounded-full h-14 px-5"
                onClick={() => setShowMobileFilters(true)}
              >
                <SlidersHorizontal className="h-5 w-5" />
                Filters
              </Button>
            </div>

            {/* Active Filters */}
            {(activeCategory !== "all" || searchQuery) && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <span className="text-sm text-stone-500">Active filters:</span>
                {activeCategory !== "all" && (
                  <Badge 
                    className="bg-[#ff7f5c]/10 text-[#ff7f5c] hover:bg-[#ff7f5c]/20 cursor-pointer"
                    onClick={() => setActiveCategory("all")}
                  >
                    {allCategories.find(c => c.slug.current === activeCategory)?.title}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                )}
                {searchQuery && (
                  <Badge 
                    className="bg-[#ff7f5c]/10 text-[#ff7f5c] hover:bg-[#ff7f5c]/20 cursor-pointer"
                    onClick={() => setSearchQuery("")}
                  >
                    &quot;{searchQuery}&quot;
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                )}
                <button
                  onClick={() => {
                    setActiveCategory("all");
                    setSearchQuery("");
                  }}
                  className="text-sm text-stone-500 hover:text-[#ff7f5c] underline"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Results Count */}
            <p className="text-sm text-stone-500 mb-6">
              Showing {filteredAndSortedProducts.length} product{filteredAndSortedProducts.length !== 1 ? "s" : ""}
            </p>

            {/* Product Grid */}
            {filteredAndSortedProducts.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredAndSortedProducts.map((product, idx) => (
                  <div
                    key={product._id}
                    className="group glass-card rounded-2xl overflow-hidden card-hover flex h-full flex-col"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedProduct(product)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedProduct(product);
                        }
                      }}
                      className="aspect-square relative block w-full overflow-hidden text-left"
                      aria-label={`Preview ${product.title}`}
                    >
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.images?.[0]?.alt || product.title}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#ff7f5c]/20 to-[#ffa891]/30 flex items-center justify-center">
                          <ShoppingBag className="h-16 w-16 text-[#ff7f5c]/40" />
                        </div>
                      )}
                      {!product.inStock && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="px-4 py-2 rounded-full bg-stone-900 text-white text-sm font-semibold">
                            Sold Out
                          </span>
                        </div>
                      )}
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <div className="absolute top-3 left-3">
                          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg">
                            Sale
                          </span>
                        </div>
                      )}
                      {/* Quick Add Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          addToCart(product);
                        }}
                        type="button"
                        className="absolute bottom-3 right-3 w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-gradient-to-r hover:from-[#ff7f5c] hover:to-[#ffa891] hover:text-white hover:scale-110"
                        disabled={!product.inStock}
                      >
                        <ShoppingCart className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="flex flex-1 flex-col p-4 sm:p-5">
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(product)}
                        className="mb-2 text-left"
                      >
                        <h3 className="font-bold text-stone-900 text-sm sm:text-base leading-snug group-hover:text-[#ff7f5c] transition-colors">
                          {product.title}
                        </h3>
                      </button>
                      <div className="mt-auto">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-lg sm:text-xl font-bold text-gradient">
                            {formatPrice(product.price)}
                          </span>
                          {product.compareAtPrice && product.compareAtPrice > product.price && (
                            <span className="text-xs sm:text-sm text-stone-400 line-through">
                              {formatPrice(product.compareAtPrice)}
                            </span>
                          )}
                        </div>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <label
                            htmlFor={`quantity-${product._id}`}
                            className="text-xs font-bold uppercase tracking-wide text-stone-500"
                          >
                            Qty
                          </label>
                          <div className="flex h-10 w-32 items-center rounded-full border border-stone-200 bg-white shadow-sm">
                            <button
                              type="button"
                              onClick={() => setProductQuantity(product._id, getQuantity(product._id) - 1)}
                              className="flex h-full w-9 items-center justify-center rounded-l-full text-stone-600 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-300"
                              disabled={!product.inStock || getQuantity(product._id) <= 1}
                              aria-label={`Decrease ${product.title} quantity`}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <input
                              id={`quantity-${product._id}`}
                              type="number"
                              inputMode="numeric"
                              min={1}
                              value={getQuantity(product._id)}
                              onChange={(event) => setProductQuantity(product._id, Number(event.target.value))}
                              className="h-full w-14 border-x border-stone-200 bg-transparent text-center text-sm font-bold text-stone-900 outline-none [appearance:textfield] disabled:text-stone-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              disabled={!product.inStock}
                            />
                            <button
                              type="button"
                              onClick={() => setProductQuantity(product._id, getQuantity(product._id) + 1)}
                              className="flex h-full w-9 items-center justify-center rounded-r-full text-stone-600 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-300"
                              disabled={!product.inStock}
                              aria-label={`Increase ${product.title} quantity`}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            addToCart(product);
                          }}
                          className="w-full gradient-peach-glow text-white text-sm font-bold rounded-full h-11"
                          disabled={!product.inStock}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Add to Cart
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#ff7f5c]/20 to-[#ffa891]/10 flex items-center justify-center">
                  <ShoppingBag className="h-10 w-10 text-[#ff7f5c]" />
                </div>
                <h2 className="text-xl font-bold text-stone-900 mb-2">No products found</h2>
                <p className="text-stone-500 mb-6">Try adjusting your search or filters</p>
                <Button
                  className="glass rounded-full px-6"
                  onClick={() => {
                    setActiveCategory("all");
                    setSearchQuery("");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button onClick={() => setShowMobileFilters(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <Sidebar />
            <Button
              className="w-full mt-6 bg-[#ff7f5c] hover:bg-[#e67854]"
              onClick={() => setShowMobileFilters(false)}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
