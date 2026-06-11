"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Recipient {
  id: string;
  email: string;
  is_enabled: boolean;
  created_at: string;
}

interface DeliveryLog {
  id: string;
  event_type: string;
  recipient_email: string;
  subject: string;
  status: "sent" | "failed";
  error_message?: string | null;
  created_at: string;
}

const eventLabels: Record<string, string> = {
  class_booking: "Class booking",
  service_booking: "Item booking",
  rental_booking: "Rental booking",
  rental_inquiry: "Rental inquiry",
  product_order: "Product order",
  test: "Test",
};

export default function AdminNotificationsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const enabledCount = useMemo(
    () => recipients.filter((recipient) => recipient.is_enabled).length,
    [recipients]
  );

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/notifications", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load notifications");
      if (data.settingsAvailable === false) {
        throw new Error("Notification tables are not available. Apply the latest database migration.");
      }
      setRecipients(data.recipients || []);
      setLogs(data.deliveryLogs || []);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to load notifications" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function addRecipient(event: FormEvent) {
    event.preventDefault();
    setAdding(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add email");
      setEmail("");
      setMessage({ type: "success", text: `${data.recipient.email} will receive new customer notifications.` });
      await loadSettings();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to add email" });
    } finally {
      setAdding(false);
    }
  }

  async function toggleRecipient(recipient: Recipient) {
    setWorkingId(recipient.id);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: recipient.id, is_enabled: !recipient.is_enabled }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update email");
      setRecipients((current) =>
        current.map((item) => (item.id === recipient.id ? data.recipient : item))
      );
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to update email" });
    } finally {
      setWorkingId(null);
    }
  }

  async function deleteRecipient(recipient: Recipient) {
    if (!window.confirm(`Remove ${recipient.email} from admin notifications?`)) return;
    setWorkingId(recipient.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/notifications?id=${encodeURIComponent(recipient.id)}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to delete email");
      setRecipients((current) => current.filter((item) => item.id !== recipient.id));
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to delete email" });
    } finally {
      setWorkingId(null);
    }
  }

  async function sendTest(recipient: Recipient) {
    setWorkingId(recipient.id);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_test", email: recipient.email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Test notification failed");
      setMessage({ type: "success", text: `Test notification sent to ${recipient.email}.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Test notification failed" });
    } finally {
      setWorkingId(null);
      await loadSettings();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-stone-900">
            <BellRing className="h-8 w-8 text-[#FF7A5C]" />
            Admin Notifications
          </h1>
          <p className="mt-1 text-stone-500">
            Email the team when customers create bookings, rentals, or product orders.
          </p>
        </div>
        <Button variant="outline" onClick={loadSettings} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {message && (
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
          message.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-red-200 bg-red-50 text-red-800"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 p-5">
            <h2 className="text-lg font-semibold text-stone-900">Notification recipients</h2>
            <p className="mt-1 text-sm text-stone-500">
              {enabledCount} of {recipients.length} email{recipients.length === 1 ? "" : "s"} enabled
            </p>
          </div>

          <form onSubmit={addRecipient} className="flex flex-col gap-3 border-b border-stone-200 bg-stone-50 p-5 sm:flex-row">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@mamalukitchen.com"
                required
                className="h-10 w-full rounded-md border border-stone-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#FF7A5C] focus:ring-2 focus:ring-[#FF7A5C]/20"
              />
            </div>
            <Button type="submit" disabled={adding || !email.trim()}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add email
            </Button>
          </form>

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-stone-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading notification settings...
            </div>
          ) : recipients.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="mx-auto h-10 w-10 text-stone-300" />
              <p className="mt-3 font-semibold text-stone-800">No notification emails yet</p>
              <p className="mt-1 text-sm text-stone-500">Add the first recipient above.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {recipients.map((recipient) => (
                <div key={recipient.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-stone-900">{recipient.email}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      Added {new Date(recipient.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleRecipient(recipient)}
                      disabled={workingId === recipient.id}
                      className={`relative h-7 w-12 rounded-full transition-colors ${
                        recipient.is_enabled ? "bg-emerald-500" : "bg-stone-300"
                      }`}
                      aria-label={`${recipient.is_enabled ? "Disable" : "Enable"} ${recipient.email}`}
                    >
                      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        recipient.is_enabled ? "translate-x-6" : "translate-x-1"
                      }`} />
                    </button>
                    <span className={`w-16 text-sm ${recipient.is_enabled ? "text-emerald-700" : "text-stone-500"}`}>
                      {recipient.is_enabled ? "Enabled" : "Disabled"}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => sendTest(recipient)}
                      disabled={workingId === recipient.id}
                    >
                      {workingId === recipient.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Test
                    </Button>
                    <button
                      type="button"
                      onClick={() => deleteRecipient(recipient)}
                      disabled={workingId === recipient.id}
                      className="rounded-md p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      aria-label={`Delete ${recipient.email}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="h-fit rounded-2xl border border-orange-200 bg-orange-50 p-5">
          <h2 className="font-semibold text-stone-900">Events included</h2>
          <div className="mt-4 space-y-3 text-sm text-stone-700">
            {["Class and item bookings", "Kitchen rental bookings", "Rental inquiries", "Paid product orders"].map((label) => (
              <div key={label} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {label}
              </div>
            ))}
          </div>
          <p className="mt-5 border-t border-orange-200 pt-4 text-xs leading-5 text-stone-600">
            Disabled emails stay in the list but receive nothing until they are enabled again.
          </p>
        </aside>
      </div>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 p-5">
          <h2 className="text-lg font-semibold text-stone-900">Recent deliveries</h2>
          <p className="mt-1 text-sm text-stone-500">The latest 50 notification attempts.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
              <tr>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Event</th>
                <th className="px-5 py-3">Recipient</th>
                <th className="px-5 py-3">Subject</th>
                <th className="px-5 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-stone-500">
                    No notifications have been sent yet.
                  </td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="text-sm">
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
                        log.status === "sent" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      }`}
                      title={log.error_message || undefined}
                    >
                      {log.status === "sent" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      {log.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-stone-700">{eventLabels[log.event_type] || log.event_type}</td>
                  <td className="px-5 py-4 font-medium text-stone-900">{log.recipient_email}</td>
                  <td className="max-w-sm truncate px-5 py-4 text-stone-600">{log.subject}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-stone-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
