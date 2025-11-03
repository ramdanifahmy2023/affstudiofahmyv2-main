// src/pages/Performance.tsx

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, TrendingUp, MoreHorizontal, Loader2 } from "lucide-react";
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

// Tipe data gabungan untuk tabel
interface EmployeePerformance {
    id: string;
    name: string;
    group: string;
    omset: number; // actual_sales
    commission: number; // actual_commission
    paidCommission: number; // Placeholder
    attendance: number; // actual_attendance
    kpi: number; // total_kpi
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
  const [performanceData, setPerformanceData] = useState<EmployeePerformance[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
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
  
  const fetchData = async () => {
    setLoading(true);
    if (!profile || !canRead) {
        setLoading(false);
        return;
    }
    
    try {
        // Ambil data KPI, Employees, dan Group
        const { data: kpiResults, error: kpiError } = await supabase
            .from('kpi_targets')
            .select(`
                id,
                sales_target,
                commission_target,
                attendance_target,
                actual_sales,
                actual_commission,
                actual_attendance,
                employees (
                    id,
                    profiles ( full_name ),
                    groups ( name )
                ),
                target_month
            `)
            .order('target_month', { ascending: false });

        if (kpiError) throw kpiError;
        
        const rawData = kpiResults as any[];

        // Deduplikasi: Hanya simpan KPI terbaru (bulan terbesar) per karyawan
        const latestKpiMap = new Map<string, EmployeePerformance>();
        
        rawData.forEach((item) => {
             const employeeId = item.employees.id;
             const calculatedKpi = calculateTotalKpi(
                item.actual_sales || 0, item.sales_target,
                item.actual_commission || 0, item.commission_target,
                item.actual_attendance || 0, item.attendance_target
            );
            
             const performanceRecord: EmployeePerformance = {
                id: employeeId,
                name: item.employees?.profiles?.full_name || "N/A",
                group: item.employees?.groups?.name || "N/A",
                omset: item.actual_sales || 0,
                commission: item.actual_commission || 0,
                paidCommission: 0, 
                attendance: item.actual_attendance || 0,
                kpi: calculatedKpi,
            };
            
            // Cek apakah data ini lebih baru atau belum ada
            if (!latestKpiMap.has(employeeId)) {
                latestKpiMap.set(employeeId, performanceRecord);
            }
        });

        const uniqueData = Array.from(latestKpiMap.values());

        // Sort by KPI (Tertinggi ke Rendah)
        uniqueData.sort((a, b) => b.kpi - a.kpi);

        setPerformanceData(uniqueData);

    } catch (error: any) {
        toast.error("Gagal memuat data Performance: " + error.message);
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) fetchData();
  }, [profile]);
  
  // Filter berdasarkan search term
  const filteredData = performanceData.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.group.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Summary Calculation
  const totalOmsetTeam = performanceData.reduce((sum, e) => sum + e.omset, 0);
  const totalCommissionTeam = performanceData.reduce((sum, e) => sum + e.commission, 0);
  const avgKpi = performanceData.length > 0 ? performanceData.reduce((sum, e) => sum + e.kpi, 0) / performanceData.length : 0;
  
  if (!canRead) {
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
            <h1 className="text-3xl font-bold">Team & Individual Performance</h1>
            <p className="text-muted-foreground">
              Track and analyze team performance metrics
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled>Filter (Soon)</Button>
            <Button variant="outline" className="gap-2" disabled>
              <Download className="h-4 w-4" />
              Export (Soon)
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Team Omset
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                 {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(totalOmsetTeam)}
              </div>
              <p className="text-xs text-success mt-1">+Data KPI Aktual</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Commission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(totalCommissionTeam)}
              </div>
              <p className="text-xs text-success mt-1">+Data KPI Aktual</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Karyawan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : performanceData.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total Karyawan dengan Target KPI</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Team KPI Avg
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", getKPIColor(avgKpi))}>
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${avgKpi.toFixed(1)}%`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Overall achievement</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
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
                          <TableHead>Name</TableHead>
                          <TableHead>Group</TableHead>
                          <TableHead className="text-right">Omset Aktual</TableHead>
                          <TableHead className="text-right">Komisi Aktual</TableHead>
                          <TableHead className="text-center">Absensi Aktual</TableHead>
                          <TableHead className="text-center">KPI %</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                    Tidak ada data performance ditemukan.
                                </TableCell>
                            </TableRow>
                        )}
                        {filteredData.map((employee, index) => (
                          <TableRow key={employee.id}>
                            <TableCell className="font-bold">#{index + 1}</TableCell>
                            <TableCell className="font-medium">{employee.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{employee.group}</Badge>
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
                              <Button variant="ghost" size="sm" disabled>
                                Details
                              </Button>
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
                Top Performers - Omset
              </CardTitle>
              <CardDescription>Berdasarkan Omset Aktual.</CardDescription>
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
                    <p className="font-medium">{employee.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress
                        value={(employee.omset / (totalOmsetTeam || 1)) * 100 * 2} // Skala relatif
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
                Top Performers - KPI
              </CardTitle>
              <CardDescription>Berdasarkan Total KPI Aktual.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredData
                .sort((a, b) => b.kpi - a.kpi)
                .slice(0, 3)
                .map((employee, index) => (
                  <div key={employee.id} className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{employee.name}</p>
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
    </MainLayout>
  );
};

export default Performance;