// src/pages/Performance.tsx

import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// --- 1. TAMBAHKAN 'Label' DI SINI ---
import { Label } from "@/components/ui/label";
// ------------------------------------
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator, 
} from "@/components/ui/dropdown-menu";
import { Search, Download, TrendingUp, Loader2, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useExport } from "@/hooks/useExport";
import { format, startOfMonth, parseISO } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";

// Import Tipe Data dari Employees & Dialog Detail
import { EmployeeProfile } from "@/pages/Employees"; 
import { EmployeeDetailDialog } from "@/components/Employee/EmployeeDetailDialog";

// Tipe data lokal yang diperluas
interface PerformanceProfile extends EmployeeProfile {
  omset: number; // actual_sales
  commission: number; // actual_commission
  attendance: number; // actual_attendance
  kpi: number; // total_kpi
}


// Tipe data untuk filter group
interface Group {
  id: string;
  name: string;
}

// Kalkulasi KPI
const calculateTotalKpi = (sales: number, sTarget: number, comm: number, cTarget: number, attend: number, aTarget: number) => {
    // Bobot: Omset 50%, Komisi 30%, Absensi 20%
    const sales_pct = (sTarget > 0) ? (sales / sTarget) * 100 : 0;
    const commission_pct = (cTarget > 0) ? (comm / cTarget) * 100 : 0;
    const attendance_pct = (aTarget > 0) ? (attend / aTarget) * 100 : 0;
    
    const total_kpi = (sales_pct * 0.5) + (commission_pct * 0.3) + (attendance_pct * 0.2);
    
    return Math.min(total_kpi, 100);
};

const Performance = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<PerformanceProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [filterMonth, setFilterMonth] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [filterGroup, setFilterGroup] = useState("all");
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  
  const [summary, setSummary] = useState({
    totalOmset: 0,
    totalCommission: 0,
    avgKpi: 0
  });
  
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<PerformanceProfile | null>(null);

  const { exportToPDF, exportToCSV, isExporting } = useExport();
  
  const canRead = profile?.role !== "staff" && profile?.role !== "viewer"; 

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getKPIColor = (kpi: number) => {
    if (kpi >= 90) return "text-success";
    if (kpi >= 70) return "text-warning";
    return "text-destructive";
  };
  
  const fetchData = useCallback(async (month: string, groupId: string) => {
    setLoading(true);
    if (!profile || !canRead) {
        setLoading(false);
        return;
    }
    
    try {
        let query = supabase
            .from('kpi_targets')
            .select(`
                id,
                sales_target,
                commission_target,
                attendance_target,
                actual_sales,
                actual_commission,
                actual_attendance,
                employees!inner (
                    id,
                    profile_id,
                    group_id,
                    position,
                    profiles ( full_name, email, phone, avatar_url, role, status ),
                    groups ( name )
                ),
                target_month
            `)
            .eq('target_month', month); 
            
        if (groupId !== "all") {
            query = query.eq('employees.group_id', groupId);
        }

        const { data: kpiResults, error: kpiError } = await query;

        if (kpiError) throw kpiError;
        
        const rawData = kpiResults as any[];

        const mappedData: PerformanceProfile[] = rawData.map((item) => {
             const emp = item.employees;
             const prof = emp.profiles;
             
             const calculatedKpi = calculateTotalKpi(
                item.actual_sales || 0, item.sales_target,
                item.actual_commission || 0, item.commission_target,
                item.actual_attendance || 0, item.attendance_target
            );
            
             return {
                // EmployeeProfile fields
                id: emp.id,
                profile_id: emp.profile_id,
                full_name: prof?.full_name || "N/A",
                email: prof?.email || "N/A",
                role: prof?.role || "viewer",
                phone: prof?.phone || null,
                avatar_url: prof?.avatar_url || null,
                status: prof?.status || "active",
                position: emp.position || null,
                group_name: emp.groups?.name || "N/A",
                group_id: emp.group_id || null,
                
                // PerformanceProfile fields
                omset: item.actual_sales || 0,
                commission: item.actual_commission || 0,
                attendance: item.actual_attendance || 0,
                kpi: calculatedKpi,
            };
        });

        mappedData.sort((a, b) => b.kpi - a.kpi);
        setPerformanceData(mappedData);

    } catch (error: any) {
        toast.error("Gagal memuat data Performance: " + error.message);
        console.error(error);
    } finally {
        setLoading(false);
    }
  }, [profile, canRead]);

  useEffect(() => {
    const fetchGroups = async () => {
      const { data, error } = await supabase.from("groups").select("id, name");
      if (error) {
        toast.error("Gagal memuat daftar grup");
      } else {
        setAvailableGroups(data || []);
      }
    };
    
    if (profile) {
      fetchGroups();
      fetchData(filterMonth, filterGroup);
    }
  }, [profile, filterMonth, filterGroup, fetchData]);
  
  const filteredData = performanceData.filter(e => 
    e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.group_name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  useEffect(() => {
    const totalOmset = filteredData.reduce((sum, e) => sum + e.omset, 0);
    const totalCommission = filteredData.reduce((sum, e) => sum + e.commission, 0);
    const avgKpi = filteredData.length > 0 
      ? filteredData.reduce((sum, e) => sum + e.kpi, 0) / filteredData.length 
      : 0;
      
    setSummary({
      totalOmset,
      totalCommission,
      avgKpi
    });
  }, [filteredData]);
  
  
  const handleExport = (type: 'pdf' | 'csv') => {
    const columns = [
      { header: 'Rank', dataKey: 'rank' },
      { header: 'Nama', dataKey: 'full_name' },
      { header: 'Group', dataKey: 'group_name' },
      { header: 'Total Omset', dataKey: 'omsetFormatted' },
      { header: 'Komisi (Aktual)', dataKey: 'commissionFormatted' },
      { header: 'Absensi', dataKey: 'attendanceFormatted' },
      { header: 'KPI %', dataKey: 'kpiFormatted' },
    ];
    
    const exportData = filteredData.map((item, index) => ({
      ...item,
      rank: `#${index + 1}`,
      omsetFormatted: formatCurrency(item.omset),
      commissionFormatted: formatCurrency(item.commission),
      attendanceFormatted: `${item.attendance} hari`,
      kpiFormatted: `${item.kpi.toFixed(1)}%`
    }));

    const formattedMonth = format(parseISO(filterMonth), "MMMM yyyy", { locale: indonesiaLocale });

    const options = {
        filename: `Laporan_Performa_Tim_${formattedMonth}`,
        title: `Laporan Performa Tim - ${formattedMonth}`,
        data: exportData,
        columns,
    };
    
    if (type === 'pdf') {
        exportToPDF(options);
    } else {
        exportToCSV(options);
    }
  };
  
  const handleOpenDetail = (employee: PerformanceProfile) => {
    setSelectedEmployee(employee);
    setIsDetailOpen(true);
  };
  
  const closeAllModals = () => {
    setIsDetailOpen(false);
    setSelectedEmployee(null);
  };


  if (!canRead && !loading) {
    return (
      <MainLayout>
        <div className="flex flex-col justify-center items-center h-[calc(100vh-100px)]">
             <h1 className="text-2xl font-bold">Akses Ditolak</h1>
             <p className="text-muted-foreground">Anda tidak memiliki izin untuk melihat halaman ini.</p>
        </div>
      </MainLayout>
    );
  }


  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Performa Tim & Individu</h1>
            <p className="text-muted-foreground">
              Lacak dan analisis metrik performa tim.
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2" disabled={isExporting || filteredData.length === 0}>
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
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="filter-month">Bulan Target</Label>
                <Input
                  id="filter-month"
                  type="month"
                  value={format(parseISO(filterMonth), "yyyy-MM")} 
                  onChange={(e) => setFilterMonth(format(parseISO(e.target.value), "yyyy-MM-dd"))}
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="filter-group">Group</Label>
                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger id="filter-group">
                    <SelectValue placeholder="Pilih Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Group</SelectItem>
                    {availableGroups.map(group => (
                      <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="search-employee">Cari Karyawan</Label>
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search-employee"
                      placeholder="Cari nama atau grup..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Omset Tim (Filter)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                 {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(summary.totalOmset)}
              </div>
              <p className="text-xs text-success mt-1">Berdasarkan filter aktif</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Komisi (Filter)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(summary.totalCommission)}
              </div>
              <p className="text-xs text-success mt-1">Berdasarkan filter aktif</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Karyawan (Filter)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : performanceData.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total karyawan (sesuai filter)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rata-rata KPI Tim (Filter)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", getKPIColor(summary.avgKpi))}>
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${summary.avgKpi.toFixed(1)}%`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Pencapaian rata-rata</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Ranking Karyawan</CardTitle>
            <CardDescription>
              Menampilkan data performa berdasarkan filter yang dipilih.
            </CardDescription>
          </CardHeader>
          <CardContent>
             {loading ? (
                 <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 </div>
             ) : (
                <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Nama</TableHead>
                          <TableHead>Group</TableHead>
                          <TableHead className="text-right">Total Omset</TableHead>
                          <TableHead className="text-right">Komisi (Aktual)</TableHead>
                          <TableHead className="text-center">Absensi</TableHead>
                          <TableHead className="text-center">KPI %</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                    {searchTerm ? "Karyawan tidak ditemukan." : "Tidak ada data performa untuk filter ini."}
                                </TableCell>
                            </TableRow>
                        )}
                        {filteredData.map((employee, index) => (
                          <TableRow key={employee.id}>
                            <TableCell className="font-bold">#{index + 1}</TableCell>
                            <TableCell className="font-medium">{employee.full_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{employee.group_name}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(employee.omset)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(employee.commission)}
                            </TableCell>
                            <TableCell className="text-center">
                                {employee.attendance} hari
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col items-center gap-1">
                                <span className={`font-bold ${getKPIColor(employee.kpi)}`}>
                                  {employee.kpi.toFixed(1)}%
                                </span>
                                <Progress value={employee.kpi} className="w-16 h-1.5" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleOpenDetail(employee)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Lihat Detail Performa
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                </div>
             )}
          </CardContent>
        </Card>

        {/* Top Performers (Menggunakan data real) */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Top Performers - Omset (Filter)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredData
                .sort((a, b) => b.omset - a.omset)
                .slice(0, 3)
                .map((employee, index) => (
                <div key={employee.id} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{employee.full_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress
                        value={(employee.omset / (summary.totalOmset || 1)) * 100}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-20 text-right">
                        {formatCurrency(employee.omset)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {filteredData.length === 0 && <p className="text-muted-foreground">Tidak ada data untuk peringkat.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                Top Performers - KPI (Filter)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredData
                // Data sudah di-sort by KPI
                .slice(0, 3)
                .map((employee, index) => (
                  <div key={employee.id} className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{employee.full_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={employee.kpi} className="flex-1" />
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {employee.kpi.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              {filteredData.length === 0 && <p className="text-muted-foreground">Tidak ada data untuk peringkat.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* --- RENDER MODAL DETAIL --- */}
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

export default Performance;