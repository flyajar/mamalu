"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Bell,
  Search,
  ChevronDown,
  LogOut,
  User,
  ExternalLink,
  ShoppingBag,
  MessageSquare,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface AdminHeaderProps {
  user: {
    email: string;
    name: string;
    avatar?: string;
    role: string;
  };
}

interface RecentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  created_at: string;
}

interface RecentInquiry {
  id: string;
  name: string;
  subject: string;
  created_at: string;
}

export function AdminHeader({ user }: AdminHeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [newInquiriesCount, setNewInquiriesCount] = useState(0);
  const [recentInquiries, setRecentInquiries] = useState<RecentInquiry[]>([]);
  const [totalNotifications, setTotalNotifications] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      if (res.ok) {
        const data = await res.json();
        setNewOrdersCount(data.newOrdersCount || 0);
        setRecentOrders(data.recentOrders || []);
        setNewInquiriesCount(data.newInquiriesCount || 0);
        setRecentInquiries(data.recentInquiries || []);
        setTotalNotifications(data.totalNotifications || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, []);

  useEffect(() => {
    const initialFetch = setTimeout(() => {
      fetchNotifications();
    }, 0);
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => {
      clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  const handleSignOut = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
      window.location.href = "/admin/login";
    }
  };

  const roleLabels: Record<string, string> = {
    staff: "Staff",
    admin: "Admin",
    super_admin: "Super Admin",
  };

  return (
    <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search users, bookings, orders..."
            className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* View site */}
        <Link
          href="/"
          target="_blank"
          className="text-sm text-stone-600 hover:text-amber-600 flex items-center gap-1"
        >
          View Site
          <ExternalLink className="h-3 w-3" />
        </Link>

        {/* Notifications */}
        <div className="relative">
          <button 
            className="relative p-2 text-stone-600 hover:bg-stone-100 rounded-lg"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-5 w-5" />
            {totalNotifications > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-medium">
                {totalNotifications > 9 ? "9+" : totalNotifications}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-stone-200 z-20 overflow-hidden">
                <div className="px-4 py-3 bg-stone-50 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-stone-900">Notifications</h3>
                  {totalNotifications > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                      {totalNotifications} new
                    </span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {/* Orders */}
                  {recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      href="/admin/orders"
                      onClick={() => setShowNotifications(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-stone-50 border-b border-stone-100"
                    >
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <ShoppingBag className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-900">New Order {order.order_number}</p>
                        <p className="text-xs text-stone-500 truncate">{order.customer_name}</p>
                        <p className="text-xs font-medium text-amber-600">{formatPrice(order.total_amount)}</p>
                      </div>
                      <span className="text-xs text-stone-400">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </Link>
                  ))}
                  
                  {/* Inquiries */}
                  {recentInquiries.map((inquiry) => (
                    <Link
                      key={inquiry.id}
                      href="/admin/inquiries"
                      onClick={() => setShowNotifications(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-stone-50 border-b border-stone-100"
                    >
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-900">New Inquiry</p>
                        <p className="text-xs text-stone-500 truncate">{inquiry.name}</p>
                        <p className="text-xs text-stone-600 truncate">{inquiry.subject}</p>
                      </div>
                      <span className="text-xs text-stone-400">
                        {new Date(inquiry.created_at).toLocaleDateString()}
                      </span>
                    </Link>
                  ))}

                  {totalNotifications === 0 && (
                    <div className="px-4 py-8 text-center text-stone-500">
                      <Bell className="h-8 w-8 mx-auto mb-2 text-stone-300" />
                      <p className="text-sm">No new notifications</p>
                    </div>
                  )}
                </div>
                {totalNotifications > 0 && (
                  <div className="flex border-t">
                    <Link
                      href="/admin/orders"
                      onClick={() => setShowNotifications(false)}
                      className="flex-1 px-4 py-3 text-center text-sm text-amber-600 hover:bg-stone-50 border-r"
                    >
                      Orders ({newOrdersCount})
                    </Link>
                    <Link
                      href="/admin/inquiries"
                      onClick={() => setShowNotifications(false)}
                      className="flex-1 px-4 py-3 text-center text-sm text-blue-600 hover:bg-stone-50"
                    >
                      Inquiries ({newInquiriesCount})
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-2 hover:bg-stone-100 rounded-lg"
          >
            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="h-8 w-8 rounded-full" />
              ) : (
                <User className="h-4 w-4 text-amber-600" />
              )}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-medium text-stone-900">{user.name}</div>
              <div className="text-xs text-stone-500">{roleLabels[user.role] || user.role}</div>
            </div>
            <ChevronDown className="h-4 w-4 text-stone-400" />
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-20">
                <div className="px-4 py-2 border-b border-stone-100">
                  <div className="text-sm font-medium text-stone-900">{user.name}</div>
                  <div className="text-xs text-stone-500">{user.email}</div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
