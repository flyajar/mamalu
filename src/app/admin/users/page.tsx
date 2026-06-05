import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteUserButton } from "@/components/admin/delete-user-button";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Phone,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

async function getUsers() {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching users:", error.message, error.code, error.details);
    return [];
  }

  return data || [];
}

async function getCurrentUser() {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    role: profile?.role || "customer",
  };
}

const roleColors: Record<string, string> = {
  customer: "bg-stone-100 text-stone-700",
  student: "bg-blue-100 text-blue-700",
  renter: "bg-purple-100 text-purple-700",
  instructor: "bg-green-100 text-green-700",
  staff: "bg-amber-100 text-amber-700",
  admin: "bg-[#FF8C6B]/20 text-[#FF8C6B]",
  super_admin: "bg-red-100 text-red-700",
};

export default async function UsersPage() {
  const [users, currentUser] = await Promise.all([getUsers(), getCurrentUser()]);
  const canDeleteUsers = currentUser?.role === "super_admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Users & CRM</h1>
          <p className="text-stone-600">Manage customers, students, and renters</p>
        </div>
        <Link href="/admin/users/new">
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="min-w-0 flex-1 basis-full sm:basis-52">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone..."
                  className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <select className="px-4 py-2 border border-stone-300 rounded-lg text-sm">
              <option value="">All Roles</option>
              <option value="customer">Customers</option>
              <option value="student">Students</option>
              <option value="renter">Renters</option>
              <option value="instructor">Instructors</option>
              <option value="staff">Staff</option>
              <option value="admin">Admins</option>
            </select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left text-xs font-medium text-stone-500 uppercase px-6 py-4">User</th>
                  <th className="text-left text-xs font-medium text-stone-500 uppercase px-6 py-4">Role</th>
                  <th className="text-left text-xs font-medium text-stone-500 uppercase px-6 py-4">Contact</th>
                  <th className="text-left text-xs font-medium text-stone-500 uppercase px-6 py-4">Stats</th>
                  <th className="text-left text-xs font-medium text-stone-500 uppercase px-6 py-4">Joined</th>
                  <th className="text-left text-xs font-medium text-stone-500 uppercase px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-stone-500">
                      <Users className="h-12 w-12 mx-auto mb-4 text-stone-300" />
                      <p>No users found</p>
                      <p className="text-sm mt-1">Users will appear here once they sign up</p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-stone-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                            ) : (
                              <span className="text-amber-600 font-medium">
                                {(user.full_name || user.email)?.[0]?.toUpperCase() || "?"}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-stone-900">
                              {user.full_name || "No name"}
                            </div>
                            <div className="text-sm text-stone-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${roleColors[user.role] || roleColors.customer}`}>
                          {user.role || "customer"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-sm text-stone-600">
                          {user.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                          )}
                          {user.city && (
                            <div>{user.city}, {user.country}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-sm">
                          <div className="text-stone-900">
                            {user.total_classes_attended || 0} classes
                          </div>
                          <div className="text-stone-500">
                            AED {(user.total_spend || 0).toLocaleString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-600">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {user.role === "customer" && (
                            <Link href={`/admin/users/${user.id}`}>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </Link>
                          )}
                          {canDeleteUsers && currentUser?.id !== user.id && (
                            <DeleteUserButton
                              userId={user.id}
                              userName={user.full_name || user.email || "this user"}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
