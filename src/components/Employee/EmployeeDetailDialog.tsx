// src/components/Employee/EmployeeDetailDialog.tsx

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, DollarSign, Target, TrendingUp, Shield, Users, Mail, Phone } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from "recharts";
import { EmployeeProfile } from "@/pages/Employees"; // Import tipe dari halaman Employees
import { format, parseISO } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";

// --- Helper Functions (dicopy dari Performance.tsx) ---

const calculateTotalKpi = (sales: number, sTarget: number, comm: number, cTarget: number, attend: number, aTarget: number) => {
    const sales_pct = (sTarget > 0) ? (sales / sTarget) * 100 : 0;
    const commission_pct = (cTarget > 0) ? (comm / cTarget) * 100 : 0;
    const attendance_pct = (aTarget > 0) ? (attend / aTarget) * 100 : 0;
    const total_kpi = (sales_pct * 0.5) + (commission_pct * 0.3) + (attendance_pct * 0.2);
    return Math.min(total_kpi, 100);
};

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

const getAvatarFallback = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
};
// ----------------------------------------------------

interface EmployeeDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeProfile | null;
}

// Tipe data untuk histori KPI
type KpiHistory = {
  month: string;
  omset: number;
  komisi: number;
  kpi: number;
};

// Tipe data untuk summary
type KpiSummary = {
  totalOmset: number;
  totalKomisi: number;
  avgKpi: number;
  monthsTracked: number;
};

export const EmployeeDetailDialog = ({
  isOpen,
  onClose,
  employee,
}: EmployeeDetailDialogProps) => {
  const [loadingKpi, setLoadingKpi] = useState(false);
  const [performanceData, setPerformanceData] = useState<KpiHistory[]>([]);
  const [summary, setSummary] = useState<KpiSummary | null>(null);

  const fetchPerformanceData = useCallback(async (employeeId: string) => {
    setLoadingKpi(true);
    try {
      // Ambil 6 bulan terakhir data KPI untuk karyawan ini
      const { data, error } = await supabase
        .from("kpi_targets")
        .select(`
            target_month,
            sales_target,
            commission_target,
            attendance_target,
            actual_sales,
            actual_commission,
            actual_attendance
        `)
        .eq("employee_id", employeeId)
        .order("target_month", { ascending: false }) // Ambil terbaru dulu
        .limit(6);

      if (error) throw error;

      if (data.length === 0) {
        setPerformanceData([]);
        setSummary(null);
        return;
      }

      let totalOmset = 0;
      let totalKomisi = 0;
      let totalKpi = 0;

      const chartData: KpiHistory[] = data.map(item => {
        const kpi = calculateTotalKpi(
          item.actual_sales || 0, item.sales_target,
          item.actual_commission || 0, item.commission_target,
          item.actual_attendance || 0, item.attendance_target
        );
        
        totalOmset += (item.actual_sales || 0);
        totalKomisi += (item.actual_commission || 0);
        totalKpi += kpi;

        return {
          // Format '2024-11-01' -> 'Nov 2024'
          month: format(parseISO(item.target_month), "MMM yyyy", { locale: indonesiaLocale }),
          omset: item.actual_sales || 0,
          komisi: item.actual_commission || 0,
          kpi: kpi,
        };
      }).reverse(); // Balik array agar kronologis (lama -> baru) untuk chart

      setPerformanceData(chartData);
      setSummary({
        totalOmset,
        totalKomisi,
        avgKpi: totalKpi / data.length,
        monthsTracked: data.length,
      });

    } catch (error: any) {
      toast.error("Gagal memuat data performa karyawan.", {
        description: error.message,
      });
    } finally {
      setLoadingKpi(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && employee) {
      fetchPerformanceData(employee.id); // 'id' dari EmployeeProfile adalah 'employee_id'
    } else {
      // Reset state saat ditutup
      setPerformanceData([]);
      setSummary(null);
    }
  }, [isOpen, employee, fetchPerformanceData]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90svh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center gap-4 space-y-0">
          <Avatar className="h-16 w-16">
            <AvatarImage src={employee?.avatar_url || ""} />
            <AvatarFallback className="text-2xl">
              {getAvatarFallback(employee?.full_name || "??")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <DialogTitle className="text-2xl mb-1">{employee?.full_name}</DialogTitle>
            <DialogDescription className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5"><Shield className="h-4 w-4" /> <span className="capitalize">{employee?.role}</span></span>
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {employee?.group_name}</span>
              <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" /> {employee?.email}</span>
              <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> {employee?.phone || "-"}</span>
            </DialogDescription>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Performa (Maks. 6 Bulan Terakhir)</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingKpi ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !summary ? (
                <div className="flex justify-center items-center h-64">
                  <p className="text-muted-foreground">Belum ada data KPI yang tercatat untuk karyawan ini.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <DollarSign className="h-4 w-4" /> Total Omset (6 Bln)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.totalOmset)}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" /> Total Komisi (6 Bln)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.totalKomisi)}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Target className="h-4 w-4" /> Rata-rata KPI
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={cn("text-2xl font-bold", getKPIColor(summary.avgKpi))}>
                          {summary.avgKpi.toFixed(1)}%
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Performance Trend Chart */}
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" tickFormatter={(val) => formatCurrency(val)} />
                      <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" tickFormatter={(val) => `${val}%`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                        formatter={(value: number, name: string) => 
                          name === 'kpi' ? `${value.toFixed(1)}%` : formatCurrency(value)
                        }
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="omset" fill="hsl(var(--chart-1))" name="Omset" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="left" dataKey="komisi" fill="hsl(var(--chart-2))" name="Komisi" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="kpi" fill="hsl(var(--chart-3))" name="KPI" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};