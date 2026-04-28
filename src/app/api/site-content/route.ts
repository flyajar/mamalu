import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { 
  SiteContent, 
  defaultSiteContent,
  AboutPageContent,
  defaultAboutContent,
  MiniChefPageContent,
  defaultMiniChefContent,
  BigChefPageContent,
  defaultBigChefContent,
  RentalsPageContent,
  defaultRentalsContent,
} from "@/types/site-content";

const defaultContentMap: Record<string, any> = {
  homepage: defaultSiteContent,
  about: defaultAboutContent,
  minichef: defaultMiniChefContent,
  bigchef: defaultBigChefContent,
  rentals: defaultRentalsContent,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "homepage";
    const defaultContent = defaultContentMap[page] || defaultSiteContent;

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(defaultContent);
    }

    const { data, error } = await supabase
      .from("site_content")
      .select("content")
      .eq("id", page)
      .single();

    if (error || !data) {
      return NextResponse.json(defaultContent);
    }

    return NextResponse.json(data.content);
  } catch (error) {
    console.error("Error fetching site content:", error);
    return NextResponse.json(defaultSiteContent);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Check if user is authenticated and has admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const adminRoles = ["staff", "admin", "super_admin"];
    const isWilson = user.email === "wilson@mutant.ae";
    
    if (!isWilson && (!profile || !adminRoles.includes(profile.role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { page = "homepage", content } = body;

    const serviceClient = createServiceClient();
    if (!serviceClient) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { error } = await serviceClient
      .from("site_content")
      .upsert({
        id: page,
        content,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      });

    if (error) {
      console.error("Error saving site content:", error);
      return NextResponse.json(
        { error: "Failed to save content", detail: error.message, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving site content:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
