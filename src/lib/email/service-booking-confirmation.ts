import { Resend } from "resend";
import { getEmailFrom } from "@/lib/email/config";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface ServiceBookingDetails {
  bookingNumber: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  packageName?: string | null;
  menuName?: string | null;
  eventDate?: string | null;
  eventTime?: string | null;
  guestCount: number;
  totalAmount: number;
  depositAmount?: number | null;
  balanceAmount?: number | null;
  isDepositPayment?: boolean | null;
}

export async function sendServiceBookingConfirmationEmail(
  booking: ServiceBookingDetails
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error("Resend not configured - RESEND_API_KEY missing");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from: getEmailFrom(),
      to: booking.customerEmail,
      subject: `Booking Confirmed - ${booking.bookingNumber} | Mamalu Kitchen`,
      html: generateEmailHtml(booking),
    });

    if (error) {
      console.error("Service booking email send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to send email";
    console.error("Send service booking confirmation email error:", err);
    return { success: false, error: errorMessage };
  }
}

function generateEmailHtml(booking: ServiceBookingDetails): string {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://mamalu.vercel.app").replace(/\/$/, "");
  const eventDate = booking.eventDate || "TBD";
  const eventTime = booking.eventTime || "TBD";
  const packageLabel = [booking.packageName, booking.menuName].filter(Boolean).join(" - ") || booking.serviceName;
  const paidLabel = booking.isDepositPayment ? "Deposit Paid" : "Amount Paid";
  const paidAmount = booking.isDepositPayment
    ? booking.depositAmount ?? Math.ceil(booking.totalAmount * 0.5)
    : booking.totalAmount;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; background-color: #fff7f2;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 36px 30px 28px; text-align: center; background-color: #FF8C6B; border-bottom: 4px solid #ff7a54;">
        <img src="${baseUrl}/graphics/mamalu-logo-transparent.png" alt="Mamalu Kitchen" style="width: 180px; height: auto; margin: 0 auto; display: block;" />
      </td>
    </tr>
    <tr>
      <td style="padding: 50px 30px 30px; text-align: center;">
        <h1 style="color: #1c1917; margin: 0 0 10px; font-size: 24px; font-weight: 600;">Booking Confirmed</h1>
        <p style="color: #6b5f59; margin: 0; font-size: 15px;">Thank you for your booking. Your payment has been received successfully.</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 30px 40px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="12" style="font-size: 14px; border-top: 2px solid #FF8C6B; border-bottom: 1px solid #f1d8cf;">
          <tr>
            <td style="color: #666666; width: 150px; padding: 12px 0;">Booking Number</td>
            <td style="color: #000000; font-weight: 600; padding: 12px 0;">${booking.bookingNumber}</td>
          </tr>
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">Name</td>
            <td style="color: #000000; font-weight: 500; padding: 12px 0; border-top: 1px solid #f5f5f5;">${booking.customerName}</td>
          </tr>
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">Experience</td>
            <td style="color: #000000; font-weight: 500; padding: 12px 0; border-top: 1px solid #f5f5f5;">${packageLabel}</td>
          </tr>
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">Date</td>
            <td style="color: #000000; padding: 12px 0; border-top: 1px solid #f5f5f5;">${eventDate}</td>
          </tr>
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">Time</td>
            <td style="color: #000000; padding: 12px 0; border-top: 1px solid #f5f5f5;">${eventTime}</td>
          </tr>
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">Guests</td>
            <td style="color: #000000; padding: 12px 0; border-top: 1px solid #f5f5f5;">${booking.guestCount}</td>
          </tr>
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">${paidLabel}</td>
            <td style="color: #000000; font-weight: 600; padding: 12px 0; border-top: 1px solid #f5f5f5;">AED ${paidAmount.toFixed(2)}</td>
          </tr>
          ${booking.isDepositPayment && booking.balanceAmount ? `
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">Balance Due Later</td>
            <td style="color: #000000; font-weight: 600; padding: 12px 0; border-top: 1px solid #f5f5f5;">AED ${booking.balanceAmount.toFixed(2)}</td>
          </tr>
          ` : ""}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #fff7f2; border-top: 1px solid #f1d8cf; border-bottom: 1px solid #f1d8cf;">
        <h3 style="color: #FF8C6B; margin: 0 0 15px 0; font-size: 14px; font-weight: 600; text-transform: uppercase;">Important Information</h3>
        <ul style="color: #6b5f59; margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
          <li>Please arrive 10-15 minutes before your scheduled time</li>
          <li>Wear comfortable clothing suitable for cooking</li>
          <li>Notify us in advance about allergies or dietary restrictions</li>
          <li>Contact us if any booking details need to be updated</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; text-align: center;">
        <p style="color: #666666; margin: 0 0 10px 0; font-size: 13px;">
          Questions? Contact us at <a href="mailto:info@mamalukitchen.com" style="color: #FF8C6B; text-decoration: none; border-bottom: 1px solid #FF8C6B;">info@mamalukitchen.com</a> or WhatsApp <a href="https://wa.me/971527479512" style="color: #FF8C6B; text-decoration: none; border-bottom: 1px solid #FF8C6B;">+971 52 747 9512</a>
        </p>
        <p style="color: #999999; margin: 20px 0 0 0; font-size: 11px;">
          &copy; ${new Date().getFullYear()} Mamalu Kitchen. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
