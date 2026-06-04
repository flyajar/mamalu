import { Resend } from "resend";
import { getEmailFrom } from "@/lib/email/config";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface VoucherRedemptionDetails {
  customerName: string;
  customerEmail: string;
  voucherCode: string;
  experienceName: string;
  eventDate: string;
  timeSlot: string;
  numberOfGuests: number;
  originalPrice: number;
  specialRequests?: string;
}

export async function sendVoucherRedemptionConfirmation(details: VoucherRedemptionDetails): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error("Resend not configured - RESEND_API_KEY missing");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from: getEmailFrom(),
      to: details.customerEmail,
      subject: `Booking Confirmed - ${details.experienceName} | Mamalu Kitchen`,
      html: generateEmailHtml(details),
    });

    if (error) {
      console.error("Voucher redemption email error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to send email";
    console.error("Send voucher redemption email error:", err);
    return { success: false, error: errorMessage };
  }
}

function generateEmailHtml(details: VoucherRedemptionDetails): string {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://mamalu.vercel.app").replace(/\/$/, "");

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
    <!-- Header -->
    <tr>
      <td style="padding: 36px 30px 28px; text-align: center; background-color: #FF8C6B; border-bottom: 4px solid #ff7a54;">
        <img src="${baseUrl}/graphics/mamalu-logo-transparent.png" alt="Mamalu Kitchen" style="width: 180px; height: auto; margin: 0 auto; display: block;" />
      </td>
    </tr>
    
    <!-- Success Banner -->
    <tr>
      <td style="padding: 50px 30px 30px; text-align: center;">
        <h1 style="color: #1c1917; margin: 0 0 10px; font-size: 24px; font-weight: 600;">Booking Confirmed</h1>
        <p style="color: #6b5f59; margin: 0; font-size: 15px;">Your voucher has been successfully redeemed</p>
      </td>
    </tr>
    
    <!-- Booking Details -->
    <tr>
      <td style="padding: 20px 30px 40px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="12" style="font-size: 14px; border-top: 2px solid #FF8C6B; border-bottom: 1px solid #f1d8cf;">
          <tr>
            <td style="color: #666666; width: 140px; padding: 12px 0;">Name</td>
            <td style="color: #000000; font-weight: 500; padding: 12px 0;">${details.customerName}</td>
          </tr>
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">Experience</td>
            <td style="color: #000000; font-weight: 500; padding: 12px 0; border-top: 1px solid #f5f5f5;">${details.experienceName}</td>
          </tr>
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">Date</td>
            <td style="color: #000000; padding: 12px 0; border-top: 1px solid #f5f5f5;">${details.eventDate}</td>
          </tr>
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">Time</td>
            <td style="color: #000000; padding: 12px 0; border-top: 1px solid #f5f5f5;">${details.timeSlot}</td>
          </tr>
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">Guests</td>
            <td style="color: #000000; font-weight: 500; padding: 12px 0; border-top: 1px solid #f5f5f5;">${details.numberOfGuests}</td>
          </tr>
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">Voucher Code</td>
            <td style="color: #000000; font-family: monospace; font-weight: 600; padding: 12px 0; border-top: 1px solid #f5f5f5;">${details.voucherCode}</td>
          </tr>
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">Original Price</td>
            <td style="color: #999999; text-decoration: line-through; padding: 12px 0; border-top: 1px solid #f5f5f5;">AED ${details.originalPrice.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">Amount Paid</td>
            <td style="color: #000000; font-weight: 600; padding: 12px 0; border-top: 1px solid #f5f5f5;">FREE (Gift Card)</td>
          </tr>
          ${details.specialRequests ? `
          <tr>
            <td style="color: #666666; vertical-align: top; padding: 12px 0; border-top: 1px solid #f5f5f5;">Special Requests</td>
            <td style="color: #000000; padding: 12px 0; border-top: 1px solid #f5f5f5;">${details.specialRequests}</td>
          </tr>
          ` : ''}
        </table>
      </td>
    </tr>
    
    <!-- Important Notes -->
    <tr>
      <td style="padding: 30px; background-color: #fff7f2; border-top: 1px solid #f1d8cf; border-bottom: 1px solid #f1d8cf;">
        <h3 style="color: #FF8C6B; margin: 0 0 15px 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Important Information</h3>
        <ul style="color: #6b5f59; margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
          <li>Please arrive 10-15 minutes before your scheduled time</li>
          <li>Bring a copy of this confirmation email</li>
          <li>Wear comfortable clothing suitable for cooking</li>
          <li>Notify us at least 24 hours in advance for cancellations or changes</li>
        </ul>
        <p style="color: #666666; margin: 15px 0 0 0; font-size: 13px;">
          Our team will reach out to you shortly to confirm final details.
        </p>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 30px; text-align: center;">
        <p style="color: #666666; margin: 0 0 10px 0; font-size: 13px;">
          Questions? Contact us at <a href="mailto:hello@mamalukitchen.com" style="color: #FF8C6B; text-decoration: none; border-bottom: 1px solid #FF8C6B;">hello@mamalukitchen.com</a> or WhatsApp <a href="https://wa.me/971527479512" style="color: #FF8C6B; text-decoration: none; border-bottom: 1px solid #FF8C6B;">+971 52 747 9512</a>
        </p>
        <p style="color: #999999; margin: 20px 0 0 0; font-size: 11px;">
          © ${new Date().getFullYear()} Mamalu Kitchen. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
