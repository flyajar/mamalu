"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingBag, Filter, ArrowRight, Search, X, SlidersHorizontal, ShoppingCart } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface Category {
  _id: string;
  title: string;
  slug: { current: string };
}

interface Product {
  _id: string;
  title: string;
  slug: { current: string };
  description: string;
  price: number;
  compareAtPrice?: number;
  images?: { asset: { _ref: string }; alt?: string }[];
  imageUrl?: string | null;
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

  const addToCart = (product: Product) => {
    const cart = JSON.parse(localStorage.getItem("mamalu_cart") || "[]");
    const existingItem = cart.find((item: { id: string }) => item.id === product._id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        id: product._id,
        title: product.title,
        price: product.price,
        quantity: 1,
        imageUrl: product.imageUrl,
      });
    }
    
    localStorage.setItem("mamalu_cart", JSON.stringify(cart));
    // Trigger storage event for other components
    window.dispatchEvent(new Event("storage"));
    alert(`${product.title} added to cart!`);
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
                  ? "bg-[#ff7f5c] text-white font-bold"
                  : "text-stone-600 font-bold hover:bg-[#ff7f5c]/10 hover:text-[#ff7f5c]"
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
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#ff7f5c]" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-12 h-14 glass border-0 rounded-full focus:ring-2 focus:ring-[#ff7f5c]/30 text-base"
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
                className="lg:hidden flex items-center gap-2 glass border-0 rounded-full h-14 px-6"
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
                    className="group glass-card rounded-2xl overflow-hidden card-hover"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="aspect-square relative overflow-hidden">
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
                          addToCart(product);
                        }}
                        className="absolute bottom-3 right-3 w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-gradient-to-r hover:from-[#ff7f5c] hover:to-[#ffa891] hover:text-white hover:scale-110"
                        disabled={!product.inStock}
                      >
                        <ShoppingCart className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="p-4 sm:p-5">
                      <h3 className="font-bold text-stone-900 text-sm sm:text-base mb-2 group-hover:text-[#ff7f5c] transition-colors line-clamp-1">
                        {product.title}
                      </h3>
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
