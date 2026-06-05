import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureCustomerAccountAndSendAccess } from "@/lib/account/customer-account";
import { sendServiceBookingConfirmationEmail } from "@/lib/email/service-booking-confirmation";
import { validateVoucherPurchaseWindow } from "@/lib/vouchers/validate-voucher-purchase";

const BOOKED_SLOT_STATUSES = ["confirmed", "pending", "deposit_paid"];
const MIN_BOOKING_NOTICE_MINUTES = 120;
const BUSINESS_TIME_ZONE = "Asia/Dubai";

function normalizeTimeForQuery(time: string) {
  return time.length === 5 ? `${time}:00` : time;
}

function parseTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getBusinessDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const value = (type: string) => parts.find((part) => part.type === type)?.value || "00";

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minutes: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

function hasMinimumBookingNotice(eventDate: string, eventTime: string) {
  const now = getBusinessDateParts();

  if (eventDate < now.date) return false;
  if (eventDate > now.date) return true;

  return parseTime(eventTime) - now.minutes >= MIN_BOOKING_NOTICE_MINUTES;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const body = await request.json();
    const {
      serviceId,
      packageId,
      serviceType,
      serviceName,
      packageName,
      // Corporate menu
      menuId,
      menuName,
      menuPrice,
      customerName,
      customerEmail,
      customerPhone,
      companyName,
      eventDate,
      eventTime,
      guestCount,
      items,
      extras,
      baseAmount,
      extrasAmount,
      totalAmount,
      // Split payment info
      isDepositPayment,
      specialRequests,
      ageRange,
      waiverAccepted,
      userId,
      createdBy,
      category,
      voucherCode,
    } = body;

    if (!serviceName || !customerName || !customerEmail || !totalAmount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let voucher: { id: string; code: string; discount_value: number } | null = null;
    let discountAmount = 0;

    if (voucherCode && typeof voucherCode === "string") {
      const { data: voucherData, error: voucherError } = await supabase
        .from("vouchers")
        .select("id, code, discount_value")
        .eq("code", voucherCode.trim().toUpperCase())
        .eq("is_active", true)
        .single();

      if (voucherError || !voucherData) {
        return NextResponse.json(
          { error: "Invalid or expired voucher code" },
          { status: 400 }
        );
      }

      const validity = await validateVoucherPurchaseWindow(supabase, voucherData.code);
      if (!validity.valid) {
        return NextResponse.json(
          { error: validity.error },
          { status: 400 }
        );
      }

      voucher = {
        id: voucherData.id,
        code: voucherData.code,
        discount_value: Number(voucherData.discount_value) || 0,
      };
      discountAmount = Math.min(Number(totalAmount), voucher.discount_value);
    }

    const discountedTotalAmount = Math.max(0, Number(totalAmount) - discountAmount);
    const adjustedDepositAmount = isDepositPayment ? Math.ceil(discountedTotalAmount * 0.5) : null;
    const adjustedBalanceAmount = isDepositPayment
      ? discountedTotalAmount - (adjustedDepositAmount || 0)
      : null;

    // Determine payment amount (deposit for corporate, full for others)
    const paymentAmount = isDepositPayment ? adjustedDepositAmount || 0 : discountedTotalAmount;
    const paymentStatus = paymentAmount <= 0 ? "paid" : (isDepositPayment ? "deposit_pending" : "pending");
    const bookingStatus = paymentAmount <= 0 ? "confirmed" : "pending";

    if (eventDate && eventTime && !hasMinimumBookingNotice(eventDate, eventTime)) {
      return NextResponse.json(
        { error: "Please choose a time slot at least 2 hours from now." },
        { status: 400 }
      );
    }

    const shouldBlockBookedSlot = category === "birthdays" || category === "corporate";

    if (shouldBlockBookedSlot && eventDate && eventTime) {
      const { data: existingBookings, error: availabilityError } = await supabase
        .from("service_bookings")
        .select("id, booking_number")
        .eq("event_date", eventDate)
        .eq("event_time", normalizeTimeForQuery(eventTime))
        .in("status", BOOKED_SLOT_STATUSES)
        .limit(1);

      if (availabilityError) {
        console.error("Slot availability check error:", availabilityError);
        return NextResponse.json({ error: "Could not verify slot availability" }, { status: 500 });
      }

      if (existingBookings && existingBookings.length > 0) {
        return NextResponse.json(
          { error: "The selected time slot is already booked. Please choose another time." },
          { status: 409 }
        );
      }
    }

    // Create booking record
    const bookingData = {
      service_id: serviceId || null,
      package_id: packageId || null,
      service_type: serviceType,
      service_name: serviceName,
      package_name: packageName || null,
      // Corporate menu info
      menu_id: menuId || null,
      menu_name: menuName || null,
      menu_price: menuPrice || null,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone || null,
      company_name: companyName || null,
      event_date: eventDate || null,
      event_time: eventTime || null,
      guest_count: guestCount || 1,
      items: items || [],
      extras: extras || [],
      base_amount: baseAmount || totalAmount,
      extras_amount: extrasAmount || 0,
      discount_amount: discountAmount,
      total_amount: discountedTotalAmount,
      // Split payment tracking
      is_deposit_payment: isDepositPayment || false,
      deposit_amount: adjustedDepositAmount,
      balance_amount: adjustedBalanceAmount,
      deposit_paid: paymentAmount <= 0 ? Boolean(isDepositPayment) : false,
      balance_paid: paymentAmount <= 0,
      payment_status: paymentStatus,
      special_requests: voucher
        ? `${specialRequests ? `${specialRequests}\n\n` : ""}Voucher applied: ${voucher.code} (AED ${discountAmount})`
        : specialRequests || null,
      age_range: ageRange || null,
      waiver_accepted: waiverAccepted || false,
      user_id: userId || null,
      created_by: createdBy || null,
      status: bookingStatus,
    };

    const { data: booking, error: bookingError } = await supabase
      .from("service_bookings")
      .insert(bookingData)
      .select()
      .single();

    if (bookingError) {
      console.error("Create booking error:", bookingError);
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }

    if (paymentAmount <= 0) {
      if (voucher) {
        await supabase
          .from("vouchers")
          .update({ is_active: false })
          .eq("id", voucher.id);
      }

      const accountResult = await ensureCustomerAccountAndSendAccess({
        supabase,
        email: booking.customer_email,
        name: booking.customer_name,
        phone: booking.customer_phone,
        reason: "booking",
      });

      if (accountResult.userId && !booking.user_id) {
        await supabase
          .from("service_bookings")
          .update({ user_id: accountResult.userId })
          .eq("id", booking.id);
      }

      if (accountResult.created && !accountResult.emailSent) {
        console.error(`Customer account email failed for ${booking.customer_email}: ${accountResult.error}`);
      }

      const { success, error } = await sendServiceBookingConfirmationEmail({
        bookingNumber: booking.booking_number,
        customerName: booking.customer_name,
        customerEmail: booking.customer_email,
        serviceName: booking.service_name,
        packageName: booking.package_name,
        menuName: booking.menu_name,
        eventDate: booking.event_date,
        eventTime: booking.event_time,
        guestCount: booking.guest_count || 1,
        totalAmount: booking.total_amount || discountedTotalAmount,
        depositAmount: booking.deposit_amount,
        balanceAmount: booking.balance_amount,
        isDepositPayment: booking.is_deposit_payment,
      });

      if (!success) {
        console.error(`Service booking confirmation email failed for ${booking.booking_number}: ${error}`);
      }

      return NextResponse.json({
        success: true,
        booking,
        checkoutUrl: null,
      });
    }

    // Create Stripe checkout session
    const productName = menuName 
      ? `${serviceName} - ${menuName}` 
      : (packageName ? `${serviceName} - ${packageName}` : serviceName);
    
    const productDescription = isDepositPayment
      ? `50% Deposit for ${guestCount} guest(s)${eventDate ? ` on ${eventDate}` : ""} - Balance of AED ${adjustedBalanceAmount} due 48 hours before event`
      : `Booking for ${guestCount} guest(s)${eventDate ? ` on ${eventDate}` : ""}`;

    const product = await stripe.products.create({
      name: isDepositPayment ? `${productName} (50% Deposit)` : productName,
      description: productDescription,
      metadata: {
        booking_id: booking.id,
        service_type: serviceType,
        booking_number: booking.booking_number,
        is_deposit: isDepositPayment ? "true" : "false",
        voucher_id: voucher?.id || "",
        voucher_code: voucher?.code || "",
        voucher_discount_amount: discountAmount ? String(discountAmount) : "",
      },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(paymentAmount * 100), // Use paymentAmount (deposit or full)
      currency: "aed",
    });

    // Always use production URL for Stripe redirects
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mamalu.vercel.app";
    
    const checkoutSession = await stripe.checkout.sessions.create({
      line_items: [{ price: price.id, quantity: 1 }],
      mode: "payment",
      success_url: `${baseUrl}/booking/success?booking=${booking.booking_number}`,
      cancel_url: `${baseUrl}/booking/cancelled`,
      customer_email: customerEmail,
      metadata: {
        booking_id: booking.id,
        booking_number: booking.booking_number,
        service_type: serviceType,
        type: "service_booking",
        voucher_id: voucher?.id || "",
        voucher_code: voucher?.code || "",
        voucher_discount_amount: discountAmount ? String(discountAmount) : "",
      },
    });

    // Update booking with Stripe session ID
    await supabase
      .from("service_bookings")
      .update({ stripe_checkout_session_id: checkoutSession.id })
      .eq("id", booking.id);

    return NextResponse.json({
      success: true,
      booking,
      checkoutUrl: checkoutSession.url,
    });
  } catch (error: unknown) {
    console.error("Book service error:", error);
    const message = error instanceof Error ? error.message : "Failed to create booking";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
