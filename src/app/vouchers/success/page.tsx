"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Gift, Loader2 } from "lucide-react";
import Link from "next/link";
import { openAccountWithAutoLogin } from "@/lib/account/auto-login-client";

export default function VoucherSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">(sessionId ? "loading" : "error");
  const [openingAccount, setOpeningAccount] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    // Small delay then show success – the webhook handles the rest asynchronously
    const t = setTimeout(() => setStatus("success"), 1200);
    return () => clearTimeout(t);
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-[#fff5eb] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
        {status === "loading" ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-[#ff7f5c] mx-auto mb-4" />
            <p className="text-stone-500">Confirming your purchase…</p>
          </>
        ) : status === "success" ? (
          <>
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <h1
              className="text-3xl font-bold text-stone-900 mb-3"
              style={{ fontFamily: "var(--font-mossy), cursive" }}
            >
              Payment Successful!
            </h1>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Gift className="h-5 w-5 text-[#ff7f5c]" />
              <p className="text-stone-600 font-medium">Your gift card is on its way</p>
            </div>
            <p className="text-stone-500 text-sm mb-8">
              We&apos;ve sent your gift card code to your email. It may take a few minutes to arrive — please also check your spam folder.
            </p>
            <div className="space-y-3">
              <button
                type="button"
                disabled={openingAccount}
                onClick={async () => {
                  setOpeningAccount(true);
                  await openAccountWithAutoLogin({
                    sessionId,
                    destination: "/account/vouchers",
                  });
                }}
                className="inline-block w-full py-3 rounded-2xl bg-[#ff7f5c] text-white font-bold hover:bg-[#ff6a42] transition-colors disabled:opacity-60"
              >
                {openingAccount ? "Opening..." : "View My Vouchers"}
              </button>
              <Link
                href="/"
                className="inline-block w-full py-3 rounded-2xl border border-stone-200 text-stone-700 font-bold hover:bg-stone-50 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-red-500 font-medium mb-4">Something went wrong.</p>
            <Link href="/vouchers" className="text-[#ff7f5c] underline text-sm">
              Return to Gift Cards
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
