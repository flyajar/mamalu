import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from("newsletter_leads")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    let subscriptionMessage = "Successfully subscribed!";

    if (existing) {
      subscriptionMessage = "You're already subscribed!";
    } else {
      // Insert into the marketing/newsletter contacts table.
      const { error } = await supabase.from("newsletter_leads").insert({
        email: normalizedEmail,
        source: "website",
        subscribed_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Newsletter subscription error:", error);
        return NextResponse.json(
          { error: "Failed to subscribe" },
          { status: 500 }
        );
      }
    }

    const serviceSupabase = createServiceClient();
    if (!serviceSupabase) throw new Error("Failed to create Supabase service client");

    const { data: existingLead, error: existingLeadError } = await serviceSupabase
      .from("leads")
      .select("id")
      .eq("email", normalizedEmail)
      .eq("lead_type", "newsletter")
      .limit(1)
      .maybeSingle();

    if (existingLeadError) {
      console.error("Newsletter lead lookup error:", existingLeadError);
      return NextResponse.json(
        { error: "Failed to create CRM lead" },
        { status: 500 }
      );
    }

    if (!existingLead) {
      const { error: leadError } = await serviceSupabase.from("leads").insert({
        name: normalizedEmail,
        email: normalizedEmail,
        source: "website",
        status: "new",
        lead_type: "newsletter",
        interests: ["Newsletter"],
        notes: "Subscribed through the website cooking tips newsletter form.",
      });

      if (leadError) {
        console.error("Newsletter CRM lead creation error:", leadError);
        return NextResponse.json(
          { error: "Failed to create CRM lead" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ message: subscriptionMessage }, { status: 200 });
  } catch (error) {
    console.error("Newsletter API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
