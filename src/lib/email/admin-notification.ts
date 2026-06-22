import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getEmailFrom } from "@/lib/email/config";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export type AdminNotificationEventType =
  | "class_booking"
  | "service_booking"
  | "rental_booking"
  | "rental_inquiry"
  | "product_order"
  | "test";

export interface AdminNotificationEvent {
  eventType: AdminNotificationEventType;
  sourceId?: string | null;
  reference?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  title: string;
  amount?: number | null;
  eventDate?: string | null;
  eventTime?: string | null;
  guestCount?: number | null;
  items?: Array<{ name: string; quantity?: number | string | null }>;
}

export type AdminNotificationRecipientGroup = "admin" | "easy_freezy";

const eventLabels: Record<AdminNotificationEventType, string> = {
  class_booking: "Class Booking",
  service_booking: "Item Booking",
  rental_booking: "Rental Booking",
  rental_inquiry: "Rental Inquiry",
  product_order: "Product Order",
  test: "Test Notification",
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function detailRow(label: string, value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "";
  return `<tr>
    <td style="padding:10px 0;color:#78716c;width:150px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:10px 0;color:#1c1917;font-weight:600;">${escapeHtml(value)}</td>
  </tr>`;
}

function formatAmount(amount?: number | null) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return null;
  return `AED ${Number(amount).toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildSubject(event: AdminNotificationEvent) {
  return `New ${eventLabels[event.eventType]}${event.reference ? ` - ${event.reference}` : ""} | Mamalu Kitchen`;
}

function buildHtml(event: AdminNotificationEvent) {
  const items = event.items?.length
    ? `<div style="margin-top:24px;">
        <h2 style="font-size:15px;color:#1c1917;margin:0 0 10px;">Items</h2>
        <ul style="margin:0;padding-left:20px;color:#57534e;line-height:1.7;">
          ${event.items.map((item) =>
            `<li>${escapeHtml(item.name)}${item.quantity ? ` x ${escapeHtml(item.quantity)}` : ""}</li>`
          ).join("")}
        </ul>
      </div>`
    : "";

  return `<!DOCTYPE html>
  <html>
    <body style="margin:0;background:#fff7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;">
        <div style="background:#FF8C6B;padding:28px 32px;color:#ffffff;">
          <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Mamalu Admin Notification</p>
          <h1 style="margin:0;font-size:24px;">New ${escapeHtml(eventLabels[event.eventType])}</h1>
        </div>
        <div style="padding:30px 32px;">
          <p style="margin:0 0 22px;color:#57534e;">A customer activity needs your attention.</p>
          <table role="presentation" style="width:100%;border-collapse:collapse;border-top:2px solid #FF8C6B;">
            ${detailRow("Reference", event.reference)}
            ${detailRow("Customer", event.customerName)}
            ${detailRow("Email", event.customerEmail)}
            ${detailRow("Phone", event.customerPhone)}
            ${detailRow(event.eventType === "product_order" ? "Order" : "Booking", event.title)}
            ${detailRow("Date", event.eventDate)}
            ${detailRow("Time", event.eventTime)}
            ${detailRow("Guests", event.guestCount)}
            ${detailRow("Total", formatAmount(event.amount))}
          </table>
          ${items}
        </div>
        <div style="padding:20px 32px;background:#1c1917;color:#d6d3d1;font-size:12px;">
          This email was sent from the Mamalu Kitchen admin notification system.
        </div>
      </div>
    </body>
  </html>`.trim();
}

async function writeLog(
  supabase: SupabaseClient,
  event: AdminNotificationEvent,
  recipientEmail: string,
  subject: string,
  status: "sent" | "failed",
  errorMessage?: string
) {
  const { error } = await supabase.from("admin_notification_logs").insert({
    event_type: event.eventType,
    source_id: event.sourceId || null,
    recipient_email: recipientEmail,
    subject,
    status,
    error_message: errorMessage || null,
  });

  if (error) console.error("Failed to write admin notification log:", error);
}

export async function sendAdminNotification(
  supabase: SupabaseClient,
  event: AdminNotificationEvent,
  recipientOverride?: string,
  recipientGroup: AdminNotificationRecipientGroup = "admin"
): Promise<{ sent: number; failed: number; skipped: boolean }> {
  let recipients: Array<{ email: string }>;

  if (recipientOverride) {
    recipients = [{ email: recipientOverride }];
  } else {
    const { data, error } = await supabase
      .from("admin_notification_recipients")
      .select("email")
      .eq("recipient_group", recipientGroup)
      .eq("is_enabled", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load admin notification recipients:", error);
      return { sent: 0, failed: 0, skipped: true };
    }
    recipients = data || [];
  }

  if (recipients.length === 0) return { sent: 0, failed: 0, skipped: true };

  const subject = buildSubject(event);
  const html = buildHtml(event);
  const results = await Promise.all(recipients.map(async (recipient) => {
    if (!resend) {
      await writeLog(supabase, event, recipient.email, subject, "failed", "RESEND_API_KEY is not configured");
      return false;
    }

    try {
      const { error } = await resend.emails.send({
        from: getEmailFrom(),
        to: recipient.email,
        subject,
        html,
        replyTo: event.customerEmail || undefined,
      });
      if (error) throw new Error(error.message);
      await writeLog(supabase, event, recipient.email, subject, "sent");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email delivery failed";
      console.error(`Admin notification failed for ${recipient.email}:`, error);
      await writeLog(supabase, event, recipient.email, subject, "failed", message);
      return false;
    }
  }));

  const sent = results.filter(Boolean).length;
  return { sent, failed: results.length - sent, skipped: false };
}
