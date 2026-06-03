"use client";

import { useState } from "react";
import { 
  CreditCard, 
  Plus, 
  Search,
  Users,
  DollarSign,
  TrendingUp,
  Crown,
  Star,
  Zap,
  Gift,
  CheckCircle,
  XCircle,
  Eye,
  Edit3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDate } from "@/lib/utils";

const membershipPlans = [
  {
    id: '1',
    name: 'Basic',
    icon: Star,
    price: 299,
    period: 'month',
    color: 'from-stone-500 to-stone-600',
    features: ['2 classes/month', '5% product discount', 'Recipe access'],
    activeMembers: 45,
    revenue: 13455,
  },
  {
    id: '2',
    name: 'Premium',
    icon: Crown,
    price: 599,
    period: 'month',
    color: 'from-[#FF8C6B] to-[#ff7a54]',
    features: ['5 classes/month', '10% product discount', 'Priority booking', 'Free recipe book'],
    activeMembers: 28,
    revenue: 16772,
  },
  {
    id: '3',
    name: 'VIP',
    icon: Zap,
    price: 999,
    period: 'month',
    color: 'from-violet-500 to-purple-600',
    features: ['Unlimited classes', '20% product discount', 'Kitchen rental discount', 'Exclusive events', 'Personal chef consultation'],
    activeMembers: 12,
    revenue: 11988,
  },
];

const mockMembers = [
  { id: '1', name: 'Sarah Al Maktoum', email: 'sarah@email.com', plan: 'VIP', status: 'active', startDate: '2024-06-15', nextBilling: '2025-01-15', totalSpent: 8994 },
  { id: '2', name: 'Ahmed Hassan', email: 'ahmed@company.ae', plan: 'Premium', status: 'active', startDate: '2024-08-01', nextBilling: '2025-01-01', totalSpent: 2995 },
  { id: '3', name: 'Maria Santos', email: 'maria@gmail.com', plan: 'Basic', status: 'active', startDate: '2024-10-20', nextBilling: '2024-12-20', totalSpent: 598 },
  { id: '4', name: 'John Peterson', email: 'john@hotel.com', plan: 'Premium', status: 'cancelled', startDate: '2024-03-01', nextBilling: null, totalSpent: 4194 },
  { id: '5', name: 'Fatima Khalid', email: 'fatima@startup.io', plan: 'Basic', status: 'expiring', startDate: '2024-01-15', nextBilling: '2024-12-15', totalSpent: 3289 },
];

const stats = [
  { label: 'Active Members', value: '85', change: '+12', icon: Users, color: 'from-violet-500 to-purple-600' },
  { label: 'Monthly Revenue', value: 'AED 42,215', change: '+8%', icon: DollarSign, color: 'from-emerald-500 to-teal-600' },
  { label: 'Retention Rate', value: '94%', change: '+2%', icon: TrendingUp, color: 'from-[#FF8C6B] to-[#ff7a54]' },
  { label: 'Avg Lifetime Value', value: 'AED 4,850', change: '+15%', icon: Gift, color: 'from-cyan-500 to-blue-600' },
];

export default function MembershipsPage() {
  const [tab, setTab] = useState<'members' | 'plans'>('members');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'expiring': return 'bg-amber-100 text-amber-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-stone-100 text-stone-700';
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'VIP': return 'bg-violet-100 text-violet-700';
      case 'Premium': return 'bg-amber-100 text-amber-700';
      case 'Basic': return 'bg-stone-100 text-stone-700';
      default: return 'bg-stone-100 text-stone-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Memberships</h1>
          <p className="text-stone-500 mt-1">Manage subscription plans and members</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`rounded-2xl bg-gradient-to-br ${stat.color} p-5 text-white`}>
              <div className="flex items-center justify-between mb-3">
                <Icon className="h-6 w-6 opacity-80" />
                <span className="text-sm bg-white/20 px-2 py-0.5 rounded-full">{stat.change}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm opacity-80">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200">
        <button
          onClick={() => setTab('members')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'members' ? 'border-amber-500 text-amber-600' : 'border-transparent text-stone-500'
          }`}
        >
          Members
        </button>
        <button
          onClick={() => setTab('plans')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'plans' ? 'border-amber-500 text-amber-600' : 'border-transparent text-stone-500'
          }`}
        >
          Plans
        </button>
      </div>

      {tab === 'members' && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="relative min-w-0 flex-1 basis-full sm:basis-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input type="text" placeholder="Search members..." className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg text-sm" />
                </div>
                <select className="px-4 py-2 border border-stone-200 rounded-lg text-sm">
                  <option>All Plans</option>
                  <option>Basic</option>
                  <option>Premium</option>
                  <option>VIP</option>
                </select>
                <select className="px-4 py-2 border border-stone-200 rounded-lg text-sm">
                  <option>All Status</option>
                  <option>Active</option>
                  <option>Expiring</option>
                  <option>Cancelled</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4">Member</th>
                    <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4">Plan</th>
                    <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4">Status</th>
                    <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4">Next Billing</th>
                    <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4">Total Spent</th>
                    <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {mockMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-stone-50 group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-medium">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-stone-900">{member.name}</p>
                            <p className="text-sm text-stone-500">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={getPlanBadge(member.plan)}>{member.plan}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={getStatusBadge(member.status)}>
                          {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-stone-700">
                          {member.nextBilling ? formatDate(member.nextBilling) : '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-stone-900">{formatPrice(member.totalSpent)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm"><Edit3 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {tab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {membershipPlans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card key={plan.id} className="overflow-hidden">
                <div className={`bg-gradient-to-br ${plan.color} p-6 text-white`}>
                  <Icon className="h-10 w-10 mb-4" />
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{formatPrice(plan.price)}</span>
                    <span className="text-sm opacity-80">/{plan.period}</span>
                  </div>
                </div>
                <CardContent className="p-6">
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-stone-600">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="pt-4 border-t border-stone-100 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">Active Members</span>
                      <span className="font-medium">{plan.activeMembers}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">Monthly Revenue</span>
                      <span className="font-medium">{formatPrice(plan.revenue)}</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4">Edit Plan</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
