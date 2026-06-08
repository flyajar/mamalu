"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  ShoppingBag,
  Package,
  BarChart3,
  ChefHat,
  Tags,
  UserPlus,
  Ticket,
  TicketPercent,
  FileText,
  Link as LinkIcon,
  Phone,
  ScanLine,
  ClipboardList,
  TrendingUp,
  Clock,
  Palette,
  PartyPopper,
  Newspaper,
  BookOpen,
} from "lucide-react";

interface AdminSidebarProps {
  userRole: string;
  onNavigate?: () => void;
}

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Mamalu Users", href: "/admin/users", icon: Users },
  { name: "Leads CRM", href: "/admin/leads", icon: UserPlus },
  { name: "Bookings", href: "/admin/bookings", icon: Ticket },
  { name: "Event Scanner", href: "/admin/scanner", icon: ScanLine },
  { name: "Attendees", href: "/admin/attendees", icon: ClipboardList },
  { name: "Invoices", href: "/admin/invoices", icon: FileText },
  { name: "Payment Links", href: "/admin/payment-links", icon: LinkIcon },
  { name: "Payment Tracking", href: "/admin/payment-tracking", icon: Clock },
  { name: "WhatsApp Monitor", href: "/admin/whatsapp", icon: Phone, superAdminOnly: true },
  { name: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { name: "Products", href: "/admin/products", icon: Package },
  { name: "Menu Items", href: "/admin/menu-items", icon: UtensilsCrossed },
  { name: "Time Slots", href: "/admin/time-slots", icon: Clock },
  { name: "Party Extras", href: "/admin/party-extras", icon: PartyPopper },
  { name: "Packages", href: "/admin/packages", icon: Package },
  { name: "Marketing", href: "/admin/marketing", icon: Tags, children: [
    { name: "Campaigns", href: "/admin/marketing" },
    { name: "Lists", href: "/admin/marketing/lists" },
    { name: "Discounts", href: "/admin/marketing/discounts" },
    { name: "Referrals", href: "/admin/marketing/referrals" },
  ]},
  { name: "Vouchers", href: "/admin/vouchers", icon: TicketPercent, children: [
    { name: "Gift Cards", href: "/admin/vouchers" },
    { name: "Purchases", href: "/admin/vouchers/purchases" },
  ]},
  { name: "Sales Report", href: "/admin/sales", icon: TrendingUp },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { name: "Blogs", href: "/admin/blogs", icon: BookOpen },
  { name: "Press", href: "/admin/press", icon: Newspaper },
  { name: "Site Content", href: "/admin/site-content", icon: Palette },
];

export function AdminSidebar({ userRole, onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();

  // Filter navigation items based on user role
  const filteredNavigation = navigation.filter(item => {
    if (item.superAdminOnly && userRole !== 'super_admin') {
      return false;
    }
    return true;
  });

  return (
    <aside className="w-full lg:w-64 bg-stone-900 text-white flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-stone-800">
        <Link href="/admin" className="flex items-center gap-2">
          <ChefHat className="h-8 w-8 text-amber-500" />
          <div>
            <span className="font-bold text-lg">Mamalu</span>
            <span className="text-xs text-stone-200 block -mt-1">Admin Portal</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-transparent">
        <ul className="space-y-1 px-3">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            // Dashboard gets white highlight, others get amber
            const isDashboard = item.href === "/admin" && pathname === "/admin";
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? isDashboard
                        ? "bg-white text-stone-900 shadow-lg"
                        : "bg-amber-600 text-white"
                      : "text-stone-100 hover:bg-stone-800 hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
                {item.children && isActive && (
                  <ul className="ml-8 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <li key={child.name}>
                        <Link
                          href={child.href}
                          onClick={onNavigate}
                          className={cn(
                            "block px-3 py-1.5 rounded text-sm transition-colors",
                            pathname === child.href
                              ? "text-amber-400"
                              : "text-stone-200 hover:text-white"
                          )}
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

    </aside>
  );
}
