"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Clock, CheckCircle2 } from "lucide-react";
import ImageSlider from "@/components/ImageSlider";
import { MonthlyAvailableDatePicker } from "@/components/booking/monthly-available-date-picker";
import { RentalsPageContent, defaultRentalsContent } from "@/types/site-content";
import { dateAllowsDeposit, getDubaiDate, getMinimumBookableDate } from "@/lib/payments/deposit-policy";

const PRIMARY_BUTTON_CLASS = "bg-[rgb(255_140_107)] hover:bg-[rgb(255_126_91)] text-white border border-[rgb(255_140_107)] disabled:!bg-[rgb(255_170_145)] disabled:!border-[rgb(255_170_145)] disabled:!text-white disabled:!opacity-100 disabled:cursor-not-allowed";
const FORM_LABEL_CLASS = "block text-base font-bold text-stone-700 mb-2";
const PURPOSE_OPTIONS = [
  { value: "", label: "Select purpose" },
  { value: "cooking-session", label: "Private Cooking Session" },
  { value: "content-creation", label: "Content Creation / Filming" },
  { value: "corporate-event", label: "Corporate Event" },
  { value: "private-party", label: "Private Party" },
  { value: "workshop", label: "Workshop / Class" },
  { value: "other", label: "Other" },
];
const HALF_DAY_TIME_SLOTS = ["9am - 1pm", "1pm - 5pm", "5pm - 9pm"];
const HALF_DAY_START_TIMES: Record<string, string> = {
  "9am - 1pm": "09:00",
  "1pm - 5pm": "13:00",
  "5pm - 9pm": "17:00",
};

export default function RentalsPage() {
  const [content, setContent] = useState<RentalsPageContent>(defaultRentalsContent);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    date: "",
    guests: "",
    timeSlot: "",
    purpose: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isPurposeOpen, setIsPurposeOpen] = useState(false);
  const [blockedRentalDates, setBlockedRentalDates] = useState<string[]>([]);
  const [blockedHalfDaySlots, setBlockedHalfDaySlots] = useState<string[]>([]);
  const [selectedDateHasHiddenTimeRules, setSelectedDateHasHiddenTimeRules] = useState(false);
  const today = getDubaiDate();
  const minimumBookableDate = getMinimumBookableDate();
  const selectedPurposeLabel = PURPOSE_OPTIONS.find((option) => option.value === formData.purpose)?.label || "Select purpose";
  const selectedRentalOption = content.rentalOptions.find((o) => o.id === selectedOption);
  const isHalfDayRental = selectedRentalOption?.id === "half-day";
  const selectedDateAllowsDeposit = formData.date
    ? dateAllowsDeposit(formData.date, today)
    : false;

  useEffect(() => {
    fetchContent();
    fetchRentalAvailability();
  }, []);

  useEffect(() => {
    fetchRentalAvailability(formData.date);
  }, [formData.date]);

  useEffect(() => {
    if (formData.timeSlot && blockedHalfDaySlots.includes(formData.timeSlot)) {
      setFormData((current) => ({ ...current, timeSlot: "" }));
    }
  }, [blockedHalfDaySlots, formData.timeSlot]);

  const fetchContent = async () => {
    try {
      const res = await fetch("/api/site-content?page=rentals");
      const data = await res.json();
      setContent(data);
    } catch (error) {
      console.error("Error fetching rentals content:", error);
    }
  };

  const fetchRentalAvailability = async (date?: string) => {
    try {
      const query = date ? `?date=${encodeURIComponent(date)}` : "";
      const res = await fetch(`/api/rentals/availability${query}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch rental availability");
      const data = await res.json();
      setBlockedRentalDates(Array.isArray(data.blockedDates) ? data.blockedDates : []);
      setBlockedHalfDaySlots(Array.isArray(data.blockedHalfDaySlots) ? data.blockedHalfDaySlots : []);
      setSelectedDateHasHiddenTimeRules(Boolean(data.hasHiddenTimeRules));
    } catch (error) {
      console.error("Error fetching rental availability:", error);
    }
  };

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const calculateTotal = () => {
    const optionPrice = content.rentalOptions.find((o) => o.id === selectedOption)?.price || 0;
    const addOnsPrice = selectedAddOns.reduce((sum, id) => {
      const addOn = content.addOns.find((a) => a.id === id);
      return sum + (addOn?.price || 0);
    }, 0);
    return optionPrice + addOnsPrice;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption) return;
    if (!formData.date) {
      alert("Please select a preferred date.");
      return;
    }
    if (formData.date < minimumBookableDate) {
      alert("Please select a later preferred date.");
      return;
    }
    if (isHalfDayRental && !formData.timeSlot) {
      alert("Please select a time slot for the half day rental.");
      return;
    }
    if (isHalfDayRental && blockedHalfDaySlots.includes(formData.timeSlot)) {
      alert("The selected rental time slot is no longer available. Please choose another time.");
      return;
    }
    if (!isHalfDayRental && selectedDateHasHiddenTimeRules) {
      alert("The selected date has booked time ranges and is not available for full day rental. Please choose another date.");
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedRental = content.rentalOptions.find((o) => o.id === selectedOption);
      const selectedAddOnItems = selectedAddOns
        .map((id) => content.addOns.find((addOn) => addOn.id === id))
        .filter((addOn): addOn is NonNullable<typeof addOn> => Boolean(addOn));
      
      const response = await fetch("/api/services/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: "walkin_menu",
          serviceName: "Kitchen Studio Rental",
          packageName: selectedRental?.name,
          customerName: formData.name,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          eventDate: formData.date,
          eventTime: formData.timeSlot ? HALF_DAY_START_TIMES[formData.timeSlot] : null,
          guestCount: Number(formData.guests) || 1,
          extras: selectedAddOnItems.map((addOn) => ({
            id: addOn.id,
            name: addOn.name,
            price: addOn.price,
            quantity: 1,
          })),
          baseAmount: selectedRental?.price || 0,
          extrasAmount: selectedAddOnItems.reduce((sum, addOn) => sum + addOn.price, 0),
          totalAmount: calculateTotal(),
          specialRequests: [
            formData.timeSlot ? `Rental time slot: ${formData.timeSlot}` : "",
            formData.purpose ? `Purpose: ${selectedPurposeLabel}` : "",
            formData.message,
          ].filter(Boolean).join("\n"),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create rental booking");
      }

      const data = await response.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error("Error creating rental booking:", error);
      alert(error instanceof Error ? error.message : "Failed to create rental booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-white pt-8 pb-20">
        <div className="container max-w-2xl mx-auto px-6 text-center">
          <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-[#FF8C6B]/15 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-[#FF8C6B]" />
          </div>
          <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
            Booking Confirmed!
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Your kitchen rental booking has been created and is available in your account.
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
      {/* Page Title */}
      <div className="container max-w-6xl mx-auto px-6">
        <h1 className="text-4xl sm:text-5xl text-center pb-12" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
          Rentals
        </h1>
      </div>

      {/* Image Slider */}
      <div className="container max-w-6xl mx-auto px-6 mb-12">
        <ImageSlider images={content.galleryImages} alt="Kitchen Studio Photos" />
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
          <div className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-3 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 md:mb-0" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
              {content.pageTitle}
            </h1>
            <Image src={content.headerIcon} alt="" width={40} height={40} className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0" />
          </div>
          <p className="text-lg text-gray-600 max-w-2xl text-center md:text-left">
            {content.pageSubtitle}
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
                {content.rentalOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setSelectedOption(option.id);
                      if (option.id !== "half-day") {
                        setFormData({ ...formData, timeSlot: "" });
                      }
                    }}
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
                {content.addOns.map((addOn) => (
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
                      {addOn.icon ? (
                        <img src={addOn.icon} alt="" className="w-10 h-10 object-contain flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 flex-shrink-0" />
                      )}
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
                    <label className={FORM_LABEL_CLASS}>Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--c-accent)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className={FORM_LABEL_CLASS}>Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--c-accent)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className={FORM_LABEL_CLASS}>Phone *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--c-accent)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className={FORM_LABEL_CLASS}>Preferred Date *</label>
                    <MonthlyAvailableDatePicker
                      value={formData.date}
                      onChange={(date) => setFormData({ ...formData, date })}
                      today={minimumBookableDate}
                      unavailableDates={blockedRentalDates}
                      restrictToAvailableDates={false}
                    />
                  </div>
                  <div>
                    <label className={FORM_LABEL_CLASS}>Number of Guests</label>
                    <input
                      type="number"
                      min="1"
                      max="35"
                      value={formData.guests}
                      onChange={(e) => {
                        const value = e.target.value;
                        const guestCount = Number(value);
                        setFormData({
                          ...formData,
                          guests: value && guestCount > 35 ? "35" : value,
                        });
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--c-accent)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className={FORM_LABEL_CLASS}>Purpose of Rental</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsPurposeOpen((open) => !open)}
                        className="flex min-h-[60px] w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-base font-bold leading-6 text-stone-700 focus:border-[var(--c-accent)] focus:outline-none"
                      >
                        <span className={formData.purpose ? "text-stone-700" : "text-stone-400"}>
                          {selectedPurposeLabel}
                        </span>
                        <ChevronDown className={`h-4 w-4 text-stone-700 transition-transform ${isPurposeOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isPurposeOpen && (
                        <div className="absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                          {PURPOSE_OPTIONS.map((option) => (
                            <button
                              key={option.value || "empty"}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, purpose: option.value });
                                setIsPurposeOpen(false);
                              }}
                              className={`block w-full px-4 py-3 text-left text-base font-bold transition-colors hover:bg-[#FF8C6B]/10 ${
                                formData.purpose === option.value
                                  ? "bg-[#FF8C6B]/15 text-[#E95F3F]"
                                  : "text-stone-700"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {isHalfDayRental && (
                  <div>
                    <label className={FORM_LABEL_CLASS}>Time Slot *</label>
                    <div className="grid sm:grid-cols-3 gap-3">
                      {HALF_DAY_TIME_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => {
                            if (blockedHalfDaySlots.includes(slot)) return;
                            setFormData({ ...formData, timeSlot: slot });
                          }}
                          disabled={blockedHalfDaySlots.includes(slot)}
                          className={`rounded-xl border px-4 py-3 text-center text-base font-bold transition-colors ${
                            formData.timeSlot === slot
                              ? "border-[#FF8C6B] bg-[#FF8C6B] text-white"
                              : blockedHalfDaySlots.includes(slot)
                              ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-300"
                              : "border-gray-200 bg-white text-stone-700 hover:border-[#FF8C6B] hover:bg-[#FF8C6B]/10"
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <label className={FORM_LABEL_CLASS}>Additional Notes</label>
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
                  className={`w-full py-4 rounded-full font-bold text-lg transition-colors ${PRIMARY_BUTTON_CLASS}`}
                >
                  {isSubmitting ? "Opening Stripe..." : selectedDateAllowsDeposit ? "Pay 50% Deposit" : "Pay in Full"}
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
                        {content.rentalOptions.find((o) => o.id === selectedOption)?.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {content.rentalOptions.find((o) => o.id === selectedOption)?.duration}
                      </p>
                      {isHalfDayRental && formData.timeSlot && (
                        <p className="text-sm font-medium text-[#E95F3F]">
                          {formData.timeSlot}
                        </p>
                      )}
                    </div>
                    <p className="font-bold">
                      AED {content.rentalOptions.find((o) => o.id === selectedOption)?.price.toLocaleString()}
                    </p>
                  </div>

                  {selectedAddOns.map((id) => {
                    const addOn = content.addOns.find((a) => a.id === id);
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
                    {formData.date && (
                      <p className="mt-2 text-sm text-gray-500">
                        {selectedDateAllowsDeposit
                          ? `Due now: AED ${Math.ceil(calculateTotal() * 0.5).toLocaleString()} (50% deposit)`
                          : "Full payment is required for rentals within 2 days."}
                      </p>
                    )}
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
                  {content.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#FF8C6B]" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
