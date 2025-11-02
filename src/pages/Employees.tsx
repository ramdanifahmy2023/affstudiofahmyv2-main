import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { AddEmployeeDialog } from "@/components/Employee/AddEmployeeDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Users,
  Search,
  FileDown,
  Loader2,
} from "lucide-react";

// Tipe data gabungan dari employees + profiles
type EmployeeProfile = {
  id: string; // employee_id
  position: string | null;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
    role: string;
    status: string;
  } | null;
  groups: {
    name: string;
  } | null;
};

const Employees = () => {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Fungsi untuk mengambil data karyawan
  const fetchEmployees = async () => {
    setLoading(true);
    // Kita query 'employees' dan join data dari 'profiles' dan 'groups'
    let query = supabase
      .from("employees")
      .select(
        `
        id,
        position,
        profiles (
          full_name,
          email,
          avatar_url,
          role,
          status
        ),
        groups (
          name
        )
      `
      )
      .order("created_at", { ascending: false });

    if (search) {
      // @ts-ignore
      query = query.ilike("profiles.full_name", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Gagal mengambil data karyawan:", error.message);
      console.error(error);
    } else {
      setEmployees(data as EmployeeProfile[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []); // Hanya fetch saat pertama kali load

  // Handle search (dengan debounce sederhana)
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchEmployees();
    }, 500); // Tunda pencarian 500ms setelah user berhenti mengetik
    return () => clearTimeout(handler);
  }, [search]);

  // Fungsi untuk mendapatkan inisial nama
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };
  
  // TODO: Hapus Karyawan (butuh RLS dan Supabase Function)
  const handleDelete = (employeeId: string) => {
    toast.warning(`Fitur hapus untuk ${employeeId} belum diimplementasikan.`);
    // Implementasi delete butuh function khusus di Supabase
    // untuk menghapus data di employees, profiles, dan auth.users
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header Halaman */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8" />
              Direktori Karyawan
            </h1>
            <p className="text-muted-foreground">
              Kelola semua akun, profil, dan role karyawan di sistem.
            </p>
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <Button variant="outline" className="gap-2">
              <FileDown className="h-4 w-4" />
              Export
            </Button>
            <AddEmployeeDialog onEmployeeAdded={fetchEmployees} />
          </div>
        </div>

        {/* Konten Utama (Tabel) */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Karyawan</CardTitle>
            <CardDescription>
              Total {employees.length} karyawan terdaftar.
            </CardDescription>
            <div className="relative pt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Cari nama karyawan..."
                className="pl-10 w-full md:w-1/3"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Avatar</TableHead>
                    <TableHead>Nama Karyawan</TableHead>
                    <TableHead>Jabatan</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Role Sistem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        Tidak ada data karyawan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <Avatar>
                            <AvatarImage
                              src={emp.profiles?.avatar_url || ""}
                              alt={emp.profiles?.full_name}
                            />
                            <AvatarFallback>
                              {getInitials(emp.profiles?.full_name || "??")}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {emp.profiles?.full_name || "N/A"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {emp.profiles?.email || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell>{emp.position || "-"}</TableCell>
                        <TableCell>
                          {emp.groups ? (
                            <Badge variant="outline">{emp.groups.name}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Belum ada
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {emp.profiles?.role || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              emp.profiles?.status === "active"
                                ? "default"
                                : "destructive"
                            }
                            className="capitalize bg-green-500"
                          >
                            {emp.profiles?.status === "active"
                              ? "Aktif"
                              : "Tidak Aktif"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>
                                Edit Karyawan
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(emp.id)}
                              >
                                Hapus Karyawan
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {/* TODO: Tambahkan Pagination di sini nanti */}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Employees;