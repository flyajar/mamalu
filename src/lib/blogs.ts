import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { BlogPost, BlogPostRow } from "@/types/blog";
export { slugifyBlogTitle } from "@/lib/blog-utils";

export function blogRowToPost(row: BlogPostRow): BlogPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    body: row.body,
    imageUrl: row.image_url,
    imageAlt: row.image_alt,
    authorName: row.author_name,
    category: row.category,
    readTime: row.read_time,
    publishedAt: row.published_at,
    featured: row.featured === true,
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPublishedBlogPosts(client?: SupabaseClient): Promise<BlogPost[]> {
  const supabase = client || await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("is_active", true)
    .order("featured", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Error fetching blog posts:", error);
    return [];
  }

  return (data as BlogPostRow[]).map(blogRowToPost);
}

export async function getPublishedBlogPostBySlug(slug: string, client?: SupabaseClient): Promise<BlogPost | null> {
  const supabase = client || await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Error fetching blog post:", error);
    return null;
  }

  return blogRowToPost(data as BlogPostRow);
}
