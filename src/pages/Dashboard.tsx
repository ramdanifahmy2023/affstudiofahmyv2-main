// src/pages/Dashboard.tsx
import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Search,
  DollarSign,
  TrendingUp,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import DashboardStats from "@/components/Dashboard/DashboardStats";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


// --- INTERFACE & HELPER DARI PERFORMANCE.TS (Untuk Ranking/Chart) ---
interface EmployeePerformance {
    id: string;
    name: string;
    group: string;
    omset: number; // actual_sales
    commission: number; // actual_commission
    kpi: number; // total_kpi
}

const calculateTotalKpi = (sales: number, sTarget: number, comm: number, cTarget: number, attend: number, aTarget: number) => {
    // Bobot: Omset 50%, Komisi 30%, Absensi 20%
    const sales_pct = (sTarget > 0) ? (sales / sTarget) * 100 : 0;
    const commission_pct = (cTarget > 0) ? (comm / cTarget) * 100 : 0;
    const attendance_pct = (aTarget > 0) ? (attend / aTarget) * 100 : 0;
    
    const total_kpi = (sales_pct * 0.5) + (commission_pct * 0.3) + (attendance_pct * 0.2);
    
    return Math.min(total_kpi, 100);
};

const getKPIColorClass = (kpi: number) => {
    if (kpi >= 90) return "text-success";
    if (kpi >= 70) return "text-warning";
    return "text-destructive";
};

// --- END INTERFACE & HELPER ---


const Dashboard = () => {
  const { profile } = useAuth();
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [loadingRanking, setLoadingRanking] = useState(true);
  const [rankingData, setRankingData] = useState<EmployeePerformance[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatCurrencyForChart = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
    
  const handleFilterSubmit = () => {
    // Logic filter akan diterapkan di sini (saat ini hanya konsol log)
    console.log("Filtering applied:", { start: filterDateStart, end: filterDateEnd });
  };
  
  // --- FETCH RANKING DATA (REAL) ---
  const fetchRankingData = async () => {
    setLoadingRanking(true);
    try {
        const { data: kpiResults, error: kpiError } = await supabase
            .from('kpi_targets')
            .select(`
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
                kpi: calculatedKpi,
            };
            
            // Hanya ambil record paling baru (asumsi data diurutkan berdasarkan target_month)
            if (!latestKpiMap.has(employeeId)) {
                latestKpiMap.set(employeeId, performanceRecord);
            }
        });

        const uniqueData = Array.from(latestKpiMap.values());

        // Urutkan berdasarkan KPI (Tertinggi ke Rendah)
        uniqueData.sort((a, b) => b.kpi - a.kpi);

        setRankingData(uniqueData);

    } catch (error: any) {
        toast.error("Gagal memuat data Ranking Dashboard.");
        console.error(error);
    } finally {
        setLoadingRanking(false);
    }
  };
  
  useEffect(() => {
    if (profile) fetchRankingData();
  }, [profile]);
  
  // Filter Ranking Data berdasarkan Search Term
  const filteredRankingData = rankingData.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.group.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // --- DATA DUMMY UNTUK CHART (Dibiarkan untuk visual layout) ---
  const dummySalesData = [
    { name: "Mon", sales: 4000, commission: 2400 },
    { name: "Tue", sales: 3000, commission: 1398 },
    { name: "Wed", sales: 2000, commission: 9800 },
    { name: "Thu", sales: 2780, commission: 3908 },
    { name: "Fri", sales: 1890, commission: 4800 },
    { name: "Sat", sales: 2390, commission: 3800 },
    { name: "Sun", sales: 3490, commission: 4300 },
  ];
  
  const dummyCommissionData = [
    { name: "Kotor", value: 125000000, color: "hsl(var(--chart-1))" },
    { name: "Bersih", value: 100000000, color: "hsl(var(--chart-2))" },
    { name: "Cair", value: 85000000, color: "hsl(var(--chart-3))" },
  ];
  
  const dummyGroupData = [
    { name: "Group A", omset: 45000000 },
    { name: "Group B", omset: 38000000 },
    { name: "Group C", omset: 32000000 },
  ];
  
  const dummyAccountData = [
    { name: "Shopee", value: 15, color: "hsl(var(--chart-1))" },
    { name: "TikTok", value: 9, color: "hsl(var(--chart-2))" },
  ];
  // --- END DATA DUMMY ---


  return (
    <MainLayout>
      <div className="space-y-6">
        {/* --- FILTER GLOBAL (Di-simplify) --- */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[150px] space-y-1">
                <label htmlFor="date-start" className="text-xs text-muted-foreground">Mulai Tgl</label>
                <Input 
                  id="date-start" 
                  type="date" 
                  className="w-full" 
                  value={filterDateStart}
                  onChange={(e) => setFilterDateStart(e.target.value)}
                />
              </div>
              <div className="flex-1 min-w-[150px] space-y-1">
                <label htmlFor="date-end" className="text-xs text-muted-foreground">Sampai Tgl</label>
                <Input 
                  id="date-end" 
                  type="date" 
                  className="w-full"
                  value={filterDateEnd}
                  onChange={(e) => setFilterDateEnd(e.target.value)}
                />
              </div>
              <Button onClick={handleFilterSubmit} className="gap-2" disabled>
                <Search className="h-4 w-4" /> Terapkan (Soon)
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* === KOMPONEN METRIK REAL TIME === */}
        <DashboardStats />
        {/* ================================== */}

        {/* --- Charts Row 1 --- */}
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
          {/* Chart Tren Omset */}
          <Card className="lg:col-span-2"> 
            <CardHeader>
              <CardTitle>Tren Omset & Komisi (Dummy)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dummySalesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    formatter={(value: number) => formatCurrencyForChart(value)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    name="Omset"
                  />
                  <Line
                    type="monotone"
                    dataKey="commission"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    name="Komisi"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Chart Breakdown Komisi */}
          <Card>
            <CardHeader>
              <CardTitle>Breakdown Komisi (Dummy)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dummyCommissionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                        formatter={(value: number) => formatCurrencyForChart(value)}
                    />
                    <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 8, 8, 0]} name="Nilai"/>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* --- Charts Row 2 & Ranking --- */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Chart Performa Group */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Performa Group (Top 3) (Dummy)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dummyGroupData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    formatter={(value: number) => formatCurrencyForChart(value)}
                  />
                  <Bar dataKey="omset" fill="hsl(var(--chart-1))" radius={[0, 8, 8, 0]} name="Omset" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* Chart Performa Akun */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Performa Akun (Dummy)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dummyAccountData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                        formatter={(value: number) => `${value} Akun`}
                    />
                    <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 8, 8, 0]} name="Jumlah Akun"/>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Ranking Table (REAL DATA) */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Top Performers (Bulan Terakhir)</CardTitle>
              <CardDescription>Berdasarkan Total KPI aktual.</CardDescription>
              <Input 
                placeholder="Cari nama karyawan..."
                className="w-full mt-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </CardHeader>
            <CardContent>
              {loadingRanking ? (
                 <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                 </div>
             ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                    {filteredRankingData.length === 0 && (
                        <p className="text-center text-muted-foreground">Tidak ada data ranking ditemukan.</p>
                    )}
                    {filteredRankingData
                        .slice(0, 5)
                        .map((employee, index) => (
                        <div
                            key={employee.id}
                            className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                            <div 
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm"
                            >
                                {index + 1}
                            </div>
                            <div className="flex-1">
                                <p className="font-medium">{employee.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Progress value={employee.kpi} className="flex-1 h-1.5" />
                                    <span className={cn("text-xs w-12 text-right font-semibold", getKPIColorClass(employee.kpi))}>
                                        {employee.kpi.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-semibold">
                                    {formatCurrency(employee.omset)}
                                </p>
                                <p className="text-xs text-muted-foreground">Omset</p>
                            </div>
                        </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
      </div>
    </MainLayout>
  );
};

export default Dashboard;