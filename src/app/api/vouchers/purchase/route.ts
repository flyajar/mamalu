import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSourceInvoice, updateSourceInvoiceCheckout } from "@/lib/invoices/source-invoices";
import { countAvailableVouchersForAmount } from "@/lib/vouchers/assign-purchase-voucher";

export async function POST(request: NextRequest) {
  try {
    const { name, email, mobile, amount, isGift = false, recipient } = await request.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedMobile = typeof mobile === "string" ? mobile.trim() : "";
    const recipientName = typeof recipient?.name === "string" ? recipient.name.trim() : "";
    const recipientEmail = typeof recipient?.email === "string" ? recipient.email.trim().toLowerCase() : "";
    const recipientMobile = typeof recipient?.mobile === "string" ? recipient.mobile.trim() : "";

    if (!name?.trim() || !normalizedEmail || !normalizedMobile || !amount) {
      return NextResponse.json({ error: "Name, email, mobile number, and amount are required" }, { status: 400 });
    }

    if (isGift && (!recipientName || !recipientEmail || !recipientMobile)) {
      return NextResponse.json({ error: "Recipient name, email, and mobile number are required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) throw new Error("Database not configured");

    const availableCount = await countAvailableVouchersForAmount(supabase, Number(amount));
    if (availableCount < 1) {
      return NextResponse.json({ error: "No gift cards available for this amount" }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: normalizedEmail,
      line_items: [
        {
          price_data: {
            currency: "aed",
            product_data: {
              name: `Mamalu Kitchen Gift Card – AED ${amount}`,
              description: "Redeemable on any Mamalu Kitchen experience",
            },
            unit_amount: Math.round(Number(amount) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "voucher_purchase",
        customer_name: name.trim(),
        customer_email: normalizedEmail,
        amount: String(amount),
      },
      success_url: `${siteUrl}/vouchers/success?session_id={CHECKOUT_SESSION_ID}${isGift ? "&gift=1" : ""}`,
      cancel_url: `${siteUrl}/vouchers`,
    });

    // Create a pending purchase record
    const { data: purchase, error: purchaseError } = await supabase.from("voucher_purchases").insert({
      customer_name: name.trim(),
      customer_email: normalizedEmail,
      customer_mobile: normalizedMobile,
      is_gift: Boolean(isGift),
      recipient_name: isGift ? recipientName : null,
      recipient_email: isGift ? recipientEmail : null,
      recipient_mobile: isGift ? recipientMobile : null,
      amount: Number(amount),
      stripe_session_id: session.id,
      status: "pending",
    }).select().single();

    if (purchaseError) {
      throw new Error(purchaseError.message);
    }

    await createSourceInvoice(supabase, {
      sourceType: "voucher_purchase",
      voucherPurchaseId: purchase.id,
      customerName: name.trim(),
      customerEmail: normalizedEmail,
      amount: Number(amount),
      baseAmount: Number(amount),
      description: "Gift Voucher",
      lineItems: [{ name: "Gift Voucher", quantity: 1, price: Number(amount) }],
      serviceName: "Gift Voucher",
      serviceType: "voucher_purchase",
      status: "sent",
      paymentLink: session.url,
    });

    await updateSourceInvoiceCheckout(supabase, { voucherPurchaseId: purchase.id }, session.url, session.id);

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("Voucher purchase error:", error);
    const message = error instanceof Error ? error.message : "Failed to create checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
