import { Resend } from "resend";
import { getEmailFrom } from "@/lib/email/config";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface CustomerAccountAccessDetails {
  customerName: string;
  customerEmail: string;
  temporaryPassword?: string;
  reason: "booking" | "order" | "voucher";
}

export async function sendCustomerAccountAccessEmail(
  details: CustomerAccountAccessDetails
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error("Resend not configured - RESEND_API_KEY missing");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from: getEmailFrom(),
      to: details.customerEmail,
      subject: "Your Mamalu Kitchen account access",
      html: generateEmailHtml(details),
    });

    if (error) {
      console.error("Customer account access email send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to send email";
    console.error("Send customer account access email error:", err);
    return { success: false, error: errorMessage };
  }
}

function generateEmailHtml(details: CustomerAccountAccessDetails): string {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://mamalu.vercel.app").replace(/\/$/, "");
  const accountUrl = `${baseUrl}/account`;
  const reasonText = {
    booking: "booking",
    order: "product order",
    voucher: "gift card purchase",
  }[details.reason];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mamalu Kitchen Account Access</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; background-color: #ffffff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px 30px; text-align: center; border-bottom: 1px solid #000000;">
        <img src="${baseUrl}/logos/logo-transparent.png" alt="Mamalu Kitchen" style="width: 180px; height: auto; margin: 0 auto;" />
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px 20px;">
        <h1 style="color: #000000; margin: 0 0 12px; font-size: 24px; font-weight: 600;">Your Mamalu Kitchen Account</h1>
        <p style="color: #666666; margin: 0; font-size: 15px; line-height: 1.7;">
          Hi ${details.customerName || "there"}, your ${reasonText} is linked to your customer account. Use it to view your bookings, product orders, and gift card purchases.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 10px 30px 30px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="12" style="font-size: 14px; border-top: 1px solid #e5e5e5; border-bottom: 1px solid #e5e5e5;">
          <tr>
            <td style="color: #666666; width: 150px; padding: 12px 0;">Login Email</td>
            <td style="color: #000000; font-weight: 600; padding: 12px 0;">${details.customerEmail}</td>
          </tr>
          ${details.temporaryPassword ? `
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">Temporary Password</td>
            <td style="color: #000000; font-weight: 600; padding: 12px 0; border-top: 1px solid #f5f5f5;">${details.temporaryPassword}</td>
          </tr>
          ` : ""}
        </table>
        ${details.temporaryPassword ? `
        <p style="color: #666666; margin: 18px 0 0; font-size: 13px; line-height: 1.6;">
          Please sign in and change this temporary password from your account page.
        </p>
        ` : `
        <p style="color: #666666; margin: 18px 0 0; font-size: 13px; line-height: 1.6;">
          This email is already linked to a Mamalu Kitchen account. Sign in with your existing password.
        </p>
        `}
      </td>
    </tr>
    <tr>
      <td style="padding: 0 30px 40px; text-align: center;">
        <a href="${accountUrl}" style="display: inline-block; background-color: #ff8c6b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Open My Account</a>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
