import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { 
  Users, 
  Calendar, 
  ShoppingBag, 
  ChefHat,
  Utensils,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  CreditCard,
  Target,
  Zap,
  Activity,
  BarChart3,
} from "lucide-react";

async function getStats() {
  const supabase = await createClient();
  if (!supabase) return null;

  const [users, bookings, orders, leads] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("class_bookings").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }),
  ]);

  return {
    totalUsers: users.count || 0,
    totalBookings: bookings.count || 0,
    totalOrders: orders.count || 0,
    totalLeads: leads.count || 0,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  const quickActions = [
    { label: "Process Order", icon: ShoppingBag, color: "from-[#FF8C6B] to-[#ff7a54]", href: "/admin/orders" },
    { label: "Add Customer", icon: Users, color: "from-emerald-500 to-teal-500", href: "/admin/users/new" },
    { label: "Kitchen Booking", icon: Utensils, color: "from-rose-500 to-pink-500", href: "/admin/rentals" },
    { label: "View Analytics", icon: BarChart3, color: "from-blue-500 to-cyan-500", href: "/admin/analytics" },
    { label: "Send Campaign", icon: Zap, color: "from-fuchsia-500 to-purple-500", href: "/admin/marketing" },
  ];

  const recentActivity = [
    { action: "New class booking", user: "Sarah M.", time: "2 min ago", icon: Calendar, color: "bg-emerald-100 text-emerald-600" },
    { action: "Order #1234 completed", user: "John D.", time: "15 min ago", icon: ShoppingBag, color: "bg-amber-100 text-amber-600" },
    { action: "Kitchen rental request", user: "Chef Ahmed", time: "1 hour ago", icon: Utensils, color: "bg-purple-100 text-purple-600" },
    { action: "New user registered", user: "Maria K.", time: "2 hours ago", icon: Users, color: "bg-blue-100 text-blue-600" },
    { action: "Payment received", user: "David L.", time: "3 hours ago", icon: CreditCard, color: "bg-green-100 text-green-600" },
  ];

  const popularClasses = [
    { name: "Middle Eastern Essentials", students: 45, revenue: "AED 20,250", fill: 95 },
    { name: "Bread Baking Masterclass", students: 38, revenue: "AED 13,300", fill: 80 },
    { name: "Thai Street Food", students: 32, revenue: "AED 12,800", fill: 70 },
    { name: "French Pastry Basics", students: 28, revenue: "AED 11,200", fill: 60 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-stone-900 via-stone-700 to-stone-900 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-stone-500 mt-1">Welcome back! Here&apos;s your business overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-xl bg-white border border-stone-200 hover:border-amber-300 hover:shadow-md transition-all">
            <Bell className="h-5 w-5 text-stone-600" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Users Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-6 text-white shadow-lg hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                <Users className="h-5 w-5" />
              </div>
              <span className="flex items-center text-sm font-medium text-green-300">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                12%
              </span>
            </div>
            <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
            <p className="text-sm text-white/70 mt-1">Total Users</p>
            <div className="flex items-end gap-1 mt-4 h-8">
              {[40, 70, 45, 90, 60, 80, 95].map((h, i) => (
                <div key={i} className="flex-1 bg-white/30 rounded-t-sm group-hover:bg-white/40 transition-all" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Bookings Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-lg hover:shadow-xl hover:shadow-emerald-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                <Calendar className="h-5 w-5" />
              </div>
              <span className="flex items-center text-sm font-medium text-green-300">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                8%
              </span>
            </div>
            <p className="text-3xl font-bold">{stats?.totalBookings || 0}</p>
            <p className="text-sm text-white/70 mt-1">Class Bookings</p>
            <div className="flex items-end gap-1 mt-4 h-8">
              {[60, 40, 80, 50, 70, 90, 65].map((h, i) => (
                <div key={i} className="flex-1 bg-white/30 rounded-t-sm group-hover:bg-white/40 transition-all" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Orders Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FF8C6B] to-[#ff7a54] p-6 text-white shadow-lg hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <span className="flex items-center text-sm font-medium text-green-300">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                23%
              </span>
            </div>
            <p className="text-3xl font-bold">{stats?.totalOrders || 0}</p>
            <p className="text-sm text-white/70 mt-1">Total Orders</p>
            <div className="flex items-end gap-1 mt-4 h-8">
              {[30, 50, 40, 70, 85, 60, 90].map((h, i) => (
                <div key={i} className="flex-1 bg-white/30 rounded-t-sm group-hover:bg-white/40 transition-all" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Leads Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 p-6 text-white shadow-lg hover:shadow-xl hover:shadow-rose-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                <Target className="h-5 w-5" />
              </div>
              <span className="flex items-center text-sm font-medium text-red-300">
                <ArrowDownRight className="h-4 w-4 mr-1" />
                3%
              </span>
            </div>
            <p className="text-3xl font-bold">{stats?.totalLeads || 0}</p>
            <p className="text-sm text-white/70 mt-1">Active Leads</p>
            <div className="flex items-end gap-1 mt-4 h-8">
              {[80, 60, 70, 50, 40, 55, 45].map((h, i) => (
                <div key={i} className="flex-1 bg-white/30 rounded-t-sm group-hover:bg-white/40 transition-all" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-stone-900">Revenue Overview</h3>
                <p className="text-sm text-stone-500">Monthly performance</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 text-sm font-medium text-amber-600 bg-amber-50 rounded-lg">Month</button>
                <button className="px-3 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-50 rounded-lg">Quarter</button>
                <button className="px-3 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-50 rounded-lg">Year</button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-end justify-between gap-3 h-48">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => {
                const heights = [45, 65, 50, 80, 60, 75, 90, 70, 85, 95, 80, 88];
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-2">
                    <div 
                      className="w-full bg-gradient-to-t from-amber-500 to-amber-300 rounded-t-lg hover:from-amber-600 hover:to-amber-400 transition-all cursor-pointer"
                      style={{ height: `${heights[i]}%` }}
                    />
                    <span className="text-xs text-stone-400">{month}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-sm text-stone-600">Classes Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-stone-600">Kitchen Rentals</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-sm text-stone-600">Product Sales</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100">
            <h3 className="font-semibold text-stone-900">Quick Actions</h3>
          </div>
          <div className="p-4 space-y-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-stone-50 transition-all group"
              >
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${action.color} text-white shadow-lg`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <span className="flex-1 text-sm font-medium text-stone-700 group-hover:text-stone-900">{action.label}</span>
                <ArrowUpRight className="h-4 w-4 text-stone-400 group-hover:text-amber-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#FF8C6B] to-[#ff7a54] text-white">
                <Activity className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-stone-900">Recent Activity</h3>
            </div>
            <button className="text-sm text-amber-600 hover:text-amber-700 font-medium">View all</button>
          </div>
          <div className="divide-y divide-stone-100">
            {recentActivity.map((item, i) => (
              <div key={i} className="p-4 hover:bg-stone-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl ${item.color}`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{item.action}</p>
                    <p className="text-xs text-stone-500">{item.user}</p>
                  </div>
                  <span className="text-xs text-stone-400 whitespace-nowrap">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Classes */}
        <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 text-white">
                <ChefHat className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-stone-900">Popular Classes</h3>
            </div>
            <button className="text-sm text-amber-600 hover:text-amber-700 font-medium">View all</button>
          </div>
          <div className="p-4 space-y-4">
            {popularClasses.map((course, i) => (
              <div key={i} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-stone-900 group-hover:text-amber-600 transition-colors">{course.name}</p>
                    <p className="text-xs text-stone-500">{course.students} students</p>
                  </div>
                  <span className="text-sm font-semibold text-stone-700">{course.revenue}</span>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#FF8C6B] to-[#ff7a54] rounded-full transition-all group-hover:from-[#ffa891] group-hover:to-[#FF8C6B]"
                    style={{ width: `${course.fill}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
