"use client";

import { useEffect, useState, useRef } from "react";
import { 
  SiteContent, 
  defaultSiteContent, 
  ServiceButton,
  AboutPageContent,
  defaultAboutContent,
  MiniChefPageContent,
  defaultMiniChefContent,
  BigChefPageContent,
  defaultBigChefContent,
  RentalsPageContent,
  defaultRentalsContent,
  FooterContent,
  defaultFooterContent,
} from "@/types/site-content";
import { createClient } from "@/lib/supabase/client";
import {
  Save,
  Plus,
  Trash2,
  Image as ImageIcon,
  GripVertical,
  RefreshCw,
  Check,
  X,
  Upload,
  Film,
  Type,
  LayoutGrid,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Home,
  Users,
  ChefHat,
  Info,
  Building2,
  Link as LinkIcon,
  Mail,
  Phone,
  MapPin,
  Share2,
} from "lucide-react";

type PageType = "homepage" | "about" | "minichef" | "bigchef" | "rentals" | "footer";

const pageConfig = {
  homepage: { label: "Homepage", icon: Home, default: defaultSiteContent },
  about: { label: "About Page", icon: Info, default: defaultAboutContent },
  minichef: { label: "Mini Chef", icon: Users, default: defaultMiniChefContent },
  bigchef: { label: "Big Chef", icon: ChefHat, default: defaultBigChefContent },
  rentals: { label: "Rentals", icon: Building2, default: defaultRentalsContent },
  footer: { label: "Footer", icon: LinkIcon, default: defaultFooterContent },
};

export default function SiteContentPage() {
  const [activePage, setActivePage] = useState<PageType>("homepage");
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [aboutContent, setAboutContent] = useState<AboutPageContent>(defaultAboutContent);
  const [miniChefContent, setMiniChefContent] = useState<MiniChefPageContent>(defaultMiniChefContent);
  const [bigChefContent, setBigChefContent] = useState<BigChefPageContent>(defaultBigChefContent);
  const [rentalsContent, setRentalsContent] = useState<RentalsPageContent>(defaultRentalsContent);
  const [footerContent, setFooterContent] = useState<FooterContent>(defaultFooterContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"slider" | "buttons" | "gallery" | "texts" | "video">("slider");
  
  // Video upload state
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAllContent();
    fetchCurrentVideo();
  }, []);

  const fetchAllContent = async () => {
    setLoading(true);
    try {
      const [homepageRes, aboutRes, minichefRes, bigchefRes, rentalsRes, footerRes] = await Promise.all([
        fetch("/api/site-content?page=homepage"),
        fetch("/api/site-content?page=about"),
        fetch("/api/site-content?page=minichef"),
        fetch("/api/site-content?page=bigchef"),
        fetch("/api/site-content?page=rentals"),
        fetch("/api/site-content?page=footer"),
      ]);
      
      const [homepageData, aboutData, minichefData, bigchefData, rentalsData, footerData] = await Promise.all([
        homepageRes.json(),
        aboutRes.json(),
        minichefRes.json(),
        bigchefRes.json(),
        rentalsRes.json(),
        footerRes.json(),
      ]);
      
      setContent(homepageData);
      setAboutContent(aboutData);
      setMiniChefContent(minichefData);
      setBigChefContent(bigchefData);
      setRentalsContent(rentalsData);
      setFooterContent(footerData);
    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveContent = async () => {
    setSaving(true);
    try {
      let pageContent;
      switch (activePage) {
        case "homepage":
          pageContent = content;
          break;
        case "about":
          pageContent = aboutContent;
          break;
        case "minichef":
          pageContent = miniChefContent;
          break;
        case "bigchef":
          pageContent = bigChefContent;
          break;
        case "rentals":
          pageContent = rentalsContent;
          break;
        case "footer":
          pageContent = footerContent;
          break;
      }

      const res = await fetch("/api/site-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: activePage, content: pageContent }),
      });
      
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving content:", error);
      alert("Failed to save content");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    if (confirm("Reset this page's content to defaults? This cannot be undone.")) {
      switch (activePage) {
        case "homepage":
          setContent(defaultSiteContent);
          break;
        case "about":
          setAboutContent(defaultAboutContent);
          break;
        case "minichef":
          setMiniChefContent(defaultMiniChefContent);
          break;
        case "bigchef":
          setBigChefContent(defaultBigChefContent);
          break;
        case "rentals":
          setRentalsContent(defaultRentalsContent);
          break;
        case "footer":
          setFooterContent(defaultFooterContent);
          break;
      }
    }
  };

  // Video functions
  const fetchCurrentVideo = async () => {
    setVideoLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;

      const { data } = await supabase.storage
        .from("videos")
        .list("", { limit: 10, sortBy: { column: "name", order: "asc" } });

      const videoFile = data?.find((f) => {
        const lower = f.name.toLowerCase();
        return (
          (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm")) &&
          f.name !== ".emptyFolderPlaceholder"
        );
      });

      if (videoFile) {
        const { data: urlData } = supabase.storage
          .from("videos")
          .getPublicUrl(videoFile.name);
        setVideoUrl(urlData.publicUrl);
        setContent((prev) => ({ ...prev, videoFileName: videoFile.name }));
      }
    } catch (error) {
      console.error("Error fetching video:", error);
    } finally {
      setVideoLoading(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["video/mp4", "video/quicktime", "video/webm"];
    if (!validTypes.includes(file.type)) {
      alert("Please upload an MP4, MOV, or WebM video file.");
      return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("Video file must be less than 100MB.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase not configured");

      // Delete existing videos first
      const { data: existingFiles } = await supabase.storage
        .from("videos")
        .list("");

      if (existingFiles) {
        const videosToDelete = existingFiles
          .filter((f) => {
            const lower = f.name.toLowerCase();
            return (
              (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm")) &&
              f.name !== ".emptyFolderPlaceholder"
            );
          })
          .map((f) => f.name);

        if (videosToDelete.length > 0) {
          await supabase.storage.from("videos").remove(videosToDelete);
        }
      }

      // Upload new video
      const fileName = `homepage-video-${Date.now()}.${file.name.split(".").pop()}`;
      
      const { error } = await supabase.storage
        .from("videos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("videos")
        .getPublicUrl(fileName);

      setVideoUrl(urlData.publicUrl);
      setContent((prev) => ({ ...prev, videoFileName: fileName }));
      setUploadProgress(100);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading video:", error);
      alert("Failed to upload video. Please try again.");
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleDeleteVideo = async () => {
    if (!confirm("Delete the current video? This cannot be undone.")) return;

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase not configured");

      const { data: existingFiles } = await supabase.storage
        .from("videos")
        .list("");

      if (existingFiles) {
        const videosToDelete = existingFiles
          .filter((f) => {
            const lower = f.name.toLowerCase();
            return (
              (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm")) &&
              f.name !== ".emptyFolderPlaceholder"
            );
          })
          .map((f) => f.name);

        if (videosToDelete.length > 0) {
          await supabase.storage.from("videos").remove(videosToDelete);
        }
      }

      setVideoUrl(null);
      setContent((prev) => ({ ...prev, videoFileName: "" }));
    } catch (error) {
      console.error("Error deleting video:", error);
      alert("Failed to delete video.");
    }
  };

  const toggleVideoPlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setVideoPlaying(true);
    } else {
      videoRef.current.pause();
      setVideoPlaying(false);
    }
  };

  const toggleVideoMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setVideoMuted(videoRef.current.muted);
  };

  // Hero Images handlers
  const addHeroImage = () => {
    setContent((prev) => ({
      ...prev,
      heroImages: [...prev.heroImages, ""],
    }));
  };

  const updateHeroImage = (index: number, value: string) => {
    setContent((prev) => ({
      ...prev,
      heroImages: prev.heroImages.map((img, i) => (i === index ? value : img)),
    }));
  };

  const removeHeroImage = (index: number) => {
    setContent((prev) => ({
      ...prev,
      heroImages: prev.heroImages.filter((_, i) => i !== index),
    }));
  };

  // Service Button handlers
  const updateServiceButton = (index: number, updates: Partial<ServiceButton>) => {
    setContent((prev) => ({
      ...prev,
      serviceButtons: prev.serviceButtons.map((btn, i) =>
        i === index ? { ...btn, ...updates } : btn
      ),
    }));
  };

  // Gallery Image handlers
  const addGalleryImage = () => {
    setContent((prev) => ({
      ...prev,
      galleryImages: [...prev.galleryImages, ""],
    }));
  };

  const updateGalleryImage = (index: number, value: string) => {
    setContent((prev) => ({
      ...prev,
      galleryImages: prev.galleryImages.map((img, i) => (i === index ? value : img)),
    }));
  };

  const removeGalleryImage = (index: number) => {
    setContent((prev) => ({
      ...prev,
      galleryImages: prev.galleryImages.filter((_, i) => i !== index),
    }));
  };

  // Image upload handler
  const [imageUploading, setImageUploading] = useState<string | null>(null);
  
  const handleImageUpload = async (
    file: File,
    onSuccess: (url: string) => void,
    uploadId: string
  ) => {
    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a JPG, PNG, WebP, or GIF image.");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("Image must be less than 5MB.");
      return;
    }

    setImageUploading(uploadId);

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase not configured");

      // Generate unique filename
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `site-content/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      const { error } = await supabase.storage
        .from("images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("images")
        .getPublicUrl(fileName);

      onSuccess(urlData.publicUrl);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setImageUploading(null);
    }
  };

  const handleHeroImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleImageUpload(file, (url) => updateHeroImage(index, url), `hero-${index}`);
    e.target.value = "";
  };

  const handleGalleryImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleImageUpload(file, (url) => updateGalleryImage(index, url), `gallery-${index}`);
    e.target.value = "";
  };

  const handleServiceButtonImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleImageUpload(
      file,
      (url) => updateServiceButton(index, { backgroundImage: url }),
      `service-${index}`
    );
    e.target.value = "";
  };

  const handleAddHeroImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleImageUpload(
      file,
      (url) => {
        setContent((prev) => ({
          ...prev,
          heroImages: [...prev.heroImages, url],
        }));
      },
      "hero-new"
    );
    e.target.value = "";
  };

  const handleAddGalleryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleImageUpload(
      file,
      (url) => {
        setContent((prev) => ({
          ...prev,
          galleryImages: [...prev.galleryImages, url],
        }));
      },
      "gallery-new"
    );
    e.target.value = "";
  };

  // Stat handlers
  const updateStat = (index: number, field: "value" | "label", value: string) => {
    setContent((prev) => ({
      ...prev,
      stats: prev.stats.map((stat, i) =>
        i === index ? { ...stat, [field]: value } : stat
      ),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  const tabs = [
    { id: "slider", label: "Hero Slider", icon: ImageIcon },
    { id: "buttons", label: "Service Buttons", icon: LayoutGrid },
    { id: "gallery", label: "Gallery", icon: ImageIcon },
    { id: "texts", label: "Texts & Stats", icon: Type },
    { id: "video", label: "Video", icon: Film },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Site Content</h1>
          <p className="text-stone-500 mt-1">Manage content for {pageConfig[activePage].label}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={resetToDefault}
            className="px-4 py-2 text-stone-600 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={saveContent}
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-[#FF8C6B] to-[#ff7a54] text-white rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Page Selector */}
      <div className="flex gap-2 p-1 bg-stone-100 rounded-xl w-fit">
        {(Object.keys(pageConfig) as PageType[]).map((page) => {
          const config = pageConfig[page];
          const Icon = config.icon;
          return (
            <button
              key={page}
              onClick={() => setActivePage(page)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
                activePage === page
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Homepage Content */}
      {activePage === "homepage" && (
        <>
          {/* Tabs */}
          <div className="flex gap-2 border-b border-stone-200 pb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-amber-100 text-amber-700"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        {/* Hero Slider Tab */}
        {activeTab === "slider" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-stone-900">Hero Slider Images</h2>
              <div className="flex items-center gap-2">
                <label className="px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors flex items-center gap-2 cursor-pointer">
                  {imageUploading === "hero-new" ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAddHeroImageUpload}
                    className="hidden"
                    disabled={imageUploading === "hero-new"}
                  />
                </label>
                <button
                  onClick={addHeroImage}
                  className="px-3 py-1.5 text-sm bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add URL
                </button>
              </div>
            </div>
            <p className="text-sm text-stone-500 mb-4">
              Images displayed in the hero slider. Upload images or enter URLs like <code className="bg-stone-100 px-1 rounded">/images/filename.jpg</code>
            </p>
            <div className="space-y-3">
              {content.heroImages.map((image, index) => (
                <div key={index} className="flex items-center gap-3 group">
                  <GripVertical className="w-4 h-4 text-stone-300" />
                  <span className="text-sm text-stone-400 w-6">{index + 1}</span>
                  <input
                    type="text"
                    value={image}
                    onChange={(e) => updateHeroImage(index, e.target.value)}
                    placeholder="/images/example.jpg or upload"
                    className="flex-1 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <label className="p-2 text-stone-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer">
                    {imageUploading === `hero-${index}` ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleHeroImageUpload(index, e)}
                      className="hidden"
                      disabled={imageUploading === `hero-${index}`}
                    />
                  </label>
                  {image && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                      <img
                        src={image}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.src = "/images/placeholder.jpg")}
                      />
                    </div>
                  )}
                  <button
                    onClick={() => removeHeroImage(index)}
                    className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Service Buttons Tab */}
        {activeTab === "buttons" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Service Buttons</h2>
            <p className="text-sm text-stone-500 mb-4">
              Configure the four service buttons (Mini Chef, Big Chef, Rentals, Eazy Freezy) displayed below the hero slider.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {content.serviceButtons.map((button, index) => (
                <div key={button.id} className="border border-stone-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    {button.backgroundImage && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                        <img
                          src={button.backgroundImage}
                          alt={button.title}
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.src = "/images/placeholder.jpg")}
                        />
                      </div>
                    )}
                    <h3 className="font-medium text-stone-900">{button.title}</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-stone-600 mb-1 block">Title</label>
                      <input
                        type="text"
                        value={button.title}
                        onChange={(e) => updateServiceButton(index, { title: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-stone-600 mb-1 block">Link URL</label>
                      <input
                        type="text"
                        value={button.href}
                        onChange={(e) => updateServiceButton(index, { href: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-stone-600 mb-1 block">Background Image</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={button.backgroundImage}
                          onChange={(e) => updateServiceButton(index, { backgroundImage: e.target.value })}
                          placeholder="/images/example.jpg"
                          className="flex-1 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                        <label className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors cursor-pointer flex items-center gap-2">
                          {imageUploading === `service-${index}` ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          <span className="text-sm">Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleServiceButtonImageUpload(index, e)}
                            className="hidden"
                            disabled={imageUploading === `service-${index}`}
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-stone-600 mb-1 block">Text Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={button.textColor || "#1c1917"}
                          onChange={(e) => updateServiceButton(index, { textColor: e.target.value })}
                          className="w-10 h-10 rounded border border-stone-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={button.textColor || "#1c1917"}
                          onChange={(e) => updateServiceButton(index, { textColor: e.target.value })}
                          className="flex-1 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gallery Tab */}
        {activeTab === "gallery" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-stone-900">Gallery Images</h2>
              <div className="flex items-center gap-2">
                <label className="px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors flex items-center gap-2 cursor-pointer">
                  {imageUploading === "gallery-new" ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAddGalleryImageUpload}
                    className="hidden"
                    disabled={imageUploading === "gallery-new"}
                  />
                </label>
                <button
                  onClick={addGalleryImage}
                  className="px-3 py-1.5 text-sm bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add URL
                </button>
              </div>
            </div>
            <p className="text-sm text-stone-500 mb-4">
              Images displayed in the &quot;Life at Mamalu&quot; gallery section. Upload or enter image URLs.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {content.galleryImages.map((image, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-4/3 rounded-xl overflow-hidden bg-stone-100 relative">
                    {image ? (
                      <img
                        src={image}
                        alt={`Gallery ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.src = "/images/placeholder.jpg")}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                    {/* Upload overlay for empty or replacing */}
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      {imageUploading === `gallery-${index}` ? (
                        <RefreshCw className="w-8 h-8 text-white animate-spin" />
                      ) : (
                        <div className="text-center text-white">
                          <Upload className="w-8 h-8 mx-auto mb-1" />
                          <span className="text-xs">Click to upload</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleGalleryImageUpload(index, e)}
                        className="hidden"
                        disabled={imageUploading === `gallery-${index}`}
                      />
                    </label>
                  </div>
                  <button
                    onClick={() => removeGalleryImage(index)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={image}
                    onChange={(e) => updateGalleryImage(index, e.target.value)}
                    placeholder="/images/example.jpg or upload above"
                    className="mt-2 w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Texts & Stats Tab */}
        {activeTab === "texts" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 mb-4">Section Titles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-stone-600 mb-1 block">Life at Mamalu Title</label>
                  <input
                    type="text"
                    value={content.lifeAtMamaluTitle}
                    onChange={(e) => setContent((prev) => ({ ...prev, lifeAtMamaluTitle: e.target.value }))}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-stone-600 mb-1 block">Our Story Title</label>
                  <input
                    type="text"
                    value={content.ourStoryTitle}
                    onChange={(e) => setContent((prev) => ({ ...prev, ourStoryTitle: e.target.value }))}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-stone-900 mb-4">Our Story Content</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-stone-600 mb-1 block">Paragraph 1</label>
                  <textarea
                    value={content.ourStoryParagraph1}
                    onChange={(e) => setContent((prev) => ({ ...prev, ourStoryParagraph1: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-stone-600 mb-1 block">Paragraph 2</label>
                  <textarea
                    value={content.ourStoryParagraph2}
                    onChange={(e) => setContent((prev) => ({ ...prev, ourStoryParagraph2: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-stone-600 mb-1 block">Button Text</label>
                  <input
                    type="text"
                    value={content.ourStoryButtonText}
                    onChange={(e) => setContent((prev) => ({ ...prev, ourStoryButtonText: e.target.value }))}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-stone-900 mb-4">Founder Section</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-stone-600 mb-1 block">Founder Image</label>
                  <input
                    type="text"
                    value={content.founderImage}
                    onChange={(e) => setContent((prev) => ({ ...prev, founderImage: e.target.value }))}
                    placeholder="/images/founder.jpg"
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-stone-600 mb-1 block">Founder Name / Alt Text</label>
                  <input
                    type="text"
                    value={content.founderName}
                    onChange={(e) => setContent((prev) => ({ ...prev, founderName: e.target.value }))}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-stone-900 mb-4">Stats</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {content.stats.map((stat, index) => (
                  <div key={index} className="border border-stone-200 rounded-xl p-4 space-y-2">
                    <div>
                      <label className="text-xs text-stone-500 mb-1 block">Value</label>
                      <input
                        type="text"
                        value={stat.value}
                        onChange={(e) => updateStat(index, "value", e.target.value)}
                        className="w-full px-2 py-1.5 text-lg font-bold border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-center"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 mb-1 block">Label</label>
                      <input
                        type="text"
                        value={stat.label}
                        onChange={(e) => updateStat(index, "label", e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-center"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Video Tab */}
        {activeTab === "video" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-stone-900">Homepage Video</h2>
            <p className="text-sm text-stone-500">
              Upload a video to display in the &quot;Life at Mamalu&quot; section on the homepage. 
              Supported formats: MP4, MOV, WebM. Maximum file size: 100MB.
            </p>

            {/* Current Video Preview */}
            {videoLoading ? (
              <div className="aspect-video bg-stone-100 rounded-xl flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-stone-400" />
              </div>
            ) : videoUrl ? (
              <div className="space-y-4">
                <div className="relative aspect-video bg-black rounded-xl overflow-hidden group">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-full object-contain"
                    muted={videoMuted}
                    loop
                    playsInline
                    onPlay={() => setVideoPlaying(true)}
                    onPause={() => setVideoPlaying(false)}
                  />
                  {/* Video Controls Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                    <button
                      onClick={toggleVideoPlay}
                      className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                    >
                      {videoPlaying ? (
                        <Pause className="w-8 h-8 text-stone-800" />
                      ) : (
                        <Play className="w-8 h-8 text-stone-800 ml-1" />
                      )}
                    </button>
                  </div>
                  {/* Mute Button */}
                  <button
                    onClick={toggleVideoMute}
                    className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    {videoMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-700">Current Video</p>
                    <p className="text-xs text-stone-500">{content.videoFileName || "Unknown"}</p>
                  </div>
                  <button
                    onClick={handleDeleteVideo}
                    className="px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Video
                  </button>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-stone-50 border-2 border-dashed border-stone-200 rounded-xl flex flex-col items-center justify-center text-stone-400">
                <Film className="w-12 h-12 mb-3" />
                <p className="text-sm">No video uploaded</p>
              </div>
            )}

            {/* Upload Section */}
            <div className="border border-stone-200 rounded-xl p-6">
              <h3 className="font-medium text-stone-900 mb-4">Upload New Video</h3>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={handleVideoUpload}
                className="hidden"
                id="video-upload"
              />
              
              <label
                htmlFor="video-upload"
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  uploading
                    ? "border-amber-300 bg-amber-50"
                    : "border-stone-200 hover:border-amber-400 hover:bg-amber-50/50"
                }`}
              >
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mb-2" />
                    <p className="text-sm text-amber-600 font-medium">Uploading...</p>
                    {uploadProgress > 0 && (
                      <div className="w-48 h-2 bg-amber-100 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-8 h-8 text-stone-400 mb-2" />
                    <p className="text-sm text-stone-600 font-medium">Click to upload video</p>
                    <p className="text-xs text-stone-400 mt-1">MP4, MOV, or WebM (max 100MB)</p>
                  </div>
                )}
              </label>

              {videoUrl && (
                <p className="text-xs text-stone-500 mt-3 text-center">
                  Uploading a new video will replace the current one.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
        </>
      )}

      {/* About Page Content */}
      {activePage === "about" && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-stone-900">About Page Content</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-stone-600 mb-1 block">Page Title</label>
              <input
                type="text"
                value={aboutContent.pageTitle}
                onChange={(e) => setAboutContent((prev) => ({ ...prev, pageTitle: e.target.value }))}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-sm text-stone-600 mb-1 block">Feeding Families Title</label>
              <input
                type="text"
                value={aboutContent.feedingFamiliesTitle}
                onChange={(e) => setAboutContent((prev) => ({ ...prev, feedingFamiliesTitle: e.target.value }))}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-stone-600 mb-1 block">Feeding Families Subtitle</label>
            <input
              type="text"
              value={aboutContent.feedingFamiliesSubtitle}
              onChange={(e) => setAboutContent((prev) => ({ ...prev, feedingFamiliesSubtitle: e.target.value }))}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Images */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm text-stone-600 block">Founder Image 1</label>
              <div className="flex items-center gap-3">
                {aboutContent.founderImage1 && (
                  <div className="w-20 h-24 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                    <img src={aboutContent.founderImage1} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={aboutContent.founderImage1}
                      onChange={(e) => setAboutContent((prev) => ({ ...prev, founderImage1: e.target.value }))}
                      placeholder="/images/founder.jpg"
                      className="flex-1 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file, (url) => setAboutContent((prev) => ({ ...prev, founderImage1: url })), "about-founder1");
                          }
                          e.target.value = "";
                        }}
                      />
                      <div className="p-2 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors">
                        <Upload className="w-4 h-4 text-amber-700" />
                      </div>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={aboutContent.founderImage1Alt}
                    onChange={(e) => setAboutContent((prev) => ({ ...prev, founderImage1Alt: e.target.value }))}
                    placeholder="Image alt text"
                    className="w-full mt-2 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm text-stone-600 block">Founder Image 2</label>
              <div className="flex items-center gap-3">
                {aboutContent.founderImage2 && (
                  <div className="w-20 h-24 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                    <img src={aboutContent.founderImage2} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={aboutContent.founderImage2}
                      onChange={(e) => setAboutContent((prev) => ({ ...prev, founderImage2: e.target.value }))}
                      placeholder="/images/founder2.jpg"
                      className="flex-1 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file, (url) => setAboutContent((prev) => ({ ...prev, founderImage2: url })), "about-founder2");
                          }
                          e.target.value = "";
                        }}
                      />
                      <div className="p-2 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors">
                        <Upload className="w-4 h-4 text-amber-700" />
                      </div>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={aboutContent.founderImage2Alt}
                    onChange={(e) => setAboutContent((prev) => ({ ...prev, founderImage2Alt: e.target.value }))}
                    placeholder="Image alt text"
                    className="w-full mt-2 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 1 Paragraphs */}
          <div>
            <label className="text-sm text-stone-600 mb-2 block">Section 1 Paragraphs</label>
            <div className="space-y-3">
              {aboutContent.section1Paragraphs.map((para, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-xs text-stone-400 mt-2 w-4">{index + 1}</span>
                  <textarea
                    value={para}
                    onChange={(e) => {
                      const newParas = [...aboutContent.section1Paragraphs];
                      newParas[index] = e.target.value;
                      setAboutContent((prev) => ({ ...prev, section1Paragraphs: newParas }));
                    }}
                    rows={3}
                    className="flex-1 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section 2 Paragraphs */}
          <div>
            <label className="text-sm text-stone-600 mb-2 block">Section 2 Paragraphs</label>
            <div className="space-y-3">
              {aboutContent.section2Paragraphs.map((para, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-xs text-stone-400 mt-2 w-4">{index + 1}</span>
                  <textarea
                    value={para}
                    onChange={(e) => {
                      const newParas = [...aboutContent.section2Paragraphs];
                      newParas[index] = e.target.value;
                      setAboutContent((prev) => ({ ...prev, section2Paragraphs: newParas }));
                    }}
                    rows={3}
                    className="flex-1 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mini Chef Page Content */}
      {activePage === "minichef" && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-stone-900">Mini Chef Page Content</h2>
          <p className="text-sm text-stone-500">Configure the header section of the Mini Chef booking page.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-stone-600 mb-1 block">Page Title</label>
              <input
                type="text"
                value={miniChefContent.pageTitle}
                onChange={(e) => setMiniChefContent((prev) => ({ ...prev, pageTitle: e.target.value }))}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-sm text-stone-600 mb-1 block">Page Subtitle</label>
              <input
                type="text"
                value={miniChefContent.pageSubtitle}
                onChange={(e) => setMiniChefContent((prev) => ({ ...prev, pageSubtitle: e.target.value }))}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm text-stone-600 block">Header Image (Right side)</label>
              <div className="flex items-center gap-3">
                {miniChefContent.headerImage && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                    <img src={miniChefContent.headerImage} alt="" className="w-full h-full object-contain" />
                  </div>
                )}
                <input
                  type="text"
                  value={miniChefContent.headerImage}
                  onChange={(e) => setMiniChefContent((prev) => ({ ...prev, headerImage: e.target.value }))}
                  placeholder="/images/apron.png"
                  className="flex-1 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload(file, (url) => setMiniChefContent((prev) => ({ ...prev, headerImage: url })), "minichef-header");
                      }
                      e.target.value = "";
                    }}
                  />
                  <div className="p-2 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors">
                    <Upload className="w-4 h-4 text-amber-700" />
                  </div>
                </label>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm text-stone-600 block">Header Icon (Left of title)</label>
              <div className="flex items-center gap-3">
                {miniChefContent.headerIcon && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                    <img src={miniChefContent.headerIcon} alt="" className="w-full h-full object-contain" />
                  </div>
                )}
                <input
                  type="text"
                  value={miniChefContent.headerIcon}
                  onChange={(e) => setMiniChefContent((prev) => ({ ...prev, headerIcon: e.target.value }))}
                  placeholder="/images/girl-01.png"
                  className="flex-1 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload(file, (url) => setMiniChefContent((prev) => ({ ...prev, headerIcon: url })), "minichef-icon");
                      }
                      e.target.value = "";
                    }}
                  />
                  <div className="p-2 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors">
                    <Upload className="w-4 h-4 text-amber-700" />
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-stone-900 mb-4">Category Icons</h3>
            <p className="text-sm text-stone-500 mb-4">Configure the icons displayed on category tabs in the Mini Chef booking page.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries({
                classics: "Our Classics",
                monthly: "Monthly Specials",
                mommy_me: "Mommy & Me",
                birthdays: "Birthdays",
                packages: "Packages"
              }).map(([key, label]) => (
                <div key={key} className="border border-stone-200 rounded-lg p-3 space-y-2">
                  <label className="text-sm font-medium text-stone-700 block">{label}</label>
                  <div className="flex items-center gap-2">
                    {miniChefContent.categoryIcons[key as keyof typeof miniChefContent.categoryIcons] && (
                      <div className="w-10 h-10 rounded overflow-hidden bg-stone-100 flex-shrink-0">
                        <img 
                          src={miniChefContent.categoryIcons[key as keyof typeof miniChefContent.categoryIcons]} 
                          alt={label} 
                          className="w-full h-full object-contain" 
                        />
                      </div>
                    )}
                    <input
                      type="text"
                      value={miniChefContent.categoryIcons[key as keyof typeof miniChefContent.categoryIcons]}
                      onChange={(e) => setMiniChefContent((prev) => ({
                        ...prev,
                        categoryIcons: { ...prev.categoryIcons, [key]: e.target.value }
                      }))}
                      placeholder="/icons/icon.png"
                      className="flex-1 px-2 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <label className="cursor-pointer flex-shrink-0">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file, (url) => setMiniChefContent((prev) => ({
                              ...prev,
                              categoryIcons: { ...prev.categoryIcons, [key]: url }
                            })), `minichef-cat-${key}`);
                          }
                          e.target.value = "";
                        }}
                      />
                      <div className="p-1.5 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors">
                        {imageUploading === `minichef-cat-${key}` ? (
                          <RefreshCw className="w-3 h-3 text-amber-700 animate-spin" />
                        ) : (
                          <Upload className="w-3 h-3 text-amber-700" />
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Big Chef Page Content */}
      {activePage === "bigchef" && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-stone-900">Big Chef Page Content</h2>
          <p className="text-sm text-stone-500">Configure the header section of the Big Chef booking page.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-stone-600 mb-1 block">Page Title</label>
              <input
                type="text"
                value={bigChefContent.pageTitle}
                onChange={(e) => setBigChefContent((prev) => ({ ...prev, pageTitle: e.target.value }))}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-sm text-stone-600 mb-1 block">Page Subtitle</label>
              <input
                type="text"
                value={bigChefContent.pageSubtitle}
                onChange={(e) => setBigChefContent((prev) => ({ ...prev, pageSubtitle: e.target.value }))}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm text-stone-600 block">Header Image (Right side)</label>
              <div className="flex items-center gap-3">
                {bigChefContent.headerImage && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                    <img src={bigChefContent.headerImage} alt="" className="w-full h-full object-contain" />
                  </div>
                )}
                <input
                  type="text"
                  value={bigChefContent.headerImage}
                  onChange={(e) => setBigChefContent((prev) => ({ ...prev, headerImage: e.target.value }))}
                  placeholder="/images/whisk-01.png"
                  className="flex-1 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload(file, (url) => setBigChefContent((prev) => ({ ...prev, headerImage: url })), "bigchef-header");
                      }
                      e.target.value = "";
                    }}
                  />
                  <div className="p-2 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors">
                    <Upload className="w-4 h-4 text-amber-700" />
                  </div>
                </label>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm text-stone-600 block">Header Icon (Left of title)</label>
              <div className="flex items-center gap-3">
                {bigChefContent.headerIcon && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                    <img src={bigChefContent.headerIcon} alt="" className="w-full h-full object-contain" />
                  </div>
                )}
                <input
                  type="text"
                  value={bigChefContent.headerIcon}
                  onChange={(e) => setBigChefContent((prev) => ({ ...prev, headerIcon: e.target.value }))}
                  placeholder="/images/knives-01.png"
                  className="flex-1 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload(file, (url) => setBigChefContent((prev) => ({ ...prev, headerIcon: url })), "bigchef-icon");
                      }
                      e.target.value = "";
                    }}
                  />
                  <div className="p-2 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors">
                    <Upload className="w-4 h-4 text-amber-700" />
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-stone-900 mb-4">Category Icons</h3>
            <p className="text-sm text-stone-500 mb-4">Configure the icons displayed on category tabs in the Big Chef booking page.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries({
                corporate: "Corporate / Private",
                classics: "Our Classics",
                monthly: "Monthly Specials",
                teenagers: "Teenager Course",
                nanny: "Nanny Class"
              }).map(([key, label]) => (
                <div key={key} className="border border-stone-200 rounded-lg p-3 space-y-2">
                  <label className="text-sm font-medium text-stone-700 block">{label}</label>
                  <div className="flex items-center gap-2">
                    {bigChefContent.categoryIcons[key as keyof typeof bigChefContent.categoryIcons] && (
                      <div className="w-10 h-10 rounded overflow-hidden bg-stone-100 flex-shrink-0">
                        <img 
                          src={bigChefContent.categoryIcons[key as keyof typeof bigChefContent.categoryIcons]} 
                          alt={label} 
                          className="w-full h-full object-contain" 
                        />
                      </div>
                    )}
                    <input
                      type="text"
                      value={bigChefContent.categoryIcons[key as keyof typeof bigChefContent.categoryIcons]}
                      onChange={(e) => setBigChefContent((prev) => ({
                        ...prev,
                        categoryIcons: { ...prev.categoryIcons, [key]: e.target.value }
                      }))}
                      placeholder="/icons/icon.png"
                      className="flex-1 px-2 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <label className="cursor-pointer flex-shrink-0">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file, (url) => setBigChefContent((prev) => ({
                              ...prev,
                              categoryIcons: { ...prev.categoryIcons, [key]: url }
                            })), `bigchef-cat-${key}`);
                          }
                          e.target.value = "";
                        }}
                      />
                      <div className="p-1.5 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors">
                        {imageUploading === `bigchef-cat-${key}` ? (
                          <RefreshCw className="w-3 h-3 text-amber-700 animate-spin" />
                        ) : (
                          <Upload className="w-3 h-3 text-amber-700" />
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rentals Page Content */}
      {activePage === "rentals" && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-stone-900">Rentals Page Content</h2>
          <p className="text-sm text-stone-500">Configure the Kitchen Studio Rental page content.</p>
          
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-stone-600 mb-1 block">Page Title</label>
              <input
                type="text"
                value={rentalsContent.pageTitle}
                onChange={(e) => setRentalsContent((prev) => ({ ...prev, pageTitle: e.target.value }))}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-sm text-stone-600 mb-1 block">Header Icon</label>
              <div className="flex items-center gap-3">
                {rentalsContent.headerIcon && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                    <img src={rentalsContent.headerIcon} alt="" className="w-full h-full object-contain" />
                  </div>
                )}
                <input
                  type="text"
                  value={rentalsContent.headerIcon}
                  onChange={(e) => setRentalsContent((prev) => ({ ...prev, headerIcon: e.target.value }))}
                  placeholder="/image-updates/kitchen-03.png"
                  className="flex-1 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm text-stone-600 mb-1 block">Page Subtitle</label>
            <textarea
              value={rentalsContent.pageSubtitle}
              onChange={(e) => setRentalsContent((prev) => ({ ...prev, pageSubtitle: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-sm text-stone-600 mb-1 block">Hero Image</label>
            <div className="flex items-center gap-3">
              {rentalsContent.heroImage && (
                <div className="w-24 h-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                  <img src={rentalsContent.heroImage} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <input
                type="text"
                value={rentalsContent.heroImage}
                onChange={(e) => setRentalsContent((prev) => ({ ...prev, heroImage: e.target.value }))}
                placeholder="/images/_C3A0998.JPG"
                className="flex-1 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImageUpload(file, (url) => setRentalsContent((prev) => ({ ...prev, heroImage: url })), "rentals-hero");
                    }
                    e.target.value = "";
                  }}
                />
                <div className="p-2 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors">
                  <Upload className="w-4 h-4 text-amber-700" />
                </div>
              </label>
            </div>
          </div>

          {/* Rental Options */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-stone-900 mb-4">Rental Options</h3>
            <div className="space-y-4">
              {rentalsContent.rentalOptions.map((option, index) => (
                <div key={option.id} className="border border-stone-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-stone-800">{option.name}</h4>
                    <button
                      onClick={() => {
                        const newOptions = rentalsContent.rentalOptions.filter((_, i) => i !== index);
                        setRentalsContent((prev) => ({ ...prev, rentalOptions: newOptions }));
                      }}
                      className="p-1 text-stone-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-stone-500 block mb-1">Name</label>
                      <input
                        type="text"
                        value={option.name}
                        onChange={(e) => {
                          const newOptions = [...rentalsContent.rentalOptions];
                          newOptions[index] = { ...option, name: e.target.value };
                          setRentalsContent((prev) => ({ ...prev, rentalOptions: newOptions }));
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 block mb-1">Duration</label>
                      <input
                        type="text"
                        value={option.duration}
                        onChange={(e) => {
                          const newOptions = [...rentalsContent.rentalOptions];
                          newOptions[index] = { ...option, duration: e.target.value };
                          setRentalsContent((prev) => ({ ...prev, rentalOptions: newOptions }));
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 block mb-1">Price (AED)</label>
                      <input
                        type="number"
                        value={option.price}
                        onChange={(e) => {
                          const newOptions = [...rentalsContent.rentalOptions];
                          newOptions[index] = { ...option, price: Number(e.target.value) };
                          setRentalsContent((prev) => ({ ...prev, rentalOptions: newOptions }));
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 block mb-1">Icon Image</label>
                      <div className="flex items-center gap-2">
                        {option.icon && (
                          <div className="w-8 h-8 rounded overflow-hidden bg-stone-100 flex-shrink-0">
                            <img src={option.icon} alt="" className="w-full h-full object-contain" onError={(e) => (e.currentTarget.src = "/images/placeholder.jpg")} />
                          </div>
                        )}
                        <input
                          type="text"
                          value={option.icon}
                          onChange={(e) => {
                            const newOptions = [...rentalsContent.rentalOptions];
                            newOptions[index] = { ...option, icon: e.target.value };
                            setRentalsContent((prev) => ({ ...prev, rentalOptions: newOptions }));
                          }}
                          placeholder="/images/icon.png"
                          className="flex-1 px-2 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                        <label className="cursor-pointer flex-shrink-0">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(file, (url) => {
                                  const newOptions = [...rentalsContent.rentalOptions];
                                  newOptions[index] = { ...option, icon: url };
                                  setRentalsContent((prev) => ({ ...prev, rentalOptions: newOptions }));
                                }, `rentals-option-icon-${index}`);
                              }
                              e.target.value = "";
                            }}
                          />
                          <div className="p-1.5 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors">
                            {imageUploading === `rentals-option-icon-${index}` ? (
                              <RefreshCw className="w-3 h-3 text-amber-700 animate-spin" />
                            ) : (
                              <Upload className="w-3 h-3 text-amber-700" />
                            )}
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">Description</label>
                    <input
                      type="text"
                      value={option.description}
                      onChange={(e) => {
                        const newOptions = [...rentalsContent.rentalOptions];
                        newOptions[index] = { ...option, description: e.target.value };
                        setRentalsContent((prev) => ({ ...prev, rentalOptions: newOptions }));
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  const newOption = {
                    id: `option-${Date.now()}`,
                    name: "New Option",
                    duration: "4 hours",
                    price: 0,
                    description: "",
                    icon: "",
                  };
                  setRentalsContent((prev) => ({
                    ...prev,
                    rentalOptions: [...prev.rentalOptions, newOption],
                  }));
                }}
                className="w-full py-2 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:border-amber-400 hover:text-amber-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Rental Option
              </button>
            </div>
          </div>

          {/* Add-ons */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-stone-900 mb-4">Add-ons</h3>
            <div className="space-y-3">
              {rentalsContent.addOns.map((addOn, index) => (
                <div key={addOn.id} className="border border-stone-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-stone-800">{addOn.name}</h4>
                    <button
                      onClick={() => {
                        const newAddOns = rentalsContent.addOns.filter((_, i) => i !== index);
                        setRentalsContent((prev) => ({ ...prev, addOns: newAddOns }));
                      }}
                      className="p-1 text-stone-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-stone-500 block mb-1">Name</label>
                      <input
                        type="text"
                        value={addOn.name}
                        onChange={(e) => {
                          const newAddOns = [...rentalsContent.addOns];
                          newAddOns[index] = { ...addOn, name: e.target.value };
                          setRentalsContent((prev) => ({ ...prev, addOns: newAddOns }));
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 block mb-1">Price (AED)</label>
                      <input
                        type="number"
                        value={addOn.price}
                        onChange={(e) => {
                          const newAddOns = [...rentalsContent.addOns];
                          newAddOns[index] = { ...addOn, price: Number(e.target.value) };
                          setRentalsContent((prev) => ({ ...prev, addOns: newAddOns }));
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 block mb-1">Icon Image</label>
                      <div className="flex items-center gap-2">
                        {addOn.icon && (
                          <div className="w-8 h-8 rounded overflow-hidden bg-stone-100 flex-shrink-0">
                            <img src={addOn.icon} alt="" className="w-full h-full object-contain" onError={(e) => (e.currentTarget.src = "/images/placeholder.jpg")} />
                          </div>
                        )}
                        <input
                          type="text"
                          value={addOn.icon}
                          onChange={(e) => {
                            const newAddOns = [...rentalsContent.addOns];
                            newAddOns[index] = { ...addOn, icon: e.target.value };
                            setRentalsContent((prev) => ({ ...prev, addOns: newAddOns }));
                          }}
                          placeholder="/images/icon.png"
                          className="flex-1 px-2 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                        <label className="cursor-pointer flex-shrink-0">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(file, (url) => {
                                  const newAddOns = [...rentalsContent.addOns];
                                  newAddOns[index] = { ...addOn, icon: url };
                                  setRentalsContent((prev) => ({ ...prev, addOns: newAddOns }));
                                }, `rentals-addon-icon-${index}`);
                              }
                              e.target.value = "";
                            }}
                          />
                          <div className="p-1.5 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors">
                            {imageUploading === `rentals-addon-icon-${index}` ? (
                              <RefreshCw className="w-3 h-3 text-amber-700 animate-spin" />
                            ) : (
                              <Upload className="w-3 h-3 text-amber-700" />
                            )}
                          </div>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 block mb-1">Description</label>
                      <input
                        type="text"
                        value={addOn.description}
                        onChange={(e) => {
                          const newAddOns = [...rentalsContent.addOns];
                          newAddOns[index] = { ...addOn, description: e.target.value };
                          setRentalsContent((prev) => ({ ...prev, addOns: newAddOns }));
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  const newAddOn = {
                    id: `addon-${Date.now()}`,
                    name: "New Add-on",
                    price: 0,
                    description: "",
                    icon: "",
                  };
                  setRentalsContent((prev) => ({
                    ...prev,
                    addOns: [...prev.addOns, newAddOn],
                  }));
                }}
                className="w-full py-2 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:border-amber-400 hover:text-amber-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Add-on
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-stone-900 mb-4">What&apos;s Included (Features)</h3>
            <div className="space-y-2">
              {rentalsContent.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => {
                      const newFeatures = [...rentalsContent.features];
                      newFeatures[index] = e.target.value;
                      setRentalsContent((prev) => ({ ...prev, features: newFeatures }));
                    }}
                    className="flex-1 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <button
                    onClick={() => {
                      const newFeatures = rentalsContent.features.filter((_, i) => i !== index);
                      setRentalsContent((prev) => ({ ...prev, features: newFeatures }));
                    }}
                    className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  setRentalsContent((prev) => ({
                    ...prev,
                    features: [...prev.features, ""],
                  }));
                }}
                className="w-full py-2 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:border-amber-400 hover:text-amber-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Feature
              </button>
            </div>
          </div>

          {/* Gallery Images */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-900">Photo Gallery</h3>
              <label className="px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImageUpload(
                        file,
                        (url) => {
                          setRentalsContent((prev) => ({
                            ...prev,
                            galleryImages: [...prev.galleryImages, url],
                          }));
                        },
                        "rentals-gallery-new"
                      );
                    }
                    e.target.value = "";
                  }}
                  className="hidden"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {rentalsContent.galleryImages.map((image, index) => (
                <div key={index} className="relative group aspect-video">
                  <img
                    src={image}
                    alt={`Gallery ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => (e.currentTarget.src = "/images/placeholder.jpg")}
                  />
                  <button
                    onClick={() => {
                      const newImages = rentalsContent.galleryImages.filter((_, i) => i !== index);
                      setRentalsContent((prev) => ({ ...prev, galleryImages: newImages }));
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer Content */}
      {activePage === "footer" && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-stone-900">Footer Configuration</h2>
          <p className="text-sm text-stone-500">Configure the footer content displayed across all pages.</p>

          {/* Basic Info */}
          <div className="border-b pb-6">
            <h3 className="font-semibold text-stone-900 mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-stone-600 mb-1 block">Logo URL</label>
                <div className="flex items-center gap-3">
                  {footerContent.logo && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0 p-2">
                      <img src={footerContent.logo} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <input
                    type="text"
                    value={footerContent.logo}
                    onChange={(e) => setFooterContent((prev) => ({ ...prev, logo: e.target.value }))}
                    placeholder="/images/mamalu-logo.png"
                    className="flex-1 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(file, (url) => setFooterContent((prev) => ({ ...prev, logo: url })), "footer-logo");
                        }
                        e.target.value = "";
                      }}
                    />
                    <div className="p-2 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors">
                      {imageUploading === "footer-logo" ? (
                        <RefreshCw className="w-4 h-4 text-amber-700 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 text-amber-700" />
                      )}
                    </div>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-stone-600 mb-1 block">Tagline</label>
                  <input
                    type="text"
                    value={footerContent.tagline}
                    onChange={(e) => setFooterContent((prev) => ({ ...prev, tagline: e.target.value }))}
                    placeholder="Feeding Families"
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-stone-600 mb-1 block">Copyright Text</label>
                  <input
                    type="text"
                    value={footerContent.copyrightText}
                    onChange={(e) => setFooterContent((prev) => ({ ...prev, copyrightText: e.target.value }))}
                    placeholder="© 2026 Mamalu Kitchen. All rights reserved."
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-stone-600 mb-1 block">Description</label>
                <textarea
                  value={footerContent.description}
                  onChange={(e) => setFooterContent((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  placeholder="Brief description about your business..."
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-b pb-6">
            <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-stone-600 mb-1 block flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  Email
                </label>
                <input
                  type="email"
                  value={footerContent.contactEmail}
                  onChange={(e) => setFooterContent((prev) => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="info@mamalukitchen.com"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-sm text-stone-600 mb-1 block flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Phone
                </label>
                <input
                  type="tel"
                  value={footerContent.contactPhone}
                  onChange={(e) => setFooterContent((prev) => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="+971 50 123 4567"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-sm text-stone-600 mb-1 block flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Address
                </label>
                <input
                  type="text"
                  value={footerContent.address}
                  onChange={(e) => setFooterContent((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Dubai, United Arab Emirates"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="border-b pb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Navigation Links
              </h3>
              <button
                onClick={() => {
                  const newLink = {
                    id: `link-${Date.now()}`,
                    label: "New Link",
                    href: "/",
                  };
                  setFooterContent((prev) => ({
                    ...prev,
                    navigationLinks: [...prev.navigationLinks, newLink],
                  }));
                }}
                className="px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Link
              </button>
            </div>
            <div className="space-y-3">
              {footerContent.navigationLinks.map((link, index) => (
                <div key={link.id} className="flex items-center gap-3 group">
                  <GripVertical className="w-4 h-4 text-stone-300" />
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => {
                      const newLinks = [...footerContent.navigationLinks];
                      newLinks[index] = { ...link, label: e.target.value };
                      setFooterContent((prev) => ({ ...prev, navigationLinks: newLinks }));
                    }}
                    placeholder="Link Label"
                    className="w-40 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <input
                    type="text"
                    value={link.href}
                    onChange={(e) => {
                      const newLinks = [...footerContent.navigationLinks];
                      newLinks[index] = { ...link, href: e.target.value };
                      setFooterContent((prev) => ({ ...prev, navigationLinks: newLinks }));
                    }}
                    placeholder="/path"
                    className="flex-1 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <button
                    onClick={() => {
                      const newLinks = footerContent.navigationLinks.filter((_, i) => i !== index);
                      setFooterContent((prev) => ({ ...prev, navigationLinks: newLinks }));
                    }}
                    className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Social Links */}
          <div className="border-b pb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Social Media Links
              </h3>
              <button
                onClick={() => {
                  const newLink = {
                    id: `social-${Date.now()}`,
                    platform: "New Platform",
                    url: "https://",
                    icon: "link",
                  };
                  setFooterContent((prev) => ({
                    ...prev,
                    socialLinks: [...prev.socialLinks, newLink],
                  }));
                }}
                className="px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Social
              </button>
            </div>
            <div className="space-y-3">
              {footerContent.socialLinks.map((social, index) => (
                <div key={social.id} className="flex items-center gap-3 group border border-stone-200 rounded-lg p-3">
                  <GripVertical className="w-4 h-4 text-stone-300" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
                    <input
                      type="text"
                      value={social.platform}
                      onChange={(e) => {
                        const newLinks = [...footerContent.socialLinks];
                        newLinks[index] = { ...social, platform: e.target.value };
                        setFooterContent((prev) => ({ ...prev, socialLinks: newLinks }));
                      }}
                      placeholder="Platform (e.g., Instagram)"
                      className="px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <input
                      type="text"
                      value={social.url}
                      onChange={(e) => {
                        const newLinks = [...footerContent.socialLinks];
                        newLinks[index] = { ...social, url: e.target.value };
                        setFooterContent((prev) => ({ ...prev, socialLinks: newLinks }));
                      }}
                      placeholder="https://..."
                      className="px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <input
                      type="text"
                      value={social.icon}
                      onChange={(e) => {
                        const newLinks = [...footerContent.socialLinks];
                        newLinks[index] = { ...social, icon: e.target.value };
                        setFooterContent((prev) => ({ ...prev, socialLinks: newLinks }));
                      }}
                      placeholder="Icon name (lucide)"
                      className="px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const newLinks = footerContent.socialLinks.filter((_, i) => i !== index);
                      setFooterContent((prev) => ({ ...prev, socialLinks: newLinks }));
                    }}
                    className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Newsletter Settings */}
          <div>
            <h3 className="font-semibold text-stone-900 mb-4">Newsletter Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg">
                <input
                  type="checkbox"
                  id="newsletter-enabled"
                  checked={footerContent.newsletterEnabled}
                  onChange={(e) => setFooterContent((prev) => ({ ...prev, newsletterEnabled: e.target.checked }))}
                  className="w-4 h-4 text-amber-500 border-stone-300 rounded focus:ring-2 focus:ring-amber-500/20"
                />
                <label htmlFor="newsletter-enabled" className="text-sm text-stone-700 font-medium cursor-pointer">
                  Enable newsletter signup in footer
                </label>
              </div>
              {footerContent.newsletterEnabled && (
                <div className="space-y-3 pl-7">
                  <div>
                    <label className="text-sm text-stone-600 mb-1 block">Newsletter Title</label>
                    <input
                      type="text"
                      value={footerContent.newsletterTitle}
                      onChange={(e) => setFooterContent((prev) => ({ ...prev, newsletterTitle: e.target.value }))}
                      placeholder="Join Our Community"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-stone-600 mb-1 block">Newsletter Description</label>
                    <textarea
                      value={footerContent.newsletterDescription}
                      onChange={(e) => setFooterContent((prev) => ({ ...prev, newsletterDescription: e.target.value }))}
                      rows={2}
                      placeholder="Subscribe to get updates..."
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
