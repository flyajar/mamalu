"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, ChefHat } from "lucide-react";
import Image from "next/image";

export function WalkInButton() {
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();

  // Hide on mobile for Mini Chef and Big Chef pages
  const isMobileOnlyPage = pathname === "/minichef" || pathname === "/bigchef";

  return (
    <div className={`fixed bottom-4 right-4 lg:bottom-6 lg:right-6 z-50 flex flex-col items-end gap-3 ${isMobileOnlyPage ? "hidden lg:flex" : ""}`}>
      {expanded && (
        <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 p-5 w-72 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-black" />
              <h3 style={{ fontFamily: 'var(--font-mossy), cursive' }}>Walk-In Customers</h3>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="text-stone-400 hover:text-stone-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-black mb-4 leading-relaxed" style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 700 }}>
            Feeling spontaneous? Contact us on WhatsApp to check our last-minute availability!
          </p>
          <a
            href="https://wa.me/971527479512?text=Hi!%20I%27d%20like%20to%20check%20walk-in%20availability"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-xl transition-colors"
            style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 900 }}
          >
            <MessageCircle className="h-4 w-4" />
            Chat on WhatsApp
          </a>
        </div>
      )}
      <button
        onClick={() => setExpanded(!expanded)}
        className="relative w-16 h-16 bg-[#fff5eb] hover:bg-[#ffe8d9] text-stone-800 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 animate-bounce border-2 border-stone-300"
        style={{ animationDuration: "2s" }}
        aria-label="Walk-in Customers"
      >
        <Image src="/sun.png" alt="Walk-in" width={28} height={28} className="w-7 h-7" />
        <span className="absolute -top-1 -right-1 w-6 h-6 bg-[#25D366] rounded-full flex items-center justify-center shadow-md">
          <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </span>
      </button>
    </div>
  );
}
