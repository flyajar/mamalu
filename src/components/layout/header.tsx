"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { X, Instagram } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { name: "Mini Chef", href: "/minichef" },
  { name: "Big Chef", href: "/bigchef" },
  { name: "Rentals", href: "/book/rentals" },
];

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const socialLinks = [
  { name: "Instagram", href: "https://www.instagram.com/mamalukitchen/", icon: Instagram },
  { name: "TikTok", href: "https://www.tiktok.com/@mamalukitchen?_r=1&_t=ZS-94Lv8kCwZqz", icon: TikTokIcon },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const updateCartCount = () => {
      try {
        const cart = JSON.parse(localStorage.getItem("mamalu_cart") || "[]");
        const count = cart.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);
        setCartCount(count);
      } catch {
        setCartCount(0);
      }
    };

    updateCartCount();
    window.addEventListener("storage", updateCartCount);
    window.addEventListener("cartUpdated", updateCartCount);

    return () => {
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("cartUpdated", updateCartCount);
    };
  }, []);

  // Listen for custom event to open menu from other components
  useEffect(() => {
    const handleOpenMenu = () => setMenuOpen(true);
    window.addEventListener("openMamaluMenu", handleOpenMenu);
    return () => window.removeEventListener("openMamaluMenu", handleOpenMenu);
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <>
      {/* Header - Static at top */}
      <header className="relative z-50 bg-white">
        <nav className="container mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between relative py-4 min-h-[140px] lg:min-h-[160px]">
            
            {/* Left: Nav Links - Horizontal layout, 2x bigger text, line separators */}
            <div className="hidden lg:flex flex-row items-center gap-6 z-10">
              {navLinks.map((link, index) => (
                <div key={link.name} className="flex items-center gap-6">
                  <Link
                    href={link.href}
                    className="text-xl font-bold text-[var(--c-black)] hover:opacity-60 transition-opacity uppercase whitespace-nowrap"
                    style={{ fontFamily: 'var(--font-mossy), cursive' }}
                  >
                    {link.name}
                  </Link>
                  {index < navLinks.length - 1 && (
                    <div className="w-px h-5 bg-[var(--c-black)]/20" />
                  )}
                </div>
              ))}
              {/* Social Links */}
              <div className="w-px h-5 bg-[var(--c-black)]/20" />
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-[#ff7f5c] hover:text-white transition-all"
                  >
                    <social.icon className="h-4 w-4" />
                    <span className="sr-only">{social.name}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Mobile: Menu button on left */}
            <button
              type="button"
              className="lg:hidden p-2"
              onClick={() => setMenuOpen(true)}
            >
              <svg className="h-6 w-6 text-[var(--c-black)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Center: Logo */}
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex flex-col items-center z-0">
              <Link href="/">
                <Image 
                  src="/graphics/mamalu-logo-transparent.png" 
                  alt="Mamalu Kitchen" 
                  width={200} 
                  height={200}
                  className="w-28 h-28 lg:w-32 lg:h-32"
                  priority
                />
              </Link>
            </div>

            {/* Right: Eazy Freezy + Cart */}
            <div className="flex items-center gap-4">
              <Link
                href="/products"
                className="text-xl font-bold text-[#ff7f5c] hover:opacity-70 transition-opacity uppercase whitespace-nowrap hidden sm:block"
                style={{ fontFamily: 'var(--font-mossy), cursive' }}
              >
                Eazy Freezy
              </Link>
              <Link
                href="/cart"
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--c-black)]/20 bg-white text-xs font-bold uppercase tracking-wide transition-all duration-300 hover:border-[var(--c-black)]"
              >
                <span className="text-[var(--c-black)] hidden sm:inline">Cart ({cartCount})</span>
                <span className="text-[var(--c-black)] sm:hidden">{cartCount}</span>
                <div className="w-5 h-5 sm:w-6 sm:h-6 relative">
                  <Image 
                    src="/recent/cart-icon.png" 
                    alt="Cart" 
                    fill 
                    className="object-contain"
                  />
                </div>
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Fullscreen Menu Overlay - white bg, centered logo, peach highlights */}
      <div
        className={cn(
          "fixed inset-0 z-[100] transition-all duration-700",
          menuOpen ? "visible" : "invisible pointer-events-none"
        )}
      >
        {/* White Background */}
        <div 
          className={cn(
            "absolute inset-0 bg-[#fff5eb] transition-transform duration-700 ease-out",
            menuOpen ? "translate-y-0" : "-translate-y-full"
          )}
        />
        
        {/* Menu Content */}
        <div className={cn(
          "relative h-full flex flex-col transition-opacity duration-500 delay-300",
          menuOpen ? "opacity-100" : "opacity-0"
        )}>
          {/* Top Bar - Centered Logo (2x bigger) and Close */}
          <div className="flex items-center justify-center px-6 lg:px-12 py-8 relative">
            <Link href="/" onClick={() => setMenuOpen(false)} className="mx-auto">
              <Image 
                src="/graphics/mamalu-logo-transparent.png" 
                alt="Mamalu Kitchen" 
                width={160} 
                height={160}
                className="w-28 h-28 md:w-32 md:h-32"
              />
            </Link>
            
            {/* Close Button - positioned absolute right */}
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute right-6 lg:right-12 flex flex-col items-center gap-1 group"
            >
              <X className="w-8 h-8 text-[var(--c-black)] group-hover:rotate-90 transition-transform duration-300" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--c-black)]">Close</span>
            </button>
          </div>

          {/* Menu Links - Large centered text with peach underline highlight on hover */}
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 relative z-10">
            {[{ name: "Home", href: "/" }, ...navLinks].map((link, i) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "relative text-4xl md:text-6xl lg:text-7xl font-bold text-[var(--c-black)] transition-all duration-500 uppercase tracking-tight group",
                  menuOpen ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                )}
                style={{ 
                  transitionDelay: menuOpen ? `${300 + i * 100}ms` : '0ms',
                  fontFamily: 'var(--font-mossy), cursive'
                }}
              >
                <span className="relative z-10">{link.name}</span>
                {/* Peach highlight underline on hover */}
                <span className="absolute bottom-0 left-0 w-full h-3 bg-[var(--c-peach)] -z-0 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </Link>
            ))}
          </div>

          {/* Social Links */}
          <div className="flex items-center justify-center gap-6 py-6">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center text-stone-700 hover:bg-[#ff7f5c] hover:text-white transition-all hover:scale-110"
              >
                <social.icon className="h-6 w-6" />
                <span className="sr-only">{social.name}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Decorative floating doodles - visible on all screens */}
        <div className={cn(
          "absolute top-1/2 -translate-y-1/2 left-[10%] md:left-[15%] lg:left-[20%] w-24 h-24 md:w-40 md:h-40 lg:w-48 lg:h-48 transition-all duration-700 delay-500 pointer-events-none",
          menuOpen ? "opacity-80 translate-x-0" : "opacity-0 -translate-x-12"
        )}>
          <Image 
            src="/images/gloves-01.png" 
            alt="" 
            width={192}
            height={192}
            className="w-full h-full object-contain"
          />
        </div>
        
        <div className={cn(
          "absolute top-1/2 -translate-y-1/2 right-[10%] md:right-[15%] lg:right-[20%] w-24 h-24 md:w-40 md:h-40 lg:w-48 lg:h-48 transition-all duration-700 delay-600 pointer-events-none",
          menuOpen ? "opacity-80 translate-x-0" : "opacity-0 translate-x-12"
        )}>
          <Image 
            src="/images/rolling pin-01.png" 
            alt="" 
            width={192}
            height={192}
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    </>
  );
}
