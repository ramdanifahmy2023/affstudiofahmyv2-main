// src/components/Layout/Header.tsx

import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Moon, 
  Sun, 
  Laptop, 
  Bell, 
  Check, 
  Trash2, 
  Info, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  CheckCircle,
  Clock 
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { NotificationType, Notification } from "@/types/notification";


const ModeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className="cursor-pointer"
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
          {theme === "light" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className="cursor-pointer"
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
          {theme === "dark" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className="cursor-pointer"
        >
          <Laptop className="mr-2 h-4 w-4" />
          <span>System</span>
          {theme === "system" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Helper component untuk ikon notifikasi
const NotificationIcon = ({ type }: { type: NotificationType }) => {
    switch (type) {
        case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
        case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
        case 'info':
        default: return <Info className="h-4 w-4 text-primary" />;
    }
}

const NotificationBell = () => {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
  } = useNotifications();
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const handleMarkAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (unreadCount === 0) return;
    
    setIsMarkingAll(true);
    try {
      await markAllAsRead();
    } finally {
      setIsMarkingAll(false);
    }
  };
  
  const handleMarkOne = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await markAsRead(id);
  }
  
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteNotification(id);
  }
  
  const displayCount = unreadCount > 9 ? '9+' : unreadCount;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <>
              {/* Ping Animation */}
              <span className="absolute top-1.5 right-1.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              {/* Actual Count Badge */}
              <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold z-10">
                 {displayCount}
              </span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 max-w-[calc(100vw-2rem)] p-0" align="end">
        {/* Header */}
        <DropdownMenuLabel className="flex justify-between items-center p-3">
          Notifikasi
          <Badge variant="destructive" className="text-xs">
            {unreadCount} Belum Dibaca
          </Badge>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="m-0" />
        
        {/* Loading State */}
        {loading ? (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        ) : notifications.length === 0 ? (
             // Empty State
             <div className="flex justify-center items-center h-20">
                <p className="text-muted-foreground text-sm">Tidak ada notifikasi.</p>
            </div>
        ) : (
            // Notifications List
            <ScrollArea className="max-h-96">
                <div className="flex flex-col">
                    {notifications.map((notif: Notification) => (
                        <div
                            key={notif.id}
                            // Menggunakan anchor tag jika ada link, atau div
                            role={notif.link ? "link" : "listitem"}
                            className={cn(
                                "flex flex-col items-start gap-1 p-3 border-b transition-colors",
                                !notif.is_read ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-accent/50"
                            )}
                            onClick={(e) => {
                                if (!notif.is_read) {
                                     handleMarkOne(e, notif.id);
                                }
                                if (notif.link) {
                                    // Buka link
                                    window.open(notif.link, '_blank', 'noopener,noreferrer');
                                }
                            }}
                        >
                            <div className="flex items-start justify-between w-full">
                                <div className="flex items-center gap-2">
                                    <NotificationIcon type={notif.type} />
                                    <p className="font-medium text-sm">
                                      {notif.title}
                                    </p>
                                </div>
                                <div className="flex gap-1.5 items-center">
                                    {/* Mark as Read Button (Hanya tampil jika belum dibaca) */}
                                    {!notif.is_read && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 text-success hover:bg-success/20"
                                            onClick={(e) => handleMarkOne(e, notif.id)}
                                        >
                                            <Check className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {/* Delete Button */}
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                                        onClick={(e) => handleDelete(e, notif.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {notif.description || '-'}
                            </p>
                             <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: indonesiaLocale })}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        )}

        <DropdownMenuSeparator className="m-0" />
        
        {/* Footer Action */}
        <DropdownMenuItem 
          className={cn(
            "text-center justify-center p-3",
            unreadCount === 0 || isMarkingAll ? "text-muted-foreground cursor-not-allowed" : "text-primary cursor-pointer hover:bg-accent"
          )}
          onClick={handleMarkAll}
          disabled={unreadCount === 0 || isMarkingAll}
        >
          {isMarkingAll ? (
             <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
             <Check className="h-4 w-4 mr-2" />
          )}
          Tandai semua telah dibaca
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const UserNav = () => {
  const { user, profile, signOut } = useAuth();
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const getAvatarFallback = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || ""} />
              <AvatarFallback>{getAvatarFallback(profile?.full_name)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none truncate">
                {profile?.full_name}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <Link to="/profile">
            <DropdownMenuItem className="cursor-pointer">
              Pengaturan Akun
            </DropdownMenuItem>
          </Link>
          
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive cursor-pointer"
            onClick={() => setIsAlertOpen(true)}
          >
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin ingin keluar?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={signOut}>Ya, Keluar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export const Header = () => {
  // const { profile } = useAuth(); // If needed for conditional rendering

  return (
    <div className="flex items-center gap-1">
      <NotificationBell />
      <ModeToggle />
      <UserNav />
    </div>
  );
};