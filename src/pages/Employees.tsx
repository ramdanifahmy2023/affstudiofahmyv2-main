// src/pages/Employees.tsx

import { useState, useEffect, useCallback } from "react";
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
import { 
  PlusCircle, 
  MoreHorizontal, 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Loader2, 
  Eye, 
  Download,
  Search 
} from "lucide-react";
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label"; 
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; 
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { AddEmployeeDialog } from "@/components/Employee/AddEmployeeDialog"; 
import { EditEmployeeDialog } from "@/components/Employee/EditEmployeeDialog"; 
import { DeleteEmployeeAlert } from "@/components/Employee/DeleteEmployeeAlert"; 
import { EmployeeDetailDialog } from "@/components/Employee/EmployeeDetailDialog";
import { useExport } from "@/hooks/useExport"; 
// --- MODIFIKASI: Tambahkan useSearchParams ---
import { useSearchParams } from "react-router-dom"; 

// Tipe data gabungan - DIPERBARUI
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
  // --- TAMBAHAN BARU ---
  date_of_birth: string | null;
  address: string | null;
  // --------------------
}

// --- 2. TIPE DATA BARU UNTUK FILTER ---
type Group = {
  id: string;
  name: string;
};
// Daftar statis untuk filter (sesuai blueprint/supabase enum)
const roles = ["superadmin", "leader", "admin", "staff", "viewer"];
const statuses = ["active", "inactive"];
// ------------------------------------

const Employees = () => {
  const { profile } = useAuth(); 
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  
  // --- PERUBAHAN: Gunakan useSearchParams untuk mengelola state dialog Add ---
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Dapatkan status dialog dari URL
  const isAddDialogOpen = searchParams.get('dialog') === 'add-employee';
  // -------------------------------------------------------------------------
  
  // State filter
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  
  // State untuk dialog lainnya (tetap useState)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false); 
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);

  const { exportToPDF, exportToCSV, isExporting } = useExport();

  // --- 4. MODIFIKASI FUNGSI FETCH DATA (SERVER-SIDE FILTERING) ---
  const fetchEmployees = useCallback(async (
    search: string, 
    groupId: string, 
    role: string, 
    status: string
  ) => {
    setLoading(true);
    try {
      let query = supabase
        .from("employees")
        .select(`
          id,
          profile_id,
          position,
          group_id, 
          profiles!inner (
            full_name,
            email,
            role,
            phone,
            avatar_url,
            status,
            date_of_birth,
            address
          ),
          groups (
            name
          )
        `)
        .order('created_at', { ascending: true });

      // Terapkan filter
      if (search.trim() !== "") {
        query = query.ilike('profiles.full_name', `%${search.trim()}%`);
      }
      if (groupId === "no-group") {
        query = query.is('group_id', null);
      } else if (groupId !== "all") {
        query = query.eq('group_id', groupId);
      }
      if (role !== "all") {
        query = query.eq('profiles.role', role);
      }
      if (status !== "all") {
        query = query.eq('profiles.status', status);
      }

      const { data, error } = await query;

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
        date_of_birth: emp.profiles.date_of_birth,
        address: emp.profiles.address,
      }));

      setEmployees(formattedData);
    } catch (error: any) {
      toast.error("Gagal mengambil data karyawan.", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, []); // <-- useCallback

  // --- 5. USEEFFECT UNTUK FETCH DATA GROUPS (SAAT MOUNT) ---
  useEffect(() => {
    const fetchGroups = async () => {
      const { data } = await supabase.from("groups").select("id, name");
      if (data) {
        setAvailableGroups(data);
      }
    };
    fetchGroups();
  }, []);

  // --- 6. USEEFFECT UNTUK MEMANGGIL FETCH DATA SAAT FILTER BERUBAH ---
  useEffect(() => {
    fetchEmployees(searchTerm, filterGroup, filterRole, filterStatus);
  }, [fetchEmployees, searchTerm, filterGroup, filterRole, filterStatus]);


  const canManage = profile?.role === "superadmin" || profile?.role === "leader";
  const canDelete = profile?.role === "superadmin";


  const getAvatarFallback = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // --- HANDLER BARU: Buka Add Dialog dengan URL Parameter ---
  const handleOpenAdd = () => {
    setSearchParams(prev => {
        prev.set('dialog', 'add-employee'); // <-- SET URL PARAMETER
        return prev;
    }, { replace: true });
  }

  // Handlers untuk Dialog (Modifikasi closeAllModals)
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
    // Hapus query parameter 'dialog' jika dialog Add sedang dibuka
    if (isAddDialogOpen) {
        setSearchParams(prev => {
            prev.delete('dialog'); // <-- HAPUS URL PARAMETER
            return prev;
        }, { replace: true });
    }
    
    // Logika penutupan modal lain tetap sama
    setIsEditDialogOpen(false);
    setIsAlertOpen(false);
    setIsDetailOpen(false); 
    setSelectedEmployee(null);
  };
  
  const handleSuccess = () => {
    closeAllModals();
    // Panggil ulang fetch dengan filter saat ini
    fetchEmployees(searchTerm, filterGroup, filterRole, filterStatus); 
  };
  
  // Handle Export (Data 'employees' sudah terfilter)
  const handleExport = (type: 'pdf' | 'csv') => {
    const columns = [
      { header: 'Nama Lengkap', dataKey: 'full_name' },
      { header: 'Jabatan', dataKey: 'position' },
      { header: 'Email', dataKey: 'email' },
      { header: 'No. HP', dataKey: 'phone' },
      { header: 'Alamat', dataKey: 'address' },
      { header: 'Tgl Lahir', dataKey: 'date_of_birth' },
      { header: 'Grup', dataKey: 'group_name' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Role', dataKey: 'role' },
    ];
    
    const exportData = employees.map(emp => ({
        ...emp,
        position: emp.position || '-',
        phone: emp.phone || '-',
        address: emp.address || '-',
        date_of_birth: emp.date_of_birth || '-',
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
              <Button className="gap-2" onClick={handleOpenAdd}> {/* <-- Panggil Handler Baru */}
                <PlusCircle className="h-4 w-4" />
                Tambah Karyawan
              </Button>
            )}
          </div>
        </div>

        {/* --- 7. UI FILTER BARU --- */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Filter Search */}
              <div className="flex-1 space-y-2">
                <Label htmlFor="search-name">Cari Nama Karyawan</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-name"
                    placeholder="Ketik nama karyawan..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Filter Grup */}
              <div className="flex-1 space-y-2">
                <Label htmlFor="filter-group">Filter Grup</Label>
                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger id="filter-group" className="w-full">
                    <SelectValue placeholder="Pilih Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Group</SelectItem>
                    <SelectItem value="no-group">Belum ada group</SelectItem>
                    {availableGroups.map(group => (
                      <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filter Role */}
              <div className="flex-1 space-y-2">
                <Label htmlFor="filter-role">Filter Role</Label>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger id="filter-role" className="w-full">
                    <SelectValue placeholder="Pilih Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Role</SelectItem>
                    {roles.map(role => (
                      <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filter Status */}
              <div className="flex-1 space-y-2">
                <Label htmlFor="filter-status">Filter Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger id="filter-status" className="w-full">
                    <SelectValue placeholder="Pilih Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    {statuses.map(status => (
                      <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>
        {/* ------------------------- */}


        {/* Card Tabel Karyawan */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Karyawan</CardTitle>
            <CardDescription>
              Menampilkan {employees.length} karyawan sesuai filter.
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
                    {/* Menggunakan state 'employees' yang sudah terfilter */}
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
                Tidak ada karyawan yang cocok dengan filter yang dipilih.
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