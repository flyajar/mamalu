import type { SupabaseClient } from "@supabase/supabase-js";

export interface ProductCartSettings {
  minimumOrderValue: number;
  deliveryFee: number;
}

export const defaultProductCartSettings: ProductCartSettings = {
  minimumOrderValue: 100,
  deliveryFee: 15,
};

function toMoneyValue(value: unknown, fallback: number) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) return fallback;
  return numericValue;
}

export function normalizeProductCartSettings(value: unknown): ProductCartSettings {
  const settings = value && typeof value === "object" ? value as Partial<ProductCartSettings> : {};

  return {
    minimumOrderValue: toMoneyValue(settings.minimumOrderValue, defaultProductCartSettings.minimumOrderValue),
    deliveryFee: toMoneyValue(settings.deliveryFee, defaultProductCartSettings.deliveryFee),
  };
}

export async function fetchProductCartSettings(
  supabase: SupabaseClient | null
): Promise<ProductCartSettings> {
  if (!supabase) return defaultProductCartSettings;

  const { data, error } = await supabase
    .from("site_content")
    .select("content")
    .eq("id", "product_cart_settings")
    .single();

  if (error || !data) return defaultProductCartSettings;

  return normalizeProductCartSettings(data.content);
}
