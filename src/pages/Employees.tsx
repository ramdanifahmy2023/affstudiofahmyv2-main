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
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal, User, Mail, Phone, Shield, Loader2, Eye, Download } from "lucide-react"; // <-- 1. IMPORT DOWNLOAD
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { AddEmployeeDialog } from "@/components/Employee/AddEmployeeDialog"; 
import { EditEmployeeDialog } from "@/components/Employee/EditEmployeeDialog"; 
import { DeleteEmployeeAlert } from "@/components/Employee/DeleteEmployeeAlert"; 
import { EmployeeDetailDialog } from "@/components/Employee/EmployeeDetailDialog";
import { useExport } from "@/hooks/useExport"; // <-- 2. IMPORT USE EXPORT

// Tipe data gabungan dari profiles, employees, dan groups
export interface EmployeeProfile {
  id: string; // employee_id
  profile_id: string; // profiles.id
  full_name: string;
  email: string;
  role: string;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  position: string | null;
  group_name: string | null;
  group_id: string | null; 
}

const Employees = () => {
  const { profile } = useAuth(); 
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  
  // State untuk dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false); 
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);

  // --- 3. INISIALISASI HOOK EXPORT ---
  const { exportToPDF, exportToCSV, isExporting } = useExport();

  // Fungsi untuk mengambil data karyawan
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employees")
        .select(`
          id,
          profile_id,
          position,
          group_id, 
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
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;

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
        group_id: emp.group_id, 
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

  const canManage = profile?.role === "superadmin" || profile?.role === "leader";
  const canDelete = profile?.role === "superadmin";


  const getAvatarFallback = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleOpenDetail = (employee: EmployeeProfile) => {
    setSelectedEmployee(employee);
    setIsDetailOpen(true);
  };

  const handleOpenEdit = (employee: EmployeeProfile) => {
    setSelectedEmployee(employee);
    setIsEditDialogOpen(true);
  };

  const handleOpenDelete = (employee: EmployeeProfile) => {
    setSelectedEmployee(employee);
    setIsAlertOpen(true);
  };

  const closeAllModals = () => {
    setIsAddDialogOpen(false);
    setIsEditDialogOpen(false);
    setIsAlertOpen(false);
    setIsDetailOpen(false); 
    setSelectedEmployee(null);
  };

  const handleSuccess = () => {
    closeAllModals();
    fetchEmployees(); 
  };
  
  // --- 4. FUNGSI HANDLE EXPORT ---
  const handleExport = (type: 'pdf' | 'csv') => {
    const columns = [
      { header: 'Nama Lengkap', dataKey: 'full_name' },
      { header: 'Jabatan', dataKey: 'position' },
      { header: 'Email', dataKey: 'email' },
      { header: 'No. HP', dataKey: 'phone' },
      { header: 'Grup', dataKey: 'group_name' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Role', dataKey: 'role' },
    ];
    
    // Gunakan data 'employees' yang sudah di-fetch
    const exportData = employees.map(emp => ({
        ...emp,
        position: emp.position || '-',
        phone: emp.phone || '-',
    }));

    const options = {
        filename: 'Daftar_Karyawan',
        title: 'Laporan Daftar Karyawan',
        data: exportData,
        columns,
    };
    
    if (type === 'pdf') {
        exportToPDF(options);
    } else {
        exportToCSV(options);
    }
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
          {/* --- 5. TAMBAHKAN DROPDOWN EXPORT --- */}
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2" disabled={isExporting || employees.length === 0}>
                      <Download className="h-4 w-4" />
                      {isExporting ? 'Mengekspor...' : 'Export'}
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={isExporting}>
                      Export PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('csv')} disabled={isExporting}>
                      Export CSV
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canManage && (
              <Button className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
                <PlusCircle className="h-4 w-4" />
                Tambah Karyawan
              </Button>
            )}
          </div>
          {/* ---------------------------------- */}
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
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="border rounded-md overflow-x-auto">
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
                                <DropdownMenuItem onClick={() => handleOpenDetail(emp)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Lihat Detail
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleOpenEdit(emp)}>
                                  Edit
                                </DropdownMenuItem>
                                {canDelete && (
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => handleOpenDelete(emp)}
                                  >
                                    Hapus
                                  </DropdownMenuItem>
                                )}
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

      <AddEmployeeDialog
        isOpen={isAddDialogOpen}
        onClose={closeAllModals}
        onSuccess={handleSuccess}
      />

      {selectedEmployee && (
        <EditEmployeeDialog
          isOpen={isEditDialogOpen}
          onClose={closeAllModals}
          onSuccess={handleSuccess}
          employeeToEdit={selectedEmployee}
        />
      )}

      {selectedEmployee && (
        <DeleteEmployeeAlert
          isOpen={isAlertOpen}
          onClose={closeAllModals}
          onSuccess={handleSuccess}
          employeeToDelete={selectedEmployee}
        />
      )}
      
      {selectedEmployee && (
        <EmployeeDetailDialog
          isOpen={isDetailOpen}
          onClose={closeAllModals}
          employee={selectedEmployee}
        />
      )}
    </MainLayout>
  );
};

export default Employees;