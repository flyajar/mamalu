import { Resend } from "resend";
import { generateBookingQRCode } from "@/lib/qrcode/generate";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface GuestQR {
  guestNumber: number;
  guestName?: string;
  qrToken: string;
}

interface BookingDetails {
  bookingNumber: string;
  attendeeName: string;
  attendeeEmail: string;
  classTitle: string;
  classDate: string;
  classTime: string;
  location: string;
  sessionsBooked: number;
  totalAmount: number;
  numberOfGuests: number;
  qrToken: string; // Main booking QR (for single guest)
  guestQRs?: GuestQR[]; // Individual guest QRs (for multiple guests)
}

/**
 * Send booking confirmation email with QR code(s)
 * For multiple guests, generates individual QR codes for each guest
 */
export async function sendBookingConfirmationEmail(booking: BookingDetails): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error("Resend not configured - RESEND_API_KEY missing");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const numberOfGuests = booking.numberOfGuests || 1;
    const attachments: Array<{ filename: string; content: string; contentType: string }> = [];
    const qrCodeDataUrls: Array<{ guestNumber: number; guestName: string; dataUrl: string }> = [];

    if (numberOfGuests > 1 && booking.guestQRs && booking.guestQRs.length > 0) {
      // Generate QR codes for each guest
      for (const guest of booking.guestQRs) {
        const qrDataUrl = await generateBookingQRCode(guest.qrToken);
        const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
        
        qrCodeDataUrls.push({
          guestNumber: guest.guestNumber,
          guestName: guest.guestName || `Guest ${guest.guestNumber}`,
          dataUrl: qrDataUrl,
        });

        attachments.push({
          filename: `guest-${guest.guestNumber}-qr-${booking.bookingNumber}.png`,
          content: qrBase64,
          contentType: "image/png",
        });
      }
    } else {
      // Single guest - use main booking QR
      const qrCodeDataUrl = await generateBookingQRCode(booking.qrToken);
      const qrCodeBase64 = qrCodeDataUrl.replace(/^data:image\/png;base64,/, "");
      
      qrCodeDataUrls.push({
        guestNumber: 1,
        guestName: booking.attendeeName,
        dataUrl: qrCodeDataUrl,
      });

      attachments.push({
        filename: `booking-qr-${booking.bookingNumber}.png`,
        content: qrCodeBase64,
        contentType: "image/png",
      });
    }

    const emailHtml = generateEmailHtml(booking, qrCodeDataUrls);

    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Mamalu Kitchen <noreply@mamalu.ae>",
      to: booking.attendeeEmail,
      subject: `Booking Confirmed - ${booking.classTitle} | Mamalu Kitchen`,
      html: emailHtml,
      attachments,
    });

    if (error) {
      console.error("Email send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to send email";
    console.error("Send confirmation email error:", err);
    return { success: false, error: errorMessage };
  }
}

interface QRCodeInfo {
  guestNumber: number;
  guestName: string;
  dataUrl: string;
}

function generateEmailHtml(booking: BookingDetails, qrCodes: QRCodeInfo[]): string {
  const numberOfGuests = booking.numberOfGuests || 1;
  const isMultipleGuests = qrCodes.length > 1;
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://mamalu.vercel.app").replace(/\/$/, "");

  const qrCodesHtml = qrCodes.map((qr, index) => `
    <div style="background-color: #ffffff; padding: 20px; display: inline-block; border: 2px solid #000000; margin: 10px; vertical-align: top;">
      <p style="color: #000000; font-weight: 600; margin: 0 0 15px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">${qr.guestName}</p>
      <img src="${qr.dataUrl}" alt="Check-in QR Code for ${qr.guestName}" style="width: 150px; height: 150px; display: block;" />
      <p style="color: #666666; margin: 15px 0 0 0; font-size: 11px;">Guest ${qr.guestNumber} of ${qrCodes.length}</p>
    </div>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; background-color: #ffffff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="padding: 40px 30px 30px; text-align: center; border-bottom: 1px solid #000000;">
        <img src="${baseUrl}/logos/logo-transparent.png" alt="Mamalu Kitchen" style="width: 180px; height: auto; margin: 0 auto;" />
      </td>
    </tr>
    
    <!-- Success Banner -->
    <tr>
      <td style="padding: 50px 30px 30px; text-align: center;">
        <h1 style="color: #000000; margin: 0 0 10px; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">Booking Confirmed</h1>
        <p style="color: #666666; margin: 0; font-size: 15px;">Your payment has been received successfully</p>
      </td>
    </tr>
    
    <!-- Booking Details -->
    <tr>
      <td style="padding: 20px 30px 40px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="12" style="font-size: 14px; border-top: 1px solid #e5e5e5; border-bottom: 1px solid #e5e5e5;">
          <tr>
            <td style="color: #666666; width: 140px; padding: 12px 0;">Booking Number</td>
            <td style="color: #000000; font-weight: 600; padding: 12px 0;">${booking.bookingNumber}</td>
          </tr>
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">Name</td>
            <td style="color: #000000; font-weight: 500; padding: 12px 0; border-top: 1px solid #f5f5f5;">${booking.attendeeName}</td>
          </tr>
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">Class</td>
            <td style="color: #000000; font-weight: 500; padding: 12px 0; border-top: 1px solid #f5f5f5;">${booking.classTitle}</td>
          </tr>
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">Date</td>
            <td style="color: #000000; padding: 12px 0; border-top: 1px solid #f5f5f5;">${booking.classDate}</td>
          </tr>
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">Time</td>
            <td style="color: #000000; padding: 12px 0; border-top: 1px solid #f5f5f5;">${booking.classTime}</td>
          </tr>
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">Location</td>
            <td style="color: #000000; padding: 12px 0; border-top: 1px solid #f5f5f5;">${booking.location}</td>
          </tr>
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">Guests</td>
            <td style="color: #000000; font-weight: 500; padding: 12px 0; border-top: 1px solid #f5f5f5;">${numberOfGuests}</td>
          </tr>
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">Sessions</td>
            <td style="color: #000000; padding: 12px 0; border-top: 1px solid #f5f5f5;">${booking.sessionsBooked}</td>
          </tr>
          <tr>
            <td style="color: #666666; padding: 12px 0; border-top: 1px solid #f5f5f5;">Amount Paid</td>
            <td style="color: #000000; font-weight: 600; padding: 12px 0; border-top: 1px solid #f5f5f5;">AED ${booking.totalAmount.toFixed(2)}</td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- QR Code Section -->
    <tr>
      <td style="padding: 30px; text-align: center; background-color: #fafafa; border-top: 1px solid #e5e5e5; border-bottom: 1px solid #e5e5e5;">
        <h3 style="color: #000000; margin: 0 0 10px 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
          ${isMultipleGuests ? `Check-In QR Codes (${qrCodes.length} Guests)` : "Your Check-In QR Code"}
        </h3>
        <p style="color: #666666; margin: 0 0 25px 0; font-size: 13px;">
          ${isMultipleGuests 
            ? "Each guest must present their own QR code for entry" 
            : "Present this QR code when you arrive for quick check-in"}
        </p>
        <div style="text-align: center;">
          ${qrCodesHtml}
        </div>
        <p style="color: #999999; margin: 20px 0 0 0; font-size: 11px;">
          QR codes are also attached to this email for offline access
        </p>
      </td>
    </tr>
    
    <!-- Important Notes -->
    <tr>
      <td style="padding: 30px; background-color: #fafafa; border-bottom: 1px solid #e5e5e5;">
        <h3 style="color: #000000; margin: 0 0 15px 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Important Information</h3>
        <ul style="color: #666666; margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
          <li>Please arrive 10-15 minutes before the class starts</li>
          <li>Bring your QR code (on phone or printed)</li>
          <li>Wear comfortable clothing suitable for cooking</li>
          <li>Notify us at least 24 hours in advance for cancellations</li>
        </ul>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 30px; text-align: center;">
        <p style="color: #666666; margin: 0 0 10px 0; font-size: 13px;">
          Questions? Contact us at <a href="mailto:info@mamalukitchen.com" style="color: #000000; text-decoration: none; border-bottom: 1px solid #000000;">info@mamalukitchen.com</a> or WhatsApp <a href="https://wa.me/971527479512" style="color: #000000; text-decoration: none; border-bottom: 1px solid #000000;">+971 52 747 9512</a>
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
