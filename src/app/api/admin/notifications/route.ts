import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendAdminNotification } from "@/lib/email/admin-notification";
import { requireAuth } from "@/lib/auth/api-auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["staff", "admin", "super_admin"]);
    if (auth instanceof NextResponse) return auth;

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Get count of new product orders
    const { count: newOrdersCount } = await supabase
      .from("product_orders")
      .select("*", { count: "exact", head: true })
      .eq("is_new", true);

    // Get recent new orders for preview
    const { data: recentOrders } = await supabase
      .from("product_orders")
      .select("id, order_number, customer_name, total_amount, created_at")
      .eq("is_new", true)
      .order("created_at", { ascending: false })
      .limit(3);

    // Get count of unread inquiries
    const { count: newInquiriesCount } = await supabase
      .from("contact_submissions")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false);

    // Get recent unread inquiries for preview
    const { data: recentInquiries } = await supabase
      .from("contact_submissions")
      .select("id, name, subject, created_at")
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(3);

    const totalNotifications = (newOrdersCount || 0) + (newInquiriesCount || 0);

    const { data: recipients, error: recipientsError } = await supabase
      .from("admin_notification_recipients")
      .select("id, email, is_enabled, created_at, updated_at")
      .order("created_at", { ascending: true });

    const { data: deliveryLogs, error: logsError } = await supabase
      .from("admin_notification_logs")
      .select("id, event_type, source_id, recipient_email, subject, status, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      newOrdersCount: newOrdersCount || 0,
      recentOrders: recentOrders || [],
      newInquiriesCount: newInquiriesCount || 0,
      recentInquiries: recentInquiries || [],
      totalNotifications,
      recipients: recipientsError ? [] : recipients || [],
      deliveryLogs: logsError ? [] : deliveryLogs || [],
      settingsAvailable: !recipientsError && !logsError,
    });
  } catch (error: unknown) {
    console.error("Notifications API error:", error);
    const message = error instanceof Error ? error.message : "Failed to load notifications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["staff", "admin", "super_admin"]);
    if (auth instanceof NextResponse) return auth;

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }

    if (body.action === "send_test") {
      const result = await sendAdminNotification(
        supabase,
        {
          eventType: "test",
          reference: "TEST",
          customerName: "Sample Customer",
          customerEmail: "customer@example.com",
          customerPhone: "+971 50 000 0000",
          title: "Sample booking notification",
          amount: 250,
          eventDate: new Date().toISOString().slice(0, 10),
          eventTime: "10:00 AM",
          guestCount: 2,
          items: [{ name: "Sample item", quantity: 1 }],
        },
        email
      );

      if (result.failed > 0) {
        return NextResponse.json({ error: "Test notification failed. Check the delivery log." }, { status: 502 });
      }
      return NextResponse.json({ success: true });
    }

    const { data, error } = await supabase
      .from("admin_notification_recipients")
      .insert({ email, is_enabled: body.is_enabled !== false })
      .select()
      .single();

    if (error?.code === "23505") {
      return NextResponse.json({ error: "That email is already in the notification list" }, { status: 409 });
    }
    if (error) throw error;

    return NextResponse.json({ recipient: data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add notification email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["staff", "admin", "super_admin"]);
    if (auth instanceof NextResponse) return auth;

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const body = await request.json();
    if (!body.id || typeof body.is_enabled !== "boolean") {
      return NextResponse.json({ error: "Recipient id and enabled state are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("admin_notification_recipients")
      .update({ is_enabled: body.is_enabled })
      .eq("id", body.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ recipient: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update notification email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["staff", "admin", "super_admin"]);
    if (auth instanceof NextResponse) return auth;

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Recipient id is required" }, { status: 400 });
    }

    const { error } = await supabase.from("admin_notification_recipients").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete notification email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
