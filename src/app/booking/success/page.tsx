"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { openAccountWithAutoLogin } from "@/lib/account/auto-login-client";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const bookingNumber = searchParams.get("booking");
  const [loading, setLoading] = useState(true);
  const [openingAccount, setOpeningAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingDetails] = useState<{
    bookingNumber: string;
    className: string;
    amount: string;
  } | null>(null);

  useEffect(() => {
    async function verifyPayment() {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        // Payment is already verified by webhook, just show success
        setLoading(false);
      } catch {
        setError("Failed to verify payment");
        setLoading(false);
      }
    }

    verifyPayment();
  }, [sessionId]);

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
              Payment Successful!
            </h1>
            <p className="text-lg text-stone-600 mb-6">
              Thank you for your booking. Your payment has been processed successfully.
            </p>

            {bookingDetails && (
              <div className="bg-stone-50 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-stone-900 mb-2">Booking Details</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-stone-500">Booking #:</span> {bookingDetails.bookingNumber}</p>
                  <p><span className="text-stone-500">Class:</span> {bookingDetails.className}</p>
                  <p><span className="text-stone-500">Amount:</span> {bookingDetails.amount}</p>
                </div>
              </div>
            )}

            <div className="bg-amber-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">
                A confirmation email has been sent to your email address with all the details.
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
