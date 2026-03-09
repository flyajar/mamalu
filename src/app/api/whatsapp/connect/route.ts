import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/api-auth";
import { isTwilioConfigured, TWILIO_WHATSAPP_NUMBER } from "@/lib/twilio/client";

/**
 * GET: Check Twilio configuration status
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, ["super_admin"]);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const configured = isTwilioConfigured();
  
  return NextResponse.json({
    configured,
    whatsappNumber: configured ? TWILIO_WHATSAPP_NUMBER : null,
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://mamalu.vercel.app"}/api/webhooks/twilio-whatsapp`,
  });
}

/**
 * POST: Connect/activate WhatsApp monitoring with Twilio
 */
export async function POST(request: NextRequest) {
  // Verify user is super admin
  const authResult = await requireAuth(request, ["super_admin"]);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const { user } = authResult;

  try {
    const body = await request.json();
    const { displayName } = body;

    if (!isTwilioConfigured()) {
      return NextResponse.json(
        { error: "Twilio is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER in environment variables." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Check if account already exists
    const { data: existingAccount } = await supabase
      .from("whatsapp_accounts")
      .select("id")
      .eq("phone_number", TWILIO_WHATSAPP_NUMBER)
      .single();

    if (existingAccount) {
      // Update existing account
      const { data: account, error } = await supabase
        .from("whatsapp_accounts")
        .update({
          status: "active",
          display_name: displayName || "Twilio WhatsApp",
          provider: "twilio",
        })
        .eq("id", existingAccount.id)
        .select()
        .single();

      if (error) {
        console.error("Update account error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        account,
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio-whatsapp`,
      });
    }

    // Create new WhatsApp account
    const { data: account, error } = await supabase
      .from("whatsapp_accounts")
      .insert({
        super_admin_id: user.id,
        phone_number: TWILIO_WHATSAPP_NUMBER,
        business_account_id: process.env.TWILIO_ACCOUNT_SID || "twilio",
        display_name: displayName || "Twilio WhatsApp",
        provider: "twilio",
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Create account error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      account,
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio-whatsapp`,
    });
  } catch (error: any) {
    console.error("Connect account error:", error);
    return NextResponse.json({ error: "Failed to connect account" }, { status: 500 });
  }
}

/**
 * PATCH: Update WhatsApp account settings
 */
export async function PATCH(request: NextRequest) {
  // Verify user is super admin
  const authResult = await requireAuth(request, ["super_admin"]);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const { user } = authResult;

  try {
    const body = await request.json();
    const { accountId, status, displayName, accessToken } = body;

    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Verify account belongs to this super admin
    const { data: account } = await supabase
      .from("whatsapp_accounts")
      .select("id")
      .eq("id", accountId)
      .eq("super_admin_id", user.id)
      .single();

    if (!account) {
      return NextResponse.json({ error: "Account not found or access denied" }, { status: 404 });
    }

    // Update account
    const updateData: any = {};
    if (status) updateData.status = status;
    if (displayName) updateData.display_name = displayName;
    if (accessToken) updateData.access_token = accessToken;

    const { data: updatedAccount, error } = await supabase
      .from("whatsapp_accounts")
      .update(updateData)
      .eq("id", accountId)
      .select()
      .single();

    if (error) {
      console.error("Update account error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, account: updatedAccount });
  } catch (error: any) {
    console.error("Update account error:", error);
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}
