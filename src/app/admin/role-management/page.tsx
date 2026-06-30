"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle, Save, Search, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AdminUser = {
  id: string;
  email: string;
  full_name?: string | null;
  role?: string | null;
};

const managedRoles = [
  { value: "super_admin", label: "Super Admin", color: "bg-red-100 text-red-700" },
  { value: "mall", label: "Mall", color: "bg-blue-100 text-blue-700" },
  { value: "accountant", label: "Accountant", color: "bg-emerald-100 text-emerald-700" },
  { value: "chef", label: "Chef", color: "bg-amber-100 text-amber-700" },
];

const getRoleLabel = (role?: string | null) =>
  managedRoles.find((item) => item.value === role)?.label || role || "customer";

const getRoleColor = (role?: string | null) =>
  managedRoles.find((item) => item.value === role)?.color || "bg-stone-100 text-stone-700";

export default function RoleManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/admin/users?limit=200");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load users");
        }

        const loadedUsers = data.users || [];
        setUsers(loadedUsers);
        setSelectedRoles(
          Object.fromEntries(
            loadedUsers.map((user: AdminUser) => [user.id, user.role || "customer"])
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const roleManagedUsers = users.filter((user) => (user.role || "customer") !== "customer");
    const term = search.trim().toLowerCase();
    if (!term) return roleManagedUsers;

    return roleManagedUsers.filter((user) =>
      [user.full_name, user.email, user.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [search, users]);

  const saveRole = async (user: AdminUser) => {
    if ((user.role || "customer") === "customer") return;

    const role = selectedRoles[user.id];
    if (!role || role === user.role) return;

    setSavingUserId(user.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      setUsers((prev) =>
        prev.map((item) => (item.id === user.id ? { ...item, role } : item))
      );
      setSuccess(`${user.full_name || user.email} is now ${getRoleLabel(role)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Role Management</h1>
        <p className="text-stone-600">Attach admin roles to users</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {managedRoles.map((role) => (
          <Card key={role.value}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-stone-500">{role.label}</p>
                <p className="text-2xl font-bold text-stone-900">
                  {users.filter((user) => user.role === role.value).length}
                </p>
              </div>
              <ShieldCheck className="h-5 w-5 text-stone-400" />
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle className="h-5 w-5 shrink-0" />
          {success}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-stone-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-lg border border-stone-300 py-2 pl-10 pr-4 text-sm"
                placeholder="Search users by name, email, or role..."
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-stone-200 bg-stone-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase text-stone-500">User</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase text-stone-500">Current Role</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase text-stone-500">Assign Role</th>
                  <th className="px-6 py-4 text-right text-xs font-medium uppercase text-stone-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-stone-500">
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-stone-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const selectedRole = selectedRoles[user.id] || user.role || "customer";
                    const isChanged = selectedRole !== (user.role || "customer");
                    const isCustomer = (user.role || "customer") === "customer";

                    return (
                      <tr key={user.id} className="hover:bg-stone-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-stone-900">{user.full_name || "No name"}</div>
                          <div className="text-sm text-stone-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getRoleColor(user.role)}`}>
                            {getRoleLabel(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={selectedRole}
                            onChange={(event) =>
                              setSelectedRoles((prev) => ({ ...prev, [user.id]: event.target.value }))
                            }
                            disabled={isCustomer}
                            className="w-full min-w-44 rounded-lg border border-stone-300 px-3 py-2 text-sm"
                          >
                            {isCustomer && <option value="customer">Customer</option>}
                            {managedRoles.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            onClick={() => saveRole(user)}
                            disabled={isCustomer || !isChanged || savingUserId === user.id}
                          >
                            <Save className="mr-2 h-4 w-4" />
                            {savingUserId === user.id ? "Saving..." : "Save"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
