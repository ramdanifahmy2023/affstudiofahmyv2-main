import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const pageTitles: Record<string, { title: string; description: string }> = {
  "/dashboard": {
    title: "Dashboard",
    description: "Welcome back! Here's what's happening today.",
  },
  "/performance": {
    title: "Performance",
    description: "Track team and individual performance metrics",
  },
  "/daily-report": {
    title: "Daily Report",
    description: "Submit your daily work report",
  },
  "/attendance": {
    title: "Attendance",
    description: "Track your work attendance",
  },
  "/commissions": {
    title: "Commissions",
    description: "Track affiliate commission data",
  },
  "/cashflow": {
    title: "Cashflow",
    description: "Monitor income and expenses",
  },
  "/employees": {
    title: "Employees",
    description: "Manage your team members",
  },
  "/devices": {
    title: "Devices",
    description: "Manage team devices and inventory",
  },
  "/accounts": {
    title: "Accounts",
    description: "Manage affiliate accounts",
  },
  "/groups": {
    title: "Groups",
    description: "Manage team groups and assignments",
  },
};

export const Header = () => {
  const location = useLocation();
  const pageInfo = pageTitles[location.pathname] || {
    title: "Affiliate Pro",
    description: "Shopee Affiliate Management System",
  };

  return (
    <header className="fixed right-0 top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 w-[calc(100%-16rem)]">
      <div className="flex h-full items-center justify-between px-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{pageInfo.title}</h2>
          <p className="text-sm text-muted-foreground">{pageInfo.description}</p>
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center bg-destructive">
                  3
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-2">
                <p className="text-sm font-semibold mb-2">Notifications</p>
                <DropdownMenuItem className="flex-col items-start gap-1 p-3">
                  <p className="text-sm font-medium">New commission recorded</p>
                  <p className="text-xs text-muted-foreground">
                    Commission for week M2 has been added
                  </p>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex-col items-start gap-1 p-3">
                  <p className="text-sm font-medium">Daily report submitted</p>
                  <p className="text-xs text-muted-foreground">
                    Your report for today has been saved
                  </p>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex-col items-start gap-1 p-3">
                  <p className="text-sm font-medium">KPI target updated</p>
                  <p className="text-xs text-muted-foreground">
                    New monthly targets have been set
                  </p>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
