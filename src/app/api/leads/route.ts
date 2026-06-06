import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) throw new Error("Failed to create Supabase client");
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build main query with filters
    let query = supabase
      .from("leads")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }
    if (source && source !== "all") {
      query = query.eq("source", source);
    }
    if (type && type !== "all") {
      query = query.eq("lead_type", type);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,company.ilike.%${search}%,notes.ilike.%${search}%`);
    }
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", `${endDate}T23:59:59`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    // Build stats query with same date filter but no pagination/status/source filter
    // Paginate to handle >1000 leads (Supabase default row limit)
    let allLeadsForStats: { source: string; status: string; lead_type: string | null }[] = [];
    let statsOffset = 0;
    const statsPageSize = 1000;
    while (true) {
      let statsQuery = supabase.from("leads").select("source, status, lead_type")
        .range(statsOffset, statsOffset + statsPageSize - 1);
      if (startDate) {
        statsQuery = statsQuery.gte("created_at", startDate);
      }
      if (endDate) {
        statsQuery = statsQuery.lte("created_at", `${endDate}T23:59:59`);
      }
      const { data: statsPage } = await statsQuery;
      if (!statsPage || statsPage.length === 0) break;
      allLeadsForStats = allLeadsForStats.concat(statsPage);
      if (statsPage.length < statsPageSize) break;
      statsOffset += statsPageSize;
    }
    
    // Calculate stats from all leads (within date range)
    const stats = {
      total: allLeadsForStats.length,
      bySource: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
    };
    
    allLeadsForStats.forEach(lead => {
      stats.bySource[lead.source] = (stats.bySource[lead.source] || 0) + 1;
      stats.byStatus[lead.status] = (stats.byStatus[lead.status] || 0) + 1;
      if (lead.lead_type) {
        stats.byType[lead.lead_type] = (stats.byType[lead.lead_type] || 0) + 1;
      }
    });

    return NextResponse.json({ 
      leads: data,
      total: count || 0,
      stats,
      limit,
      offset 
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) throw new Error("Failed to create Supabase client");
    const body = await request.json();

    const { data, error } = await supabase
      .from("leads")
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ lead: data });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) throw new Error("Failed to create Supabase client");
    const body = await request.json();
    const { id, ...updateData } = body;

    const { data, error } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ lead: data });
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) throw new Error("Failed to create Supabase client");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Lead ID required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json(
      { error: "Failed to delete lead" },
      { status: 500 }
    );
  }
}
