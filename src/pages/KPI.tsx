// src/pages/KPI.tsx

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Download, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { SetTargetDialog } from "@/components/KPI/SetTargetDialog";
import { EditTargetDialog } from "@/components/KPI/EditTargetDialog"; 
import { DeleteTargetAlert } from "@/components/KPI/DeleteTargetAlert"; 
import { cn } from "@/lib/utils";
import { useExport } from "@/hooks/useExport"; 

// Tipe data dari Supabase
export type KpiData = {
  id: string;
  employee_id: string; 
  target_month: string;
  sales_target: number;
  commission_target: number;
  attendance_target: number;
  actual_sales: number | null;
  actual_commission: number | null;
  actual_attendance: number | null;
  employees: {
    profiles: {
      full_name: string;
    }
  };
};

// Tipe data yang sudah dihitung
type CalculatedKpi = KpiData & {
  sales_pct: number;
  commission_pct: number;
  attendance_pct: number;
  total_kpi: number;
};

// Tipe untuk dialog
type DialogState = {
  add: boolean;
  edit: KpiData | null;
  delete: KpiData | null;
};

const KPI = () => {
  const { profile } = useAuth();
  const [kpiData, setKpiData] = useState<CalculatedKpi[]>([]
);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogs, setDialogs] = useState<DialogState>({
    add: false,
    edit: null,
    delete: null,
  });

  // INISIALISASI HOOK EXPORT
  const { exportToPDF, exportToCSV, isExporting } = useExport();

  const canManage = profile?.role === "superadmin" || profile?.role === "leader";
  const canRead = canManage || profile?.role === "admin" || profile?.role === "viewer";
  const canDelete = profile?.role === "superadmin";

  // Helper format
  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatDateMonth = (dateString: string) => {
    try {
      return format(new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`), "MMM yyyy");
    } catch (e) { return "-"; }
  }
  
  // --- FUNGSI UTAMA: KALKULASI KPI ---
  const calculateKpi = (data: KpiData[]): CalculatedKpi[] => {
    return data.map(item => {
      // Realisasi (%) = (Aktual / Target) * 100
      const sales_pct = (item.sales_target > 0) ? ((item.actual_sales || 0) / item.sales_target) * 100 : 0;
      const commission_pct = (item.commission_target > 0) ? ((item.actual_commission || 0) / item.commission_target) * 100 : 0;
      const attendance_pct = (item.attendance_target > 0) ? ((item.actual_attendance || 0) / item.attendance_target) * 100 : 0;
      
      // Total KPI = (Omset x 0.5) + (Komisi x 0.3) + (Absensi x 0.2)
      const total_kpi = (sales_pct * 0.5) + (commission_pct * 0.3) + (attendance_pct * 0.2);
      
      return {
        ...item,
        // Cap di 100% untuk Realisasi Individu
        sales_pct: Math.min(sales_pct, 100),
        commission_pct: Math.min(commission_pct, 100),
        attendance_pct: Math.min(attendance_pct, 100),
        // Cap total KPI di 100%
        total_kpi: Math.min(total_kpi, 100), 
      };
    });
  };

  const fetchKpiData = async () => {
    setLoading(true);
    if (!canRead && profile) {
        toast.error("Anda tidak memiliki akses ke halaman ini.");
        setLoading(false);
        return;
    }
    try {
      // Ambil data KPI targets, dan join ke employees (untuk nama)
      const { data, error } = await supabase
        .from("kpi_targets")
        .select(`
          id,
          employee_id,
          target_month,
          sales_target,
          commission_target,
          attendance_target,
          actual_sales,
          actual_commission,
          actual_attendance,
          employees (
            profiles ( full_name )
          )
        `)
        .order("target_month", { ascending: false });

      if (error) throw error;
      
      const calculatedData = calculateKpi(data as any);
      // Urutkan berdasarkan total KPI tertinggi (Ranking)
      calculatedData.sort((a, b) => b.total_kpi - a.total_kpi);
      setKpiData(calculatedData);

    } catch (error: any) {
      toast.error("Gagal memuat data KPI.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) fetchKpiData();
  }, [profile]);
  
  // Helper untuk menentukan warna Progress Bar
  const getKpiColor = (kpi: number) => {
    if (kpi >= 100) return "bg-success";
    if (kpi >= 70) return "bg-warning";
    return "bg-destructive";
  };
  
  // Helper untuk menentukan warna teks KPI
  const getKpiTextColor = (kpi: number) => {
     if (kpi >= 100) return "text-success";
     if (kpi >= 70) return "text-warning";
     return "text-destructive";
  }
  
  const handleEditClick = (kpi: KpiData) => {
    setDialogs({ ...dialogs, edit: kpi });
  };
  
  const handleDeleteClick = (kpi: KpiData) => {
    setDialogs({ ...dialogs, delete: kpi });
  };
  
  const handleSuccess = () => {
     setDialogs({ add: false, edit: null, delete: null });
     fetchKpiData(); 
  };
  
  const filteredKpiData = kpiData.filter(item => 
    item.employees?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // --- FUNGSI HANDLE EXPORT ---
  const handleExport = (type: 'pdf' | 'csv') => {
    const columns = [
      { header: 'Rank', dataKey: 'rank' },
      { header: 'Karyawan', dataKey: 'employee_name' },
      { header: 'Bulan', dataKey: 'month_formatted' },
      { header: 'Omset Aktual', dataKey: 'actual_sales_formatted' },
      { header: 'Omset Target', dataKey: 'sales_target_formatted' },
      { header: 'Komisi Aktual', dataKey: 'actual_commission_formatted' },
      { header: 'Komisi Target', dataKey: 'commission_target_formatted' },
      { header: 'Absen Aktual', dataKey: 'actual_attendance_formatted' },
      { header: 'Absen Target', dataKey: 'attendance_target_formatted' },
      { header: 'Total KPI %', dataKey: 'total_kpi_formatted' },
    ];
    
    const exportData = filteredKpiData.map((item, index) => ({
        ...item,
        rank: `#${index + 1}`,
        employee_name: item.employees?.profiles?.full_name || 'N/A',
        month_formatted: formatDateMonth(item.target_month),
        actual_sales_formatted: formatCurrency(item.actual_sales),
        sales_target_formatted: formatCurrency(item.sales_target),
        actual_commission_formatted: formatCurrency(item.actual_commission),
        commission_target_formatted: formatCurrency(item.commission_target),
        actual_attendance_formatted: `${item.actual_attendance || 0} hari`,
        attendance_target_formatted: `${item.attendance_target} hari`,
        total_kpi_formatted: `${item.total_kpi.toFixed(1)}%`
    }));

    const options = {
        filename: 'Laporan_KPI_Karyawan',
        title: 'Laporan KPI Karyawan',
        data: exportData,
        columns,
    };
    
    if (type === 'pdf') {
        exportToPDF(options);
    } else {
        exportToCSV(options);
    }
  };


  if (!canRead && !loading) {
     return (
        <MainLayout>
           <div className="flex flex-col justify-center items-center h-[calc(100vh-100px)]">
             <h1 className="text-2xl font-bold">Akses Ditolak</h1>
             <p className="text-muted-foreground">Anda tidak memiliki izin untuk melihat halaman ini.</p>
           </div>
         </MainLayout>
     )
  }


  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Goal & Target KPI</h1>
            <p className="text-muted-foreground">Lacak pencapaian target tim dan individu.</p>
          </div>
          {canManage && (
            <Button className="gap-2" onClick={() => setDialogs({ ...dialogs, add: true })}>
              <Plus className="h-4 w-4" />
              Set Target Baru
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ranking Karyawan (Berdasarkan KPI Total)</CardTitle>
            <CardDescription>Menampilkan data target dan realisasi bulanan karyawan.</CardDescription>
             <div className="flex items-center gap-4 pt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari nama karyawan..." 
                  className="pl-10 w-full" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2" disabled={isExporting || filteredKpiData.length === 0}>
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
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Bulan</TableHead>
                    <TableHead>Omset (Aktual/Target)</TableHead>
                    <TableHead>Komisi (Aktual/Target)</TableHead>
                    <TableHead>Absensi (Aktual/Target)</TableHead>
                    <TableHead className="w-[200px]">Total KPI</TableHead>
                    {canManage && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKpiData.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={canManage ? 8 : 7} className="text-center h-24">
                         Belum ada data target KPI yang ditetapkan atau tidak ditemukan.
                       </TableCell>
                     </TableRow>
                  )}
                  {filteredKpiData.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-bold text-lg">#{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        {item.employees?.profiles?.full_name || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatDateMonth(item.target_month)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                           <span className="font-medium">{formatCurrency(item.actual_sales)}</span>
                           <span className="text-xs text-muted-foreground">/ {formatCurrency(item.sales_target)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col">
                           <span className="font-medium">{formatCurrency(item.actual_commission)}</span>
                           <span className="text-xs text-muted-foreground">/ {formatCurrency(item.commission_target)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                           <span className="font-medium">{item.actual_attendance || 0} hari</span>
                           <span className="text-xs text-muted-foreground">/ {item.attendance_target} hari</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           <Progress 
                             value={item.total_kpi} 
                             className={cn("h-3 w-full", getKpiColor(item.total_kpi))} 
                           />
                           <span className={cn("font-bold w-12 text-right", getKpiTextColor(item.total_kpi))}>
                             {item.total_kpi.toFixed(1)}%
                           </span>
                        </div>
                      </TableCell>
                      {canManage && (
                        <TableCell>
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditClick(item)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit Target
                                </DropdownMenuItem>
                                {canDelete && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      className="text-destructive"
                                      onClick={() => handleDeleteClick(item)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Hapus Target
                                    </DropdownMenuItem>
                                  </>
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
          </CardContent>
        </Card>
      </div>

      {canManage && (
         <>
           <SetTargetDialog
             open={dialogs.add}
             onOpenChange={(open) => setDialogs({ ...dialogs, add: open })}
             onSuccess={handleSuccess}
           />
           {dialogs.edit && (
             <EditTargetDialog
                open={!!dialogs.edit}
                onOpenChange={(open) => setDialogs({ ...dialogs, edit: open ? dialogs.edit : null })}
                onSuccess={handleSuccess}
                kpiToEdit={dialogs.edit}
              />
            )}
            {canDelete && dialogs.delete && (
              <DeleteTargetAlert
                open={!!dialogs.delete}
                onOpenChange={(open) => setDialogs({ ...dialogs, delete: open ? dialogs.delete : null })}
                onSuccess={handleSuccess}
                kpiToDelete={dialogs.delete}
              />
            )}
         </>
       )}
    </MainLayout>
  );
};

export default KPI;