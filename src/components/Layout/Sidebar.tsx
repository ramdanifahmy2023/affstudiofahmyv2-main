// src/components/Layout/Sidebar.tsx

import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Smartphone,
  UserCircle,
  FileText,
  TrendingUp, // Digunakan untuk Laba Rugi
  DollarSign, // Digunakan untuk Commissions (tetap)
  Wallet, // Digunakan untuk Cashflow (tetap)
  Package,
  FileSpreadsheet, // Digunakan untuk Assets (tetap)
  Target, // Digunakan untuk KPI (tetap)
  BookOpen, // Digunakan untuk Knowledge (tetap)
  Settings,
  LogOut,
  Archive,
  Scale, // Digunakan untuk Debt & Receivable
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Performance", href: "/performance", icon: TrendingUp },
  { title: "Daily Report", href: "/daily-report", icon: FileText, roles: ["staff"] },
  { title: "Attendance", href: "/attendance", icon: UserCircle },
  { title: "Commissions", href: "/commissions", icon: DollarSign }, 
  { title: "Cashflow", href: "/cashflow", icon: Wallet },
  { title: "Assets", href: "/assets", icon: FileSpreadsheet },
  // PERBAIKAN: Mengganti ikon agar lebih logis
  { title: "Debt & Receivable", href: "/debt-receivable", icon: Scale }, // Menggunakan Scale (Timbangan)
  { title: "Laba Rugi", href: "/profit-loss", icon: TrendingUp }, // Menggunakan TrendingUp (Hasil Finansial)
  // AKHIR PERBAIKAN
  { title: "KPI Targets", href: "/kpi", icon: Target },
  { title: "Employees", href: "/employees", icon: Users },
  { title: "Devices", href: "/devices", icon: Smartphone },
  { title: "Accounts", href: "/accounts", icon: UserCircle },
  { title: "Groups", href: "/groups", icon: Package },
  { title: "SOP & Knowledge", href: "/knowledge", icon: BookOpen },
];

export const Sidebar = () => {
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(profile?.role || "");
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
            const isActive = location.pathname === item.href;

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