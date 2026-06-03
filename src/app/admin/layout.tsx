import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/shell";

export const metadata = {
  title: {
    default: "Admin Portal | Mamalu Kitchen",
    template: "%s | Admin Portal",
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get the current path to skip auth for login/unauthorized pages
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  
  // Skip auth check for public admin pages
  const publicPaths = ["/admin/login", "/admin/unauthorized"];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  
  if (isPublicPath) {
    return <>{children}</>;
  }

  const supabase = await createClient();
  
  // Check if Supabase is configured
  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
          <h1 className="text-2xl font-bold text-stone-900 mb-4">Supabase Not Configured</h1>
          <p className="text-stone-600">Please add your Supabase credentials to .env.local</p>
        </div>
      </div>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  // TEMPORARY: Allow wilson@mutant.ae direct access while debugging
  const isWilson = user.email === "wilson@mutant.ae";
  
  // Check if user has admin access
  const adminRoles = ["staff", "admin", "super_admin"];
  if (!isWilson && (!profile || !adminRoles.includes(profile.role))) {
    redirect("/admin/unauthorized");
  }

  // Use profile data or defaults for wilson
  const userRole = profile?.role || (isWilson ? "super_admin" : "customer");
  const userName = profile?.full_name || (isWilson ? "Wilson Admin" : user.email || "");

  return (
    <AdminShell
      userRole={userRole}
      user={{
        email: user.email || "",
        name: userName,
        avatar: profile?.avatar_url,
        role: userRole,
      }}
    >
      {children}
    </AdminShell>
  );
}
