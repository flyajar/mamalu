"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Clock, Users, Calendar, CheckCircle2, Plus, Minus } from "lucide-react";

interface RentalOption {
  id: string;
  name: string;
  duration: string;
  price: number;
  description: string;
  icon: string;
}

const rentalOptions: RentalOption[] = [
  {
    id: "full-day",
    name: "Full Day Rental",
    duration: "8 hours",
    price: 5000,
    description: "Complete access to our professional kitchen studio for a full day of cooking, filming, or events.",
    icon: "/image-updates/kitchen-01.png",
  },
  {
    id: "half-day",
    name: "Half Day Rental",
    duration: "4 hours",
    price: 2500,
    description: "Perfect for shorter sessions, workshops, or intimate cooking events.",
    icon: "/image-updates/kitchen-02.png",
  },
];

const addOns = [
  {
    id: "cleaning",
    name: "Cleaning Service",
    price: 300,
    description: "Professional deep cleaning after your session",
    icon: "🧼",
  },
];

export default function RentalsPage() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    date: "",
    guests: "",
    purpose: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const calculateTotal = () => {
    const optionPrice = rentalOptions.find((o) => o.id === selectedOption)?.price || 0;
    const addOnsPrice = selectedAddOns.reduce((sum, id) => {
      const addOn = addOns.find((a) => a.id === id);
      return sum + (addOn?.price || 0);
    }, 0);
    return optionPrice + addOnsPrice;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption) return;

    setIsSubmitting(true);
    
    try {
      const selectedRental = rentalOptions.find((o) => o.id === selectedOption);
      const selectedAddOnNames = selectedAddOns.map(id => addOns.find(a => a.id === id)?.name).filter(Boolean);
      
      const response = await fetch("/api/rentals/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          date: formData.date,
          guests: formData.guests,
          purpose: formData.purpose,
          message: formData.message,
          rentalOption: selectedRental?.name,
          rentalPrice: selectedRental?.price,
          addOns: selectedAddOnNames,
          totalAmount: calculateTotal(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit inquiry");
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting rental inquiry:", error);
      alert("Failed to submit inquiry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-white pt-8 pb-20">
        <div className="container max-w-2xl mx-auto px-6 text-center">
          <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
            Inquiry Received!
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Thank you for your interest in renting our kitchen studio. Our team will contact you within 24 hours to confirm availability and finalize your booking.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--c-black)] text-white rounded-full font-bold hover:opacity-90 transition-opacity"
          >
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pt-4 pb-20">
      {/* Hero Image */}
      <div className="w-full h-64 md:h-80 relative mb-8">
        <Image
          src="/images/_C3A0998.JPG"
          alt="Kitchen Studio"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>
      
      <div className="container max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("openMamaluMenu"))}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Booking
          </button>
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
            KITCHEN STUDIO RENTAL <Image src="/image-updates/kitchen-03.png" alt="" width={40} height={40} className="inline-block ml-2" />
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Rent our fully-equipped professional kitchen for your cooking sessions, content creation, private events, or corporate team building.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Left: Options */}
          <div className="lg:col-span-2 space-y-8">
            {/* Rental Options */}
            <div>
              <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
                Choose Your Rental Duration
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {rentalOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedOption(option.id)}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${
                      selectedOption === option.id
                        ? "border-[var(--c-accent)] bg-[var(--c-peach)]/30"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Image src={option.icon} alt="" width={48} height={48} className="mb-3" />
                    <h3 className="text-xl font-bold mb-1">{option.name}</h3>
                    <div className="flex items-center gap-2 text-gray-600 mb-3">
                      <Clock className="w-4 h-4" />
                      <span>{option.duration}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">{option.description}</p>
                    <div className="text-2xl font-bold text-stone-900">
                      AED {option.price.toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Add-ons */}
            <div>
              <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
                Add-ons
              </h2>
              <div className="space-y-3">
                {addOns.map((addOn) => (
                  <button
                    key={addOn.id}
                    onClick={() => toggleAddOn(addOn.id)}
                    className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                      selectedAddOns.includes(addOn.id)
                        ? "border-[var(--c-accent)] bg-[var(--c-peach)]/30"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{addOn.icon}</span>
                      <div className="text-left">
                        <h3 className="font-bold">{addOn.name}</h3>
                        <p className="text-sm text-gray-500">{addOn.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-stone-900">AED {addOn.price}</span>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedAddOns.includes(addOn.id)
                          ? "bg-[var(--c-accent)] border-[var(--c-accent)]"
                          : "border-gray-300"
                      }`}>
                        {selectedAddOns.includes(addOn.id) && (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Booking Form */}
            {selectedOption && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
                  Your Details
                </h2>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--c-accent)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--c-accent)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--c-accent)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Preferred Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--c-accent)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Number of Guests</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.guests}
                      onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--c-accent)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Purpose of Rental</label>
                    <select
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--c-accent)] focus:outline-none"
                    >
                      <option value="">Select purpose</option>
                      <option value="cooking-session">Private Cooking Session</option>
                      <option value="content-creation">Content Creation / Filming</option>
                      <option value="corporate-event">Corporate Event</option>
                      <option value="private-party">Private Party</option>
                      <option value="workshop">Workshop / Class</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Additional Notes</label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--c-accent)] focus:outline-none resize-none"
                    placeholder="Tell us more about your event or any special requirements..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[var(--c-black)] text-white rounded-full font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Inquiry"}
                </button>
              </form>
            )}
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 bg-gray-50 rounded-3xl p-6">
              <h3 className="text-xl font-bold mb-6" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
                Booking Summary
              </h3>
              
              {selectedOption ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {rentalOptions.find((o) => o.id === selectedOption)?.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {rentalOptions.find((o) => o.id === selectedOption)?.duration}
                      </p>
                    </div>
                    <p className="font-bold">
                      AED {rentalOptions.find((o) => o.id === selectedOption)?.price.toLocaleString()}
                    </p>
                  </div>
                  
                  {selectedAddOns.map((id) => {
                    const addOn = addOns.find((a) => a.id === id);
                    return addOn ? (
                      <div key={id} className="flex justify-between items-center text-sm">
                        <p>{addOn.name}</p>
                        <p>AED {addOn.price}</p>
                      </div>
                    ) : null;
                  })}
                  
                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-bold">Total</p>
                      <p className="text-2xl font-bold text-stone-900">
                        AED {calculateTotal().toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Select a rental option to see pricing
                </p>
              )}

              {/* Kitchen Features */}
              <div className="mt-8 pt-6 border-t">
                <h4 className="font-bold mb-4">What&apos;s Included</h4>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Professional kitchen equipment
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Multiple cooking stations
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Air-conditioned space
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    WiFi access
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Parking available
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
