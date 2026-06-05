"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  User, 
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
  Clock,
  CreditCard,
  Receipt,
  Award,
  Activity,
  BarChart3,
  PieChart,
  Users,
  Star,
  CheckCircle,
  AlertCircle
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
  total_spend?: number;
  total_classes_attended?: number;
  dietary_restrictions?: string[];
  emergency_contact?: string;
  notes?: string;
}

interface ActivityItem {
  id: string;
  type: 'order' | 'booking' | 'rental' | 'payment' | 'invoice';
  description: string;
  amount?: number;
  date: string;
  status: string;
}

const roleOptions = [
  { value: 'customer', label: 'Customer', color: 'bg-stone-100 text-stone-700' },
  { value: 'student', label: 'Student', color: 'bg-blue-100 text-blue-700' },
  { value: 'renter', label: 'Kitchen Renter', color: 'bg-purple-100 text-purple-700' },
  { value: 'instructor', label: 'Instructor', color: 'bg-green-100 text-green-700' },
  { value: 'staff', label: 'Staff', color: 'bg-amber-100 text-amber-700' },
  { value: 'admin', label: 'Admin', color: 'bg-[#FF8C6B]/20 text-[#FF8C6B]' },
  { value: 'super_admin', label: 'Super Admin', color: 'bg-red-100 text-red-700' },
];

const getRoleColor = (role: string) => {
  return roleOptions.find(r => r.value === role)?.color || 'bg-stone-100 text-stone-700';
};

const isCustomerRole = (role?: string | null) => role === 'customer';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Mock data for demonstration - replace with actual API calls
  const [stats, setStats] = useState({
    totalRevenue: 12450,
    totalOrders: 23,
    totalClasses: 8,
    totalRentals: 3,
    averageOrderValue: 541,
    lifetimeValue: 15200,
    // Staff/Admin stats
    salesMade: 45600,
    invoicesCreated: 34,
    cashPayments: 12,
    commissionsEarned: 2280,
  });

  const [activities, setActivities] = useState<ActivityItem[]>([
    { id: '1', type: 'order', description: 'Order #1234 - Spice Collection', amount: 450, date: '2024-12-05', status: 'completed' },
    { id: '2', type: 'booking', description: 'Booked: Middle Eastern Essentials', amount: 350, date: '2024-12-03', status: 'confirmed' },
    { id: '3', type: 'payment', description: 'Payment received - Invoice #892', amount: 1200, date: '2024-12-01', status: 'completed' },
    { id: '4', type: 'rental', description: 'Kitchen Station A - 4 hours', amount: 800, date: '2024-11-28', status: 'completed' },
    { id: '5', type: 'invoice', description: 'Created Invoice #893 for Client XYZ', amount: 2500, date: '2024-11-25', status: 'pending' },
  ]);

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      if (response.ok) {
        const data = await response.json();

        if (!isCustomerRole(data.user?.role)) {
          router.replace('/admin/users');
          return;
        }

        setUser(data.user);
        setSelectedRole(data.user.role);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (response.ok) {
        setUser(prev => prev ? { ...prev, role: selectedRole } : null);
        setEditingRole(false);

        if (!isCustomerRole(selectedRole)) {
          router.replace('/admin/users');
        }
      }
    } catch (error) {
      console.error('Error updating role:', error);
    } finally {
      setSaving(false);
    }
  };

  const isStaffRole = (role: string) => {
    return ['staff', 'admin', 'super_admin', 'instructor'].includes(role);
  };

  const handleResetPassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setResettingPassword(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordSuccess('Password reset successfully');
        setNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => {
          setShowPasswordReset(false);
          setPasswordSuccess('');
        }, 2000);
      } else {
        setPasswordError(data.error || 'Failed to reset password');
      }
    } catch (error) {
      setPasswordError('An error occurred while resetting password');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      {/* Profile Header Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-[#FF8C6B] to-[#ff7a54] h-24" />
        <CardContent className="relative pt-0 pb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12">
            {/* Avatar */}
            <div className="h-24 w-24 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-amber-600">
                  {(user.full_name || user.email)?.[0]?.toUpperCase()}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-stone-900">{user.full_name || 'No Name'}</h1>
              <p className="text-stone-500">{user.email}</p>
            </div>

            {/* Role Badge & Edit */}
            <div className="flex items-center gap-3">
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

          {/* Quick Info */}
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

      {/* Password Reset Card */}
      {showPasswordReset && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-blue-600" />
                Reset User Password
              </span>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => {
                  setShowPasswordReset(false);
                  setPasswordError('');
                  setPasswordSuccess('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                }}
              >
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
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  New Password
                </label>
                <PasswordInput
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Confirm Password
                </label>
                <PasswordInput
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  minLength={6}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowPasswordReset(false);
                  setPasswordError('');
                  setPasswordSuccess('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleResetPassword}
                disabled={resettingPassword || !newPassword || !confirmNewPassword}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {resettingPassword ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200">
        {['overview', 'orders', 'classes', 'rentals', 'activity'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Stats - For Customers */}
          {!isStaffRole(user.role) && (
            <>
              <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <CardContent className="p-4">
                    <DollarSign className="h-8 w-8 mb-2 opacity-80" />
                    <p className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</p>
                    <p className="text-sm opacity-80">Total Revenue</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                  <CardContent className="p-4">
                    <ShoppingBag className="h-8 w-8 mb-2 opacity-80" />
                    <p className="text-2xl font-bold">{stats.totalOrders}</p>
                    <p className="text-sm opacity-80">Orders</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-[#FF8C6B] to-[#ff7a54] text-white">
                  <CardContent className="p-4">
                    <BookOpen className="h-8 w-8 mb-2 opacity-80" />
                    <p className="text-2xl font-bold">{stats.totalClasses}</p>
                    <p className="text-sm opacity-80">Classes</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-rose-500 to-pink-600 text-white">
                  <CardContent className="p-4">
                    <Utensils className="h-8 w-8 mb-2 opacity-80" />
                    <p className="text-2xl font-bold">{stats.totalRentals}</p>
                    <p className="text-sm opacity-80">Rentals</p>
                  </CardContent>
                </Card>
              </div>

              {/* Lifetime Value Calculator */}
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
                      <p className="font-semibold">{formatPrice(stats.totalRevenue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Staff/Admin Stats */}
          {isStaffRole(user.role) && (
            <>
              <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <CardContent className="p-4">
                    <DollarSign className="h-8 w-8 mb-2 opacity-80" />
                    <p className="text-2xl font-bold">{formatPrice(stats.salesMade)}</p>
                    <p className="text-sm opacity-80">Total Sales</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                  <CardContent className="p-4">
                    <Receipt className="h-8 w-8 mb-2 opacity-80" />
                    <p className="text-2xl font-bold">{stats.invoicesCreated}</p>
                    <p className="text-sm opacity-80">Invoices</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-[#FF8C6B] to-[#ff7a54] text-white">
                  <CardContent className="p-4">
                    <CreditCard className="h-8 w-8 mb-2 opacity-80" />
                    <p className="text-2xl font-bold">{stats.cashPayments}</p>
                    <p className="text-sm opacity-80">Cash Payments</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-rose-500 to-pink-600 text-white">
                  <CardContent className="p-4">
                    <Award className="h-8 w-8 mb-2 opacity-80" />
                    <p className="text-2xl font-bold">{formatPrice(stats.commissionsEarned)}</p>
                    <p className="text-sm opacity-80">Commissions</p>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-amber-500" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
                    <p className="text-sm text-stone-500 mb-1">This Month</p>
                    <p className="text-3xl font-bold text-emerald-600">{formatPrice(12500)}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">Target</span>
                      <span className="font-medium">AED 15,000</span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#FF8C6B] to-[#ff7a54] rounded-full" style={{ width: '83%' }} />
                    </div>
                    <p className="text-xs text-stone-500 text-right">83% achieved</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Recent Activity */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5 text-amber-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-stone-50">
                      <div className={`p-2 rounded-xl ${
                        activity.type === 'order' ? 'bg-amber-100 text-amber-600' :
                        activity.type === 'booking' ? 'bg-blue-100 text-blue-600' :
                        activity.type === 'rental' ? 'bg-purple-100 text-purple-600' :
                        activity.type === 'payment' ? 'bg-green-100 text-green-600' :
                        'bg-stone-100 text-stone-600'
                      }`}>
                        {activity.type === 'order' && <ShoppingBag className="h-4 w-4" />}
                        {activity.type === 'booking' && <BookOpen className="h-4 w-4" />}
                        {activity.type === 'rental' && <Utensils className="h-4 w-4" />}
                        {activity.type === 'payment' && <CreditCard className="h-4 w-4" />}
                        {activity.type === 'invoice' && <Receipt className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-stone-900">{activity.description}</p>
                        <p className="text-xs text-stone-500">{formatDate(activity.date)}</p>
                      </div>
                      {activity.amount && (
                        <p className="font-semibold text-stone-900">{formatPrice(activity.amount)}</p>
                      )}
                      <Badge variant={activity.status === 'completed' ? 'success' : activity.status === 'pending' ? 'warning' : 'secondary'}>
                        {activity.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-stone-500">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Order history will appear here</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Classes Tab */}
      {activeTab === 'classes' && (
        <Card>
          <CardHeader>
            <CardTitle>Class Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-stone-500">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Class bookings will appear here</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rentals Tab */}
      {activeTab === 'rentals' && (
        <Card>
          <CardHeader>
            <CardTitle>Kitchen Rentals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-stone-500">
              <Utensils className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Rental history will appear here</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <Card>
          <CardHeader>
            <CardTitle>Full Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg border border-stone-100">
                  <div className={`p-2 rounded-xl ${
                    activity.type === 'order' ? 'bg-amber-100 text-amber-600' :
                    activity.type === 'booking' ? 'bg-blue-100 text-blue-600' :
                    activity.type === 'rental' ? 'bg-purple-100 text-purple-600' :
                    activity.type === 'payment' ? 'bg-green-100 text-green-600' :
                    'bg-stone-100 text-stone-600'
                  }`}>
                    {activity.type === 'order' && <ShoppingBag className="h-4 w-4" />}
                    {activity.type === 'booking' && <BookOpen className="h-4 w-4" />}
                    {activity.type === 'rental' && <Utensils className="h-4 w-4" />}
                    {activity.type === 'payment' && <CreditCard className="h-4 w-4" />}
                    {activity.type === 'invoice' && <Receipt className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-900">{activity.description}</p>
                    <p className="text-xs text-stone-500">{formatDate(activity.date)}</p>
                  </div>
                  {activity.amount && (
                    <p className="font-semibold text-stone-900">{formatPrice(activity.amount)}</p>
                  )}
                  <Badge variant={activity.status === 'completed' ? 'success' : activity.status === 'pending' ? 'warning' : 'secondary'}>
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
