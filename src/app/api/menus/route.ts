import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET active menu items (public endpoint for frontend)
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error("Failed to create Supabase client");

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    let query = supabase
      .from("menu_items")
      .select("id, categories, name, description, dishes, price, price_unit, image_url, emoji, is_popular, sort_order, min_guests, max_guests, scheduled_date")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (category) {
      query = query.eq("categories", category);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Group by category
    const grouped: Record<string, any[]> = {};
    (data || []).forEach((item) => {
      if (!grouped[item.categories]) grouped[item.categories] = [];
      grouped[item.categories].push(item);
    });

    return NextResponse.json({ items: data || [], grouped });
  } catch (error: any) {
    console.error("Error fetching menus:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch menus" },
      { status: 500 }
    );
  }
}
