"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit3,
  Save,
  X,
  KeyRound,
  DollarSign,
  ShoppingBag,
  BookOpen,
  Utensils,
  TrendingUp,
  Activity,
  TicketPercent,
  CheckCircle,
  AlertCircle,
  type LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PasswordInput } from "@/components/ui/password-input";
import { formatPrice, formatDate } from "@/lib/utils";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: string;
  city?: string;
  country?: string;
  created_at: string;
  notes?: string;
}

interface UserStats {
  totalSpend: number;
  totalRevenue: number;
  orderCount: number;
  totalOrders: number;
  bookingCount: number;
  totalClasses: number;
  serviceBookingCount: number;
  voucherCount: number;
  rentalInquiryCount: number;
  totalRentals: number;
  averageOrderValue: number;
  lifetimeValue: number;
}

interface ActivityItem {
  id: string;
  type: "order" | "booking" | "voucher" | "rental";
  description: string;
  amount?: number | null;
  date?: string | null;
  status: string;
}

// API records are normalized from unrelated order, booking, voucher, and lead tables.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DataRecord = Record<string, any>;

const roleOptions = [
  { value: "customer", label: "Customer", color: "bg-stone-100 text-stone-700" },
  { value: "student", label: "Student", color: "bg-blue-100 text-blue-700" },
  { value: "renter", label: "Kitchen Renter", color: "bg-purple-100 text-purple-700" },
  { value: "instructor", label: "Instructor", color: "bg-green-100 text-green-700" },
  { value: "staff", label: "Staff", color: "bg-amber-100 text-amber-700" },
  { value: "admin", label: "Admin", color: "bg-[#FF8C6B]/20 text-[#FF8C6B]" },
  { value: "super_admin", label: "Super Admin", color: "bg-red-100 text-red-700" },
];

const emptyStats: UserStats = {
  totalSpend: 0,
  totalRevenue: 0,
  orderCount: 0,
  totalOrders: 0,
  bookingCount: 0,
  totalClasses: 0,
  serviceBookingCount: 0,
  voucherCount: 0,
  rentalInquiryCount: 0,
  totalRentals: 0,
  averageOrderValue: 0,
  lifetimeValue: 0,
};

const getRoleColor = (role: string) => {
  return roleOptions.find(r => r.value === role)?.color || "bg-stone-100 text-stone-700";
};

const isCustomerRole = (role?: string | null) => role === "customer";

type BadgeVariant = "success" | "warning" | "secondary";

const statusVariant = (status?: string): BadgeVariant => {
  const normalized = String(status || "").toLowerCase();
  if (["completed", "paid", "confirmed", "delivered"].includes(normalized)) return "success";
  if (["pending", "processing", "new"].includes(normalized)) return "warning";
  return "secondary";
};

const formatDateSafe = (date?: string | null) => date ? formatDate(date) : "Not set";

const getRentalDetail = (notes?: string | null, label?: string) => {
  if (!notes || !label) return null;
  const line = notes.split("\n").find((item) => item.toLowerCase().startsWith(label.toLowerCase()));
  return line?.split(":").slice(1).join(":").trim() || null;
};

function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="text-center py-10 text-stone-500">
      <Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>{message}</p>
    </div>
  );
}

function ActivityRows({ activities }: { activities: ActivityItem[] }) {
  if (activities.length === 0) {
    return <EmptyState icon={Activity} message="No activity has been recorded for this customer." />;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg border border-stone-100">
          <div className={`p-2 rounded-xl ${
            activity.type === "order" ? "bg-amber-100 text-amber-600" :
            activity.type === "booking" ? "bg-blue-100 text-blue-600" :
            activity.type === "voucher" ? "bg-green-100 text-green-600" :
            "bg-purple-100 text-purple-600"
          }`}>
            {activity.type === "order" && <ShoppingBag className="h-4 w-4" />}
            {activity.type === "booking" && <BookOpen className="h-4 w-4" />}
            {activity.type === "voucher" && <TicketPercent className="h-4 w-4" />}
            {activity.type === "rental" && <Utensils className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-900 truncate">{activity.description}</p>
            <p className="text-xs text-stone-500">{formatDateSafe(activity.date)}</p>
          </div>
          {activity.amount ? <p className="font-semibold text-stone-900">{formatPrice(activity.amount)}</p> : null}
          <Badge variant={statusVariant(activity.status)}>{activity.status}</Badge>
        </div>
      ))}
    </div>
  );
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>(emptyStats);
  const [orders, setOrders] = useState<DataRecord[]>([]);
  const [bookings, setBookings] = useState<DataRecord[]>([]);
  const [vouchers, setVouchers] = useState<DataRecord[]>([]);
  const [rentals, setRentals] = useState<DataRecord[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      if (response.ok) {
        const data = await response.json();

        if (!isCustomerRole(data.user?.role)) {
          router.replace("/admin/users");
          return;
        }

        setUser(data.user);
        setSelectedRole(data.user.role);
        setStats({ ...emptyStats, ...(data.stats || {}) });
        setOrders(data.orders || []);
        setBookings(data.bookings || []);
        setVouchers(data.vouchers || []);
        setRentals(data.rentals || []);
        setActivities(data.activity || []);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (response.ok) {
        setUser(prev => prev ? { ...prev, role: selectedRole } : null);
        setEditingRole(false);

        if (!isCustomerRole(selectedRole)) {
          router.replace("/admin/users");
        }
      }
    } catch (error) {
      console.error("Error updating role:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setResettingPassword(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordSuccess("Password reset successfully");
        setNewPassword("");
        setConfirmNewPassword("");
        setTimeout(() => {
          setShowPasswordReset(false);
          setPasswordSuccess("");
        }, 2000);
      } else {
        setPasswordError(data.error || "Failed to reset password");
      }
    } catch {
      setPasswordError("An error occurred while resetting password");
    } finally {
      setResettingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-stone-400 mx-auto mb-4" />
        <p className="text-stone-600">User not found</p>
        <Link href="/admin/users">
          <Button variant="outline" className="mt-4">Back to Users</Button>
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "orders", label: "Orders" },
    { id: "bookings", label: "Bookings" },
    { id: "vouchers", label: "Vouchers" },
    { id: "rentals", label: "Rentals" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-[#FF8C6B] to-[#ff7a54] h-24" />
        <CardContent className="relative pt-0 pb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12">
            <div className="h-24 w-24 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-amber-600">
                  {(user.full_name || user.email)?.[0]?.toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-stone-900">{user.full_name || "No Name"}</h1>
              <p className="text-stone-500">{user.email}</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowPasswordReset(!showPasswordReset)}
                className="bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200"
              >
                <KeyRound className="h-4 w-4 mr-1" />
                Reset Password
              </Button>
              {editingRole ? (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="px-3 py-2 border border-stone-300 rounded-lg text-sm"
                  >
                    {roleOptions.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" onClick={handleSaveRole} disabled={saving}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setEditingRole(false);
                    setSelectedRole(user.role);
                  }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Badge className={`${getRoleColor(user.role)} px-3 py-1`}>
                    {roleOptions.find(r => r.value === user.role)?.label || user.role}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => setEditingRole(true)}>
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit Role
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-6 mt-6 text-sm text-stone-600">
            {user.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {user.phone}
              </div>
            )}
            {user.city && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {user.city}, {user.country}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Joined {formatDate(user.created_at)}
            </div>
          </div>
        </CardContent>
      </Card>

      {showPasswordReset && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-blue-600" />
                Reset User Password
              </span>
              <Button size="sm" variant="ghost" onClick={() => setShowPasswordReset(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {passwordError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{passwordError}</p>
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">{passwordSuccess}</p>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-4">
              <PasswordInput placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} />
              <PasswordInput placeholder="Confirm new password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} minLength={6} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowPasswordReset(false)}>Cancel</Button>
              <Button onClick={handleResetPassword} disabled={resettingPassword || !newPassword || !confirmNewPassword} className="bg-blue-600 hover:bg-blue-700">
                {resettingPassword ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 border-b border-stone-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <CardContent className="p-4">
                <DollarSign className="h-8 w-8 mb-2 opacity-80" />
                <p className="text-2xl font-bold">{formatPrice(stats.totalSpend)}</p>
                <p className="text-sm opacity-80">Total Spend</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              <CardContent className="p-4">
                <ShoppingBag className="h-8 w-8 mb-2 opacity-80" />
                <p className="text-2xl font-bold">{stats.orderCount}</p>
                <p className="text-sm opacity-80">Orders</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-[#FF8C6B] to-[#ff7a54] text-white">
              <CardContent className="p-4">
                <BookOpen className="h-8 w-8 mb-2 opacity-80" />
                <p className="text-2xl font-bold">{stats.bookingCount}</p>
                <p className="text-sm opacity-80">Bookings</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
              <CardContent className="p-4">
                <TicketPercent className="h-8 w-8 mb-2 opacity-80" />
                <p className="text-2xl font-bold">{stats.voucherCount}</p>
                <p className="text-sm opacity-80">Vouchers</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-rose-500 to-pink-600 text-white">
              <CardContent className="p-4">
                <Utensils className="h-8 w-8 mb-2 opacity-80" />
                <p className="text-2xl font-bold">{stats.rentalInquiryCount}</p>
                <p className="text-sm opacity-80">Rentals</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-amber-500" />
                Customer Value
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-[#FF8C6B]/10 rounded-xl">
                <p className="text-sm text-stone-500 mb-1">Lifetime Value</p>
                <p className="text-3xl font-bold text-amber-600">{formatPrice(stats.lifetimeValue)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-stone-500">Avg Order</p>
                  <p className="font-semibold">{formatPrice(stats.averageOrderValue)}</p>
                </div>
                <div>
                  <p className="text-stone-500">Total Spend</p>
                  <p className="font-semibold">{formatPrice(stats.totalSpend)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5 text-amber-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityRows activities={activities.slice(0, 5)} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "orders" && (
        <Card>
          <CardHeader><CardTitle>Orders</CardTitle></CardHeader>
          <CardContent>
            {orders.length === 0 ? <EmptyState icon={ShoppingBag} message="No product orders found for this customer." /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-stone-500 border-b">
                    <tr><th className="py-3">Order</th><th>Date</th><th>Items</th><th>Status</th><th className="text-right">Total</th></tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b last:border-0">
                        <td className="py-3 font-medium">{order.order_number || order.id}</td>
                        <td>{formatDateSafe(order.created_at)}</td>
                        <td>{Array.isArray(order.items) ? order.items.length : 0}</td>
                        <td><Badge variant={statusVariant(order.status)}>{order.status || order.payment_status || "unknown"}</Badge></td>
                        <td className="text-right font-semibold">{formatPrice(Number(order.total_amount) || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "bookings" && (
        <Card>
          <CardHeader><CardTitle>Bookings</CardTitle></CardHeader>
          <CardContent>
            {bookings.length === 0 ? <EmptyState icon={BookOpen} message="No class or service bookings found for this customer." /> : (
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <div key={`${booking.booking_kind}-${booking.id}`} className="p-4 border border-stone-100 rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-stone-900">{booking.booking_kind === "class" ? booking.class_title : booking.service_name || booking.package_name}</p>
                        <p className="text-sm text-stone-500">{booking.booking_number || booking.id}</p>
                        <p className="text-sm text-stone-500 mt-1">{booking.customer_email || booking.attendee_email}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatPrice(Number(booking.total_amount) || 0)}</p>
                        <Badge variant={statusVariant(booking.status || booking.payment_status)}>{booking.status || booking.payment_status || "unknown"}</Badge>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3 mt-4 text-sm text-stone-600">
                      <p>Booked: {formatDateSafe(booking.created_at)}</p>
                      <p>Event: {formatDateSafe(booking.event_date)}</p>
                      <p>Guests: {booking.guest_count || booking.sessions_booked || 1}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "vouchers" && (
        <Card>
          <CardHeader><CardTitle>Vouchers</CardTitle></CardHeader>
          <CardContent>
            {vouchers.length === 0 ? <EmptyState icon={TicketPercent} message="No voucher purchases or redemptions found for this customer." /> : (
              <div className="space-y-3">
                {vouchers.map((voucher) => (
                  <div key={`${voucher.voucher_kind}-${voucher.id}`} className="p-4 border border-stone-100 rounded-lg flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-stone-900">
                        {voucher.voucher_kind === "purchase" ? "Voucher purchase" : "Voucher redemption"}
                      </p>
                      <p className="text-sm text-stone-500">{voucher.voucher_code || voucher.menu_item_name || "No code assigned"}</p>
                      <p className="text-sm text-stone-500">{formatDateSafe(voucher.redeemed_at || voucher.paid_at || voucher.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(Number(voucher.amount || voucher.menu_item_price) || 0)}</p>
                      <Badge variant={statusVariant(voucher.status)}>{voucher.status || "unknown"}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "rentals" && (
        <Card>
          <CardHeader><CardTitle>Rental Inquiries</CardTitle></CardHeader>
          <CardContent>
            {rentals.length === 0 ? <EmptyState icon={Utensils} message="No rental inquiries found for this customer." /> : (
              <div className="space-y-3">
                {rentals.map((rental) => (
                  <div key={rental.id} className="p-4 border border-stone-100 rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-stone-900">{rental.name || rental.company || "Rental inquiry"}</p>
                        {rental.company && <p className="text-sm text-stone-500">{rental.company}</p>}
                        <p className="text-sm text-stone-500">{formatDateSafe(rental.created_at)}</p>
                      </div>
                      <Badge variant={statusVariant(rental.status)}>{rental.status || "unknown"}</Badge>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3 mt-4 text-sm text-stone-600">
                      <p className="flex items-center gap-2"><Mail className="h-4 w-4" />{rental.email || "No email"}</p>
                      <p className="flex items-center gap-2"><Phone className="h-4 w-4" />{rental.phone || "No phone"}</p>
                      <p>Rental: {getRentalDetail(rental.notes, "Rental Type") || "Not specified"}</p>
                      <p>Preferred date: {getRentalDetail(rental.notes, "Preferred Date") || "Not specified"}</p>
                      <p>Time slot: {getRentalDetail(rental.notes, "Time Slot") || "Not specified"}</p>
                      <p>Source: {rental.source || "Not specified"}</p>
                    </div>
                    {rental.notes && <p className="mt-4 text-sm text-stone-600 whitespace-pre-line">{rental.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "activity" && (
        <Card>
          <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
          <CardContent>
            <ActivityRows activities={activities} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
