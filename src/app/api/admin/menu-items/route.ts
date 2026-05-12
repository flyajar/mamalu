import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error("Failed to create Supabase client");

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const activeOnly = searchParams.get("active") === "true";

    let query = supabase
      .from("menu_items")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (category) {
      query = query.contains("categories", [category]);
    }
    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ items: data || [] });
  } catch (error: any) {
    console.error("Error fetching menu items:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch menu items" },
      { status: 500 }
    );
  }
}

// PATCH: bulk update sort_order — body: [{ id, sort_order }]
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error("Failed to create Supabase client");

    const body: { id: string; sort_order: number }[] = await request.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Expected an array" }, { status: 400 });
    }

    const updates = await Promise.all(
      body.map(({ id, sort_order }) =>
        supabase
          .from("menu_items")
          .update({ sort_order, updated_at: new Date().toISOString() })
          .eq("id", id)
      )
    );

    const failed = updates.find((r) => r.error);
    if (failed?.error) throw failed.error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error reordering menu items:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reorder menu items" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error("Failed to create Supabase client");

    const body = await request.json();

    const { data, error } = await supabase
      .from("menu_items")
      .insert({
        categories: body.categories || [],
        name: body.name,
        description: body.description || null,
        dishes: body.dishes || [],
        price: body.price || 0,
        price_unit: body.price_unit || "per person",
        image_url: body.image_url || null,
        emoji: body.emoji || null,
        is_active: body.is_active !== false,
        is_popular: body.is_popular || false,
        sort_order: body.sort_order || 0,
        scheduled_date: body.scheduled_date || null,
        min_guests: body.min_guests || null,
        max_guests: body.max_guests || null,
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ item: data });
  } catch (error: any) {
    console.error("Error creating menu item:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create menu item" },
      { status: 500 }
    );
  }
}
