// src/components/Layout/Sidebar.tsx

import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Smartphone,
  UserCircle,
  FileText,
  TrendingUp, 
  DollarSign, 
  Wallet, 
  Package,
  FileSpreadsheet, 
  Target, 
  BookOpen, 
  Scale, 
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// Definisi peran yang diizinkan untuk Management/Financial (Semua kecuali Staff)
const MANAGEMENT_ROLES = ["superadmin", "leader", "admin", "viewer"];
const ALL_ROLES = ["superadmin", "leader", "admin", "staff", "viewer"];

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  // Roles: Jika tidak didefinisikan, artinya SEMUA ROLE memiliki akses.
  // Jika didefinisikan, hanya role di dalam array yang punya akses.
  roles?: string[]; 
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  // RESTRICTED PAGES (Hanya untuk Management, Admin, Viewer)
  { title: "Performance", href: "/performance", icon: TrendingUp, roles: MANAGEMENT_ROLES },
  { title: "Commissions", href: "/commissions", icon: DollarSign, roles: MANAGEMENT_ROLES }, 
  { title: "Cashflow", href: "/cashflow", icon: Wallet, roles: MANAGEMENT_ROLES },
  { title: "Assets", href: "/assets", icon: FileSpreadsheet, roles: MANAGEMENT_ROLES },
  { title: "Debt & Receivable", href: "/debt-receivable", icon: Scale, roles: MANAGEMENT_ROLES }, 
  { title: "Laba Rugi", href: "/profit-loss", icon: TrendingUp, roles: MANAGEMENT_ROLES }, 
  { title: "KPI Targets", href: "/kpi", icon: Target, roles: MANAGEMENT_ROLES },
  { title: "Employees", href: "/employees", icon: Users, roles: MANAGEMENT_ROLES },
  { title: "Devices", href: "/devices", icon: Smartphone, roles: MANAGEMENT_ROLES },
  { title: "Accounts", href: "/accounts", icon: UserCircle, roles: MANAGEMENT_ROLES },
  { title: "Groups", href: "/groups", icon: Package, roles: MANAGEMENT_ROLES },

  // STAFF PAGES
  { title: "Daily Report", href: "/daily-report", icon: FileText, roles: ["staff"] },
  { title: "Attendance", href: "/attendance", icon: UserCircle, roles: ALL_ROLES }, 
  { title: "SOP & Knowledge", href: "/knowledge", icon: BookOpen, roles: ALL_ROLES },
];

export const Sidebar = () => {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const userRole = profile?.role;

  const filteredNavItems = navItems.filter((item) => {
    // 1. Jika tidak ada roles yang didefinisikan (e.g. Dashboard), selalu tampilkan.
    if (!item.roles) return true; 

    // 2. Jika roles didefinisikan, periksa apakah peran pengguna termasuk di dalamnya.
    return item.roles.includes(userRole || "");
  });

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <h1 className="text-xl font-bold text-sidebar-primary">Affiliate Pro</h1>
      </div>

      <ScrollArea className="h-[calc(100vh-8rem)]">
        <nav className="space-y-1 p-4">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.href) && item.href !== "/"; // Perbaikan cek aktif

            return (
              <Link key={item.href} to={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive && "bg-sidebar-accent text-sidebar-primary font-medium"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.title}
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="absolute bottom-0 w-full border-t border-sidebar-border bg-sidebar p-4">
        <div className="mb-3 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
            {profile?.full_name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {profile?.full_name || "User"}
            </p>
            <p className="truncate text-xs text-muted-foreground capitalize">
              {profile?.role || "viewer"}
            </p>
          </div>
        </div>
        <Link to="/profile">
            <Button
              variant="outline"
              className="w-full gap-2 mb-2"
            >
              <Users className="h-4 w-4" />
              Profile Settings
            </Button>
        </Link>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
};