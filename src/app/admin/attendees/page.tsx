"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, CheckCircle, Clock, XCircle, RefreshCw, Search, TrendingUp } from "lucide-react";

interface Booking {
  id: string;
  booking_number: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone: string;
  class_id: string;
  class_title: string;
  sessions_booked: number;
  total_amount: number;
  status: string;
  paid_at: string | null;
  checked_in_at: string | null;
  created_at: string;
  number_of_guests: number;
  guests_checked_in: number;
}

interface ClassOption {
  id: string;
  title: string;
  date: string;
}

export default function AttendeesPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchBookings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedClass !== "all") params.set("class_id", selectedClass);
      if (statusFilter !== "all") params.set("status", statusFilter);
      
      const res = await fetch(`/api/admin/attendees?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, statusFilter]);

  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/admin/classes/list");
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error("Failed to fetch classes:", error);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Auto-refresh every 10 seconds for real-time updates
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchBookings();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchBookings]);

  const filteredBookings = bookings.filter(booking => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      booking.attendee_name.toLowerCase().includes(query) ||
      booking.attendee_email.toLowerCase().includes(query) ||
      booking.booking_number.toLowerCase().includes(query)
    );
  });

  const stats = {
    totalBookings: filteredBookings.length,
    confirmed: filteredBookings.filter(b => b.status === "confirmed").length,
    pending: filteredBookings.filter(b => b.status === "pending").length,
    // Headcount stats
    totalGuests: filteredBookings.reduce((sum, b) => sum + (b.number_of_guests || 1), 0),
    guestsCheckedIn: filteredBookings.reduce((sum, b) => sum + (b.guests_checked_in || 0), 0),
    bookingsFullyCheckedIn: filteredBookings.filter(b => b.checked_in_at).length,
  };

  const checkInRate = stats.totalGuests > 0 
    ? Math.round((stats.guestsCheckedIn / stats.totalGuests) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-stone-200 rounded w-1/4"></div>
          <div className="h-32 bg-stone-200 rounded"></div>
          <div className="h-64 bg-stone-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Event Attendees</h1>
          <p className="text-stone-600">Track bookings and check-in status in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh 
                ? "bg-green-100 text-green-700 hover:bg-green-200" 
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </button>
          <button
            onClick={fetchBookings}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-stone-600 text-sm">Total Bookings</span>
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold">{stats.totalBookings}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-stone-600 text-sm">Total Guests</span>
            <Users className="h-5 w-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600">{stats.totalGuests}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-stone-600 text-sm">Guests Checked In</span>
            <TrendingUp className="h-5 w-5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {stats.guestsCheckedIn}
            <span className="text-sm font-normal text-stone-500 ml-2">({checkInRate}%)</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-stone-600 text-sm">Confirmed</span>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-stone-600 text-sm">Pending</span>
            <Clock className="h-5 w-5 text-stone-400" />
          </div>
          <div className="text-2xl font-bold text-stone-500">{stats.pending}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, email, or booking #"
                className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Class/Event</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="checked_in">Checked In</option>
              <option value="not_checked_in">Not Checked In</option>
            </select>
          </div>
        </div>
        <div className="mt-3 text-xs text-stone-500 flex items-center gap-2">
          <Clock className="h-3 w-3" />
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      </div>

      {/* Attendees Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-stone-700">Attendee</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-stone-700">Booking #</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-stone-700">Class</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-stone-700">Guests</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-stone-700">Status</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-stone-700">Check-In</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                    No bookings found
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} className={`hover:bg-stone-50 ${booking.checked_in_at ? "bg-green-50/50" : ""}`}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-stone-900">{booking.attendee_name}</p>
                        <p className="text-sm text-stone-500">{booking.attendee_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm">{booking.booking_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{booking.class_title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {booking.guests_checked_in || 0}/{booking.number_of_guests || 1}
                        </span>
                        {(booking.number_of_guests || 1) > 1 && (
                          <div className="w-16 h-2 bg-stone-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded-full transition-all"
                              style={{ 
                                width: `${((booking.guests_checked_in || 0) / (booking.number_of_guests || 1)) * 100}%` 
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        booking.status === "confirmed" 
                          ? "bg-green-100 text-green-700"
                          : booking.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-stone-100 text-stone-700"
                      }`}>
                        {booking.status === "confirmed" && <CheckCircle className="h-3 w-3" />}
                        {booking.status === "pending" && <Clock className="h-3 w-3" />}
                        {booking.status === "cancelled" && <XCircle className="h-3 w-3" />}
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {booking.checked_in_at ? (
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">
                            {new Date(booking.checked_in_at).toLocaleString([], {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ) : booking.status === "confirmed" ? (
                        <span className="text-sm text-stone-400">Not yet</span>
                      ) : (
                        <span className="text-sm text-stone-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
