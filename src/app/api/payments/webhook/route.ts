import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureCustomerAccountAndSendAccess } from "@/lib/account/customer-account";
import { sendBookingConfirmationEmail } from "@/lib/email/booking-confirmation";
import { sendServiceBookingConfirmationEmail } from "@/lib/email/service-booking-confirmation";
import { sendVoucherConfirmationEmail } from "@/lib/email/voucher-confirmation";
import { findAvailableVoucherForAmount } from "@/lib/vouchers/assign-purchase-voucher";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("🔔 checkout.session.completed received");
        console.log("Session metadata:", JSON.stringify(session.metadata, null, 2));
        console.log("Session ID:", session.id);
        
        const bookingId = session.metadata?.booking_id;
        const isServiceBooking = session.metadata?.type === "service_booking";
        const isServiceBookingBalance = session.metadata?.type === "service_booking_balance";
        const isCustomPaymentLink = session.metadata?.type === "custom_payment_link";

        if (bookingId && isServiceBookingBalance) {
          const paidAmount = (session.amount_total || 0) / 100;
          const now = new Date().toISOString();

          const { data: booking, error: bookingError } = await supabase
            .from("service_bookings")
            .select("*")
            .eq("id", bookingId)
            .single();

          if (bookingError) {
            console.error("Service booking balance lookup failed:", bookingError);
          }

          if (booking) {
            const balanceAmount = Number(booking.balance_amount) || 0;
            const canMarkBalancePaid =
              booking.is_deposit_payment &&
              booking.deposit_paid &&
              !booking.balance_paid &&
              balanceAmount > 0;

            if (!canMarkBalancePaid) {
              console.error(`Service booking ${bookingId} is not eligible for balance payment completion`);
            } else {
              const { error: updateError } = await supabase
                .from("service_bookings")
                .update({
                  balance_paid: true,
                  balance_paid_at: now,
                  payment_status: "paid",
                  paid_at: now,
                  status: "confirmed",
                  stripe_payment_intent_id: session.payment_intent as string,
                  payment_method: "stripe",
                })
                .eq("id", bookingId);

              if (updateError) {
                console.error("Service booking balance update failed:", updateError);
              } else {
                await supabase.from("payment_transactions").insert({
                  transaction_type: "payment",
                  payment_method: "stripe",
                  amount: paidAmount,
                  currency: session.currency?.toUpperCase() || "AED",
                  status: "completed",
                  stripe_payment_intent_id: session.payment_intent as string,
                  metadata: {
                    checkout_session_id: session.id,
                    customer_email: session.customer_email,
                    service_booking_id: bookingId,
                    payment_stage: "balance",
                  },
                });

                console.log(`Service booking ${bookingId} balance marked as paid`);
              }
            }
          }
        } else if (bookingId && isServiceBooking) {
          const paidAmount = (session.amount_total || 0) / 100;

          const { data: booking, error: bookingError } = await supabase
            .from("service_bookings")
            .select("*")
            .eq("id", bookingId)
            .single();

          if (bookingError) {
            console.error("Service booking lookup failed:", bookingError);
          }

          if (booking) {
            const isFullPayment = !booking.is_deposit_payment || paidAmount >= booking.total_amount;
            const voucherId = session.metadata?.voucher_id;
            const voucherCode = session.metadata?.voucher_code;

            const { error: updateError } = await supabase
              .from("service_bookings")
              .update({
                status: "confirmed",
                payment_status: isFullPayment ? "paid" : "deposit_paid",
                deposit_paid: booking.is_deposit_payment ? true : undefined,
                paid_at: isFullPayment ? new Date().toISOString() : undefined,
                stripe_payment_intent_id: session.payment_intent as string,
                payment_method: "stripe",
              })
              .eq("id", bookingId);

            if (updateError) {
              console.error("Service booking payment update failed:", updateError);
            } else {
              await supabase.from("payment_transactions").insert({
                transaction_type: "payment",
                payment_method: "stripe",
                amount: paidAmount,
                currency: session.currency?.toUpperCase() || "AED",
                status: "completed",
                stripe_payment_intent_id: session.payment_intent as string,
                metadata: {
                  checkout_session_id: session.id,
                  customer_email: session.customer_email,
                  service_booking_id: bookingId,
                },
              });

              if (voucherId) {
                const { error: voucherUpdateError } = await supabase
                  .from("vouchers")
                  .update({ is_active: false })
                  .eq("id", voucherId);

                if (voucherUpdateError) {
                  console.error("Voucher deactivation failed:", voucherUpdateError);
                } else {
                  console.log(`Voucher ${voucherCode || voucherId} marked as used for service booking ${bookingId}`);
                }
              }

              if (booking.customer_email) {
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
                    .eq("id", bookingId);
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
                  totalAmount: booking.total_amount || paidAmount,
                  depositAmount: booking.deposit_amount,
                  balanceAmount: booking.balance_amount,
                  isDepositPayment: booking.is_deposit_payment,
                });

                console.log(
                  success
                    ? `Service booking confirmation email sent for ${booking.booking_number}`
                    : `Service booking confirmation email failed for ${booking.booking_number}: ${error}`
                );
              }

              console.log(`Service booking ${bookingId} marked as ${isFullPayment ? "paid" : "deposit paid"}`);
            }
          }
        } else if (bookingId) {
          // Update booking as paid
          await supabase
            .from("class_bookings")
            .update({
              status: "confirmed",
              paid_at: new Date().toISOString(),
              stripe_payment_intent_id: session.payment_intent as string,
              payment_method: "stripe",
            })
            .eq("id", bookingId);

          // Record transaction
          await supabase.from("payment_transactions").insert({
            booking_id: bookingId,
            transaction_type: "payment",
            payment_method: "stripe",
            amount: (session.amount_total || 0) / 100,
            currency: session.currency?.toUpperCase() || "AED",
            status: "completed",
            stripe_payment_intent_id: session.payment_intent as string,
            metadata: {
              checkout_session_id: session.id,
              customer_email: session.customer_email,
            },
          });

          // Fetch updated booking for email
          const { data: confirmedBooking } = await supabase
            .from("class_bookings")
            .select("*")
            .eq("id", bookingId)
            .single();

          // Send confirmation email with QR code(s)
          if (confirmedBooking && confirmedBooking.attendee_email) {
            try {
              const numberOfGuests = confirmedBooking.number_of_guests || 1;
              let guestQRs: Array<{ guestNumber: number; guestName?: string; qrToken: string }> = [];

              // Create individual guest records if multiple guests
              if (numberOfGuests > 1) {
                const guestsToInsert = [];
                for (let i = 1; i <= numberOfGuests; i++) {
                  guestsToInsert.push({
                    booking_id: bookingId,
                    guest_number: i,
                    guest_name: i === 1 ? confirmedBooking.attendee_name : `Guest ${i}`,
                  });
                }

                const { data: createdGuests } = await supabase
                  .from("booking_guests")
                  .insert(guestsToInsert)
                  .select();

                if (createdGuests) {
                  guestQRs = createdGuests.map(g => ({
                    guestNumber: g.guest_number,
                    guestName: g.guest_name,
                    qrToken: g.qr_code_token,
                  }));
                }
              }

              await sendBookingConfirmationEmail({
                bookingNumber: confirmedBooking.booking_number,
                attendeeName: confirmedBooking.attendee_name,
                attendeeEmail: confirmedBooking.attendee_email,
                classTitle: confirmedBooking.class_title,
                classDate: confirmedBooking.class_date || "TBD",
                classTime: confirmedBooking.class_time || "TBD",
                location: confirmedBooking.location || "Mamalu Kitchen",
                sessionsBooked: confirmedBooking.sessions_booked || 1,
                totalAmount: confirmedBooking.total_amount,
                numberOfGuests,
                qrToken: confirmedBooking.qr_code_token,
                guestQRs: guestQRs.length > 0 ? guestQRs : undefined,
              });

              // Mark email as sent
              await supabase
                .from("class_bookings")
                .update({ confirmation_email_sent_at: new Date().toISOString() })
                .eq("id", bookingId);

              console.log(`Confirmation email sent for booking ${confirmedBooking.booking_number} (${numberOfGuests} guests)`);
            } catch (emailError) {
              console.error("Failed to send confirmation email:", emailError);
            }
          }
        }

        // Handle voucher purchases
        if (session.metadata?.type === "voucher_purchase") {
          try {
            console.log("🎫 Processing voucher purchase webhook");
            console.log("Session ID:", session.id);
            console.log("Metadata:", session.metadata);
            
            const customerName = session.metadata.customer_name;
            const customerEmail = session.metadata.customer_email || session.customer_email || "";
            const amount = parseFloat(session.metadata.amount || "0");

            console.log(`Customer: ${customerName} (${customerEmail}), Amount: ${amount}`);

            const chosen = await findAvailableVoucherForAmount(supabase, amount);
            console.log(`Chosen voucher:`, chosen ? `${chosen.code} (ID: ${chosen.id})` : "NONE AVAILABLE");

            // Update the pending purchase record
            const { error: updateError } = await supabase
              .from("voucher_purchases")
              .update({
                status: "paid",
                paid_at: new Date().toISOString(),
                stripe_payment_intent_id: session.payment_intent as string,
                voucher_id: chosen?.id || null,
                voucher_code: chosen?.code || null,
              })
              .eq("stripe_session_id", session.id);

            if (updateError) {
              console.error("❌ Error updating voucher purchase:", updateError);
            } else {
              console.log("✅ Voucher purchase record updated");
            }

            // Send email with the code
            if (chosen && customerEmail) {
              console.log(`📧 Sending voucher email to ${customerEmail}`);
              const { success } = await sendVoucherConfirmationEmail({
                customerName,
                customerEmail,
                amount,
                voucherCode: chosen.code,
              });
              
              console.log(`Email send result: ${success ? "✅ SUCCESS" : "❌ FAILED"}`);
              
              if (success) {
                await supabase
                  .from("voucher_purchases")
                  .update({ email_sent_at: new Date().toISOString() })
                  .eq("stripe_session_id", session.id);
              }

              const accountResult = await ensureCustomerAccountAndSendAccess({
                supabase,
                email: customerEmail,
                name: customerName,
                reason: "voucher",
              });

              if (accountResult.created && !accountResult.emailSent) {
                console.error(`Customer account email failed for voucher purchase ${customerEmail}: ${accountResult.error}`);
              }
            } else {
              console.warn("⚠️ Cannot send email - missing voucher or customer email");
            }

            console.log(`✅ Voucher purchase completed for ${customerEmail} – code: ${chosen?.code || "N/A"}`);
          } catch (voucherError) {
            console.error("❌ Failed to process voucher purchase:", voucherError);
          }
        }

        // Handle product purchases
        if (session.metadata?.order_type === "product_purchase") {
          try {
            const itemsJson = session.metadata.items_json;
            const items = itemsJson ? JSON.parse(itemsJson) : [];
            const subtotal = parseFloat(session.metadata.subtotal || "0");
            const shippingCost = parseFloat(session.metadata.shipping_cost || "0");
            
            const sessionWithShipping = session as Stripe.Checkout.Session & {
              shipping_details?: {
                name?: string | null;
                address?: {
                  city?: string | null;
                  country?: string | null;
                } | null;
              } | null;
            };
            const shippingDetails = sessionWithShipping.shipping_details;
            const customerDetails = session.customer_details;
            const orderCustomerName = shippingDetails?.name || customerDetails?.name || "Customer";
            const orderCustomerEmail = customerDetails?.email || session.customer_email || "";
            const orderCustomerPhone = customerDetails?.phone || "";

            // Create product order
            await supabase.from("product_orders").insert({
              customer_name: orderCustomerName,
              customer_email: orderCustomerEmail,
              customer_phone: orderCustomerPhone,
              shipping_address: shippingDetails?.address || null,
              shipping_city: shippingDetails?.address?.city || "",
              shipping_country: shippingDetails?.address?.country || "AE",
              items: items,
              subtotal: subtotal,
              shipping_cost: shippingCost,
              total_amount: (session.amount_total || 0) / 100,
              status: "processing",
              payment_status: "paid",
              stripe_checkout_session_id: session.id,
              stripe_payment_intent_id: session.payment_intent as string,
              paid_at: new Date().toISOString(),
              is_new: true,
            });

            if (orderCustomerEmail) {
              const accountResult = await ensureCustomerAccountAndSendAccess({
                supabase,
                email: orderCustomerEmail,
                name: orderCustomerName,
                phone: orderCustomerPhone,
                reason: "order",
              });

              if (accountResult.created && !accountResult.emailSent) {
                console.error(`Customer account email failed for product order ${orderCustomerEmail}: ${accountResult.error}`);
              }
            }

            console.log(`Product order created for ${customerDetails?.email}`);
          } catch (orderError) {
            console.error("Failed to create product order:", orderError);
          }
        }

        // Handle custom payment link payments
        if (isCustomPaymentLink || session.payment_link) {
          const stripePaymentLinkId = session.payment_link as string;
          
          if (stripePaymentLinkId) {
            // Find and update the payment link
            const { data: paymentLink } = await supabase
              .from("payment_links")
              .select("*")
              .eq("stripe_payment_link_id", stripePaymentLinkId)
              .single();

            if (paymentLink) {
              const newUseCount = (paymentLink.use_count || 0) + 1;
              const shouldDeactivate = paymentLink.single_use || 
                (paymentLink.max_uses && newUseCount >= paymentLink.max_uses);

              // Generate QR code token for payment link
              const qrCodeToken = crypto.randomUUID();

              await supabase
                .from("payment_links")
                .update({
                  status: shouldDeactivate ? "paid" : "active",
                  paid_at: new Date().toISOString(),
                  paid_amount: (session.amount_total || 0) / 100,
                  use_count: newUseCount,
                  customer_email: session.customer_email || undefined,
                  stripe_checkout_session_id: session.id,
                  stripe_payment_intent_id: session.payment_intent as string,
                  qr_code_token: qrCodeToken,
                })
                .eq("id", paymentLink.id);

              // Update associated service_booking if exists
              if (paymentLink.reference_type === "service_booking" && paymentLink.reference_id) {
                const { data: booking } = await supabase
                  .from("service_bookings")
                  .select("is_deposit_payment, deposit_amount, total_amount")
                  .eq("id", paymentLink.reference_id)
                  .single();

                if (booking) {
                  const paidAmount = (session.amount_total || 0) / 100;
                  const isDepositPayment = booking.is_deposit_payment;
                  const isFullPayment = !isDepositPayment || paidAmount >= booking.total_amount;

                  await supabase
                    .from("service_bookings")
                    .update({
                      payment_status: isFullPayment ? "paid" : "deposit_paid",
                      deposit_paid: isDepositPayment ? true : undefined,
                      paid_at: new Date().toISOString(),
                      status: "confirmed",
                    })
                    .eq("id", paymentLink.reference_id);

                  console.log(`Updated service_booking ${paymentLink.reference_id} payment status`);
                }
              }

              // Update associated invoice if exists
              const { data: invoice } = await supabase
                .from("invoices")
                .select("id")
                .eq("payment_link_id", paymentLink.id)
                .single();

              if (invoice) {
                await supabase
                  .from("invoices")
                  .update({
                    status: "paid",
                    paid_at: new Date().toISOString(),
                  })
                  .eq("id", invoice.id);

                console.log(`Updated invoice ${invoice.id} to paid status`);
              }

              // Record transaction
              await supabase.from("payment_transactions").insert({
                transaction_type: "payment",
                payment_method: "stripe",
                amount: (session.amount_total || 0) / 100,
                currency: session.currency?.toUpperCase() || "AED",
                status: "completed",
                stripe_payment_intent_id: session.payment_intent as string,
                metadata: {
                  checkout_session_id: session.id,
                  payment_link_id: paymentLink.id,
                  stripe_payment_link_id: stripePaymentLinkId,
                  customer_email: session.customer_email,
                  service_booking_id: paymentLink.reference_type === "service_booking" ? paymentLink.reference_id : undefined,
                },
              });

              // Send confirmation email with QR codes
              const customerEmail = session.customer_email || paymentLink.customer_email;
              const numberOfPeople = paymentLink.number_of_people || 1;

              if (customerEmail) {
                try {
                  let guestQRs: Array<{ guestNumber: number; guestName?: string; qrToken: string }> = [];

                  // Create individual guest records if multiple people
                  if (numberOfPeople > 1) {
                    const guestsToInsert = [];
                    for (let i = 1; i <= numberOfPeople; i++) {
                      guestsToInsert.push({
                        payment_link_id: paymentLink.id,
                        guest_number: i,
                        guest_name: i === 1 ? (paymentLink.customer_name || "Guest 1") : `Guest ${i}`,
                      });
                    }

                    const { data: createdGuests } = await supabase
                      .from("payment_link_guests")
                      .insert(guestsToInsert)
                      .select();

                    if (createdGuests) {
                      guestQRs = createdGuests.map(g => ({
                        guestNumber: g.guest_number,
                        guestName: g.guest_name,
                        qrToken: g.qr_code_token,
                      }));
                    }
                  }

                  await sendBookingConfirmationEmail({
                    bookingNumber: paymentLink.link_code,
                    attendeeName: paymentLink.customer_name || "Guest",
                    attendeeEmail: customerEmail,
                    classTitle: paymentLink.title,
                    classDate: "See confirmation details",
                    classTime: "See confirmation details",
                    location: "Mamalu Kitchen",
                    sessionsBooked: 1,
                    totalAmount: (session.amount_total || 0) / 100,
                    numberOfGuests: numberOfPeople,
                    qrToken: qrCodeToken,
                    guestQRs: guestQRs.length > 0 ? guestQRs : undefined,
                  });

                  // Mark email as sent
                  await supabase
                    .from("payment_links")
                    .update({ confirmation_email_sent_at: new Date().toISOString() })
                    .eq("id", paymentLink.id);

                  console.log(`Payment link confirmation email sent to ${customerEmail} (${numberOfPeople} people)`);
                } catch (emailError) {
                  console.error("Failed to send payment link confirmation email:", emailError);
                }
              }
            }
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;

        if (bookingId) {
          // Mark checkout as expired but don't cancel booking
          await supabase
            .from("class_bookings")
            .update({
              stripe_checkout_session_id: null,
            })
            .eq("id", bookingId)
            .eq("stripe_checkout_session_id", session.id);
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Update any booking with this payment intent
        await supabase
          .from("class_bookings")
          .update({
            status: "confirmed",
            paid_at: new Date().toISOString(),
          })
          .eq("stripe_payment_intent_id", paymentIntent.id)
          .is("paid_at", null);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Record failed transaction
        await supabase.from("payment_transactions").insert({
          transaction_type: "payment",
          payment_method: "stripe",
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency.toUpperCase(),
          status: "failed",
          stripe_payment_intent_id: paymentIntent.id,
          metadata: {
            error: paymentIntent.last_payment_error?.message,
          },
        });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const bookingId = invoice.metadata?.booking_id;

        if (bookingId) {
          await supabase
            .from("class_bookings")
            .update({
              status: "confirmed",
              paid_at: new Date().toISOString(),
              stripe_invoice_id: invoice.id,
            })
            .eq("id", bookingId);
        }

        // Update invoice record if exists
        const { data: invoiceRecord } = await supabase
          .from("invoices")
          .select("id")
          .eq("stripe_invoice_id", invoice.id)
          .single();

        if (invoiceRecord) {
          await supabase
            .from("invoices")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
            })
            .eq("id", invoiceRecord.id);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        
        // Find booking by payment intent
        const { data: booking } = await supabase
          .from("class_bookings")
          .select("id, total_amount")
          .eq("stripe_payment_intent_id", charge.payment_intent)
          .single();

        if (booking) {
          const refundAmount = charge.amount_refunded / 100;
          
          await supabase
            .from("class_bookings")
            .update({
              refund_amount: refundAmount,
              refunded_at: new Date().toISOString(),
              status: refundAmount >= booking.total_amount ? "cancelled" : "confirmed",
            })
            .eq("id", booking.id);

          // Record refund transaction
          await supabase.from("payment_transactions").insert({
            booking_id: booking.id,
            transaction_type: refundAmount >= booking.total_amount ? "refund" : "partial_refund",
            payment_method: "stripe",
            amount: refundAmount,
            currency: charge.currency.toUpperCase(),
            status: "completed",
            stripe_charge_id: charge.id,
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
