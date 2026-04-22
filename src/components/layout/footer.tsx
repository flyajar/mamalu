"use client";

import Link from "next/link";
import Image from "next/image";
import { Instagram, Mail, Phone, MapPin, Heart, ArrowRight, CreditCard, Ban } from "lucide-react";

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const primaryLinks = [
  { name: "Home", href: "/", openMenu: false },
  { name: "Classes", href: "#", openMenu: true },
  { name: "Shop", href: "/products", openMenu: false },
];

const secondaryLinks = {
  explore: [
    { name: "Blog", href: "/blogs" },
    { name: "Press", href: "/press" },
    { name: "Our Story", href: "/about" },
  ],
  services: [
    { name: "Mini Chef", href: "/minichef" },
    { name: "Big Chef", href: "/bigchef" },
    { name: "Rentals", href: "/book/rentals" },
  ],
  support: [
    { name: "Contact Us", href: "/contact" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
  ],
};

const socialLinks = [
  { name: "Instagram", href: "https://www.instagram.com/mamalukitchen/", icon: Instagram },
  { name: "TikTok", href: "https://www.tiktok.com/@mamalukitchen", icon: TikTokIcon },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden">
      {/* Main Footer */}
      <div className="bg-[#fff5eb] text-stone-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-3 lg:col-span-2">
              <Link href="/" className="inline-block group">
                <Image 
                  src="/graphics/mamalu-logo-transparent.png" 
                  alt="Mamalu Kitchen" 
                  width={160} 
                  height={160}
                  className="h-32 w-32 transition-transform group-hover:scale-105"
                />
              </Link>
              <p className="mt-4 text-stone-700 max-w-sm" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
                Fun, healthy cooking classes for kids and families in Dubai. 
                Creating delicious memories since 2020.
              </p>
              
              {/* Contact Info */}
              <div className="mt-6 space-y-3">
                <a href="mailto:info@mamalukitchen.com" className="flex items-center gap-3 text-stone-700 hover:text-[#ff7f5c] transition-colors font-bold" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
                  <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center">
                    <Mail className="h-4 w-4" />
                  </div>
                  info@mamalukitchen.com
                </a>
                <a href="https://wa.me/971527479512" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-stone-700 hover:text-[#ff7f5c] transition-colors font-bold" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
                  <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center">
                    <Phone className="h-4 w-4" />
                  </div>
                  +971 52 747 9512
                </a>
                <div className="flex items-center gap-3 text-stone-700 font-bold" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
                  <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center">
                    <MapPin className="h-4 w-4" />
                  </div>
                  Depachika Food Hall, Palm Jumeirah Mall, Palm Jumeirah, Dubai
                </div>
              </div>

              {/* Social Links */}
              <div className="flex gap-3 mt-6">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-700 hover:bg-[#ff7f5c] hover:text-white transition-all hover:scale-110"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <social.icon className="h-5 w-5" />
                    <span className="sr-only">{social.name}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Primary Links */}
            <div>
              <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-4" style={{ fontFamily: 'var(--font-mossy), cursive' }}>Main</h3>
              <ul className="space-y-3">
                {primaryLinks.map((link) => (
                  <li key={link.name}>
                    {link.openMenu ? (
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent("openMamaluMenu"))}
                        className="text-stone-700 hover:text-[#ff7f5c] transition-colors flex items-center gap-1 group"
                        style={{ fontFamily: 'var(--font-mossy), cursive' }}
                      >
                        <span>{link.name}</span>
                        <ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </button>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-stone-700 hover:text-[#ff7f5c] transition-colors flex items-center gap-1 group"
                        style={{ fontFamily: 'var(--font-mossy), cursive' }}
                      >
                        <span>{link.name}</span>
                        <ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Explore */}
            <div>
              <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-4" style={{ fontFamily: 'var(--font-mossy), cursive' }}>Explore</h3>
            <ul className="space-y-3">
              {secondaryLinks.explore.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-stone-700 hover:text-[#ff7f5c] transition-colors"
                    style={{ fontFamily: 'var(--font-mossy), cursive' }}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-4" style={{ fontFamily: 'var(--font-mossy), cursive' }}>Services</h3>
            <ul className="space-y-3">
              {secondaryLinks.services.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-stone-700 hover:text-[#ff7f5c] transition-colors"
                    style={{ fontFamily: 'var(--font-mossy), cursive' }}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-4" style={{ fontFamily: 'var(--font-mossy), cursive' }}>Support</h3>
            <ul className="space-y-3">
              {secondaryLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-stone-700 hover:text-[#ff7f5c] transition-colors"
                    style={{ fontFamily: 'var(--font-mossy), cursive' }}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          </div>
        </div>
      </div>

      {/* Cashless & Payment Info */}
      <div className="bg-[#fff5eb] border-t border-stone-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-center items-center gap-6 md:gap-12">
            {/* Cashless Business */}
            <div className="flex items-center gap-3 px-5 py-3 bg-white/60 rounded-full border border-stone-200">
              <div className="w-10 h-10 rounded-full bg-[#ff7f5c]/10 flex items-center justify-center">
                <Ban className="h-5 w-5 text-[#ff7f5c]" />
              </div>
              <span className="text-stone-800 font-semibold" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
                Mamalu Kitchen is a fully Cashless Business
              </span>
            </div>
            
            {/* Stripe Payments */}
            <div className="flex items-center gap-3 px-5 py-3 bg-white/60 rounded-full border border-stone-200">
              <div className="w-10 h-10 rounded-full bg-[#635bff]/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-[#635bff]" />
              </div>
              <span className="text-stone-800" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
                Payments powered by
              </span>
              <Image 
                src="/images/stripe-logo.png" 
                alt="Stripe" 
                width={60} 
                height={25}
                className="h-6 w-auto"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-[#fff5eb] border-t border-stone-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-stone-700 flex items-center gap-1" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
              &copy; {new Date().getFullYear()} Mamalu Kitchen. Made with 
              <Heart className="h-4 w-4 text-[#ff7f5c] fill-[#ff7f5c]" /> 
              in Dubai
            </p>
            <p className="text-sm text-stone-700" style={{ fontFamily: 'var(--font-mossy), cursive' }}>
              Powered by <span className="text-[#ff7f5c]">Mutant</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
