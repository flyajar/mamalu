import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { blogRowToPost } from "@/lib/blogs";
import { slugifyBlogTitle } from "@/lib/blog-utils";
import type { BlogPostRow } from "@/types/blog";

interface BlogPostPayload {
  title?: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  authorName?: string | null;
  category?: string | null;
  readTime?: number | string | null;
  publishedAt?: string | null;
  featured?: boolean;
  isActive?: boolean;
}

function normalizePayload(body: BlogPostPayload) {
  const title = String(body.title || "").trim();
  if (!title) throw new Error("Title is required");

  const slug = slugifyBlogTitle(String(body.slug || title));
  if (!slug) throw new Error("Slug is required");

  const readTime =
    body.readTime === "" || body.readTime == null
      ? null
      : Math.max(1, Math.floor(Number(body.readTime)));

  return {
    title,
    slug,
    excerpt: String(body.excerpt || "").trim(),
    body: String(body.body || "").trim(),
    image_url: body.imageUrl?.trim() || null,
    image_alt: body.imageAlt?.trim() || null,
    author_name: body.authorName?.trim() || null,
    category: body.category?.trim() || null,
    read_time: Number.isFinite(readTime) ? readTime : null,
    published_at: body.publishedAt || null,
    featured: Boolean(body.featured),
    is_active: body.isActive !== false,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

    const { id } = await params;
    const payload = normalizePayload(await request.json());

    const { data: current } = await supabase
      .from("blog_posts")
      .select("slug")
      .eq("id", id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("blog_posts")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    revalidatePath("/blogs");
    if (current?.slug) revalidatePath(`/blogs/${current.slug}`);
    revalidatePath(`/blogs/${payload.slug}`);

    return NextResponse.json({ blog: blogRowToPost(data as BlogPostRow) });
  } catch (error) {
    console.error("Error updating blog post:", error);
    const message = error instanceof Error ? error.message : "Failed to update blog post";
    const status = message.endsWith("is required") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

    const { id } = await params;
    const { data: current } = await supabase
      .from("blog_posts")
      .select("slug")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) throw error;

    revalidatePath("/blogs");
    if (current?.slug) revalidatePath(`/blogs/${current.slug}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting blog post:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete blog post" },
      { status: 500 }
    );
  }
}
