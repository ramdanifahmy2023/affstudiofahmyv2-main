import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, UserCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { AddEmployeeDialog } from "@/components/Employee/AddEmployeeDialog"; // <-- IMPORT BARU

// Tipe data gabungan dari profiles & employees
type EmployeeProfile = {
  id: string; // profile_id
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  join_date: string | null;
  status: string | null;
  position: string | null;
  group: {
    name: string; // Ambil nama group
  } | null;
};

const Employees = () => {
  const { profile } = useAuth(); // Mendapatkan role user yang sedang login
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false); // <-- STATE UNTUK DIALOG

  // Cek hak akses untuk CRUD
  const canManageEmployees = profile?.role === 'superadmin' || profile?.role === 'leader';

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          user_id,
          full_name,
          email,
          role,
          join_date,
          status,
          employees (
            position,
            groups ( name )
          )
        `);

      if (error) throw error;

// ---- PERBAIKAN DI SINI ----
      // Kita perlu mengecek apakah prof.employees ada dan tidak kosong
      const transformedData: EmployeeProfile[] = data.map((prof: any) => {
        const emp = (prof.employees && prof.employees.length > 0) ? prof.employees[0] : null;
        
        return {
          id: prof.id,
          user_id: prof.user_id,
          full_name: prof.full_name,
          email: prof.email,
          role: prof.role,
          join_date: prof.join_date,
          status: prof.status,
          position: emp?.position || 'N/A',
          group: emp?.groups || null,
        }
      });
      // ---- BATAS PERBAIKAN ----      setEmployees(transformedData);
      setFilteredEmployees(transformedData);
      
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      toast.error("Gagal memuat data karyawan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Efek untuk filtering berdasarkan search term
  useEffect(() => {
    const results = employees.filter((employee) =>
      employee.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEmployees(results);
  }, [searchTerm, employees]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "superadmin":
        return <Badge variant="destructive">{role}</Badge>;
      case "leader":
        return <Badge className="bg-primary/90">{role}</Badge>;
      case "admin":
        return <Badge variant="secondary">{role}</Badge>; // <-- Ini baris yang error
      case "staff":
        return <Badge variant="outline">{role}</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Direktori Karyawan</h1>
            <p className="text-muted-foreground">Kelola data anggota tim Anda.</p>
          </div>
          {/* Tombol 'Add Employee' hanya tampil untuk role yang diizinkan */}
          {canManageEmployees && (
            <Button className="gap-2" onClick={() => setIsModalOpen(true)}> {/* <-- GANTI ONCLICK */}
              <Plus className="h-4 w-4" />
              Tambah Karyawan
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama karyawan..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline">Filter (Soon)</Button>
              <Button variant="outline">Export (Soon)</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredEmployees.map((employee) => (
                  <Card key={employee.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center space-y-3">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserCircle className="h-10 w-10 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{employee.full_name}</h3>
                          <p className="text-sm text-muted-foreground">{employee.email}</p>
                        </div>
                        <div className="flex gap-2">
                          {getRoleBadge(employee.role)}
                          <Badge variant="outline">
                            {employee.group?.name || "Belum ada grup"}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Bergabung: {employee.join_date ? format(new Date(employee.join_date), "dd MMM yyyy") : '-'}
                        </div>
                        <div className="flex gap-2 w-full">
                          <Button variant="outline" size="sm" className="flex-1">
                            Lihat Detail
                          </Button>
                          {canManageEmployees && (
                            <Button variant="outline" size="sm" className="flex-1">
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {!loading && filteredEmployees.length === 0 && (
               <div className="text-center h-40 flex flex-col justify-center items-center">
                 <p className="font-medium">Tidak ada karyawan ditemukan.</p>
                 <p className="text-sm text-muted-foreground">
                   {searchTerm ? "Coba kata kunci pencarian lain." : "Anda belum memiliki data karyawan."}
                 </p>
               </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Render Dialog Tambah Karyawan */}
      {canManageEmployees && (
        <AddEmployeeDialog
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchEmployees(); // <-- Refresh data setelah sukses
          }}
        />
      )}
    </MainLayout>
  );
};

export default Employees;