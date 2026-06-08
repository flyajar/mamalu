"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { BlogPost } from "@/types/blog";
import { slugifyBlogTitle } from "@/lib/blog-utils";

type BlogStatusFilter = "all" | "published" | "hidden";

const emptyBlog: BlogPost = {
  id: "",
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  imageUrl: null,
  imageAlt: null,
  authorName: "Lama",
  category: null,
  readTime: null,
  publishedAt: new Date().toISOString().slice(0, 10),
  featured: false,
  isActive: true,
};

function toDateInputValue(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function toApiPayload(blog: BlogPost) {
  return {
    title: blog.title,
    slug: blog.slug,
    excerpt: blog.excerpt,
    body: blog.body,
    imageUrl: blog.imageUrl,
    imageAlt: blog.imageAlt,
    authorName: blog.authorName,
    category: blog.category,
    readTime: blog.readTime,
    publishedAt: blog.publishedAt ? new Date(blog.publishedAt).toISOString() : null,
    featured: blog.featured,
    isActive: blog.isActive,
  };
}

export default function AdminBlogsPage() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<BlogStatusFilter>("all");
  const [search, setSearch] = useState("");

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blogs");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load blogs");
      setBlogs(data.blogs || []);
    } catch (error) {
      console.error("Error loading blogs:", error);
      alert(error instanceof Error ? error.message : "Failed to load blogs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const filteredBlogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return blogs.filter((blog) => {
      if (statusFilter === "published" && !blog.isActive) return false;
      if (statusFilter === "hidden" && blog.isActive) return false;
      if (!query) return true;
      return (
        blog.title.toLowerCase().includes(query) ||
        blog.excerpt.toLowerCase().includes(query) ||
        blog.slug.toLowerCase().includes(query)
      );
    });
  }, [blogs, search, statusFilter]);

  const startCreate = () => {
    setEditingBlog({ ...emptyBlog });
  };

  const saveEditingBlog = async () => {
    if (!editingBlog) return;
    if (!editingBlog.title.trim()) {
      alert("Title is required");
      return;
    }

    const blogToSave = {
      ...editingBlog,
      slug: slugifyBlogTitle(editingBlog.slug || editingBlog.title),
    };

    setSaving(true);
    try {
      const isExisting = Boolean(blogToSave.id);
      const res = await fetch(isExisting ? `/api/admin/blogs/${blogToSave.id}` : "/api/admin/blogs", {
        method: isExisting ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toApiPayload(blogToSave)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save blog");

      await fetchBlogs();
      setEditingBlog(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Error saving blog:", error);
      alert(error instanceof Error ? error.message : "Failed to save blog");
    } finally {
      setSaving(false);
    }
  };

  const deleteBlog = async (blog: BlogPost) => {
    if (!confirm(`Delete "${blog.title}"?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/blogs/${blog.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete blog");
      await fetchBlogs();
    } catch (error) {
      console.error("Error deleting blog:", error);
      alert(error instanceof Error ? error.message : "Failed to delete blog");
    } finally {
      setSaving(false);
    }
  };

  const quickUpdate = async (blog: BlogPost, updates: Partial<BlogPost>) => {
    const nextBlog = { ...blog, ...updates };
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/blogs/${blog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toApiPayload(nextBlog)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update blog");
      await fetchBlogs();
    } catch (error) {
      console.error("Error updating blog:", error);
      alert(error instanceof Error ? error.message : "Failed to update blog");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editingBlog) return;

    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "images");
      formData.append("userId", "blog");

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setEditingBlog({ ...editingBlog, imageUrl: data.url });
    } catch (error) {
      console.error("Error uploading blog image:", error);
      alert(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setImageUploading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Blogs</h1>
          <p className="text-sm text-stone-600">Manage articles shown on the public blog page.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {saved && (
            <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              <Check className="h-4 w-4" />
              Saved
            </span>
          )}
          <button
            onClick={startCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            <Plus className="h-4 w-4" />
            Add Blog
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search blogs..."
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 sm:max-w-sm"
        />
        <div className="inline-flex w-fit rounded-lg border border-stone-200 bg-white p-1">
          {[
            { id: "all", label: "All" },
            { id: "published", label: "Published" },
            { id: "hidden", label: "Hidden" },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id as BlogStatusFilter)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === filter.id
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {editingBlog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-5 py-4">
              <h2 className="text-lg font-semibold text-stone-900">{editingBlog.id ? "Edit Blog" : "New Blog"}</h2>
              <button
                onClick={() => setEditingBlog(null)}
                className="rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                aria-label="Close editor"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-stone-700">Title</span>
                <input
                  value={editingBlog.title}
                  onChange={(event) => {
                    const title = event.target.value;
                    setEditingBlog({
                      ...editingBlog,
                      title,
                      slug: editingBlog.slug ? editingBlog.slug : slugifyBlogTitle(title),
                    });
                  }}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-stone-700">Slug</span>
                <input
                  value={editingBlog.slug}
                  onChange={(event) => setEditingBlog({ ...editingBlog, slug: slugifyBlogTitle(event.target.value) })}
                  placeholder="article-url-slug"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-stone-700">Published Date</span>
                <input
                  type="date"
                  value={toDateInputValue(editingBlog.publishedAt)}
                  onChange={(event) => setEditingBlog({ ...editingBlog, publishedAt: event.target.value || null })}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-stone-700">Author</span>
                <input
                  value={editingBlog.authorName || ""}
                  onChange={(event) => setEditingBlog({ ...editingBlog, authorName: event.target.value || null })}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-stone-700">Read Time</span>
                <input
                  type="number"
                  min={1}
                  value={editingBlog.readTime || ""}
                  onChange={(event) => setEditingBlog({ ...editingBlog, readTime: event.target.value ? Number(event.target.value) : null })}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-stone-700">Excerpt</span>
                <textarea
                  value={editingBlog.excerpt}
                  onChange={(event) => setEditingBlog({ ...editingBlog, excerpt: event.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-stone-700">Body</span>
                <textarea
                  value={editingBlog.body}
                  onChange={(event) => setEditingBlog({ ...editingBlog, body: event.target.value })}
                  rows={12}
                  placeholder="Use blank lines between paragraphs."
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm leading-6 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-stone-700">Image URL</span>
                <input
                  value={editingBlog.imageUrl || ""}
                  onChange={(event) => setEditingBlog({ ...editingBlog, imageUrl: event.target.value || null })}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-stone-700">Image Alt Text</span>
                <input
                  value={editingBlog.imageAlt || ""}
                  onChange={(event) => setEditingBlog({ ...editingBlog, imageAlt: event.target.value || null })}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </label>
              <div className="md:col-span-2 flex items-center gap-4">
                <div className="relative h-24 w-32 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                  {editingBlog.imageUrl ? (
                    <Image src={editingBlog.imageUrl} alt="Blog image preview" fill className="object-cover" />
                  ) : null}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100">
                  {imageUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {imageUploading ? "Uploading..." : "Upload Image"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={imageUploading} />
                </label>
              </div>
              <div className="md:col-span-2 flex flex-wrap items-center gap-5">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-stone-700">
                  <input
                    type="checkbox"
                    checked={editingBlog.isActive}
                    onChange={(event) => setEditingBlog({ ...editingBlog, isActive: event.target.checked })}
                    className="h-4 w-4 rounded border-stone-300 text-amber-600"
                  />
                  Published
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-stone-700">
                  <input
                    type="checkbox"
                    checked={editingBlog.featured}
                    onChange={(event) => setEditingBlog({ ...editingBlog, featured: event.target.checked })}
                    className="h-4 w-4 rounded border-stone-300 text-amber-600"
                  />
                  Featured
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-stone-200 px-5 py-4">
              <button
                onClick={() => setEditingBlog(null)}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEditingBlog}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Blog
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-stone-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-stone-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading blogs...
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="p-12 text-center text-stone-600">No blogs match this view.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredBlogs.map((blog) => (
              <div key={blog.id} className="grid gap-4 p-4 md:grid-cols-[112px_1fr_auto] md:items-center">
                <div className="relative h-24 w-28 overflow-hidden rounded-lg bg-stone-100">
                  {blog.imageUrl ? <Image src={blog.imageUrl} alt={blog.imageAlt || blog.title} fill className="object-cover" /> : null}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-stone-900">{blog.title}</h3>
                    {blog.featured && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Featured</span>}
                    {!blog.isActive && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Hidden</span>}
                  </div>
                  <p className="mt-1 text-xs text-stone-400">/blogs/{blog.slug}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-stone-600">{blog.excerpt}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-stone-500">
                    {blog.publishedAt && <span>{toDateInputValue(blog.publishedAt)}</span>}
                    {blog.authorName && <span>{blog.authorName}</span>}
                    {blog.readTime && <span>{blog.readTime} min read</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {blog.isActive && (
                    <Link
                      href={`/blogs/${blog.slug}`}
                      target="_blank"
                      className="rounded-md px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
                    >
                      View
                    </Link>
                  )}
                  <button
                    onClick={() => quickUpdate(blog, { featured: !blog.featured })}
                    disabled={saving}
                    className="rounded-md p-2 text-stone-500 hover:bg-stone-100"
                    aria-label={blog.featured ? "Remove featured" : "Mark featured"}
                  >
                    <Star className={`h-4 w-4 ${blog.featured ? "fill-amber-500 text-amber-500" : ""}`} />
                  </button>
                  <button
                    onClick={() => quickUpdate(blog, { isActive: !blog.isActive })}
                    disabled={saving}
                    className="rounded-md p-2 text-stone-500 hover:bg-stone-100"
                    aria-label={blog.isActive ? "Hide blog" : "Publish blog"}
                  >
                    {blog.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setEditingBlog(blog)}
                    className="rounded-md px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteBlog(blog)}
                    disabled={saving}
                    className="rounded-md p-2 text-red-600 hover:bg-red-50"
                    aria-label="Delete blog"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
