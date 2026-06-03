"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { AdminHeader } from "@/components/admin/header";
import { AdminSidebar } from "@/components/admin/sidebar";

interface AdminShellProps {
  children: React.ReactNode;
  userRole: string;
  user: {
    email: string;
    name: string;
    avatar?: string;
    role: string;
  };
}

export function AdminShell({ children, userRole, user }: AdminShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="admin-shell flex h-screen w-full max-w-full overflow-hidden bg-stone-100 [&_*]:font-bold">
      <div className="hidden lg:block">
        <AdminSidebar userRole={userRole} />
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-stone-950/50"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="relative h-full w-[min(84vw,20rem)] shadow-2xl">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute right-3 top-3 z-10 rounded-lg p-2 text-stone-300 hover:bg-stone-800 hover:text-white"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <AdminSidebar userRole={userRole} onNavigate={() => setIsSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 max-w-full flex-1 flex-col overflow-hidden">
        <AdminHeader user={user} onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
          <div className="min-w-0 max-w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
