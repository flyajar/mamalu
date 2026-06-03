"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Warehouse, 
  Plus, 
  Search, 
  Calendar,
  Clock,
  User,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit3,
  MapPin,
  Utensils
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDate } from "@/lib/utils";

const mockBookings = [
  {
    id: '1',
    renter: 'Cloud Kitchen Co.',
    contact: 'Ahmed Al Fahim',
    station: 'Station A - Full Kitchen',
    date: '2024-12-06',
    shift: 'Morning (6AM - 2PM)',
    hours: 8,
    rate: 150,
    total: 1200,
    status: 'active',
    recurring: true,
  },
  {
    id: '2',
    renter: 'Homemade Delights',
    contact: 'Sara Mohammed',
    station: 'Station B - Prep Kitchen',
    date: '2024-12-06',
    shift: 'Evening (2PM - 10PM)',
    hours: 8,
    rate: 120,
    total: 960,
    status: 'confirmed',
    recurring: false,
  },
  {
    id: '3',
    renter: 'Gourmet Events LLC',
    contact: 'Michael Peters',
    station: 'Full Facility',
    date: '2024-12-08',
    shift: 'Full Day (6AM - 10PM)',
    hours: 16,
    rate: 200,
    total: 3200,
    status: 'pending',
    recurring: false,
  },
  {
    id: '4',
    renter: 'Cake Masters',
    contact: 'Lisa Chen',
    station: 'Baking Studio',
    date: '2024-12-07',
    shift: 'Morning (6AM - 2PM)',
    hours: 8,
    rate: 130,
    total: 1040,
    status: 'confirmed',
    recurring: true,
  },
];

const stations = [
  { name: 'Station A - Full Kitchen', status: 'occupied', currentRenter: 'Cloud Kitchen Co.', rate: 150 },
  { name: 'Station B - Prep Kitchen', status: 'available', currentRenter: null, rate: 120 },
  { name: 'Baking Studio', status: 'available', currentRenter: null, rate: 130 },
  { name: 'Cold Kitchen', status: 'maintenance', currentRenter: null, rate: 100 },
];

const stats = [
  { label: 'Active Rentals', value: '8', icon: Warehouse, color: 'from-violet-500 to-purple-600' },
  { label: 'This Month Revenue', value: 'AED 28,400', icon: DollarSign, color: 'from-emerald-500 to-teal-600' },
  { label: 'Occupancy Rate', value: '72%', icon: CheckCircle, color: 'from-[#FF8C6B] to-[#ff7a54]' },
  { label: 'Recurring Clients', value: '12', icon: User, color: 'from-cyan-500 to-blue-600' },
];

export default function RentalsPage() {
  const [tab, setTab] = useState<'bookings' | 'stations'>('bookings');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'confirmed': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'occupied': return 'bg-amber-100 text-amber-700';
      case 'available': return 'bg-green-100 text-green-700';
      case 'maintenance': return 'bg-red-100 text-red-700';
      default: return 'bg-stone-100 text-stone-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Kitchen Rental</h1>
          <p className="text-stone-500 mt-1">Manage kitchen bookings and stations</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/rentals/assets">
            <Button variant="outline">Manage Assets</Button>
          </Link>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`rounded-2xl bg-gradient-to-br ${stat.color} p-5 text-white`}>
              <Icon className="h-6 w-6 opacity-80 mb-3" />
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm opacity-80">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200">
        <button
          onClick={() => setTab('bookings')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'bookings' ? 'border-amber-500 text-amber-600' : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          Bookings
        </button>
        <button
          onClick={() => setTab('stations')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'stations' ? 'border-amber-500 text-amber-600' : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          Stations
        </button>
      </div>

      {tab === 'bookings' && (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="relative min-w-0 flex-1 basis-full sm:basis-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search bookings..."
                    className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg text-sm"
                  />
                </div>
                <select className="px-4 py-2 border border-stone-200 rounded-lg text-sm">
                  <option>All Stations</option>
                  {stations.map(s => <option key={s.name}>{s.name}</option>)}
                </select>
                <select className="px-4 py-2 border border-stone-200 rounded-lg text-sm">
                  <option>All Status</option>
                  <option>Active</option>
                  <option>Confirmed</option>
                  <option>Pending</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Bookings List */}
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4">Renter</th>
                    <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4">Station</th>
                    <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4">Date & Shift</th>
                    <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4">Total</th>
                    <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4">Status</th>
                    <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {mockBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-stone-50 group">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-stone-900">{booking.renter}</p>
                          <p className="text-sm text-stone-500">{booking.contact}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Utensils className="h-4 w-4 text-stone-400" />
                          <span className="text-sm text-stone-700">{booking.station}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-stone-900">{formatDate(booking.date)}</p>
                          <p className="text-sm text-stone-500">{booking.shift}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-stone-900">{formatPrice(booking.total)}</p>
                        <p className="text-xs text-stone-500">{booking.hours}h × {formatPrice(booking.rate)}/h</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusBadge(booking.status)}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </Badge>
                          {booking.recurring && (
                            <Badge variant="outline" className="text-xs">Recurring</Badge>
                          )}
                        </div>
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

      {tab === 'stations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stations.map((station) => (
            <Card key={station.name} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-amber-100">
                      <Warehouse className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-stone-900">{station.name}</h3>
                      <p className="text-sm text-stone-500">{formatPrice(station.rate)}/hour</p>
                    </div>
                  </div>
                  <Badge className={getStatusBadge(station.status)}>
                    {station.status.charAt(0).toUpperCase() + station.status.slice(1)}
                  </Badge>
                </div>
                {station.currentRenter && (
                  <div className="p-3 bg-stone-50 rounded-lg">
                    <p className="text-sm text-stone-500">Current Renter</p>
                    <p className="font-medium text-stone-900">{station.currentRenter}</p>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1">View Schedule</Button>
                  <Button size="sm" className="flex-1">Book Now</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
