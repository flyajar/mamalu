import { Resend } from "resend";
import { getEmailFrom } from "@/lib/email/config";
import { getPublicSiteUrl } from "@/lib/url/site";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface PasswordResetEmailDetails {
  email: string;
  actionLink: string;
}

export async function sendPasswordResetEmail(
  details: PasswordResetEmailDetails
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error("Resend not configured - RESEND_API_KEY missing");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from: getEmailFrom(),
      to: details.email,
      subject: "Reset your Mamalu Kitchen password",
      html: generatePasswordResetHtml(details),
    });

    if (error) {
      console.error("Password reset email send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to send email";
    console.error("Send password reset email error:", err);
    return { success: false, error: errorMessage };
  }
}

function generatePasswordResetHtml(details: PasswordResetEmailDetails): string {
  const baseUrl = getPublicSiteUrl();
  const logoUrl = `${baseUrl}/graphics/mamalu-logo-transparent.png`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Mamalu Kitchen Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; background-color: #fff7ef;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fff7ef; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #f0dfd3; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 36px 32px 24px; text-align: center; border-bottom: 1px solid #f4e7dd;">
              <img src="${logoUrl}" alt="Mamalu Kitchen" style="width: 150px; height: auto; margin: 0 auto; display: block;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px 12px;">
              <h1 style="color: #1f1f1f; margin: 0 0 12px; font-size: 26px; line-height: 1.25; font-weight: 700;">Reset your password</h1>
              <p style="color: #5f5a55; margin: 0; font-size: 15px; line-height: 1.7;">
                We received a request to reset the password for your Mamalu Kitchen account. Click the button below to choose a new password.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 32px; text-align: center;">
              <a href="${details.actionLink}" style="display: inline-block; background-color: #ff8c6b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 700;">Reset Password</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 32px;">
              <p style="color: #7a746e; margin: 0 0 12px; font-size: 13px; line-height: 1.6;">
                If you did not request this, you can ignore this email. This link is time-sensitive and can only be used to reset your password.
              </p>
              <p style="color: #7a746e; margin: 0; font-size: 13px; line-height: 1.6;">
                Having trouble with the button? Open this link in your browser:<br>
                <a href="${details.actionLink}" style="color: #ff7a54; word-break: break-all;">${details.actionLink}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
