import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureCustomerAccountAndSendAccess } from "@/lib/account/customer-account";
import { sendServiceBookingConfirmationEmail } from "@/lib/email/service-booking-confirmation";
import { createSourceInvoice, markSourceInvoicePaid, updateSourceInvoiceCheckout } from "@/lib/invoices/source-invoices";
import { consumeVoucherUse, getRedeemableVoucherByCode } from "@/lib/vouchers/voucher-usage";
import { dateAllowsDeposit } from "@/lib/payments/deposit-policy";
import { sendAdminNotification } from "@/lib/email/admin-notification";

const BOOKED_SLOT_STATUSES = ["confirmed", "pending", "deposit_paid", "completed"];
const MIN_BOOKING_NOTICE_MINUTES = 120;
const BUSINESS_TIME_ZONE = "Asia/Dubai";
const MONTHLY_SLOT_CATEGORY_IDS = new Set(["monthly_mini", "monthly_big"]);
const SUMMER_CAMP_SLOT_CATEGORY_ID = "summer_camp";
const FULL_DAY_RENTAL_PACKAGE = "full day rental";

function normalizeTimeForQuery(time: string) {
  return time.slice(0, 5);
}

function getDubaiDateKey(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const getPart = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
}

function blocksEntireTimeSlot(booking: { guest_count?: number | null; service_name?: string | null }) {
  const serviceName = (booking.service_name || "").toLowerCase();
  const isPrivateCategory = serviceName.includes("birthday")
    || serviceName.includes("corporate / private")
    || serviceName.includes("corporate/private");

  return isPrivateCategory || Number(booking.guest_count || 0) >= 6;
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

function getSummerCampSelectableDates(
  batches: Array<{ camp_dates?: string[] | null }>,
  option: "per-day" | "per-week",
  dayCount: number,
  today: string
) {
  const normalized = batches
    .map((batch) => {
      const allDates = [...new Set(batch.camp_dates || [])].sort();
      return {
        allDates,
        remainingDates: allDates.filter((date) => date > today),
      };
    })
    .filter((batch) => batch.allDates.length > 0);

  if (option === "per-week") {
    const nextFullBatch = normalized.find((batch) => batch.allDates[0] > today);
    return nextFullBatch?.allDates || [];
  }

  return [...new Set(normalized.flatMap((batch) => batch.remainingDates))].sort();
}

function getSummerCampFullWeekBatches(batches: Array<{ camp_dates?: string[] | null }>, today: string) {
  return batches
    .map((batch) => [...new Set(batch.camp_dates || [])].sort())
    .filter((dates) => dates.length === 5 && dates.every((date) => date > today));
}

function summerCampTimeMatches(
  batches: Array<{ camp_dates?: string[] | null; time_slots?: Record<string, Array<{ start?: string | null; end?: string | null }>> | null }>,
  requestedDates: string[],
  eventTime: string
) {
  const requestedTime = normalizeTimeForQuery(eventTime);

  return batches.some((batch) => {
    const batchDates = new Set(batch.camp_dates || []);
    const includesRequestedDate = requestedDates.some((date) => batchDates.has(date));
    if (!includesRequestedDate) return false;

    return requestedDates.some((date) =>
      (batch.time_slots?.[date] || []).some((slot) => slot.start && normalizeTimeForQuery(slot.start) === requestedTime)
    );
  });
}

function getEffectiveSummerCampPrice(item: {
  price?: number | string | null;
  discount_percentage?: number | string | null;
  discount_start_date?: string | null;
  discount_end_date?: string | null;
}, today: string) {
  const price = Number(item.price) || 0;
  const discountPercentage = Math.min(100, Math.max(0, Number(item.discount_percentage) || 0));
  const discountStartDate = item.discount_start_date || null;
  const discountEndDate = item.discount_end_date || null;
  const hasActiveDiscount = discountPercentage > 0
    && Boolean(discountStartDate)
    && Boolean(discountEndDate)
    && discountStartDate! <= today
    && today <= discountEndDate!;

  return hasActiveDiscount
    ? Math.round(price * (1 - discountPercentage / 100) * 100) / 100
    : price;
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
      isDepositPayment: requestedDepositPayment,
      paymentOption,
      specialRequests,
      ageRange,
      waiverAccepted,
      userId,
      createdBy,
      category,
      bookingSlotCategory,
      voucherCode,
    } = body;

    if (!serviceName || !customerName || !customerEmail || totalAmount === undefined || totalAmount === null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let effectiveTotalAmount = Number(totalAmount) || 0;

    if (bookingSlotCategory === SUMMER_CAMP_SLOT_CATEGORY_ID) {
      const summerCampItems = Array.isArray(items)
        ? items as Array<{ id?: string | null; quantity?: number | string | null }>
        : [];
      const selectedSummerCampItem = summerCampItems[0];

      if (selectedSummerCampItem?.id) {
        const { data: summerCampItem, error: summerCampItemError } = await supabase
          .from("summer_camp_items")
          .select("id, price, discount_percentage, discount_start_date, discount_end_date")
          .eq("id", selectedSummerCampItem.id)
          .eq("is_active", true)
          .maybeSingle();

        if (summerCampItemError) {
          console.error("Summer camp price check error:", summerCampItemError);
          return NextResponse.json({ error: "Could not verify summer camp price" }, { status: 500 });
        }

        if (!summerCampItem) {
          return NextResponse.json({ error: "This summer camp option is no longer available." }, { status: 409 });
        }

        const quantity = selectedSummerCampItem.id === "summer-camp-per-day"
          ? Math.min(5, Math.max(1, Number(selectedSummerCampItem.quantity) || 1))
          : 1;
        effectiveTotalAmount = getEffectiveSummerCampPrice(summerCampItem, getBusinessDateParts().date)
          * (Number(guestCount) || 1)
          * quantity
          + (Number(extrasAmount) || 0);
      }
    }

    let voucher: { id: string; code: string; discount_value: number } | null = null;
    let discountAmount = 0;

    if (voucherCode && typeof voucherCode === "string") {
      const { voucher: voucherData, error } = await getRedeemableVoucherByCode(supabase, voucherCode);
      if (!voucherData) {
        return NextResponse.json(
          { error: error || "Invalid or expired voucher code" },
          { status: 400 }
        );
      }

      voucher = {
        id: voucherData.id,
        code: voucherData.code,
        discount_value: Number(voucherData.discount_value) || 0,
      };
      discountAmount = Math.min(effectiveTotalAmount, voucher.discount_value);
    }

    const isRentalBooking =
      serviceType === "rental" ||
      String(serviceName).toLowerCase().includes("rental");
    const isFullDayRental =
      isRentalBooking &&
      String(packageName || "").trim().toLowerCase() === FULL_DAY_RENTAL_PACKAGE;
    const isMiniChefBooking = serviceType === "birthday_deck";
    const isBigChefBooking = serviceType === "corporate_deck";
    const isBirthdayBooking = isMiniChefBooking && category === "birthdays";
    const isCorporatePrivateBooking =
      isBigChefBooking && category === "corporate";
    const usesDateBasedDeposit = isRentalBooking || isBirthdayBooking || isCorporatePrivateBooking;
    const depositEligible = usesDateBasedDeposit && eventDate
      ? dateAllowsDeposit(eventDate, getBusinessDateParts().date)
      : false;
    const isDepositPayment = depositEligible
      ? paymentOption === "full"
        ? false
        : true
      : isMiniChefBooking || isBigChefBooking
        ? false
        : Boolean(requestedDepositPayment);
    const discountedTotalAmount = Math.max(0, effectiveTotalAmount - discountAmount);
    const adjustedDepositAmount = isDepositPayment ? Math.ceil(discountedTotalAmount * 0.5) : null;
    const adjustedBalanceAmount = isDepositPayment
      ? discountedTotalAmount - (adjustedDepositAmount || 0)
      : null;

    // Determine payment amount (deposit for corporate, full for others)
    const paymentAmount = isDepositPayment ? adjustedDepositAmount || 0 : discountedTotalAmount;
    const paymentStatus = paymentAmount <= 0 ? "paid" : "unpaid";
    const bookingStatus = paymentAmount <= 0 ? "confirmed" : "unpaid";

    if (eventDate && eventTime && !hasMinimumBookingNotice(eventDate, eventTime)) {
      return NextResponse.json(
        { error: "Please choose a time slot at least 2 hours from now." },
        { status: 400 }
      );
    }

    if (
      typeof bookingSlotCategory === "string" &&
      MONTHLY_SLOT_CATEGORY_IDS.has(bookingSlotCategory) &&
      eventDate
    ) {
      let matchesSelectedMonthlyMenuSchedule = false;
      if (menuId && typeof menuId === "string") {
        const { data: selectedMenu, error: selectedMenuError } = await supabase
          .from("menu_items")
          .select("scheduled_date")
          .eq("id", menuId)
          .maybeSingle();

        if (selectedMenuError) {
          console.error("Monthly menu schedule check error:", selectedMenuError);
          return NextResponse.json({ error: "Could not verify monthly special schedule" }, { status: 500 });
        }

        const scheduledDate = selectedMenu?.scheduled_date || null;
        matchesSelectedMonthlyMenuSchedule = getDubaiDateKey(scheduledDate) === eventDate;
      }

      if (matchesSelectedMonthlyMenuSchedule) {
        // The selected monthly menu item carries its own date/time schedule.
      } else {
      const { data: dateRule, error: dateRuleError } = await supabase
        .from("booking_slot_date_rules")
        .select("available_dates")
        .eq("category_id", bookingSlotCategory)
        .maybeSingle();

      if (dateRuleError) {
        console.error("Monthly date rule check error:", dateRuleError);
        return NextResponse.json({ error: "Could not verify monthly special date availability" }, { status: 500 });
      }

      const availableDates = Array.isArray(dateRule?.available_dates) ? dateRule.available_dates : [];
      if (availableDates.length === 0 || !availableDates.includes(eventDate)) {
        return NextResponse.json(
          { error: "This monthly special is not available on the selected date. Please choose another date." },
          { status: 409 }
        );
      }
    }

    if (bookingSlotCategory === SUMMER_CAMP_SLOT_CATEGORY_ID && eventDate) {
      const summerCampItems = Array.isArray(items)
        ? items as Array<{ id?: string | null; quantity?: number | string | null; camp_dates?: string[] | null }>
        : [];
      const selectedSummerCampItem = summerCampItems[0];
      const summerCampOption = selectedSummerCampItem?.id === "summer-camp-per-week" ? "per-week" : "per-day";
      const selectedDayCount = Number(selectedSummerCampItem?.quantity || 1);
      const summerCampDayCount = summerCampOption === "per-day"
        ? Math.min(5, Math.max(1, Number.isFinite(selectedDayCount) ? selectedDayCount : 1))
        : 1;
      const requiredCampDateCount = summerCampOption === "per-week" ? 5 : summerCampDayCount;
      const requestedCampDates = Array.isArray(selectedSummerCampItem?.camp_dates)
        ? selectedSummerCampItem.camp_dates
        : [eventDate].filter(Boolean);

      const { data: batches, error: batchesError } = await supabase
        .from("summer_camp_batches")
        .select("camp_dates, time_slots")
        .eq("is_active", true);

      if (batchesError) {
        console.error("Summer camp date check error:", batchesError);
        return NextResponse.json({ error: "Could not verify summer camp date availability" }, { status: 500 });
      }

      const today = getBusinessDateParts().date;
      const availableDates = new Set(
        getSummerCampSelectableDates(
          batches || [],
          summerCampOption,
          summerCampDayCount,
          today
        )
      );
      const fullWeekBatches = summerCampOption === "per-week"
        ? getSummerCampFullWeekBatches(batches || [], today)
        : [];
      const requestedCampDateKey = [...requestedCampDates].sort().join("|");
      const matchesFullWeekBatch = fullWeekBatches.some((dates) => dates.join("|") === requestedCampDateKey);

      if (
        requestedCampDates.length !== requiredCampDateCount ||
        (summerCampOption === "per-week"
          ? !matchesFullWeekBatch
          : requestedCampDates.some((date) => !availableDates.has(date))) ||
        (summerCampOption !== "per-week" && !availableDates.has(eventDate))
      ) {
        return NextResponse.json(
          { error: "This summer camp class is not available on the selected date. Please choose another camp date." },
          { status: 409 }
        );
      }

      if (eventTime && !summerCampTimeMatches(batches || [], requestedCampDates, eventTime)) {
        return NextResponse.json(
          { error: "This summer camp class is not available at the selected time. Please choose another camp time slot." },
          { status: 409 }
        );
      }
    }

    if (!isRentalBooking && eventDate) {
      const { data: rentalBookings, error: rentalAvailabilityError } = await supabase
        .from("service_bookings")
        .select("id, package_name")
        .eq("event_date", eventDate)
        .in("status", BOOKED_SLOT_STATUSES)
        .ilike("service_name", "%rental%");

      if (rentalAvailabilityError) {
        console.error("Rental availability check error:", rentalAvailabilityError);
        return NextResponse.json({ error: "Could not verify rental availability" }, { status: 500 });
      }

      const hasFullDayBooking = (rentalBookings || []).some(
        (booking) => String(booking.package_name || "").trim().toLowerCase() === FULL_DAY_RENTAL_PACKAGE
      );

      if (hasFullDayBooking) {
        return NextResponse.json(
          { error: "The selected date is already booked for a full day kitchen rental. Please choose another date." },
          { status: 409 }
        );
      }
      }
    }

    if (isRentalBooking && eventDate) {
      const { data: rentalBookings, error: rentalAvailabilityError } = await supabase
        .from("service_bookings")
        .select("id, package_name")
        .eq("event_date", eventDate)
        .in("status", BOOKED_SLOT_STATUSES)
        .ilike("service_name", "%rental%");

      if (rentalAvailabilityError) {
        console.error("Rental availability check error:", rentalAvailabilityError);
        return NextResponse.json({ error: "Could not verify rental availability" }, { status: 500 });
      }

      const hasFullDayBooking = (rentalBookings || []).some(
        (booking) => String(booking.package_name || "").trim().toLowerCase() === FULL_DAY_RENTAL_PACKAGE
      );

      if (hasFullDayBooking || (isFullDayRental && (rentalBookings || []).length > 0)) {
        return NextResponse.json(
          { error: "The selected date is already booked for a kitchen rental. Please choose another date." },
          { status: 409 }
        );
      }
    }

    if (eventDate && eventTime) {
      const { data: existingBookings, error: availabilityError } = await supabase
        .from("service_bookings")
        .select("id, booking_number, event_time, items, guest_count, service_name")
        .eq("event_date", eventDate)
        .in("status", BOOKED_SLOT_STATUSES)
        .limit(100);

      if (availabilityError) {
        console.error("Slot availability check error:", availabilityError);
        return NextResponse.json({ error: "Could not verify slot availability" }, { status: 500 });
      }

      const requestedTime = normalizeTimeForQuery(eventTime);
      const hasConflict = (existingBookings || []).some((booking) => {
        if (!blocksEntireTimeSlot(booking)) return false;

        if (booking.event_time && normalizeTimeForQuery(booking.event_time) === requestedTime) {
          return true;
        }

        const bookingItems = Array.isArray(booking.items)
          ? booking.items as Array<{ event_date?: string | null; event_time?: string | null }>
          : [];

        return bookingItems.some((item) =>
          (!item.event_date || item.event_date === eventDate) &&
          item.event_time && normalizeTimeForQuery(item.event_time) === requestedTime
        );
      });

      if (hasConflict) {
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
      base_amount: bookingSlotCategory === SUMMER_CAMP_SLOT_CATEGORY_ID ? effectiveTotalAmount : baseAmount || totalAmount,
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

    const initialInvoiceAmount = paymentAmount;
    const initialInvoiceDescription = isDepositPayment
      ? `${packageName ? `${serviceName} - ${packageName}` : serviceName} - 50% Deposit`
      : packageName ? `${serviceName} - ${packageName}` : serviceName;

    await createSourceInvoice(supabase, {
      sourceType: "service_booking",
      serviceBookingId: booking.id,
      customerName: booking.customer_name,
      customerEmail: booking.customer_email,
      customerPhone: booking.customer_phone,
      amount: initialInvoiceAmount,
      baseAmount: initialInvoiceAmount,
      extrasAmount: 0,
      description: initialInvoiceDescription,
      lineItems: [
        {
          name: initialInvoiceDescription,
          quantity: 1,
          price: initialInvoiceAmount,
        },
      ],
      serviceName,
      serviceType,
      eventDate,
      guestCount,
      status: paymentAmount <= 0 ? "paid" : "pending",
      paidAt: paymentAmount <= 0 ? new Date().toISOString() : null,
      notes: voucher ? `Voucher applied: ${voucher.code} (AED ${discountAmount})` : null,
      createdBy,
    });

    if (paymentAmount <= 0) {
      await markSourceInvoicePaid(supabase, { serviceBookingId: booking.id });

      await sendAdminNotification(supabase, {
        eventType: isRentalBooking ? "rental_booking" : "service_booking",
        sourceId: booking.id,
        reference: booking.booking_number,
        customerName: booking.customer_name,
        customerEmail: booking.customer_email,
        customerPhone: booking.customer_phone,
        title: [booking.service_name, booking.package_name || booking.menu_name].filter(Boolean).join(" - "),
        amount: Number(booking.total_amount || discountedTotalAmount),
        eventDate: booking.event_date,
        eventTime: booking.event_time,
        guestCount: booking.guest_count || guestCount || 1,
        items: Array.isArray(booking.items)
          ? booking.items.map((item: { name?: string; title?: string; quantity?: number | string }) => ({
              name: item.name || item.title || "Booked item",
              quantity: item.quantity,
            }))
          : undefined,
      });

      if (voucher) {
        const consumeResult = await consumeVoucherUse(supabase, voucher.id);
        if (!consumeResult.success) {
          return NextResponse.json(
            { error: consumeResult.error || "Failed to apply voucher" },
            { status: 409 }
          );
        }
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
        serviceType: booking.service_type,
        packageName: booking.package_name,
        menuName: booking.menu_name,
        invoiceNumber: booking.invoice_number,
        eventDate: booking.event_date,
        eventTime: booking.event_time,
        guestCount: booking.guest_count || 1,
        totalAmount: booking.total_amount || discountedTotalAmount,
        depositAmount: booking.deposit_amount,
        balanceAmount: booking.balance_amount,
        isDepositPayment: booking.is_deposit_payment,
        qrToken: booking.qr_code_token,
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
      cancel_url: `${baseUrl}/booking/cancelled?service_booking_id=${booking.id}`,
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

    await updateSourceInvoiceCheckout(
      supabase,
      { serviceBookingId: booking.id },
      checkoutSession.url,
      checkoutSession.id
    );

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
