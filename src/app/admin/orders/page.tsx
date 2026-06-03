"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  ShoppingBag, 
  Search, 
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  DollarSign,
  TrendingUp,
  Users,
  RefreshCw,
  MapPin,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

interface OrderItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
}

interface ShippingAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  shipping_address?: ShippingAddress;
  shipping_city?: string;
  items: OrderItem[];
  subtotal: number;
  shipping_cost: number;
  total_amount: number;
  status: string;
  payment_status: string;
  tracking_number?: string;
  paid_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  is_new: boolean;
  created_at: string;
}

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  paidOrders: number;
  deliveredOrders: number;
  avgOrderValue: number;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      
      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: string, status: string, trackingNumber?: string) => {
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status, trackingNumber }),
      });
      if (res.ok) {
        fetchOrders();
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error("Failed to update order:", error);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "processing": return <Package className="h-4 w-4" />;
      case "shipped": return <Truck className="h-4 w-4" />;
      case "delivered": return <CheckCircle className="h-4 w-4" />;
      case "cancelled": return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-700";
      case "processing": return "bg-blue-100 text-blue-700";
      case "shipped": return "bg-purple-100 text-purple-700";
      case "delivered": return "bg-green-100 text-green-700";
      case "cancelled": return "bg-red-100 text-red-700";
      default: return "bg-stone-100 text-stone-700";
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-700";
      case "pending": return "bg-yellow-100 text-yellow-700";
      case "refunded": return "bg-stone-100 text-stone-700";
      default: return "bg-stone-100 text-stone-700";
    }
  };

  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(query) ||
      order.customer_name.toLowerCase().includes(query) ||
      order.customer_email.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatAddress = (address?: ShippingAddress) => {
    if (!address) return "N/A";
    const parts = [
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.postal_code,
      address.country,
    ].filter(Boolean);
    return parts.join(", ") || "N/A";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Product Orders</h1>
          <p className="text-stone-500 mt-1">Manage product orders and fulfillment</p>
        </div>
        <Button variant="outline" onClick={fetchOrders}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <ShoppingBag className="h-6 w-6 opacity-80" />
          </div>
          <p className="text-2xl font-bold">{stats?.totalOrders || 0}</p>
          <p className="text-sm opacity-80">Total Orders</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="h-6 w-6 opacity-80" />
          </div>
          <p className="text-2xl font-bold">{formatPrice(stats?.totalRevenue || 0)}</p>
          <p className="text-sm opacity-80">Total Revenue</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-[#FF8C6B] to-[#ff7a54] p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="h-6 w-6 opacity-80" />
          </div>
          <p className="text-2xl font-bold">{formatPrice(stats?.avgOrderValue || 0)}</p>
          <p className="text-sm opacity-80">Avg Order Value</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle className="h-6 w-6 opacity-80" />
          </div>
          <p className="text-2xl font-bold">{stats?.deliveredOrders || 0}</p>
          <p className="text-sm opacity-80">Delivered</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative min-w-0 flex-1 basis-full sm:basis-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search by order ID, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg text-sm"
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-stone-200 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardContent className="p-0">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingBag className="h-12 w-12 text-stone-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-stone-700">No orders yet</h3>
              <p className="text-stone-500 mt-1">Orders from the products page will appear here</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4">Order</th>
                  <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4">Customer</th>
                  <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4">Items</th>
                  <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4">Total</th>
                  <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4">Status</th>
                  <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4">Payment</th>
                  <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className={`hover:bg-stone-50 group ${order.is_new ? "bg-amber-50" : ""}`}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-stone-900 flex items-center gap-2">
                          {order.order_number}
                          {order.is_new && <Badge className="bg-red-500 text-white text-xs">NEW</Badge>}
                        </p>
                        <p className="text-sm text-stone-500">{formatDate(order.created_at)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-stone-900">{order.customer_name}</p>
                        <p className="text-sm text-stone-500">{order.customer_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-stone-700">
                        {order.items?.slice(0, 2).map((item, i) => (
                          <div key={i}>{item.quantity}x {item.title}</div>
                        ))}
                        {order.items?.length > 2 && (
                          <span className="text-stone-400">+{order.items.length - 2} more</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-stone-900">{formatPrice(order.total_amount)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={`${getStatusBadge(order.status)} flex items-center gap-1 w-fit`}>
                        {getStatusIcon(order.status)}
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getPaymentBadge(order.payment_status)}>
                        {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="opacity-0 group-hover:opacity-100"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Order {selectedOrder.order_number}</h2>
                <p className="text-sm text-stone-500">{formatDate(selectedOrder.created_at)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div>
                <h3 className="font-semibold text-stone-700 mb-3">Customer</h3>
                <div className="bg-stone-50 rounded-lg p-4 space-y-2">
                  <p><span className="text-stone-500">Name:</span> {selectedOrder.customer_name}</p>
                  <p><span className="text-stone-500">Email:</span> {selectedOrder.customer_email}</p>
                  {selectedOrder.customer_phone && (
                    <p><span className="text-stone-500">Phone:</span> {selectedOrder.customer_phone}</p>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <h3 className="font-semibold text-stone-700 mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Delivery Address
                </h3>
                <div className="bg-stone-50 rounded-lg p-4">
                  <p>{formatAddress(selectedOrder.shipping_address)}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold text-stone-700 mb-3">Items</h3>
                <div className="bg-stone-50 rounded-lg p-4 space-y-3">
                  {selectedOrder.items?.map((item, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span>{item.quantity}x {item.title}</span>
                      <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between text-stone-500">
                      <span>Subtotal</span>
                      <span>{formatPrice(selectedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-stone-500">
                      <span>Shipping</span>
                      <span>{selectedOrder.shipping_cost === 0 ? "Free" : formatPrice(selectedOrder.shipping_cost)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg mt-2">
                      <span>Total</span>
                      <span>{formatPrice(selectedOrder.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="font-semibold text-stone-700 mb-3">Status</h3>
                <div className="flex items-center gap-4">
                  <Badge className={`${getStatusBadge(selectedOrder.status)} flex items-center gap-1`}>
                    {getStatusIcon(selectedOrder.status)}
                    {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                  </Badge>
                  <Badge className={getPaymentBadge(selectedOrder.payment_status)}>
                    Payment: {selectedOrder.payment_status}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div>
                <h3 className="font-semibold text-stone-700 mb-3">Update Status</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedOrder.status !== "processing" && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateOrderStatus(selectedOrder.id, "processing")}
                      disabled={updating}
                    >
                      <Package className="h-4 w-4 mr-1" />
                      Processing
                    </Button>
                  )}
                  {selectedOrder.status !== "shipped" && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateOrderStatus(selectedOrder.id, "shipped")}
                      disabled={updating}
                    >
                      <Truck className="h-4 w-4 mr-1" />
                      Mark Shipped
                    </Button>
                  )}
                  {selectedOrder.status !== "delivered" && (
                    <Button 
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => updateOrderStatus(selectedOrder.id, "delivered")}
                      disabled={updating}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark Delivered
                    </Button>
                  )}
                  {selectedOrder.status !== "cancelled" && selectedOrder.status !== "delivered" && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => updateOrderStatus(selectedOrder.id, "cancelled")}
                      disabled={updating}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
