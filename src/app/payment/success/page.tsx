"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { openAccountWithAutoLogin } from "@/lib/account/auto-login-client";

function SuccessContent() {
  const searchParams = useSearchParams();
  const invoiceNumber = searchParams.get("invoice");
  const sessionId = searchParams.get("session_id");
  const [verifying, setVerifying] = useState(!!sessionId);
  const [openingAccount, setOpeningAccount] = useState(false);

  useEffect(() => {
    // Verify payment and update status when session_id is present
    if (sessionId) {
      fetch("/api/payment-links/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Payment verification:", data);
        })
        .catch((err) => {
          console.error("Verification error:", err);
        })
        .finally(() => {
          setVerifying(false);
        });
    }
  }, [sessionId]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-stone-600">Verifying payment...</p>
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
              Thank you for your payment. Your transaction has been completed successfully.
            </p>

            {invoiceNumber && (
              <div className="bg-stone-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-stone-600">
                  Invoice Reference: <span className="font-medium">{invoiceNumber}</span>
                </p>
              </div>
            )}

            <div className="bg-amber-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">
                A receipt has been sent to your email address.
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <Link href="/">
                <Button variant="outline">Go Home</Button>
              </Link>
              <Button
                disabled={openingAccount}
                onClick={async () => {
                  setOpeningAccount(true);
                  await openAccountWithAutoLogin({
                    sessionId,
                    destination: sessionId ? "/account/orders" : "/account",
                  });
                }}
              >
                {openingAccount ? "Opening..." : "View My Account"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
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
