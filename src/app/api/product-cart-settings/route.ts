import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchProductCartSettings } from "@/lib/products/settings";

export async function GET() {
  try {
    const settings = await fetchProductCartSettings(createAdminClient());
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching product cart settings:", error);
    return NextResponse.json(await fetchProductCartSettings(null));
  }
}
