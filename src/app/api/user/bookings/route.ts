import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const serviceClient = createServiceClient();
    if (!serviceClient) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Get user profile to check email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    const email = profile?.email || user.email || "";

    // Fetch bookings for this user (by user_id or email)
    const { data: classBookings, error: classError } = await serviceClient
      .from("class_bookings")
      .select("*")
      .or(`user_id.eq.${user.id},attendee_email.eq.${email}`)
      .order("created_at", { ascending: false });

    if (classError) {
      console.error("Fetch class bookings error:", classError);
      return NextResponse.json({ error: classError.message }, { status: 500 });
    }

    const { data: serviceBookings, error: serviceError } = await serviceClient
      .from("service_bookings")
      .select("*")
      .or(`user_id.eq.${user.id},customer_email.eq.${email}`)
      .order("created_at", { ascending: false });

    if (serviceError) {
      console.error("Fetch service bookings error:", serviceError);
      return NextResponse.json({ error: serviceError.message }, { status: 500 });
    }

    return NextResponse.json({
      classBookings: classBookings || [],
      serviceBookings: serviceBookings || [],
      bookings: [...(serviceBookings || []), ...(classBookings || [])].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    });
  } catch (error) {
    console.error("Get user bookings error:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}
