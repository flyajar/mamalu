"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "Successfully subscribed!");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong");
      }
    } catch {
      setStatus("error");
      setMessage("Failed to subscribe. Please try again.");
    }

    // Reset status after 3 seconds
    setTimeout(() => {
      setStatus("idle");
      setMessage("");
    }, 3000);
  };

  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4 text-center">
        <h2 
          className="text-3xl md:text-4xl lg:text-5xl mb-4"
          style={{ fontFamily: 'var(--font-mossy), cursive' }}
        >
          Cooking Up Memories Together
        </h2>
        <p 
          className="text-stone-800 text-lg mb-8 max-w-2xl mx-auto"
          style={{ fontFamily: 'var(--font-mossy), cursive' }}
        >
          Subscribe to our monthly newsletter to see what&apos;s cooking at Mamalu Kitchen.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full sm:flex-1 px-6 py-3 rounded-full bg-white border-0 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-800"
            style={{ fontFamily: 'var(--font-mossy), cursive' }}
            disabled={status === "loading"}
          />
          <button
            type="submit"
            disabled={status === "loading" || !email}
            className="w-full sm:w-auto px-8 py-3 bg-[#c9977a] text-white rounded-full font-semibold hover:bg-[#b8866a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ fontFamily: 'var(--font-mossy), cursive' }}
          >
            {status === "loading" ? (
              "Subscribing..."
            ) : (
              <>
                Subscribe
                <Send className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {message && (
          <p 
            className={`mt-4 text-sm ${status === "success" ? "text-green-800" : "text-red-800"}`}
            style={{ fontFamily: 'var(--font-mossy), cursive' }}
          >
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
