"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface CheckoutDetails {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  phone: string;
  streetAddress: string;
  area: string;
  city: string;
  country: string;
}

const SHIPPING_FEE = 15;
const FREE_SHIPPING_THRESHOLD = 200;
const MINIMUM_ORDER_VALUE = 100;

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutDetails, setCheckoutDetails] = useState<CheckoutDetails>({
    firstName: "",
    lastName: "",
    email: "",
    countryCode: "+971",
    phone: "",
    streetAddress: "",
    area: "",
    city: "Dubai",
    country: "United Arab Emirates",
  });
  const initialized = useRef(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("mamalu_cart");
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  }, []);

  // Save cart to localStorage whenever it changes (skip initial render)
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    localStorage.setItem("mamalu_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const updateQuantity = (id: string, delta: number) => {
    setCartItems((items) =>
      items
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id: string) => {
    setCartItems((items) => items.filter((item) => item.id !== id));
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shipping = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shipping;
  const minimumOrderRemaining = Math.max(0, MINIMUM_ORDER_VALUE - subtotal);
  const canCheckout = cartItems.length > 0 && subtotal >= MINIMUM_ORDER_VALUE;

  const handleDetailsChange = (field: keyof CheckoutDetails, value: string) => {
    setCheckoutDetails((details) => ({ ...details, [field]: value }));
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    if (subtotal < MINIMUM_ORDER_VALUE) {
      alert(`Minimum order value is ${formatPrice(MINIMUM_ORDER_VALUE)}.`);
      return;
    }
    const missingField = Object.entries(checkoutDetails).find(([, value]) => !value.trim());
    if (missingField) {
      alert("Please complete the billing information before checkout.");
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/payments/checkout-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems,
          customerEmail: checkoutDetails.email,
          customerDetails: checkoutDetails,
        }),
      });

      const data = await response.json();
      
      if (data.url) {
        // Clear cart on successful checkout initiation
        localStorage.setItem("mamalu_cart", JSON.stringify([]));
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to create checkout session");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-12 bg-stone-50 min-h-[60vh]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-8">
          Shopping Cart
        </h1>

        {cartItems.length > 0 ? (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="h-20 w-20 rounded-lg flex-shrink-0 overflow-hidden bg-gradient-to-br from-amber-100 to-[#FF8C6B]/20">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.title}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="h-8 w-8 text-amber-600/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 w-full">
                        <h3 className="font-bold text-stone-900">
                          {item.title}
                        </h3>
                        <p className="text-[#FF8C6B] font-bold">
                          {formatPrice(item.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 hover:bg-stone-100 rounded"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-bold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 hover:bg-stone-100 rounded"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-right w-full sm:w-24">
                        <p className="font-bold text-stone-900">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-stone-400 hover:text-red-500"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card>
                <CardContent className="p-0">
                  <div className="rounded-t-md bg-[#FF8C6B] px-6 py-4">
                    <h2 className="text-xl font-bold text-white">
                      Billing Information
                    </h2>
                  </div>
                  <div className="grid gap-5 p-6 sm:grid-cols-2">
                    <label className="space-y-2 text-sm font-bold text-stone-800">
                      <span>First Name <span className="text-[#FF8C6B]">*</span></span>
                      <input
                        required
                        value={checkoutDetails.firstName}
                        onChange={(event) => handleDetailsChange("firstName", event.target.value)}
                        className="h-11 w-full rounded-md border border-stone-100 bg-stone-50 px-3 outline-none focus:border-[#FF8C6B] focus:ring-2 focus:ring-[#FF8C6B]/20"
                      />
                    </label>
                    <label className="space-y-2 text-sm font-bold text-stone-800">
                      <span>Last Name <span className="text-[#FF8C6B]">*</span></span>
                      <input
                        required
                        value={checkoutDetails.lastName}
                        onChange={(event) => handleDetailsChange("lastName", event.target.value)}
                        className="h-11 w-full rounded-md border border-stone-100 bg-stone-50 px-3 outline-none focus:border-[#FF8C6B] focus:ring-2 focus:ring-[#FF8C6B]/20"
                      />
                    </label>
                    <label className="space-y-2 text-sm font-bold text-stone-800 sm:col-span-2">
                      <span>Email <span className="text-[#FF8C6B]">*</span></span>
                      <input
                        required
                        type="email"
                        value={checkoutDetails.email}
                        onChange={(event) => handleDetailsChange("email", event.target.value)}
                        className="h-11 w-full rounded-md border border-stone-100 bg-stone-50 px-3 outline-none focus:border-[#FF8C6B] focus:ring-2 focus:ring-[#FF8C6B]/20"
                      />
                    </label>
                    <label className="space-y-2 text-sm font-bold text-stone-800">
                      <span>Country Code <span className="text-[#FF8C6B]">*</span></span>
                      <select
                        required
                        value={checkoutDetails.countryCode}
                        onChange={(event) => handleDetailsChange("countryCode", event.target.value)}
                        className="h-11 w-full rounded-md border border-stone-100 bg-stone-50 px-3 outline-none focus:border-[#FF8C6B] focus:ring-2 focus:ring-[#FF8C6B]/20"
                      >
                        <option value="+971">+971 UAE</option>
                        <option value="+966">+966 KSA</option>
                        <option value="+965">+965 Kuwait</option>
                        <option value="+973">+973 Bahrain</option>
                        <option value="+974">+974 Qatar</option>
                        <option value="+968">+968 Oman</option>
                      </select>
                    </label>
                    <label className="space-y-2 text-sm font-bold text-stone-800">
                      <span>Phone / Mobile <span className="text-[#FF8C6B]">*</span></span>
                      <input
                        required
                        type="tel"
                        value={checkoutDetails.phone}
                        onChange={(event) => handleDetailsChange("phone", event.target.value)}
                        className="h-11 w-full rounded-md border border-stone-100 bg-stone-50 px-3 outline-none focus:border-[#FF8C6B] focus:ring-2 focus:ring-[#FF8C6B]/20"
                      />
                    </label>
                    <label className="space-y-2 text-sm font-bold text-stone-800 sm:col-span-2">
                      <span>Street Address <span className="text-[#FF8C6B]">*</span></span>
                      <input
                        required
                        value={checkoutDetails.streetAddress}
                        onChange={(event) => handleDetailsChange("streetAddress", event.target.value)}
                        className="h-11 w-full rounded-md border border-stone-100 bg-stone-50 px-3 outline-none focus:border-[#FF8C6B] focus:ring-2 focus:ring-[#FF8C6B]/20"
                      />
                    </label>
                    <label className="space-y-2 text-sm font-bold text-stone-800">
                      <span>Area <span className="text-[#FF8C6B]">*</span></span>
                      <input
                        required
                        value={checkoutDetails.area}
                        onChange={(event) => handleDetailsChange("area", event.target.value)}
                        className="h-11 w-full rounded-md border border-stone-100 bg-stone-50 px-3 outline-none focus:border-[#FF8C6B] focus:ring-2 focus:ring-[#FF8C6B]/20"
                      />
                    </label>
                    <label className="space-y-2 text-sm font-bold text-stone-800">
                      <span>City <span className="text-[#FF8C6B]">*</span></span>
                      <select
                        required
                        value={checkoutDetails.city}
                        onChange={(event) => handleDetailsChange("city", event.target.value)}
                        className="h-11 w-full rounded-md border border-stone-100 bg-stone-50 px-3 outline-none focus:border-[#FF8C6B] focus:ring-2 focus:ring-[#FF8C6B]/20"
                      >
                        <option>Dubai</option>
                        <option>Abu Dhabi</option>
                        <option>Sharjah</option>
                        <option>Ajman</option>
                        <option>Ras Al Khaimah</option>
                        <option>Fujairah</option>
                        <option>Umm Al Quwain</option>
                      </select>
                    </label>
                    <label className="space-y-2 text-sm font-bold text-stone-800 sm:col-span-2">
                      <span>Country <span className="text-[#FF8C6B]">*</span></span>
                      <select
                        required
                        value={checkoutDetails.country}
                        onChange={(event) => handleDetailsChange("country", event.target.value)}
                        className="h-11 w-full rounded-md border border-stone-100 bg-stone-50 px-3 outline-none focus:border-[#FF8C6B] focus:ring-2 focus:ring-[#FF8C6B]/20"
                      >
                        <option>United Arab Emirates</option>
                      </select>
                    </label>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold text-stone-900 mb-4">
                    Order Summary
                  </h2>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-stone-600 font-bold">
                      <span>Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-stone-600 font-bold">
                      <span>Shipping</span>
                      <span>
                        {shipping === 0 ? "Free" : formatPrice(shipping)}
                      </span>
                    </div>
                    {shipping > 0 && (
                      <p className="text-xs text-stone-500">
                        Free shipping on orders over {formatPrice(FREE_SHIPPING_THRESHOLD)}
                      </p>
                    )}
                    {minimumOrderRemaining > 0 && (
                      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                        Add {formatPrice(minimumOrderRemaining)} more to reach the {formatPrice(MINIMUM_ORDER_VALUE)} minimum order value.
                      </p>
                    )}
                    <div className="border-t pt-3 flex justify-between font-bold text-stone-900">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={isLoading || !canCheckout}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Proceed to Checkout
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                  <Link
                    href="/products"
                    className="block text-center text-sm text-[#FF8C6B] hover:text-[#ff7a54] font-bold mt-4"
                  >
                    Continue Shopping
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <ShoppingCart className="h-16 w-16 text-stone-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-stone-900 mb-2">
              Your cart is empty
            </h2>
            <p className="text-stone-600 mb-6">
              Looks like you haven&apos;t added anything yet.
            </p>
            <Button asChild href="/products">
              Start Shopping
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
