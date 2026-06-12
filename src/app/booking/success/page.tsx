"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { openAccountWithAutoLogin } from "@/lib/account/auto-login-client";

interface BalanceBookingDetails {
  booking_number: string;
  service_name: string;
  package_name: string | null;
  menu_name: string | null;
  event_date: string | null;
  event_time: string | null;
  time_label: string | null;
  guest_count: number;
  total_amount: number;
  deposit_amount: number | null;
  balance_amount: number | null;
  balance_paid_at: string | null;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const bookingNumber = searchParams.get("booking");
  const isBalancePayment = searchParams.get("payment") === "balance";
  const [loading, setLoading] = useState(true);
  const [openingAccount, setOpeningAccount] = useState(false);
  const [error] = useState<string | null>(null);
  const [bookingDetails, setBookingDetails] = useState<BalanceBookingDetails | null>(null);

  useEffect(() => {
    async function verifyPayment() {
      if (!isBalancePayment || !bookingNumber) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/bookings/success-details?booking=${encodeURIComponent(bookingNumber)}`);
        if (res.ok) {
          const data = await res.json();
          setBookingDetails(data.booking);
        }
        setLoading(false);
      } catch {
        setLoading(false);
      }
    }

    verifyPayment();
  }, [bookingNumber, isBalancePayment, sessionId]);

  const formatAmount = (amount: number | null) =>
    new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
    }).format(amount || 0);

  const formatEventDate = (date: string | null) =>
    date
      ? new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "Date pending";

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-stone-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 py-12">
        <div className="mx-auto max-w-2xl px-4">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-stone-900 mb-2">
                Payment Verification Failed
              </h2>
              <p className="text-stone-600 mb-6">{error}</p>
              <p className="text-sm text-stone-500 mb-6">
                Don&apos;t worry - if you were charged, your booking has been recorded. Please contact support if you need assistance.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent("openMamaluMenu"))}>Browse Classes</Button>
                <Link href="/contact">
                  <Button>Contact Support</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12">
      <div className="mx-auto max-w-2xl px-4">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-stone-900 mb-2">
              {isBalancePayment ? "Booking Balance Paid!" : "Payment Successful!"}
            </h1>
            <p className="text-lg text-stone-600 mb-6">
              {isBalancePayment
                ? "Thank you. The remaining balance for this booking has been paid in full."
                : "Thank you for your booking. Your payment has been processed successfully."}
            </p>

            {isBalancePayment && bookingDetails && (
              <div className="mb-6 rounded-lg border border-stone-200 bg-stone-50 p-5 text-left">
                <h3 className="mb-4 font-semibold text-stone-900">Booking Details</h3>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-stone-500">Booking Number</p>
                    <p className="font-medium text-stone-900">{bookingDetails.booking_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">Status</p>
                    <p className="font-medium text-green-700">Fully Paid</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-stone-500">Booking</p>
                    <p className="font-medium text-stone-900">
                      {[bookingDetails.service_name, bookingDetails.package_name || bookingDetails.menu_name]
                        .filter(Boolean)
                        .join(" - ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">Event Schedule</p>
                    <p className="font-medium text-stone-900">
                      {formatEventDate(bookingDetails.event_date)}
                      {(bookingDetails.time_label || bookingDetails.event_time) &&
                        ` at ${bookingDetails.time_label || bookingDetails.event_time}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">Guests</p>
                    <p className="font-medium text-stone-900">{bookingDetails.guest_count || 1}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 border-t border-stone-200 pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Total booking amount</span>
                    <span className="font-medium">{formatAmount(bookingDetails.total_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Deposit paid</span>
                    <span className="font-medium">{formatAmount(bookingDetails.deposit_amount)}</span>
                  </div>
                  <div className="flex justify-between text-green-700">
                    <span>Balance paid</span>
                    <span className="font-semibold">{formatAmount(bookingDetails.balance_amount)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-amber-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">
                {isBalancePayment
                  ? "Your booking is now fully paid. You can review it anytime from My Bookings."
                  : "A confirmation email has been sent to your email address with all the details."}
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent("openMamaluMenu"))}>Browse More Classes</Button>
              <Button
                disabled={openingAccount}
                onClick={async () => {
                  setOpeningAccount(true);
                  await openAccountWithAutoLogin({
                    sessionId,
                    bookingNumber,
                    destination: "/account/bookings",
                  });
                }}
              >
                {openingAccount ? "Opening..." : "View My Bookings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
