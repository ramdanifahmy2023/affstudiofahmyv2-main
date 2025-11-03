// src/components/Layout/Header.tsx

import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge"; // <-- 1. TAMBAHKAN IMPORT BADGE DI SINI
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTheme } from "next-themes";
import { Moon, Sun, Laptop, Bell } from "lucide-react";

// Komponen Toggle Tema
const ModeToggle = () => {
  const { setTheme } = useTheme();

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
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Laptop className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Komponen Notifikasi
const NotificationBell = () => {
  // Data tiruan (fake data) sesuai permintaan blueprint
  const fakeNotifications = [
    {
      id: 1,
      title: "Komisi Cair!",
      description: "Komisi bulan Oktober 2025 telah cair.",
    },
    {
      id: 2,
      title: "Reminder Absensi",
      description: "Jangan lupa untuk melakukan absensi pagi ini.",
    },
    {
      id: 3,
      title: "Laporan Harian Belum Lengkap",
      description: "Harap segera isi jurnal laporan harian Anda.",
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-5 w-5" />
          {/* Indikator titik merah untuk notifikasi baru */}
          <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex justify-between items-center">
          Notifikasi
          {/* Di sinilah Badge digunakan */}
          <Badge variant="destructive" className="text-xs">
            {fakeNotifications.length} Baru
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="max-h-80 overflow-y-auto">
          {fakeNotifications.map((notif, index) => (
            <div key={notif.id}>
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                <p className="font-medium text-sm">{notif.title}</p>
                <p className="text-xs text-muted-foreground">
                  {notif.description}
                </p>
              </DropdownMenuItem>
              {index < fakeNotifications.length - 1 && <DropdownMenuSeparator />}
            </div>
          ))}
        </div>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-center justify-center text-primary cursor-pointer">
          Tandai semua telah dibaca
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Komponen UserNav (Menu Avatar)
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
              <p className="text-sm font-medium leading-none">
                {profile?.full_name}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
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

      {/* Dialog Konfirmasi Logout */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
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

// Ini adalah header versi desktop saja
export const Header = () => {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-end border-b bg-background px-8">
      <div className="flex items-center gap-1">
        <NotificationBell />
        <ModeToggle />
        <UserNav />
      </div>
    </header>
  );
};