import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/server";
import { sendPaymentLinkCreatedEmail } from "@/lib/email/payment-link-created";

interface AdminBookingScheduleItem {
  id?: string;
  name?: string;
  event_date?: string | null;
  event_time?: string | null;
}

interface CreatedInvoice {
  id: string;
  [key: string]: unknown;
}

const OPTIONAL_INVOICE_COLUMNS = new Set([
  "service_booking_id",
  "payment_link_id",
  "lead_id",
  "base_amount",
  "extras_amount",
  "service_name",
  "service_type",
  "event_date",
  "guest_count",
]);

const getMissingInvoiceColumn = (error: { message?: string }) => {
  return error.message?.match(/'([^']+)' column of 'invoices'/)?.[1] || null;
};

const ADMIN_CATEGORY_RULES: Record<string, { minGuests: number; maxGuests: number; menuCount: number; separateSchedules?: boolean }> = {
  classics_mini: { minGuests: 1, maxGuests: 35, menuCount: 1 },
  monthly_mini: { minGuests: 1, maxGuests: 35, menuCount: 1 },
  mommy_me: { minGuests: 1, maxGuests: 20, menuCount: 1 },
  birthday: { minGuests: 6, maxGuests: 35, menuCount: 1 },
  packages: { minGuests: 6, maxGuests: 35, menuCount: 1 },
  corporate: { minGuests: 6, maxGuests: 35, menuCount: 1 },
  classics_big: { minGuests: 1, maxGuests: 35, menuCount: 1 },
  monthly_big: { minGuests: 1, maxGuests: 35, menuCount: 1 },
  teenagers: { minGuests: 1, maxGuests: 20, menuCount: 4, separateSchedules: true },
  nanny: { minGuests: 1, maxGuests: 1, menuCount: 4, separateSchedules: true },
};

const HIDDEN_ADMIN_BOOKING_NUMBERS = ["SB-20260617-779821"];

const isPlainUnpaidBooking = (booking: {
  paid_at?: string | null;
  is_deposit_payment?: boolean | null;
  deposit_paid?: boolean | null;
  balance_paid?: boolean | null;
  payment_status?: string | null;
  status?: string | null;
  created_by?: string | null;
}) => {
  return (
    !booking.created_by &&
    !booking.paid_at &&
    !booking.deposit_paid &&
    !booking.balance_paid &&
    (booking.payment_status === "unpaid" || booking.status === "unpaid")
  );
};

// GET: Fetch all service bookings with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("payment_status");
    const serviceType = searchParams.get("service_type");
    const createdBy = searchParams.get("created_by");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Fetch service bookings with creator info
    let query = supabase
      .from("service_bookings")
      .select(`
        *,
        creator:created_by(id, full_name, email),
        payment_link:payment_link_id(id, link_code, stripe_payment_link_url, status)
      `)
      .not("booking_number", "in", `(${HIDDEN_ADMIN_BOOKING_NUMBERS.join(",")})`)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (paymentStatus && paymentStatus !== "all") {
      if (paymentStatus === "pending" || paymentStatus === "unpaid") {
        query = query
          .is("paid_at", null)
          .eq("deposit_paid", false)
          .eq("balance_paid", false)
          .neq("status", "unpaid")
          .neq("payment_status", "unpaid");
      } else {
        query = query.eq("payment_status", paymentStatus);
      }
    }

    if (serviceType && serviceType !== "all") {
      query = query.eq("service_type", serviceType);
    }

    if (createdBy && createdBy !== "all") {
      query = query.eq("created_by", createdBy);
    }

    if (startDate) {
      query = query.gte("created_at", `${startDate}T00:00:00`);
    }

    if (endDate) {
      query = query.lte("created_at", `${endDate}T23:59:59`);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error("Fetch bookings error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch voucher redemptions (only if no service type filter or filter is 'voucher')
    let voucherRedemptions: any[] = [];
    if (!serviceType || serviceType === "all" || serviceType === "voucher") {
      let voucherQuery = supabase
        .from("voucher_redemptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (status && status !== "all") {
        voucherQuery = voucherQuery.eq("status", status);
      }

      if (startDate) {
        voucherQuery = voucherQuery.gte("created_at", `${startDate}T00:00:00`);
      }

      if (endDate) {
        voucherQuery = voucherQuery.lte("created_at", `${endDate}T23:59:59`);
      }

      const { data: redemptions, error: redemptionError } = await voucherQuery;
      
      if (!redemptionError && redemptions) {
        // Transform voucher redemptions to match booking structure
        voucherRedemptions = redemptions.map((r: any) => ({
          id: r.id,
          booking_number: `VR-${r.voucher_code}`,
          service_id: null,
          service_name: r.menu_item_name,
          service_type: "voucher",
          package_id: null,
          package_name: null,
          menu_id: r.menu_item_id,
          menu_name: r.menu_item_name,
          menu_price: r.menu_item_price,
          customer_name: r.customer_name,
          customer_email: r.customer_email,
          customer_phone: r.customer_phone,
          company_name: null,
          event_date: r.event_date,
          event_time: r.time_slot,
          guest_count: r.number_of_guests || 1,
          extras: [],
          base_amount: r.menu_item_price,
          extras_amount: 0,
          total_amount: 0, // Free via voucher
          is_deposit_payment: false,
          deposit_amount: null,
          balance_amount: null,
          deposit_paid: true,
          balance_paid: true,
          payment_status: "paid",
          paid_at: r.redeemed_at,
          special_requests: r.special_requests,
          notes: `Voucher: ${r.voucher_code}`,
          status: r.status,
          created_at: r.created_at,
          created_by: null,
          payment_link_id: null,
          creator: null,
          payment_link: null,
          is_voucher_redemption: true,
          voucher_code: r.voucher_code,
          original_price: r.menu_item_price,
        }));
      }
    }

    const visibleBookings = (bookings || []).filter((booking) => !isPlainUnpaidBooking(booking));

    // Merge and sort by created_at
    const allBookings_merged = [...visibleBookings, ...voucherRedemptions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Calculate stats from all bookings (including voucher redemptions)
    const { data: allBookings } = await supabase
      .from("service_bookings")
      .select("booking_number, status, payment_status, paid_at, total_amount, deposit_amount, deposit_paid, balance_paid, is_deposit_payment, created_by")
      .not("booking_number", "in", `(${HIDDEN_ADMIN_BOOKING_NUMBERS.join(",")})`);

    // Get voucher redemption stats
    const { data: allVoucherRedemptions } = await supabase
      .from("voucher_redemptions")
      .select("status");

    const voucherCount = allVoucherRedemptions?.length || 0;
    const voucherPending = allVoucherRedemptions?.filter((r: any) => r.status === "pending").length || 0;

    const visibleStatsBookings = (allBookings || []).filter((booking) => !isPlainUnpaidBooking(booking));

    const stats = {
      total: visibleStatsBookings.length + voucherCount,
      confirmed: visibleStatsBookings.filter((b) => b.status === "confirmed").length || 0,
      pending: visibleStatsBookings.filter((b) => b.status === "pending").length + voucherPending,
      completed: visibleStatsBookings.filter((b) => b.status === "completed").length || 0,
      cancelled: visibleStatsBookings.filter((b) => b.status === "cancelled").length || 0,
      // Payment stats
      fullyPaid: visibleStatsBookings.filter((b) => b.paid_at || (b.is_deposit_payment && b.deposit_paid && b.balance_paid)).length + (voucherCount - voucherPending),
      depositPending: 0,
      balancePending: visibleStatsBookings.filter((b) => b.is_deposit_payment && b.deposit_paid && !b.balance_paid).length || 0,
      // Revenue
      totalRevenue: visibleStatsBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0,
      collectedRevenue: visibleStatsBookings.reduce((sum, b) => {
        if (b.paid_at) return sum + (b.total_amount || 0);
        if (b.is_deposit_payment && b.deposit_paid) return sum + (b.deposit_amount || 0);
        return sum;
      }, 0) || 0,
    };

    // Get list of users who have created bookings for filter dropdown
    const { data: creators } = await supabase
      .from("service_bookings")
      .select("created_by")
      .not("created_by", "is", null);
    
    const uniqueCreatorIds = [...new Set(creators?.map(c => c.created_by).filter(Boolean))];
    
    let creatorsList: { id: string; full_name: string | null; email: string | null }[] = [];
    if (uniqueCreatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", uniqueCreatorIds);
      creatorsList = profiles || [];
    }

    return NextResponse.json({ bookings: allBookings_merged, stats, creators: creatorsList });
  } catch (error) {
    console.error("Get bookings error:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

// POST: Create a new booking (admin)
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const body = await request.json();
    const {
      serviceId,
      serviceName,
      serviceType,
      packageId,
      packageName,
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
      isDepositPayment,
      depositAmount,
      balanceAmount,
      specialRequests,
      notes,
      createdBy,
      generatePaymentLink,
      leadId,
      bookingSlotCategory,
    } = body;

    if (!serviceName || !customerName || !customerEmail || !totalAmount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const categoryRule = typeof bookingSlotCategory === "string"
      ? ADMIN_CATEGORY_RULES[bookingSlotCategory]
      : null;
    const normalizedGuestCount = Number(guestCount || 1);
    const menuIds = typeof menuId === "string" ? menuId.split(",").filter(Boolean) : [];
    const scheduleItems = Array.isArray(items) ? items as AdminBookingScheduleItem[] : [];

    if (!categoryRule) {
      return NextResponse.json({ error: "A valid booking category is required" }, { status: 400 });
    }
    if (normalizedGuestCount < categoryRule.minGuests || normalizedGuestCount > categoryRule.maxGuests) {
      return NextResponse.json(
        { error: `Guest count must be between ${categoryRule.minGuests} and ${categoryRule.maxGuests}` },
        { status: 400 }
      );
    }
    if (menuIds.length !== categoryRule.menuCount) {
      return NextResponse.json(
        { error: `This category requires exactly ${categoryRule.menuCount} menu selection${categoryRule.menuCount === 1 ? "" : "s"}` },
        { status: 400 }
      );
    }
    if (categoryRule.separateSchedules && (
      scheduleItems.length !== categoryRule.menuCount
      || scheduleItems.some((item) => !item.event_date || !item.event_time)
    )) {
      return NextResponse.json(
        { error: "Every selected class requires its own date and time slot" },
        { status: 400 }
      );
    }
    if (!categoryRule.separateSchedules && (!eventDate || !eventTime)) {
      return NextResponse.json({ error: "Event date and time are required" }, { status: 400 });
    }

    // Create booking record
    const bookingData = {
      service_id: serviceId || null,
      // Admin package selections come from the `packages` catalog. This column
      // references the legacy `service_packages` table, so catalog package
      // details are retained in package_name/items instead.
      package_id: bookingSlotCategory === "packages" ? null : packageId || null,
      service_type: serviceType || null,
      service_name: serviceName,
      package_name: packageName || null,
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
      total_amount: totalAmount,
      is_deposit_payment: isDepositPayment || false,
      deposit_amount: depositAmount || null,
      balance_amount: balanceAmount || null,
      deposit_paid: false,
      balance_paid: false,
      payment_status: "pending",
      special_requests: specialRequests || null,
      notes: notes || null,
      created_by: createdBy || null,
      status: "pending",
      lead_id: leadId || null,
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

    let paymentLinkData = null;

    // Generate payment link if requested
    if (generatePaymentLink) {
      const paymentAmount = isDepositPayment ? depositAmount : totalAmount;
      
      // Generate link code
      const { data: linkCodeData } = await supabase.rpc("generate_payment_link_code");
      const linkCode = linkCodeData || `PAY-${Date.now().toString(36).toUpperCase()}`;

      // Create Stripe product and payment link
      const productName = menuName 
        ? `${serviceName} - ${menuName}` 
        : (packageName ? `${serviceName} - ${packageName}` : serviceName);
      
      const productDescription = isDepositPayment
        ? `50% Deposit for ${guestCount} guest(s)${eventDate ? ` on ${eventDate}` : ""}`
        : `Booking for ${guestCount} guest(s)${eventDate ? ` on ${eventDate}` : ""}`;

      const product = await stripe.products.create({
        name: isDepositPayment ? `${productName} (50% Deposit)` : productName,
        description: productDescription,
        metadata: {
          booking_id: booking.id,
          booking_number: booking.booking_number,
          type: "service_booking",
        },
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(paymentAmount * 100),
        currency: "aed",
      });

        const stripePaymentLink = await stripe.paymentLinks.create({
        line_items: [{ price: price.id, quantity: 1 }],
        after_completion: {
          type: "hosted_confirmation",
          hosted_confirmation: {
            custom_message: "Thank you for your payment! Your booking has been confirmed.",
          },
        },
          metadata: {
          type: "service_booking",
          booking_id: booking.id,
          booking_number: booking.booking_number,
            link_code: linkCode,
            customer_email: customerEmail,
            booking_slot_category: bookingSlotCategory || "",
        },
      });

      // Create payment link record
      const { data: paymentLink, error: plError } = await supabase
        .from("payment_links")
        .insert({
          link_code: linkCode,
          title: productName,
          description: productDescription,
          amount: paymentAmount,
          price_per_person: menuPrice || (totalAmount / guestCount),
          number_of_people: guestCount,
          extras: extras || [],
          extras_total: extrasAmount || 0,
          currency: "AED",
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone || null,
          stripe_payment_link_id: stripePaymentLink.id,
          stripe_payment_link_url: stripePaymentLink.url,
          stripe_price_id: price.id,
          single_use: true,
          reference_type: "service_booking",
          reference_id: booking.id,
          notes: notes || null,
          status: "active",
          created_by: createdBy || null,
          lead_id: leadId || null,
        })
        .select()
        .single();

      if (!plError && paymentLink) {
        // Update booking with payment link reference
        await supabase
          .from("service_bookings")
          .update({ payment_link_id: paymentLink.id })
          .eq("id", booking.id);

        paymentLinkData = {
          ...paymentLink,
          stripeUrl: stripePaymentLink.url,
        };

        // Create invoice for the initial payment due.
        const { data: invoiceNumData } = await supabase.rpc("generate_invoice_number");
        const invoiceNumber = invoiceNumData || `INV-${new Date().getFullYear().toString().slice(-2)}-${Date.now().toString().slice(-5)}`;
        const initialInvoiceDescription = isDepositPayment
          ? `${productName} - 50% Deposit`
          : productName;

        const invoiceData: Record<string, unknown> = {
          invoice_number: invoiceNumber,
          service_booking_id: booking.id,
          payment_link_id: paymentLink.id,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone || null,
          amount: paymentAmount,
          base_amount: paymentAmount,
          extras_amount: 0,
          currency: "AED",
          description: initialInvoiceDescription,
          line_items: [
            {
              name: initialInvoiceDescription,
              quantity: 1,
              price: paymentAmount,
            },
          ],
          service_name: serviceName,
          service_type: serviceType,
          event_date: eventDate || null,
          guest_count: guestCount,
          status: "sent",
          payment_link: stripePaymentLink.url,
          sent_at: new Date().toISOString(),
          notes: notes || null,
          created_by: createdBy || null,
          lead_id: leadId || null,
        };

        let invoice: CreatedInvoice | null = null;
        let invoiceDataForInsert = { ...invoiceData };
        let finalInvoiceError: { message?: string } | null = null;

        for (let attempt = 0; attempt <= OPTIONAL_INVOICE_COLUMNS.size; attempt += 1) {
          const { data: insertedInvoice, error: invoiceError } = await supabase
            .from("invoices")
            .insert(invoiceDataForInsert)
            .select()
            .single();

          if (!invoiceError) {
            invoice = insertedInvoice as CreatedInvoice;
            break;
          }

          finalInvoiceError = invoiceError;
          const missingColumn = getMissingInvoiceColumn(invoiceError);
          if (
            missingColumn &&
            OPTIONAL_INVOICE_COLUMNS.has(missingColumn) &&
            Object.prototype.hasOwnProperty.call(invoiceDataForInsert, missingColumn)
          ) {
            delete invoiceDataForInsert[missingColumn];
            console.warn(`Retrying admin booking invoice insert without missing column: ${missingColumn}`);
            continue;
          }

          break;
        }

        if (!invoice) {
          console.error("Create booking invoice error:", finalInvoiceError);
          return NextResponse.json(
            {
              error: "Booking and payment link were created, but the invoice could not be created.",
              booking,
              paymentLink: paymentLinkData,
            },
            { status: 500 }
          );
        }

        await supabase
          .from("payment_links")
          .update({ invoice_id: invoice.id })
          .eq("id", paymentLink.id);

        // Update booking with invoice reference
        await supabase
          .from("service_bookings")
          .update({
            invoice_id: invoice.id,
            invoice_number: invoiceNumber,
          })
          .eq("id", booking.id);

        const emailResult = await sendPaymentLinkCreatedEmail({
          customerName,
          customerEmail,
          title: productName,
          amount: paymentAmount,
          paymentUrl: stripePaymentLink.url,
          linkCode,
          invoiceNumber,
          description: productDescription,
        });

        return NextResponse.json({
          success: true,
          booking,
          paymentLink: paymentLinkData,
          invoice,
          emailSent: emailResult.success,
          emailError: emailResult.error || null,
        });
      }
    }

    return NextResponse.json({
      success: true,
      booking,
      paymentLink: paymentLinkData,
    });
  } catch (error: any) {
    console.error("Create booking error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create booking" },
      { status: 500 }
    );
  }
}
