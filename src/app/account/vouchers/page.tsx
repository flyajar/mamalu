"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gift, RefreshCw } from "lucide-react";
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
}

export default function AccountVouchersPage() {
  const [vouchers, setVouchers] = useState<VoucherPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
            {vouchers.map((voucher) => (
              <Card key={voucher.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-amber-100 p-2">
                        <Gift className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-stone-900">{formatPrice(voucher.amount)} Gift Card</h3>
                        <p className="text-sm text-stone-500">
                          Purchased {formatDate(voucher.paid_at || voucher.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <Badge className={voucher.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                        {voucher.status}
                      </Badge>
                      <p className="mt-2 font-mono text-lg font-bold text-stone-900">
                        {voucher.voucher_code || "Pending"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
