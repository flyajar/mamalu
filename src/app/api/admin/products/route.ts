import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  currentSlug,
  fetchProductCategories,
  fetchProducts,
  mapProduct,
  slugify,
} from "@/lib/products/catalog";
import { fetchProductCartSettings, normalizeProductCartSettings } from "@/lib/products/settings";

type ProductRequestBody = {
  title?: string;
  slug?: string | { current?: string };
  description?: string;
  price?: number | string;
  compareAtPrice?: number | string | null;
  imageUrl?: string;
  categoryIds?: string[];
  tags?: string[] | string;
  inStock?: boolean;
  isActive?: boolean;
  stockQuantity?: number | string | null;
  sku?: string;
  weight?: number | string | null;
  featured?: boolean;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function productPayload(body: ProductRequestBody) {
  const title = String(body.title || "").trim();

  if (!title) {
    throw new Error("Title is required");
  }

  return {
    title,
    slug: slugify(currentSlug(body.slug) || title),
    description: body.description || "",
    price: Number(body.price || 0),
    compare_at_price:
      body.compareAtPrice === "" || body.compareAtPrice == null
        ? null
        : Number(body.compareAtPrice),
    image_url: body.imageUrl || "",
    category_ids: Array.isArray(body.categoryIds) ? body.categoryIds : [],
    tags: Array.isArray(body.tags)
      ? body.tags
      : String(body.tags || "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
    in_stock: body.inStock !== false,
    is_active: body.isActive !== false,
    stock_quantity:
      body.stockQuantity === "" || body.stockQuantity == null
        ? null
        : Number(body.stockQuantity),
    sku: body.sku || "",
    weight: body.weight === "" || body.weight == null ? null : Number(body.weight),
    featured: Boolean(body.featured),
    updated_at: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error("Database not configured");

    const [productRows, categoryRows] = await Promise.all([
      fetchProducts(supabase),
      fetchProductCategories(supabase),
    ]);
    const settings = await fetchProductCartSettings(supabase);
    const categoryMap = new Map(categoryRows.map((category) => [category.id, category]));

    return NextResponse.json({
      products: productRows.map((product) => mapProduct(product, categoryMap)),
      categories: categoryRows.map((category) => ({
        _id: category.id,
        title: category.title,
        slug: { current: category.slug },
        description: category.description || "",
        order: category.display_order || 0,
        isActive: category.is_active !== false,
      })),
      settings,
    });
  } catch (error: unknown) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to fetch products") },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error("Database not configured");

    const body = await request.json();
    const settings = normalizeProductCartSettings(body);

    const { error } = await supabase
      .from("site_content")
      .upsert({
        id: "product_cart_settings",
        content: settings,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    revalidatePath("/cart");
    return NextResponse.json({ settings });
  } catch (error: unknown) {
    console.error("Error saving product settings:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to save product settings") },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error("Database not configured");

    const body = await request.json();
    const payload = productPayload(body);
    const { data: product, error } = await supabase
      .from("products")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;

    revalidatePath("/products");
    return NextResponse.json({ product });
  } catch (error: unknown) {
    console.error("Error creating product:", error);
    const message = getErrorMessage(error, "Failed to create product");
    return NextResponse.json({ error: message }, { status: message === "Title is required" ? 400 : 500 });
  }
}
