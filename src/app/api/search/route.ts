import { NextRequest, NextResponse } from "next/server";
import { getClasses, getProducts, getRecipes } from "@/lib/sanity/queries";
import { urlFor } from "@/lib/sanity/client";
import { getPublishedBlogPosts } from "@/lib/blogs";

interface SanityImage {
  asset?: unknown;
}

interface SearchableClass {
  _id: string;
  title?: string;
  description?: string;
  slug?: { current?: string };
  mainImage?: SanityImage;
  fullPrice?: number;
  startDate?: string;
}

interface SearchableProduct {
  _id: string;
  title?: string;
  description?: string;
  slug?: { current?: string };
  images?: SanityImage[];
  price?: number;
}

interface SearchableRecipe {
  _id: string;
  title?: string;
  description?: string;
  slug?: { current?: string };
  mainImage?: SanityImage;
}

interface SearchResult {
  id: string;
  title?: string;
  description?: string;
  type: "class" | "product" | "recipe" | "blog";
  href: string;
  image: string | null;
  price?: number;
  date?: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const type = searchParams.get("type") || "all";

  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }

  const searchQuery = query.toLowerCase();

  try {
    const results: SearchResult[] = [];

    // Search classes
    if (type === "all" || type === "class") {
      const classes = await getClasses() as SearchableClass[];
      const matchingClasses = (classes || [])
        .filter((cls) =>
          cls.title?.toLowerCase().includes(searchQuery) ||
          cls.description?.toLowerCase().includes(searchQuery)
        )
        .slice(0, 5)
        .map((cls) => ({
          id: cls._id,
          title: cls.title,
          description: cls.description,
          type: "class" as const,
          href: `/classes/${cls.slug?.current}`,
          image: cls.mainImage ? urlFor(cls.mainImage).width(100).height(100).url() : null,
          price: cls.fullPrice,
          date: cls.startDate,
        }));
      results.push(...matchingClasses);
    }

    // Search products
    if (type === "all" || type === "product") {
      const products = await getProducts() as SearchableProduct[];
      const matchingProducts = (products || [])
        .filter((product) =>
          product.title?.toLowerCase().includes(searchQuery) ||
          product.description?.toLowerCase().includes(searchQuery)
        )
        .slice(0, 5)
        .map((product) => ({
          id: product._id,
          title: product.title,
          description: product.description,
          type: "product" as const,
          href: `/products/${product.slug?.current}`,
          image: product.images?.[0] ? urlFor(product.images[0]).width(100).height(100).url() : null,
          price: product.price,
        }));
      results.push(...matchingProducts);
    }

    // Search recipes
    if (type === "all" || type === "recipe") {
      const recipes = await getRecipes() as SearchableRecipe[];
      const matchingRecipes = (recipes || [])
        .filter((recipe) =>
          recipe.title?.toLowerCase().includes(searchQuery) ||
          recipe.description?.toLowerCase().includes(searchQuery)
        )
        .slice(0, 5)
        .map((recipe) => ({
          id: recipe._id,
          title: recipe.title,
          description: recipe.description,
          type: "recipe" as const,
          href: `/recipes/${recipe.slug?.current}`,
          image: recipe.mainImage ? urlFor(recipe.mainImage).width(100).height(100).url() : null,
        }));
      results.push(...matchingRecipes);
    }

    // Search blogs
    if (type === "all" || type === "blog") {
      const blogs = await getPublishedBlogPosts();
      const matchingBlogs = blogs
        .filter((blog) =>
          blog.title?.toLowerCase().includes(searchQuery) ||
          blog.excerpt?.toLowerCase().includes(searchQuery)
        )
        .slice(0, 5)
        .map((blog) => ({
          id: blog.id,
          title: blog.title,
          description: blog.excerpt,
          type: "blog" as const,
          href: `/blogs/${blog.slug}`,
          image: blog.imageUrl,
        }));
      results.push(...matchingBlogs);
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ results: [], error: "Search failed" }, { status: 500 });
  }
}
