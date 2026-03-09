// UTM Tracking utilities for campaign attribution

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  campaign_id?: string;
}

export interface CampaignTracking {
  campaign_id: string;
  session_id: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content?: string;
  clicked_at: string;
}

// Parse UTM params from URL
export function parseUTMParams(url: string | URL): UTMParams {
  const searchParams = typeof url === "string" ? new URL(url).searchParams : url.searchParams;
  
  return {
    utm_source: searchParams.get("utm_source") || undefined,
    utm_medium: searchParams.get("utm_medium") || undefined,
    utm_campaign: searchParams.get("utm_campaign") || undefined,
    utm_content: searchParams.get("utm_content") || undefined,
    utm_term: searchParams.get("utm_term") || undefined,
  };
}

// Store UTM params in localStorage (client-side)
export function storeUTMParams(params: UTMParams): void {
  if (typeof window === "undefined") return;
  
  const existing = getStoredUTMParams();
  const merged = { ...existing, ...params };
  
  // Only store if we have at least one UTM param
  if (Object.values(merged).some(v => v)) {
    localStorage.setItem("utm_tracking", JSON.stringify({
      ...merged,
      stored_at: new Date().toISOString(),
    }));
  }
}

// Get stored UTM params from localStorage
export function getStoredUTMParams(): UTMParams | null {
  if (typeof window === "undefined") return null;
  
  try {
    const stored = localStorage.getItem("utm_tracking");
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    
    // Check if data is older than 30 days
    if (data.stored_at) {
      const storedDate = new Date(data.stored_at);
      const now = new Date();
      const daysDiff = (now.getTime() - storedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 30) {
        localStorage.removeItem("utm_tracking");
        return null;
      }
    }
    
    return data;
  } catch {
    return null;
  }
}

// Clear stored UTM params (after successful conversion)
export function clearUTMParams(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("utm_tracking");
}

// Generate tracked URL for campaign
export function generateTrackedURL(
  baseUrl: string,
  campaignCode: string,
  options?: {
    utm_source?: string;
    utm_medium?: string;
    utm_content?: string;
  }
): string {
  const trackingUrl = new URL("/api/track/click", process.env.NEXT_PUBLIC_SITE_URL || "https://mamalu.vercel.app");
  trackingUrl.searchParams.set("c", campaignCode);
  trackingUrl.searchParams.set("url", baseUrl);
  if (options?.utm_source) trackingUrl.searchParams.set("utm_source", options.utm_source);
  if (options?.utm_medium) trackingUrl.searchParams.set("utm_medium", options.utm_medium);
  if (options?.utm_content) trackingUrl.searchParams.set("utm_content", options.utm_content);
  
  return trackingUrl.toString();
}

// Generate direct UTM URL (without tracking redirect)
export function generateUTMUrl(
  baseUrl: string,
  params: UTMParams
): string {
  const url = new URL(baseUrl);
  if (params.utm_source) url.searchParams.set("utm_source", params.utm_source);
  if (params.utm_medium) url.searchParams.set("utm_medium", params.utm_medium);
  if (params.utm_campaign) url.searchParams.set("utm_campaign", params.utm_campaign);
  if (params.utm_content) url.searchParams.set("utm_content", params.utm_content);
  if (params.utm_term) url.searchParams.set("utm_term", params.utm_term);
  
  return url.toString();
}
