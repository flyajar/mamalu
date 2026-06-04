import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    const email = profile?.email || user.email || "";
    const serviceClient = createServiceClient();
    if (!serviceClient) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { data: orders, error } = await serviceClient
      .from("product_orders")
      .select("*")
      .eq("customer_email", email)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch user orders error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (error) {
    console.error("Get user orders error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
