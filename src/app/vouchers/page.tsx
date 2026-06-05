"use client";

import { useEffect, useState } from "react";
import { Gift, Loader2, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface VoucherGroup {
  amount: number;
  count: number;
}

interface BuyForm {
  name: string;
  email: string;
}

export default function VouchersPage() {
  const [groups, setGroups] = useState<VoucherGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VoucherGroup | null>(null);
  const [form, setForm] = useState<BuyForm>({ name: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/vouchers")
      .then((r) => r.json())
      .then((d) => setGroups(d.vouchers || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openModal = (g: VoucherGroup) => {
    setSelected(g);
    setForm({ name: "", email: "" });
    setError("");
  };

  const closeModal = () => {
    if (submitting) return;
    setSelected(null);
    setError("");
  };

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/vouchers/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, amount: selected.amount }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <section className="py-16 lg:py-24 bg-[#fff5eb] text-center">
        <Gift className="h-12 w-12 mx-auto mb-4 text-[#ff7f5c]" />
        <h1
          className="text-4xl lg:text-6xl font-bold text-stone-900 mb-4"
          style={{ fontFamily: "var(--font-mossy), cursive" }}
        >
          Vouchers
        </h1>
        <p className="text-stone-500 text-lg max-w-xl mx-auto">
          Give the gift of cooking. Vouchers are valid for 6 months from purchase
          and can be used on any Mamalu Kitchen experience.
        </p>
      </section>

      <section className="px-6 lg:px-8 py-20">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-24 text-stone-400">
            <Gift className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-lg">No gift cards available right now</p>
            <p className="text-sm mt-1">Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {groups.map((g) => (
              <div
                key={g.amount}
                className="group relative rounded-3xl overflow-hidden bg-white border-2 border-stone-100 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="h-24 bg-gradient-to-br from-[#ff7f5c] to-[#ff9a7c] relative overflow-hidden">
                  <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
                  <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10" />
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: "url(/logos/logo-white.png)",
                      backgroundSize: "contain",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                    }}
                  />
                </div>

                <div className="p-8 pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-xl bg-[#ff7f5c]/10">
                      <Gift className="h-5 w-5 text-[#ff7f5c]" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Gift Voucher
                    </p>
                  </div>

                  <p
                    className="text-5xl font-bold text-stone-900 mb-3"
                    style={{ fontFamily: "var(--font-mossy), cursive" }}
                  >
                    {formatPrice(g.amount)}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-stone-600 mb-6">
                    <span className="px-2.5 py-1 bg-stone-100 rounded-lg font-medium">
                      {g.count} available
                    </span>
                    <span className="text-stone-400">·</span>
                    <span className="text-stone-500">Valid 6 months</span>
                  </div>

                  <button
                    onClick={() => openModal(g)}
                    className="w-full text-center bg-[#ff7f5c] text-white font-bold py-3.5 rounded-2xl hover:bg-[#ff6a42] transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-bold text-stone-900">Buy Gift Card</h2>
                <p className="text-sm text-stone-500">{formatPrice(selected.amount)} value</p>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors">
                <X className="h-5 w-5 text-stone-400" />
              </button>
            </div>

            <form onSubmit={handleBuy} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Your full name"
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7f5c]/40 focus:border-[#ff7f5c]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7f5c]/40 focus:border-[#ff7f5c]"
                />
                <p className="text-xs text-stone-400 mt-1">
                  Your gift card code will be sent to this email and is valid for 6 months from purchase.
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-[#ff7f5c] text-white font-bold hover:bg-[#ff6a42] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Redirecting..." : `Pay ${formatPrice(selected.amount)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
