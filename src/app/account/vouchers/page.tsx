"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Gift, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice, formatDate } from "@/lib/utils";

interface VoucherPurchase {
  id: string;
  amount: number;
  status: string;
  voucher_code: string | null;
  paid_at: string | null;
  created_at: string;
  is_gift: boolean;
  customer_name: string;
  customer_email: string;
}

export default function AccountVouchersPage() {
  const [vouchers, setVouchers] = useState<VoucherPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/vouchers")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || "Failed to load vouchers");
        setVouchers(data.vouchers || []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const copyCode = async (id: string, code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="min-h-screen bg-stone-50 py-12">
      <div className="mx-auto max-w-4xl px-4">
        <Link href="/account" className="mb-4 inline-flex items-center text-amber-600 hover:text-amber-700">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Account
        </Link>
        <h1 className="text-3xl font-bold text-stone-900">My Vouchers</h1>
        <p className="mt-1 text-stone-500">View your Mamalu gift card purchases</p>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : error ? (
          <Card className="mt-6 border-red-200 bg-red-50">
            <CardContent className="p-4 text-red-700">{error}</CardContent>
          </Card>
        ) : vouchers.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="p-8 text-center">
              <Gift className="mx-auto mb-4 h-12 w-12 text-stone-300" />
              <h3 className="font-semibold text-stone-900">No vouchers yet</h3>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 space-y-4">
            {vouchers.map((voucher) => {
              const isPaid = voucher.status === "paid" || Boolean(voucher.paid_at);
              const statusLabel = isPaid ? "Paid" : voucher.status.charAt(0).toUpperCase() + voucher.status.slice(1);
              const hasCode = Boolean(voucher.voucher_code);

              return (
                <Card key={voucher.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-amber-100 p-2">
                          <Gift className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-stone-900">{formatPrice(voucher.amount)} Gift Card</h3>
                            {voucher.is_gift && (
                              <Badge className="bg-[#ff7f5c]/10 text-[#d95634] hover:bg-[#ff7f5c]/10">
                                Received as gift
                              </Badge>
                            )}
                          </div>
                          {voucher.is_gift && voucher.customer_name && (
                            <div className="mt-1 text-sm text-stone-700">
                              <p className="font-medium">Sent by {voucher.customer_name}</p>
                              {voucher.customer_email && (
                                <p className="text-stone-500">{voucher.customer_email}</p>
                              )}
                            </div>
                          )}
                          <p className="text-sm text-stone-500">
                            Purchased {formatDate(voucher.paid_at || voucher.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <Badge className={isPaid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                          {statusLabel}
                        </Badge>
                        {hasCode ? (
                          <div className="mt-2 flex items-center gap-2 sm:justify-end">
                            <span className="font-mono text-lg font-bold tracking-wider text-stone-900">
                              {voucher.voucher_code}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyCode(voucher.id, voucher.voucher_code!)}
                              className="rounded p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
                              title="Copy voucher code"
                              aria-label="Copy voucher code"
                            >
                              {copiedId === voucher.id ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <p className="mt-2 text-sm font-medium text-stone-500">
                            {isPaid ? "Code being prepared" : "Awaiting payment"}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
