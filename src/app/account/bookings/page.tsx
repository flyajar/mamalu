"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  Upload,
  RefreshCw,
  ChefHat,
  Receipt,
  ExternalLink,
  Bell,
  BellOff,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDate } from "@/lib/utils";

interface Booking {
  id: string;
  booking_type?: "class" | "service";
  booking_number: string;
  class_id?: string;
  class_title?: string;
  service_name?: string;
  package_name?: string | null;
  menu_name?: string | null;
  instructor_name: string | null;
  status: string;
  payment_status?: string;
  payment_type?: string;
  payment_method?: string;
  sessions_booked?: number;
  total_sessions?: number;
  total_amount: number;
  amount_paid?: number;
  amount_due?: number;
  deposit_amount?: number | null;
  balance_amount?: number | null;
  guest_count?: number;
  paid_at: string | null;
  receipt_url: string | null;
  receipt_verified?: boolean;
  payment_link: string | null;
  start_date: string | null;
  event_date?: string | null;
  event_time?: string | null;
  created_at: string;
  notes: string | null;
  reminder_enabled?: boolean;
  stripe_checkout_session_id: string | null;
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/bookings");
      if (res.ok) {
        const data = await res.json();
        const serviceBookings = (data.serviceBookings || []).map((booking: Booking) => ({
          ...booking,
          booking_type: "service" as const,
        }));
        const classBookings = (data.classBookings || []).map((booking: Booking) => ({
          ...booking,
          booking_type: "class" as const,
        }));
        const combined = [...serviceBookings, ...classBookings].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setBookings(combined);
      } else {
        setError("Failed to load bookings");
      }
    } catch {
      setError("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptUpload = async (bookingId: string, file: File) => {
    setUploadingReceipt(bookingId);
    try {
      const formData = new FormData();
      formData.append("receipt", file);
      formData.append("bookingId", bookingId);

      const res = await fetch("/api/payments/upload-receipt", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        fetchBookings();
      } else {
        alert("Failed to upload receipt");
      }
    } catch {
      alert("Failed to upload receipt");
    } finally {
      setUploadingReceipt(null);
    }
  };

  const handlePayNow = async (bookingId: string) => {
    try {
      const res = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        alert("Failed to create payment session");
      }
    } catch {
      alert("Failed to create payment session");
    }
  };

  const verifyPayment = async (bookingId: string) => {
    try {
      const res = await fetch("/api/payments/verify-stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          alert(data.message);
          fetchBookings();
        } else {
          alert(data.message || "Payment not found");
        }
      }
    } catch {
      alert("Failed to verify payment");
    }
  };

  const toggleReminder = async (bookingId: string, enabled: boolean) => {
    try {
      const res = await fetch("/api/user/bookings/reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, enabled }),
      });

      if (res.ok) {
        fetchBookings();
        alert(enabled ? "Reminder enabled! You will be notified before your class." : "Reminder disabled.");
      }
    } catch {
      alert("Failed to update reminder");
    }
  };

  const getStatusBadge = (booking: Booking) => {
    if ((booking.status === "confirmed" || booking.payment_status === "paid") && booking.paid_at) {
      return (
        <Badge className="bg-green-100 text-green-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          Confirmed & Paid
        </Badge>
      );
    }
    if (booking.status === "confirmed") {
      return (
        <Badge className="bg-green-100 text-green-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          Confirmed
        </Badge>
      );
    }
    if (booking.status === "pending" || booking.payment_status === "pending" || booking.payment_status === "deposit_pending") {
      if (booking.payment_method === "cash" && booking.receipt_url && !booking.receipt_verified) {
        return (
          <Badge className="bg-amber-100 text-amber-700">
            <Clock className="h-3 w-3 mr-1" />
            Receipt Under Review
          </Badge>
        );
      }
      return (
        <Badge className="bg-amber-100 text-amber-700">
          <AlertCircle className="h-3 w-3 mr-1" />
          Pending Payment
        </Badge>
      );
    }
    if (booking.status === "cancelled") {
      return (
        <Badge className="bg-red-100 text-red-700">
          <XCircle className="h-3 w-3 mr-1" />
          Cancelled
        </Badge>
      );
    }
    if (booking.status === "completed") {
      return (
        <Badge className="bg-blue-100 text-blue-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    }
    return <Badge className="bg-stone-100 text-stone-700">{booking.status}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 py-12">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/account"
            className="inline-flex items-center text-amber-600 hover:text-amber-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Account
          </Link>
          <h1 className="text-3xl font-bold text-stone-900">My Bookings</h1>
          <p className="text-stone-500 mt-1">View and manage your class bookings</p>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {bookings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-stone-300 mx-auto mb-4" />
              <h3 className="font-semibold text-stone-900 mb-2">No bookings yet</h3>
              <p className="text-stone-500 mb-4">
                You haven&apos;t booked any classes yet. Browse our classes to get started!
              </p>
              <Button onClick={() => window.dispatchEvent(new CustomEvent("openMamaluMenu"))}>Browse Classes</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-amber-100 rounded-lg">
                            <ChefHat className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-stone-900">
                              {booking.class_title || [booking.service_name, booking.package_name || booking.menu_name].filter(Boolean).join(" - ")}
                            </h3>
                            <p className="text-sm text-stone-500">
                              Booking #{booking.booking_number}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-stone-500">{booking.booking_type === "service" ? "Guests" : "Sessions"}</p>
                            <p className="font-medium">
                              {booking.booking_type === "service"
                                ? booking.guest_count || 1
                                : `${booking.sessions_booked || 1} of ${booking.total_sessions || 1}`}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-stone-500">Total Amount</p>
                            <p className="font-medium">{formatPrice(booking.total_amount)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-stone-500">Payment</p>
                            <p className="font-medium capitalize">
                              {booking.payment_status || booking.payment_method || "Pending"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-stone-500">{booking.event_date ? "Event Date" : "Booked On"}</p>
                            <p className="font-medium">{formatDate(booking.event_date || booking.start_date || booking.created_at)}</p>
                          </div>
                        </div>

                        {booking.instructor_name && (
                          <p className="text-sm text-stone-500 mt-3">
                            Instructor: {booking.instructor_name}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        {getStatusBadge(booking)}
                      </div>
                    </div>
                  </div>

                  {/* Action Bar */}
                  {booking.booking_type === "class" && booking.status === "pending" && !booking.paid_at && (
                    <div className="bg-stone-50 border-t px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="text-stone-500">Amount Due: </span>
                          <span className="font-semibold text-amber-600">
                            {formatPrice(booking.amount_due || booking.total_amount)}
                          </span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {/* If Stripe payment initiated but not confirmed, show verify button */}
                          {booking.stripe_checkout_session_id && booking.payment_method === "stripe" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => verifyPayment(booking.id)}
                            >
                              <RotateCw className="h-4 w-4 mr-2" />
                              Verify Payment
                            </Button>
                          )}
                          
                          {/* If no receipt uploaded yet, show both options */}
                          {!booking.receipt_url && !booking.stripe_checkout_session_id && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handlePayNow(booking.id)}
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Pay with Card
                              </Button>
                              <label>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={uploadingReceipt === booking.id}
                                  asChild
                                >
                                  <span>
                                    {uploadingReceipt === booking.id ? (
                                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <Upload className="h-4 w-4 mr-2" />
                                    )}
                                    Upload Receipt
                                  </span>
                                </Button>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*,.pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleReceiptUpload(booking.id, file);
                                  }}
                                />
                              </label>
                            </>
                          )}

                          {/* If receipt uploaded but not verified */}
                          {booking.receipt_url && !booking.receipt_verified && (
                            <div className="flex items-center gap-2 text-sm">
                              <Receipt className="h-4 w-4 text-amber-500" />
                              <span className="text-amber-600">Receipt submitted - awaiting verification</span>
                              <a
                                href={booking.receipt_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          )}

                          {/* If there's a payment link from invoice */}
                          {booking.payment_link && (
                            <a href={booking.payment_link} target="_blank" rel="noopener noreferrer">
                              <Button size="sm">
                                <CreditCard className="h-4 w-4 mr-2" />
                                Pay Now
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Paid confirmation with reminder toggle */}
                  {booking.paid_at && booking.booking_type === "class" && (
                    <div className="bg-green-50 border-t border-green-100 px-6 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-green-700 text-sm">
                          <CheckCircle className="h-4 w-4" />
                          <span>Paid on {formatDate(booking.paid_at)}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleReminder(booking.id, !booking.reminder_enabled)}
                          className={booking.reminder_enabled ? "text-amber-600" : "text-stone-400"}
                        >
                          {booking.reminder_enabled ? (
                            <>
                              <Bell className="h-4 w-4 mr-1" />
                              Reminder On
                            </>
                          ) : (
                            <>
                              <BellOff className="h-4 w-4 mr-1" />
                              Set Reminder
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
