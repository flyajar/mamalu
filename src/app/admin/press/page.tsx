"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PressArticle, PressContent, defaultPressContent } from "@/types/press";

const emptyArticle: PressArticle = {
  id: "",
  title: "",
  date: "",
  description: "",
  mediaType: "article",
  videoSource: "youtube",
  videoUrl: null,
  url: null,
  image: "",
  isActive: true,
  sortOrder: 0,
};

function createId() {
  return `press-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AdminPressPage() {
  const [articles, setArticles] = useState<PressArticle[]>([]);
  const [editingArticle, setEditingArticle] = useState<PressArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "shown" | "hidden">("all");

  const normalizeArticles = useCallback((items: PressArticle[]) =>
    items
      .map((item, index) => ({
        ...item,
        id: item.id || createId(),
        mediaType: item.mediaType || (item.isVideo ? "video" : "article"),
        videoSource: item.videoSource || (item.isVideo ? "youtube" : "youtube"),
        videoUrl: item.videoUrl || (item.isVideo ? item.url : null),
        url: item.url || null,
        isActive: item.isActive !== false,
        sortOrder: item.sortOrder ?? index,
      }))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)), []);

  const fetchPressContent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/site-content?page=press");
      const data: PressContent = res.ok ? await res.json() : defaultPressContent;
      setArticles(Array.isArray(data.articles) ? normalizeArticles(data.articles) : []);
    } catch (error) {
      console.error("Error fetching press content:", error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [normalizeArticles]);

  useEffect(() => {
    fetchPressContent();
  }, [fetchPressContent]);

  const savePressContent = async (nextArticles = articles) => {
    setSaving(true);
    try {
      const content: PressContent = {
        articles: normalizeArticles(nextArticles).map((article, index) => ({
          ...article,
          sortOrder: index,
          url: article.url?.trim() || null,
        })),
      };

      const res = await fetch("/api/site-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: "press", content }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Failed to save press data");
        return;
      }

      setArticles(content.articles);
      setEditingArticle(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Error saving press content:", error);
      alert("Failed to save press data");
    } finally {
      setSaving(false);
    }
  };

  const startCreate = () => {
    setEditingArticle({
      ...emptyArticle,
      id: createId(),
      sortOrder: articles.length,
    });
  };

  const saveEditingArticle = () => {
    if (!editingArticle?.title.trim()) {
      alert("Title is required");
      return;
    }
    if (editingArticle.mediaType !== "video" && !editingArticle.image.trim()) {
      alert("Image path or URL is required");
      return;
    }
    if (editingArticle.mediaType === "video" && !editingArticle.videoUrl?.trim()) {
      alert("Video URL is required");
      return;
    }

    const exists = articles.some((article) => article.id === editingArticle.id);
    const nextArticles = exists
      ? articles.map((article) => (article.id === editingArticle.id ? editingArticle : article))
      : [...articles, editingArticle];

    savePressContent(nextArticles);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editingArticle) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a JPG, PNG, WebP, or GIF image.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("Image must be less than 5MB.");
      return;
    }

    setImageUploading(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase not configured");

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `press/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error } = await supabase.storage
        .from("images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data } = supabase.storage.from("images").getPublicUrl(fileName);
      setEditingArticle({ ...editingArticle, image: data.publicUrl });
    } catch (error) {
      console.error("Error uploading press image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setImageUploading(false);
    }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editingArticle) return;

    const validTypes = ["video/mp4", "video/webm", "video/quicktime"];
    if (!validTypes.includes(file.type)) {
      alert("Please upload an MP4, WebM, or MOV video.");
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("Video must be less than 50MB.");
      return;
    }

    setVideoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "videos");
      formData.append("userId", "press");

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setEditingArticle({
        ...editingArticle,
        mediaType: "video",
        videoSource: "upload",
        videoUrl: data.url,
      });
    } catch (error) {
      console.error("Error uploading press video:", error);
      alert("Failed to upload video. Please try again.");
    } finally {
      setVideoUploading(false);
    }
  };

  const deleteArticle = (id: string) => {
    if (!confirm("Delete this press item?")) return;
    savePressContent(articles.filter((article) => article.id !== id));
  };

  const toggleArticle = (id: string) => {
    const nextArticles = articles.map((article) =>
      article.id === id ? { ...article, isActive: article.isActive === false } : article
    );
    savePressContent(nextArticles);
  };

  const filteredArticles = articles.filter((article) => {
    if (statusFilter === "shown") return article.isActive !== false;
    if (statusFilter === "hidden") return article.isActive === false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Press Data</h1>
          <p className="text-sm text-stone-600">Manage articles shown on the public press page.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-stone-200 bg-white p-1">
            {[
              { id: "all", label: "All" },
              { id: "shown", label: "Shown" },
              { id: "hidden", label: "Hidden" },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setStatusFilter(filter.id as "all" | "shown" | "hidden")}
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
            Add Press Item
          </button>
        </div>
      </div>

      {editingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="press-editor-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-5 py-4">
              <h2 id="press-editor-title" className="text-lg font-semibold text-stone-900">
                {articles.some((article) => article.id === editingArticle.id) ? "Edit Press Item" : "New Press Item"}
              </h2>
              <button
                onClick={() => setEditingArticle(null)}
                className="rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                aria-label="Close editor"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-stone-700">Type</span>
                  <select
                    value={editingArticle.mediaType || "article"}
                    onChange={(event) =>
                      setEditingArticle({
                        ...editingArticle,
                        mediaType: event.target.value as "article" | "video" | "photo",
                        videoSource: event.target.value === "video" ? editingArticle.videoSource || "youtube" : editingArticle.videoSource,
                        url: event.target.value === "photo" ? null : editingArticle.url,
                      })
                    }
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  >
                    <option value="article">Article</option>
                    <option value="video">Video</option>
                    <option value="photo">Photo only</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-stone-700">Title</span>
                  <input
                    value={editingArticle.title}
                    onChange={(event) => setEditingArticle({ ...editingArticle, title: event.target.value })}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-stone-700">Date</span>
                  <input
                    value={editingArticle.date}
                    onChange={(event) => setEditingArticle({ ...editingArticle, date: event.target.value })}
                    placeholder="December 2023"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-stone-700">Description</span>
                  <textarea
                    value={editingArticle.description}
                    onChange={(event) => setEditingArticle({ ...editingArticle, description: event.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  />
                </label>
                {editingArticle.mediaType === "article" ? (
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-stone-700">Article URL</span>
                    <input
                      value={editingArticle.url || ""}
                      onChange={(event) => setEditingArticle({ ...editingArticle, url: event.target.value || null })}
                      placeholder="https://..."
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                    />
                  </label>
                ) : editingArticle.mediaType === "video" ? (
                  <div className="space-y-2">
                    <label className="space-y-1">
                      <span className="text-sm font-medium text-stone-700">Video Source</span>
                      <select
                        value={editingArticle.videoSource || "youtube"}
                        onChange={(event) =>
                          setEditingArticle({
                            ...editingArticle,
                            videoSource: event.target.value as "youtube" | "upload",
                          })
                        }
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      >
                        <option value="youtube">YouTube</option>
                        <option value="upload">Uploaded Video</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm font-medium text-stone-700">
                        {editingArticle.videoSource === "upload" ? "Uploaded Video URL" : "YouTube URL"}
                      </span>
                      <input
                        value={editingArticle.videoUrl || ""}
                        onChange={(event) => setEditingArticle({ ...editingArticle, videoUrl: event.target.value || null })}
                        placeholder={editingArticle.videoSource === "upload" ? "https://..." : "https://www.youtube.com/watch?v=..."}
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      />
                    </label>
                    <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100">
                      {videoUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {videoUploading ? "Uploading..." : "Upload Video"}
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        className="hidden"
                        onChange={handleVideoUpload}
                        disabled={videoUploading}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
                    Photo-only items show the image with the title, date, and description. No article link is displayed.
                  </div>
                )}
                <div className="space-y-2">
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-stone-700">
                      {editingArticle.mediaType === "video" ? "Poster Image Path or URL" : "Image Path or URL"}
                    </span>
                    <input
                      value={editingArticle.image}
                      onChange={(event) => setEditingArticle({ ...editingArticle, image: event.target.value })}
                      placeholder="/images/press/press-01.png"
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                    />
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                      {editingArticle.image ? (
                        <Image src={editingArticle.image} alt="Press image preview" fill className="object-cover" />
                      ) : null}
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100">
                      {imageUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {imageUploading ? "Uploading..." : "Upload Image"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={imageUploading}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-stone-700">
                  <input
                    type="checkbox"
                    checked={editingArticle.isActive !== false}
                    onChange={(event) => setEditingArticle({ ...editingArticle, isActive: event.target.checked })}
                    className="h-4 w-4 rounded border-stone-300 text-amber-600"
                  />
                  Show on press page
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingArticle(null)}
                    className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEditingArticle}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Item
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-stone-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-stone-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading press data...
          </div>
        ) : articles.length === 0 ? (
          <div className="p-12 text-center text-stone-600">No press items have been added yet.</div>
        ) : filteredArticles.length === 0 ? (
          <div className="p-12 text-center text-stone-600">No press items match this filter.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredArticles.map((article) => (
              <div key={article.id} className="grid gap-4 p-4 md:grid-cols-[96px_1fr_auto] md:items-center">
                <div className="relative h-24 w-24 overflow-hidden rounded-lg bg-stone-100">
                  {article.image ? (
                    <Image src={article.image} alt={article.title} fill className="object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-stone-900">{article.title}</h3>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                      {article.date || "No date"}
                    </span>
                    {(article.mediaType === "video" || article.isVideo) && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Video</span>
                    )}
                    {article.mediaType === "photo" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Photo only</span>
                    )}
                    {article.isActive === false && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Hidden</span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-stone-600">{article.description}</p>
                  {(article.videoUrl || article.url) && (
                    <p className="mt-1 truncate text-xs text-stone-400">
                      {article.mediaType === "video" || article.isVideo ? article.videoUrl || article.url : article.url}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleArticle(article.id)}
                    disabled={saving}
                    className="rounded-md p-2 text-stone-500 hover:bg-stone-100"
                    aria-label={article.isActive === false ? "Show item" : "Hide item"}
                  >
                    {article.isActive === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setEditingArticle(article)}
                    className="rounded-md px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteArticle(article.id)}
                    disabled={saving}
                    className="rounded-md p-2 text-red-600 hover:bg-red-50"
                    aria-label="Delete item"
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
