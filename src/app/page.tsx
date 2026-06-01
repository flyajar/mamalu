"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Heart } from "lucide-react";
import HeroSlider from "@/components/ui/HeroSlider";
import NewsletterSection from "@/components/ui/NewsletterSection";
import { createClient } from "@/lib/supabase/client";
import { SiteContent, defaultSiteContent } from "@/types/site-content";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

function AutoplayVideo() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }
    supabase.storage
      .from("videos")
      .list("", { limit: 10, sortBy: { column: "name", order: "asc" } })
      .then(({ data }) => {
        const first = data?.find((f) => {
          const lower = f.name.toLowerCase();
          return (
            (lower.endsWith(".mp4") || lower.endsWith(".mov")) &&
            f.name !== ".emptyFolderPlaceholder"
          );
        });
        if (first) {
          const { data: urlData } = supabase.storage
            .from("videos")
            .getPublicUrl(first.name);
          setVideoUrl(urlData.publicUrl);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  if (loading)
    return <div className="w-full h-full bg-stone-100 animate-pulse" />;
  if (!videoUrl)
    return <div className="w-full h-full bg-stone-100" />;

  return (
    <div className="relative w-full h-full group cursor-pointer" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        onCanPlay={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {/* Play/Pause overlay — always visible when paused, fades in on hover when playing */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}>
        <div className="w-14 h-14 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-lg">
          {playing ? (
            <svg className="w-6 h-6 text-stone-800" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-stone-800 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </div>
      </div>
      {/* Mute toggle — bottom right */}
      <button
        onClick={toggleMute}
        className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0017.73 18L19 19.27 20.27 18 5.27 3 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        )}
      </button>
    </div>
  );
}

export default function HomePage() {
  const heroRef = useRef<HTMLElement>(null);
  const [siteContent, setSiteContent] = useState<SiteContent>(defaultSiteContent);
  const lifeAtMamaluTitle = siteContent.lifeAtMamaluTitle.trim();
  const shouldBreakLifeAtTitle = lifeAtMamaluTitle === "Life at Mamalu Kitchen";

  // Fetch site content
  useEffect(() => {
    fetch("/api/site-content")
      .then((res) => res.json())
      .then((data) => setSiteContent(data))
      .catch(() => setSiteContent(defaultSiteContent));
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Stats animation
      gsap.fromTo(
        ".hero-stats",
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.3 }
      );

      // Gallery parallax - disabled to maintain alignment
      // gsap.utils.toArray<HTMLElement>(".gallery-item").forEach((el, i) => {
      //   gsap.to(el, {
      //     y: i % 2 === 0 ? -15 : 15,
      //     ease: "none",
      //     scrollTrigger: {
      //       trigger: ".mamalu-life-section",
      //       start: "top bottom",
      //       end: "bottom top",
      //       scrub: 1,
      //     },
      //   });
      // });

      // Section titles animation
      gsap.utils.toArray<HTMLElement>(".section-title").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 80, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1.2,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
            },
          }
        );
      });

      // Founder section animation
      ScrollTrigger.create({
        trigger: ".founder-section",
        start: "top 70%",
        onEnter: () => {
          gsap.fromTo(
            ".founder-image",
            { x: -100, opacity: 0 },
            { x: 0, opacity: 1, duration: 1.2, ease: "power3.out" }
          );
          gsap.fromTo(
            ".founder-content",
            { x: 100, opacity: 0 },
            { x: 0, opacity: 1, duration: 1.2, ease: "power3.out", delay: 0.2 }
          );
        },
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <main className="overflow-hidden">
      {/* Hero Section - Modern Image Slider */}
      <section
        ref={heroRef}
        className="relative pt-0 pb-8 bg-white overflow-hidden"
      >
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <HeroSlider images={siteContent.heroImages} autoPlayInterval={5000} />
        </div>
      </section>

      {/* Services Section - 4 boxes with image backgrounds and circles */}
      <section className="py-5 md:py-12 bg-white">
        <div className="container mx-auto px-0">
          <div className="grid grid-cols-4">
            {siteContent.serviceButtons.map((button) => (
              <Link key={button.id} href={button.href} className="group relative aspect-[3/4] sm:aspect-square md:aspect-[3/2] block overflow-hidden">
                <Image
                  src={button.backgroundImage}
                  alt={button.title}
                  fill
                  quality={100}
                  priority
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-white/50" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-full bg-[#ffeee8] border-2 border-stone-800 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                    <span 
                      className="text-sm sm:text-base md:text-xl lg:text-2xl font-bold uppercase tracking-wider text-center leading-tight" 
                      style={{ fontFamily: 'var(--font-mossy), cursive', color: button.textColor || '#1c1917' }}
                    >
                      {button.title}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Combined Life at Mamalu + Video Section */}
      <section className="mamalu-life-section pt-3 pb-0 md:pt-6 md:pb-0 bg-white">
        <div className="container px-4 md:px-6">
          {/* Top row: video left, title right */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
            {/* Autoplay video */}
            <div className="relative rounded-2xl overflow-hidden" style={{ height: "420px" }}>
              <AutoplayVideo />
            </div>
            {/* Title block */}
            <div className="relative flex flex-col items-center justify-center bg-[#fef8f5] rounded-2xl p-8 md:p-10" style={{ height: "420px" }}>
              {/* Oven mitt — top left */}
              <Image
                src="/images/0312b1_84f73777db034245a9038f875cc1d290~mv2_d_2000_2000_s_2.png.avif"
                alt="Oven mitt"
                width={140}
                height={140}
                className="absolute top-4 left-4 object-contain"
                style={{ transform: "rotate(249.1356596547737deg)" }}
              />
              <h2
                className="section-title text-4xl md:text-5xl lg:text-6xl text-black text-center leading-tight"
                style={{ fontFamily: "var(--font-mossy), cursive", fontWeight: 900 }}
              >
                {shouldBreakLifeAtTitle ? (
                  <>
                    Life at
                    <br />
                    Mamalu Kitchen
                  </>
                ) : (
                  siteContent.lifeAtMamaluTitle
                )}
              </h2>
              {/* Kale leaf — bottom right */}
              <Image
                src="/images/0312b1_694f0a5c1c6645388b761ce78b34533b~mv2_d_1772_1772_s_2.png.avif"
                alt="Kale leaf"
                width={150}
                height={150}
                className="absolute bottom-4 right-4 object-contain"
                style={{ transform: "rotate(84.71971591842743deg)" }}
              />
            </div>
          </div>

          {/* Bottom row: 3 gallery images */}
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {siteContent.galleryImages.map((src, i) => (
              <div
                key={i}
                className="gallery-item aspect-4/3 rounded-2xl overflow-hidden bg-stone-50 flex items-center justify-center"
              >
                <Image
                  src={src}
                  alt={`Gallery image ${i + 1}`}
                  width={400}
                  height={500}
                  quality={100}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="founder-section pt-16 pb-6 md:pt-16 md:pb-12 lg:pt-20 lg:pb-16 bg-white">
        <div className="container px-4 md:px-6">
          {/* Section Title */}
          <div className="relative text-center mb-8 md:mb-16">
            <h2 style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 900 }}>
              <span className="text-3xl md:text-4xl lg:text-5xl tracking-wide text-black">{siteContent.ourStoryTitle}</span>
              <span className="inline-block ml-2 text-[#f5d5d0]">❤</span>
            </h2>
            <Image
              src="/images/0312b1_bc481cd0b42142b3afea8a2323da39a9~mv2.avif"
              alt="Arrow doodle"
              width={220}
              height={220}
              className="arrow-doodle absolute object-contain w-[100px] h-[100px] md:w-[150px] md:h-[150px] lg:w-[220px] lg:h-[220px]"
              style={{
                transform: "rotate(191.14492507569685deg)",
                left: "calc(50% + 60px)",
                top: "-40px"
              }}
            />
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-start">
            {/* Image */}
            <div className="founder-image relative">
              <div className="aspect-[3/4] max-w-[280px] sm:max-w-sm mx-auto overflow-hidden rounded-2xl">
                <Image
                  src={siteContent.founderImage}
                  alt={siteContent.founderName}
                  fill
                  quality={100}
                  className="object-cover object-top"
                />
              </div>
            </div>

            {/* Content */}
            <div className="founder-content flex flex-col justify-center text-center lg:text-left">
              <p className="text-base md:text-lg lg:text-xl text-black mb-4 md:mb-6 leading-relaxed" style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 700 }}>
                {siteContent.ourStoryParagraph1}
              </p>
              <p className="text-base md:text-lg lg:text-xl text-black mb-6 md:mb-8 leading-relaxed" style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 700 }}>
                {siteContent.ourStoryParagraph2}
              </p>
              <Link href="/about" className="inline-flex items-center gap-3 px-8 py-4 bg-[#f5e6dc] text-stone-800 border border-stone-300 rounded-full hover:bg-[#f0ddd0] transition-colors uppercase tracking-wider text-sm group w-fit mx-auto lg:mx-0" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
                <span>{siteContent.ourStoryButtonText}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <NewsletterSection />

    </main>
  );
}
