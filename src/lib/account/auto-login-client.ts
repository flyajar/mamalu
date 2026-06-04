"use client";

import { createClient } from "@/lib/supabase/client";

interface OpenAccountWithAutoLoginParams {
  sessionId?: string | null;
  bookingNumber?: string | null;
  destination?: "/account" | "/account/bookings" | "/account/orders" | "/account/vouchers";
}

export async function openAccountWithAutoLogin({
  sessionId,
  bookingNumber,
  destination = "/account",
}: OpenAccountWithAutoLoginParams) {
  try {
    const response = await fetch("/api/account/auto-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, bookingNumber, destination }),
    });

    if (!response.ok) {
      window.location.href = destination;
      return;
    }

    const data = await response.json();
    if (data.tokenHash) {
      const supabase = createClient();
      if (supabase) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: data.tokenHash,
          type: "magiclink",
        });

        if (error) {
          console.error("Customer auto-login token verification failed:", error);
        }
      }
    }

    window.location.href = data.redirectTo || destination;
  } catch (error) {
    console.error("Customer auto-login failed:", error);
    window.location.href = destination;
  }
}
