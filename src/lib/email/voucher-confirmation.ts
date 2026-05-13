import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface VoucherEmailDetails {
  customerName: string;
  customerEmail: string;
  amount: number;
  voucherCode: string;
}

export async function sendVoucherConfirmationEmail(details: VoucherEmailDetails): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error("Resend not configured");
    return { success: false, error: "Email service not configured" };
  }

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "Mamalu Kitchen <noreply@mamalu.ae>",
    to: details.customerEmail,
    subject: `Your Mamalu Kitchen Gift Card – AED ${details.amount.toFixed(2)}`,
    html: generateEmailHtml(details),
  });

  if (error) {
    console.error("Voucher email error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

function generateEmailHtml({ customerName, amount, voucherCode }: VoucherEmailDetails): string {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://mamalu.vercel.app").replace(/\/$/, "");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background-color:#ffffff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="padding:40px 30px 30px;text-align:center;border-bottom:1px solid #000000;">
        <img src="${baseUrl}/logos/logo-transparent.png" alt="Mamalu Kitchen" style="width:180px;height:auto;margin:0 auto;" />
      </td>
    </tr>
    <tr>
      <td style="padding:50px 30px 30px;text-align:center;">
        <h1 style="color:#000000;margin:0 0 10px;font-size:24px;font-weight:600;letter-spacing:-0.5px;">Gift Card</h1>
        <p style="color:#666666;margin:0 0 30px;font-size:15px;">Hi ${customerName}, your gift card is ready!</p>
        <p style="color:#000000;font-size:48px;font-weight:700;margin:0;letter-spacing:-1px;">AED ${amount.toFixed(2)}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 30px 40px;text-align:center;">
        <p style="color:#666666;margin:0 0 20px;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;font-weight:500;">Your Code</p>
        <div style="display:inline-block;border:2px solid #000000;padding:20px 40px;margin:0 0 20px;">
          <span style="color:#000000;font-size:32px;font-weight:700;letter-spacing:4px;font-family:monospace;">${voucherCode}</span>
        </div>
        <p style="color:#666666;margin:0;font-size:13px;line-height:1.6;">This code never expires and can be used on any<br/>Mamalu Kitchen experience.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:30px;border-top:1px solid #e5e5e5;">
        <p style="color:#666666;margin:0 0 15px;font-size:14px;line-height:1.6;">
          To redeem, simply enter the code above when booking a class, rental, or any other Mamalu Kitchen service.
        </p>
        <p style="color:#666666;margin:0;font-size:13px;line-height:1.6;">
          Questions? Contact us at <a href="mailto:hello@mamalukitchen.com" style="color:#000000;text-decoration:none;border-bottom:1px solid #000000;">hello@mamalukitchen.com</a> or WhatsApp <a href="https://wa.me/971527479512" style="color:#000000;text-decoration:none;border-bottom:1px solid #000000;">+971 52 747 9512</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:30px;text-align:center;border-top:1px solid #e5e5e5;">
        <p style="color:#999999;margin:0;font-size:11px;">© ${new Date().getFullYear()} Mamalu Kitchen. All rights reserved.</p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
