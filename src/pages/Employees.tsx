// src/pages/Employees.tsx

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal, User, Mail, Phone, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { AddEmployeeDialog } from "@/components/Employee/AddEmployeeDialog"; // Komponen form

// Tipe data gabungan dari profiles, employees, dan groups
export interface EmployeeProfile {
  id: string; // employee_id
  profile_id: string;
  full_name: string;
  email: string;
  role: string;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  position: string | null;
  group_name: string | null;
}

const Employees = () => {
  const { profile } = useAuth(); // Untuk cek role
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fungsi untuk mengambil data karyawan
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      // Kita perlu join 3 tabel: employees, profiles, dan groups
      const { data, error } = await supabase
        .from("employees")
        .select(`
          id,
          profile_id,
          position,
          profiles (
            full_name,
            email,
            role,
            phone,
            avatar_url,
            status
          ),
          groups (
            name
          )
        `);

      if (error) throw error;

      // Map data agar flat dan mudah dibaca tabel
      const formattedData: EmployeeProfile[] = data.map((emp: any) => ({
        id: emp.id,
        profile_id: emp.profile_id,
        position: emp.position,
        full_name: emp.profiles.full_name,
        email: emp.profiles.email,
        role: emp.profiles.role,
        phone: emp.profiles.phone,
        avatar_url: emp.profiles.avatar_url,
        status: emp.profiles.status,
        group_name: emp.groups?.name || "Belum ada group",
      }));

      setEmployees(formattedData);
    } catch (error: any) {
      toast.error("Gagal mengambil data karyawan.", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Cek hak akses (sesuai blueprint)
  const canManage = profile?.role === "superadmin" || profile?.role === "leader";

  // Helper untuk avatar fallback
  const getAvatarFallback = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Direktori Karyawan</h1>
            <p className="text-muted-foreground">
              Kelola data karyawan, group, dan hak akses.
            </p>
          </div>
          {canManage && (
            <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
              <PlusCircle className="h-4 w-4" />
              Tambah Karyawan
            </Button>
          )}
        </div>

        {/* Card Tabel Karyawan */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Karyawan</CardTitle>
            <CardDescription>
              Total {employees.length} karyawan terdaftar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Memuat data...</p>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Jabatan</TableHead>
                      <TableHead>Kontak</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Role</TableHead>
                      {canManage && <TableHead>Aksi</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={emp.avatar_url || ""} />
                              <AvatarFallback>
                                {getAvatarFallback(emp.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{emp.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <User className="h-4 w-4" />
                            {emp.position || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              {emp.email}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              {emp.phone || "-"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{emp.group_name}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={emp.status === "active" ? "default" : "destructive"}
                            className={emp.status === "active" ? "bg-green-600" : ""}
                          >
                            {emp.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1.5">
                            <Shield className="h-3.5 w-3.5" />
                            <span className="capitalize">{emp.role}</span>
                          </Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  Hapus
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {employees.length === 0 && !loading && (
               <p className="text-center text-muted-foreground py-4">
                Belum ada data karyawan.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog Tambah Karyawan */}
      <AddEmployeeDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={() => {
          setIsDialogOpen(false);
          fetchEmployees(); // Refresh tabel setelah sukses
        }}
      />
    </MainLayout>
  );
};

export default Employees;