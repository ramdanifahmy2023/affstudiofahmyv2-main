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
  FileClock,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const MANAGEMENT_ROLES = ["superadmin", "leader", "admin", "viewer"];
const MANAGEMENT_ROLES_ADMIN_ONLY = ["superadmin", "leader", "admin"];
const ALL_ROLES = ["superadmin", "leader", "admin", "staff", "viewer"];

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[]; 
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Performa Tim", href: "/performance", icon: TrendingUp, roles: MANAGEMENT_ROLES },
  { title: "KPI Targets", href: "/kpi", icon: Target, roles: MANAGEMENT_ROLES },
  { title: "Karyawan", href: "/employees", icon: Users, roles: MANAGEMENT_ROLES },
  { title: "Groups", href: "/groups", icon: Package, roles: MANAGEMENT_ROLES },
  { title: "Akun Affiliate", href: "/accounts", icon: UserCircle, roles: MANAGEMENT_ROLES },
  { title: "Manage Devices", href: "/devices", icon: Smartphone, roles: MANAGEMENT_ROLES },
  { title: "Assets", href: "/assets", icon: FileSpreadsheet, roles: MANAGEMENT_ROLES },
  { title: "Laporan Komisi", href: "/commissions", icon: DollarSign, roles: MANAGEMENT_ROLES }, 
  { title: "Cashflow", href: "/cashflow", icon: Wallet, roles: MANAGEMENT_ROLES },
  { title: "Hutang & Piutang", href: "/debt-receivable", icon: Scale, roles: MANAGEMENT_ROLES }, 
  { title: "Laba Rugi", href: "/profit-loss", icon: TrendingUp, roles: MANAGEMENT_ROLES }, 
  { title: "Audit Logs", href: "/audit-logs", icon: FileClock, roles: MANAGEMENT_ROLES_ADMIN_ONLY },
  { title: "Daily Report", href: "/daily-report", icon: FileText, roles: ["staff"] },
  { title: "Absensi Karyawan", href: "/attendance", icon: UserCircle, roles: ALL_ROLES }, 
  { title: "SOP & Knowledge", href: "/knowledge", icon: BookOpen, roles: ALL_ROLES },
];

interface SidebarProps {
  onClose?: () => void;
}

export const Sidebar = ({ onClose }: SidebarProps) => {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const userRole = profile?.role;

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true; 
    return item.roles.includes(userRole || "");
  });

  return (
    <>
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
        <h1 className="text-xl font-bold text-sidebar-primary">Fintrack Affiliate</h1>
        {/* Close button for mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-8rem)]">
        <nav className="space-y-1 p-4">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.href) && item.href !== "/";

            return (
              <Link key={item.href} to={item.href} onClick={onClose}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive && "bg-sidebar-accent text-sidebar-primary font-medium"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="truncate">{item.title}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="absolute bottom-0 w-full border-t border-sidebar-border bg-sidebar p-4">
        <div className="mb-3 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold flex-shrink-0">
            {profile?.full_name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 overflow-hidden min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {profile?.full_name || "User"}
            </p>
            <p className="truncate text-xs text-muted-foreground capitalize">
              {profile?.role || "viewer"}
            </p>
          </div>
        </div>
        <Link to="/profile" onClick={onClose}>
            <Button
              variant="outline"
              className="w-full gap-2 mb-2"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Profile Settings</span>
              <span className="sm:hidden">Profile</span>
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
    </>
  );
};