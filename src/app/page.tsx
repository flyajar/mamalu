"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Heart } from "lucide-react";
import HeroSlider from "@/components/ui/HeroSlider";
import WhatsHappeningSection from "@/components/ui/WhatsHappeningSection";
import NewsletterSection from "@/components/ui/NewsletterSection";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const heroImages = [
  "/images/1-2.jpg",
  "/images/File_010.jpeg",
  "/images/PHOTO-2025-12-02-18-26-42 (5).jpg",
  "/images/Mamalou Kitchen - 165.jpg",
  "/images/File_001.jpeg",
  "/images/Mamalou Kitchen - 67.jpg",
  "/images/Mamalou Kitchen - 78.jpg",
  "/images/Mamalou Kitchen - 103.jpg",
  "/images/Mamalou Kitchen - 193.jpg",
  "/images/Mamalou Kitchen - 220.jpg",
  "/shared-files/Kids high res pics/_C3A5778 (1).jpg",
  "/shared-files/Kids high res pics/_C3A5818.jpg",
  "/shared-files/Kids high res pics/_C3A5906 (1).jpg",
];

const stats = [
  { value: "2000+", label: "Happy Kids" },
  { value: "500+", label: "Classes Held" },
  { value: "4.9", label: "Star Rating" },
  { value: "5+", label: "Years Experience" },
];

const galleryImages = [
  "/images/image0.png",
  "/images/File_017.jpeg.jpg",
  "/images/deep dish pizza.jpg",
];

export default function HomePage() {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Stats animation
      gsap.fromTo(
        ".hero-stats",
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.3 }
      );

      // Gallery parallax
      gsap.utils.toArray<HTMLElement>(".gallery-item").forEach((el, i) => {
        gsap.to(el, {
          y: i % 2 === 0 ? -50 : 50,
          ease: "none",
          scrollTrigger: {
            trigger: ".gallery-section",
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        });
      });

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
          <HeroSlider images={heroImages} autoPlayInterval={5000} />
        </div>
      </section>

      {/* Services Section - 4 boxes with image backgrounds and circles */}
      <section className="py-5 md:py-12 bg-white">
        <div className="container mx-auto px-0">
          <div className="grid grid-cols-4">
            {/* Mini Chef */}
            <Link href="/minichef" className="group relative aspect-[3/4] sm:aspect-square md:aspect-[3/2] block overflow-hidden">
              <Image
                src="/images/taco tuesday.jpg"
                alt="Mini Chef"
                fill
                quality={100}
                priority
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-white/50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-full bg-[#ffeee8] border-2 border-stone-800 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                  <span className="text-sm sm:text-base md:text-xl lg:text-2xl font-bold text-stone-800 uppercase tracking-wider" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
                    Mini Chef
                  </span>
                </div>
              </div>
            </Link>

            {/* Big Chef */}
            <Link href="/bigchef" className="group relative aspect-[3/4] sm:aspect-square md:aspect-[3/2] block overflow-hidden">
              <Image
                src="/images/File_000-2_edited.jpg"
                alt="Big Chef"
                fill
                quality={100}
                priority
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-white/50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-full bg-[#ffeee8] border-2 border-stone-800 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                  <span className="text-sm sm:text-base md:text-xl lg:text-2xl font-bold text-stone-800 uppercase tracking-wider" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
                    Big Chef
                  </span>
                </div>
              </div>
            </Link>

            {/* Rentals */}
            <Link href="/book/rentals" className="group relative aspect-[3/4] sm:aspect-square md:aspect-[3/2] block overflow-hidden">
              <Image
                src="/images/_C3A0998.JPG"
                alt="Kitchen Rentals"
                fill
                quality={100}
                priority
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-white/50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-full bg-[#ffeee8] border-2 border-stone-800 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                  <span className="text-sm sm:text-base md:text-xl lg:text-2xl font-bold text-stone-800 uppercase tracking-wider" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
                    Rentals
                  </span>
                </div>
              </div>
            </Link>

            {/* Eazy Freezy Shop */}
            <Link href="/products" className="group relative aspect-[3/4] sm:aspect-square md:aspect-[3/2] block overflow-hidden">
              <Image
                src="/images/chicken-alfredo-lasagna-roll-ups-recipe-4.jpg"
                alt="Eazy Freezy Shop"
                fill
                quality={100}
                priority
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-white/50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-full bg-[#ffeee8] border-2 border-stone-800 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                  <span className="text-sm sm:text-base md:text-xl lg:text-2xl font-bold text-[#ff7f5c] uppercase tracking-wider text-center leading-tight" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
                    Eazy Freezy
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Gallery Section - Life at Mamalu - Hidden on mobile */}
      <section className="gallery-section section py-12 md:py-24 lg:py-32 bg-white hidden md:block">
        <div className="container px-4 md:px-6">
          <h2 className="section-title text-3xl md:text-4xl lg:text-6xl text-center mb-8 md:mb-16 text-black" style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 900 }}>
            Life at Mamalu
          </h2>
          
          {/* Mobile: 3 images in a row, smaller with equal gap */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 max-w-5xl mx-auto">
            {galleryImages.map((src, i) => (
              <div
                key={i}
                className="gallery-item aspect-square md:aspect-[4/5] rounded-lg md:rounded-2xl overflow-hidden"
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

      {/* What's Happening Section */}
      <WhatsHappeningSection />

      {/* Founder Section */}
      <section className="founder-section section py-12 md:py-24 lg:py-32 bg-white">
        <div className="container px-4 md:px-6">
          {/* Section Title */}
          <h2 className="text-center mb-8 md:mb-16" style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 900 }}>
            <span className="text-3xl md:text-4xl lg:text-5xl tracking-wide text-black">OUR STORY</span>
            <span className="inline-block ml-2 text-[#f5d5d0]">❤</span>
          </h2>
          
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-start">
            {/* Image */}
            <div className="founder-image relative">
              <div className="aspect-[3/4] max-w-[280px] sm:max-w-sm mx-auto overflow-hidden rounded-2xl">
                <Image
                  src="/images/IMG_4756_edited.jpg"
                  alt="Lama - Founder of Mamalu Kitchen"
                  fill
                  quality={100}
                  className="object-cover object-top"
                />
              </div>
            </div>

            {/* Content */}
            <div className="founder-content flex flex-col justify-center text-center lg:text-left">
              <p className="text-base md:text-lg lg:text-xl text-black mb-4 md:mb-6 leading-relaxed" style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 700 }}>
                Mamalu Kitchen was inspired by her 3 boys and the need to help fellow mums and families simplify their day-to-day lives without having to worry about feeding their family fuss-free healthy food.
              </p>
              <p className="text-base md:text-lg lg:text-xl text-black mb-6 md:mb-8 leading-relaxed" style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 700 }}>
                Mamalu Kitchen is creating a cooking movement under the slogan <span className="text-black" style={{ fontWeight: 900 }}>#feedingfamilies</span>.
              </p>
              <Link href="/about" className="inline-flex items-center gap-3 px-8 py-4 bg-[#f5e6dc] text-stone-800 border border-stone-300 rounded-full hover:bg-[#f0ddd0] transition-colors uppercase tracking-wider text-sm group w-fit mx-auto lg:mx-0" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
                <span>Our Story</span>
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
