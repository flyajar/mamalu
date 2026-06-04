"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice, formatDate } from "@/lib/utils";

interface ProductOrder {
  id: string;
  customer_name: string;
  total_amount: number;
  subtotal: number;
  shipping_cost: number;
  status: string;
  payment_status: string;
  tracking_number: string | null;
  items: Array<{ title?: string; name?: string; quantity?: number; price?: number }>;
  created_at: string;
}

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/user/orders")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || "Failed to load orders");
        setOrders(data.orders || []);
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
        <h1 className="text-3xl font-bold text-stone-900">My Orders</h1>
        <p className="mt-1 text-stone-500">View your Mamalu product purchases</p>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : error ? (
          <Card className="mt-6 border-red-200 bg-red-50">
            <CardContent className="p-4 text-red-700">{error}</CardContent>
          </Card>
        ) : orders.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="p-8 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-stone-300" />
              <h3 className="font-semibold text-stone-900">No orders yet</h3>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="mb-2 flex items-center gap-3">
                        <div className="rounded-lg bg-amber-100 p-2">
                          <Package className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-stone-900">Order #{order.id.slice(0, 8)}</h3>
                          <p className="text-sm text-stone-500">{formatDate(order.created_at)}</p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-1 text-sm text-stone-600">
                        {(order.items || []).map((item, index) => (
                          <p key={`${order.id}-${index}`}>
                            {item.quantity || 1}x {item.title || item.name || "Product"}
                          </p>
                        ))}
                      </div>
                      {order.tracking_number && (
                        <p className="mt-3 text-sm text-stone-600">Tracking: {order.tracking_number}</p>
                      )}
                    </div>
                    <div className="text-left sm:text-right">
                      <Badge className="mb-3 bg-green-100 text-green-700">{order.payment_status}</Badge>
                      <p className="text-lg font-bold text-stone-900">{formatPrice(order.total_amount)}</p>
                      <p className="text-sm capitalize text-stone-500">{order.status}</p>
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
