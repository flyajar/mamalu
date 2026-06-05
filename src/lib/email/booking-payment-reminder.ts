import { Resend } from "resend";
import { getEmailFrom } from "@/lib/email/config";
import { getPublicSiteUrl } from "@/lib/url/site";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface PaymentReminderDetails {
  bookingNumber: string;
  attendeeName: string;
  attendeeEmail: string;
  classTitle: string;
  totalAmount: number;
  paymentUrl: string;
  amountLabel?: string;
}

export async function sendBookingPaymentReminderEmail(
  booking: PaymentReminderDetails
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error("Resend not configured - RESEND_API_KEY missing");
    return { success: false, error: "Email service not configured" };
  }

  const { error } = await resend.emails.send({
    from: getEmailFrom(),
    to: booking.attendeeEmail,
    subject: `Complete your booking payment - ${booking.classTitle} | Mamalu Kitchen`,
    html: generatePaymentReminderHtml(booking),
  });

  if (error) {
    console.error("Payment reminder email send error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

function generatePaymentReminderHtml(booking: PaymentReminderDetails) {
  const baseUrl = getPublicSiteUrl();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Booking Payment</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background-color:#fff7f2;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="padding:34px 30px 26px;text-align:center;background-color:#FF8C6B;">
        <img src="${baseUrl}/graphics/mamalu-logo-transparent.png" alt="Mamalu Kitchen" style="width:170px;height:auto;margin:0 auto;display:block;" />
      </td>
    </tr>
    <tr>
      <td style="padding:42px 30px 18px;text-align:center;">
        <h1 style="color:#1c1917;margin:0 0 12px;font-size:24px;font-weight:600;">Your booking is still waiting</h1>
        <p style="color:#6b5f59;margin:0;font-size:15px;line-height:1.6;">Hi ${booking.attendeeName}, your payment was cancelled, but your booking is still pending. You can complete the payment using the button below.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 30px 30px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="12" style="font-size:14px;border-top:2px solid #FF8C6B;border-bottom:1px solid #f1d8cf;">
          <tr>
            <td style="color:#666666;width:150px;padding:12px 0;">Booking Number</td>
            <td style="color:#000000;font-weight:600;padding:12px 0;">${booking.bookingNumber}</td>
          </tr>
          <tr>
            <td style="color:#666666;padding:12px 0;border-top:1px solid #f5f5f5;">Booking</td>
            <td style="color:#000000;font-weight:500;padding:12px 0;border-top:1px solid #f5f5f5;">${booking.classTitle}</td>
          </tr>
          <tr>
            <td style="color:#666666;padding:12px 0;border-top:1px solid #f5f5f5;">${booking.amountLabel || "Amount Due"}</td>
            <td style="color:#000000;font-weight:600;padding:12px 0;border-top:1px solid #f5f5f5;">AED ${Number(booking.totalAmount || 0).toFixed(2)}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 30px 42px;text-align:center;">
        <a href="${booking.paymentUrl}" style="display:inline-block;background-color:#FF8C6B;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 24px;border-radius:8px;">Complete Payment</a>
        <p style="color:#8a817c;margin:20px 0 0;font-size:12px;line-height:1.6;">If the button does not work, copy this link into your browser:<br><a href="${booking.paymentUrl}" style="color:#FF8C6B;">${booking.paymentUrl}</a></p>
      </td>
    </tr>
    <tr>
      <td style="padding:26px 30px;text-align:center;background-color:#fff7f2;border-top:1px solid #f1d8cf;">
        <p style="color:#666666;margin:0;font-size:13px;">Questions? WhatsApp <a href="https://wa.me/971527479512" style="color:#FF8C6B;text-decoration:none;">+971 52 747 9512</a></p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
