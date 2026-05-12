"use client";

import { useState, useEffect } from "react";
import { Gift, Loader2, X, Ticket, UtensilsCrossed, Check, ShoppingBag, PartyPopper, ArrowLeft, ArrowRight, Calendar, Clock, User, Mail, Phone } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import Image from "next/image";

interface VoucherGroup {
  amount: number;
  count: number;
}

interface BuyForm {
  name: string;
  email: string;
}

interface ClaimedVoucher {
  code: string;
  amount: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  price_unit: string;
  image_url: string | null;
  emoji: string | null;
  categories: string[] | string;
  scheduled_date?: string | null;
}

interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  eventDate: string;
  timeSlot: string;
  specialRequests: string;
  numberOfGuests: number;
}

export default function VouchersPage() {
  const [groups, setGroups] = useState<VoucherGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VoucherGroup | null>(null);
  const [form, setForm] = useState<BuyForm>({ name: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const [voucherCode, setVoucherCode] = useState("");
  const [claimedVoucher, setClaimedVoucher] = useState<ClaimedVoucher | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [loadingMenu, setLoadingMenu] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(false);
  
  const [redeemStep, setRedeemStep] = useState<'select' | 'details' | 'confirm'>('select');
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    name: '',
    email: '',
    phone: '',
    eventDate: '',
    timeSlot: '',
    specialRequests: '',
    numberOfGuests: 1,
  });
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/vouchers")
      .then((r) => r.json())
      .then((d) => setGroups(d.vouchers || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openModal = (g: VoucherGroup) => {
    setSelected(g);
    setForm({ name: "", email: "" });
    setError("");
  };

  const closeModal = () => {
    if (submitting) return;
    setSelected(null);
    setError("");
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;
    
    setClaiming(true);
    setClaimError("");
    
    try {
      const res = await fetch("/api/vouchers/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: voucherCode.trim() }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setClaimError(data.error || "Invalid voucher code");
        return;
      }
      
      setClaimedVoucher(data.voucher);
      
      setLoadingMenu(true);
      const menuRes = await fetch("/api/menus");
      const menuData = await menuRes.json();
      
      if (!menuRes.ok || menuData.error) {
        setClaimError(`Failed to load menu items: ${menuData.error || 'Unknown error'}`);
        setLoadingMenu(false);
        return;
      }
      
      const filtered = (menuData.items || []).filter(
        (item: MenuItem) => Number(item.price) <= Number(data.voucher.amount)
      );
      setMenuItems(filtered);
      setLoadingMenu(false);
    } catch {
      setClaimError("Something went wrong. Please try again.");
    } finally {
      setClaiming(false);
    }
  };
  
  const resetClaim = () => {
    setVoucherCode("");
    setClaimedVoucher(null);
    setMenuItems([]);
    setClaimError("");
    setSelectedItem(null);
    setRedeemSuccess(false);
    setRedeemStep('select');
    setCustomerDetails({
      name: '',
      email: '',
      phone: '',
      eventDate: '',
      timeSlot: '',
      specialRequests: '',
      numberOfGuests: 1,
    });
  };

  // Check if selected item is a monthly special (has scheduled_date and is in monthly categories)
  const isMonthlySpecial = selectedItem?.scheduled_date && (
    Array.isArray(selectedItem.categories) 
      ? selectedItem.categories.some(c => c === 'monthly_mini' || c === 'monthly_big')
      : (selectedItem.categories === 'monthly_mini' || selectedItem.categories === 'monthly_big')
  );

  // Auto-populate date/time when a monthly special is selected
  useEffect(() => {
    if (selectedItem?.scheduled_date) {
      const categories = Array.isArray(selectedItem.categories) ? selectedItem.categories : [selectedItem.categories];
      const isMonthly = categories.some(c => c === 'monthly_mini' || c === 'monthly_big');
      if (isMonthly) {
        const scheduledDate = new Date(selectedItem.scheduled_date);
        const dateStr = scheduledDate.toISOString().split('T')[0];
        const timeStr = scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        setCustomerDetails(d => ({ ...d, eventDate: dateStr, timeSlot: timeStr }));
      }
    }
  }, [selectedItem]);

  // Fetch available time slots when date changes
  useEffect(() => {
    // Skip fetching slots if this is a monthly special (date is fixed)
    if (isMonthlySpecial) return;
    if (!customerDetails.eventDate) {
      setAvailableTimeSlots([]);
      return;
    }
    
    // Default time slots (can be fetched from API later)
    setAvailableTimeSlots([
      '10:00 AM',
      '11:00 AM',
      '12:00 PM',
      '1:00 PM',
      '2:00 PM',
      '3:00 PM',
      '4:00 PM',
      '5:00 PM',
      '6:00 PM',
    ]);
  }, [customerDetails.eventDate, isMonthlySpecial]);

  const handleProceedToDetails = () => {
    if (!selectedItem) return;
    setRedeemStep('details');
    setClaimError('');
  };

  const handleBackToSelect = () => {
    setRedeemStep('select');
    setClaimError('');
  };

  const handleRedeem = async () => {
    if (!claimedVoucher || !selectedItem) return;
    
    // Validate required fields
    if (!customerDetails.name || !customerDetails.email || !customerDetails.eventDate || !customerDetails.timeSlot) {
      setClaimError("Please fill in all required fields");
      return;
    }
    
    setRedeeming(true);
    setClaimError("");
    
    try {
      const res = await fetch("/api/vouchers/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucherCode: claimedVoucher.code,
          menuItemId: selectedItem.id,
          customerDetails: {
            name: customerDetails.name,
            email: customerDetails.email,
            phone: customerDetails.phone,
            eventDate: customerDetails.eventDate,
            timeSlot: customerDetails.timeSlot,
            specialRequests: customerDetails.specialRequests,
            numberOfGuests: customerDetails.numberOfGuests,
          },
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setClaimError(data.error || "Failed to redeem voucher");
        return;
      }
      
      setRedeemSuccess(true);
    } catch {
      setClaimError("Something went wrong. Please try again.");
    } finally {
      setRedeeming(false);
    }
  };

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/vouchers/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, amount: selected.amount }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-16 lg:py-24 bg-[#fff5eb] text-center">
        <Gift className="h-12 w-12 mx-auto mb-4 text-[#ff7f5c]" />
        <h1
          className="text-4xl lg:text-6xl font-bold text-stone-900 mb-4"
          style={{ fontFamily: "var(--font-mossy), cursive" }}
        >
          Vouchers
        </h1>
        <p className="text-stone-500 text-lg max-w-xl mx-auto">
          Give the gift of cooking. Our vouchers never expire and can be used
          on any Mamalu Kitchen experience.
        </p>
      </section>

      {/* Cards grid */}
      <section className="px-6 lg:px-8 py-20">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-24 text-stone-400">
            <Gift className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-lg">No gift cards available right now</p>
            <p className="text-sm mt-1">Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {groups.map((g) => (
              <div
                key={g.amount}
                className="group relative rounded-3xl overflow-hidden bg-white border-2 border-stone-100 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Decorative header with coral gradient */}
                <div className="h-24 bg-gradient-to-br from-[#ff7f5c] to-[#ff9a7c] relative overflow-hidden">
                  <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
                  <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10" />
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'url(/logos/logo-white.png)',
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }} />
                </div>

                {/* Content area */}
                <div className="p-8 pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-xl bg-[#ff7f5c]/10">
                      <Gift className="h-5 w-5 text-[#ff7f5c]" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Gift Voucher
                    </p>
                  </div>
                  
                  <p
                    className="text-5xl font-bold text-stone-900 mb-3"
                    style={{ fontFamily: "var(--font-mossy), cursive" }}
                  >
                    {formatPrice(g.amount)}
                  </p>
                  
                  <div className="flex items-center gap-2 text-sm text-stone-600 mb-6">
                    <span className="px-2.5 py-1 bg-stone-100 rounded-lg font-medium">
                      {g.count} available
                    </span>
                    <span className="text-stone-400">·</span>
                    <span className="text-stone-500">Never expires</span>
                  </div>
                  
                  <button
                    onClick={() => openModal(g)}
                    className="w-full text-center bg-[#ff7f5c] text-white font-bold py-3.5 rounded-2xl hover:bg-[#ff6a42] transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Claim Voucher Section */}
      <section className="px-6 lg:px-8 py-20 bg-stone-50">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-[#ff7f5c]/10 rounded-2xl mb-4">
            <Ticket className="h-8 w-8 text-[#ff7f5c]" />
          </div>
          <h2
            className="text-3xl lg:text-4xl font-bold text-stone-900 mb-3"
            style={{ fontFamily: "var(--font-mossy), cursive" }}
          >
            Have a Voucher?
          </h2>
          <p className="text-stone-600">
            Enter your voucher code to see what delicious experiences await you!
          </p>
        </div>

        {!claimedVoucher ? (
          <div className="max-w-md mx-auto">
            <form onSubmit={handleClaim} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  placeholder="Enter voucher code"
                  className="w-full px-4 py-4 border-2 border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#ff7f5c]/40 focus:border-[#ff7f5c] text-center font-mono font-bold text-lg uppercase tracking-widest"
                />
              </div>
              
              {claimError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 text-center">
                  {claimError}
                </p>
              )}
              
              <button
                type="submit"
                disabled={claiming || !voucherCode.trim()}
                className="w-full bg-[#ff7f5c] text-white font-bold py-4 rounded-2xl hover:bg-[#ff6a42] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {claiming && <Loader2 className="h-5 w-5 animate-spin" />}
                {claiming ? "Validating..." : "Claim Voucher"}
              </button>
            </form>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl p-6 mb-8 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <Ticket className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-stone-500 font-medium">Voucher Code</p>
                    <p className="text-lg font-mono font-bold text-stone-900 tracking-wider">
                      {claimedVoucher.code}
                    </p>
                  </div>
                  <div className="ml-8">
                    <p className="text-sm text-stone-500 font-medium">Value</p>
                    <p
                      className="text-2xl font-bold text-[#ff7f5c]"
                      style={{ fontFamily: "var(--font-mossy), cursive" }}
                    >
                      {formatPrice(claimedVoucher.amount)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetClaim}
                  className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  Try Another Code
                </button>
              </div>
            </div>

            {redeemSuccess ? (
              <div className="max-w-lg mx-auto">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center p-4 bg-green-100 rounded-full mb-6">
                    <PartyPopper className="h-12 w-12 text-green-600" />
                  </div>
                  <h3
                    className="text-3xl font-bold text-stone-900 mb-3"
                    style={{ fontFamily: "var(--font-mossy), cursive" }}
                  >
                    Booking Confirmed!
                  </h3>
                  <p className="text-stone-600">
                    Your voucher has been redeemed successfully
                  </p>
                </div>

                {/* Booking Summary Card */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-stone-200 mb-6">
                  <h4 className="font-bold text-lg text-stone-900 mb-4 pb-3 border-b border-stone-100">
                    Booking Details
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Experience</span>
                      <span className="font-bold text-[#ff7f5c]">{selectedItem?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Guest Name</span>
                      <span className="font-medium text-stone-900">{customerDetails.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Email</span>
                      <span className="font-medium text-stone-900">{customerDetails.email}</span>
                    </div>
                    {customerDetails.phone && (
                      <div className="flex justify-between">
                        <span className="text-stone-500">Phone</span>
                        <span className="font-medium text-stone-900">{customerDetails.phone}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-stone-500">Date</span>
                      <span className="font-medium text-stone-900">
                        {new Date(customerDetails.eventDate).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Time</span>
                      <span className="font-medium text-stone-900">{customerDetails.timeSlot}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Guests</span>
                      <span className="font-medium text-stone-900">{customerDetails.numberOfGuests}</span>
                    </div>
                    {customerDetails.specialRequests && (
                      <div className="pt-2 border-t border-stone-100">
                        <span className="text-stone-500 block mb-1">Special Requests</span>
                        <span className="text-stone-700 text-sm">{customerDetails.specialRequests}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-stone-100">
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500">Total</span>
                      <div className="text-right">
                        <span className="text-lg text-stone-400 line-through mr-2">
                          {selectedItem && formatPrice(selectedItem.price)}
                        </span>
                        <span className="text-2xl font-bold text-green-600">FREE</span>
                      </div>
                    </div>
                    <p className="text-xs text-stone-400 mt-1 text-right">Paid with voucher {claimedVoucher?.code}</p>
                  </div>
                </div>

                <p className="text-stone-500 text-sm text-center mb-6">
                  A confirmation email has been sent to {customerDetails.email}.<br />
                  Our team will contact you to finalize the details.
                </p>

                <button
                  onClick={resetClaim}
                  className="w-full px-8 py-4 bg-[#ff7f5c] text-white font-bold rounded-2xl hover:bg-[#ff6a42] transition-all"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-stone-900 mb-2">
                {selectedItem ? "Confirm Your Selection" : "Select a Menu Item"}
              </h3>
              <p className="text-stone-600">
                {selectedItem 
                  ? "Review your selection and redeem your voucher"
                  : "Click on an item to select it for redemption"
                }
              </p>
            </div>

            {loadingMenu ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
              </div>
            ) : menuItems.length === 0 ? (
              <div className="text-center py-12 text-stone-400">
                <UtensilsCrossed className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium text-lg">No menu items available for this voucher</p>
              </div>
            ) : (
              <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuItems.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(isSelected ? null : item)}
                    className={`bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer relative ${
                      isSelected ? "ring-4 ring-[#ff7f5c] ring-offset-2" : ""
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 z-10 bg-[#ff7f5c] text-white p-2 rounded-full shadow-lg">
                        <Check className="h-5 w-5" />
                      </div>
                    )}
                    {item.image_url ? (
                      <div className="relative h-48 bg-stone-100">
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-48 bg-gradient-to-br from-[#ff7f5c] to-[#ff9a7c] flex items-center justify-center">
                        {item.emoji ? (
                          <span className="text-6xl">{item.emoji}</span>
                        ) : (
                          <UtensilsCrossed className="h-16 w-16 text-white/50" />
                        )}
                      </div>
                    )}
                    <div className="p-5">
                      <h4 className="font-bold text-lg text-stone-900 mb-2">
                        {item.name}
                      </h4>
                      {item.description && (
                        <p className="text-sm text-stone-600 mb-3 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <p
                          className="text-2xl font-bold text-[#ff7f5c]"
                          style={{ fontFamily: "var(--font-mossy), cursive" }}
                        >
                          {formatPrice(item.price)}
                        </p>
                        <span className="text-xs text-stone-500">
                          {item.price_unit}
                        </span>
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>

              {/* Checkout Section - Step 1: Select */}
              {selectedItem && redeemStep === 'select' && (
                <div className="mt-8 bg-white rounded-2xl p-6 shadow-lg border-2 border-[#ff7f5c]/20">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-[#ff7f5c]/10 rounded-xl">
                        <ShoppingBag className="h-6 w-6 text-[#ff7f5c]" />
                      </div>
                      <div>
                        <p className="text-sm text-stone-500 font-medium">Selected Item</p>
                        <p className="text-lg font-bold text-stone-900">{selectedItem.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-stone-500">Item Price</p>
                      <p className="text-xl font-bold text-stone-400 line-through">
                        {formatPrice(selectedItem.price)}
                      </p>
                      <p className="text-2xl font-bold text-green-600">FREE</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleProceedToDetails}
                    className="mt-6 w-full bg-[#ff7f5c] text-white font-bold py-4 rounded-2xl hover:bg-[#ff6a42] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    Continue <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* Checkout Section - Step 2: Customer Details */}
              {selectedItem && redeemStep === 'details' && (
                <div className="mt-8 bg-white rounded-2xl p-6 shadow-lg border-2 border-[#ff7f5c]/20">
                  <h3 className="text-xl font-bold text-stone-900 mb-6">Your Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        <User className="h-4 w-4 inline mr-1" />
                        Your Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={customerDetails.name}
                        onChange={(e) => setCustomerDetails(d => ({ ...d, name: e.target.value }))}
                        placeholder="Full name"
                        className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7f5c]/40 focus:border-[#ff7f5c]"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        <Mail className="h-4 w-4 inline mr-1" />
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={customerDetails.email}
                        onChange={(e) => setCustomerDetails(d => ({ ...d, email: e.target.value }))}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7f5c]/40 focus:border-[#ff7f5c]"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        <Phone className="h-4 w-4 inline mr-1" />
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={customerDetails.phone}
                        onChange={(e) => setCustomerDetails(d => ({ ...d, phone: e.target.value }))}
                        placeholder="+971 50 123 4567"
                        className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7f5c]/40 focus:border-[#ff7f5c]"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        Number of Guests
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={customerDetails.numberOfGuests}
                        onChange={(e) => setCustomerDetails(d => ({ ...d, numberOfGuests: parseInt(e.target.value) || 1 }))}
                        className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7f5c]/40 focus:border-[#ff7f5c]"
                      />
                    </div>
                    
                    {isMonthlySpecial ? (
                      <div className="col-span-2 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-sm font-medium text-amber-800 mb-3">
                          <Calendar className="inline h-4 w-4 mr-1" />
                          This monthly special has a fixed schedule:
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-amber-700 mb-1">Event Date</label>
                            <div className="px-4 py-3 bg-white border border-amber-300 rounded-xl text-stone-900 font-medium">
                              {new Date(customerDetails.eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-amber-700 mb-1">Time</label>
                            <div className="px-4 py-3 bg-white border border-amber-300 rounded-xl text-stone-900 font-medium">
                              {customerDetails.timeSlot}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-1">
                            <Calendar className="h-4 w-4 inline mr-1" />
                            Event Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={customerDetails.eventDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setCustomerDetails(d => ({ ...d, eventDate: e.target.value, timeSlot: '' }))}
                            className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7f5c]/40 focus:border-[#ff7f5c]"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-1">
                            <Clock className="h-4 w-4 inline mr-1" />
                            Time Slot <span className="text-red-500">*</span>
                          </label>
                          <select
                            required
                            value={customerDetails.timeSlot}
                            onChange={(e) => setCustomerDetails(d => ({ ...d, timeSlot: e.target.value }))}
                            disabled={!customerDetails.eventDate}
                            className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7f5c]/40 focus:border-[#ff7f5c] disabled:bg-stone-100 disabled:cursor-not-allowed"
                          >
                            <option value="">{customerDetails.eventDate ? 'Select a time' : 'Select date first'}</option>
                            {availableTimeSlots.map(slot => (
                              <option key={slot} value={slot}>{slot}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Special Requests
                    </label>
                    <textarea
                      value={customerDetails.specialRequests}
                      onChange={(e) => setCustomerDetails(d => ({ ...d, specialRequests: e.target.value }))}
                      placeholder="Any dietary restrictions, allergies, or special requests..."
                      rows={3}
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7f5c]/40 focus:border-[#ff7f5c] resize-none"
                    />
                  </div>

                  {/* Order Summary */}
                  <div className="mt-6 p-4 bg-stone-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-stone-500">Selected Experience</p>
                        <p className="font-bold text-stone-900">{selectedItem.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg text-stone-400 line-through">{formatPrice(selectedItem.price)}</p>
                        <p className="text-xl font-bold text-green-600">FREE</p>
                      </div>
                    </div>
                  </div>
                  
                  {claimError && (
                    <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 text-center">
                      {claimError}
                    </p>
                  )}
                  
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={handleBackToSelect}
                      className="flex-1 py-4 rounded-2xl border-2 border-stone-200 text-stone-700 font-bold hover:bg-stone-50 transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="h-5 w-5" /> Back
                    </button>
                    <button
                      onClick={handleRedeem}
                      disabled={redeeming || !customerDetails.name || !customerDetails.email || !customerDetails.eventDate || !customerDetails.timeSlot}
                      className="flex-[2] bg-green-600 text-white font-bold py-4 rounded-2xl hover:bg-green-700 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {redeeming && <Loader2 className="h-5 w-5 animate-spin" />}
                      {redeeming ? "Processing..." : "Confirm Booking"}
                    </button>
                  </div>
                </div>
              )}
              </>
            )}
              </>
            )}
          </div>
        )}
      </section>

      {/* Buy Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-bold text-stone-900">Buy Gift Card</h2>
                <p className="text-sm text-stone-500">{formatPrice(selected.amount)} value</p>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors">
                <X className="h-5 w-5 text-stone-400" />
              </button>
            </div>

            <form onSubmit={handleBuy} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Your full name"
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7f5c]/40 focus:border-[#ff7f5c]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7f5c]/40 focus:border-[#ff7f5c]"
                />
                <p className="text-xs text-stone-400 mt-1">Your gift card code will be sent to this email.</p>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-[#ff7f5c] text-white font-bold hover:bg-[#ff6a42] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Redirecting…" : `Pay ${formatPrice(selected.amount)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
