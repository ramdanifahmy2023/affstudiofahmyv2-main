// src/pages/Dashboard.tsx
import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Search,
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
  PieChart,
  Pie,
  Cell,
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

// --- Tipe Data Baru untuk Charts ---
type CommissionBreakdown = { name: string; value: number; color: string };
type GroupPerformance = { name: string; omset: number };
type AccountPlatform = { name: string; value: number; color: string };
// ------------------------------------


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

// Warna untuk chart
const CHART_COLORS = {
  blue: "hsl(var(--chart-1))",
  green: "hsl(var(--chart-2))",
  yellow: "hsl(var(--chart-3))",
  shopee: "hsl(var(--chart-1))", // Biru untuk Shopee
  tiktok: "hsl(var(--chart-2))", // Hijau untuk TikTok
};


const Dashboard = () => {
  const { profile } = useAuth();
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  
  // State untuk Data Real-time
  const [loadingRanking, setLoadingRanking] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [rankingData, setRankingData] = useState<EmployeePerformance[]>([]);
  const [commissionData, setCommissionData] = useState<CommissionBreakdown[]>([]);
  const [groupData, setGroupData] = useState<GroupPerformance[]>([]);
  const [accountData, setAccountData] = useState<AccountPlatform[]>([]);
  
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
    console.log("Filtering applied:", { start: filterDateStart, end: filterDateEnd });
    // TODO: Terapkan filter ke fetchRankingData dan fetchChartData
    toast.info("Fitur filter global sedang dalam pengembangan.");
  };
  
  // --- FETCH RANKING DATA (REAL) ---
  const fetchRankingData = useCallback(async () => {
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
            
            if (!latestKpiMap.has(employeeId)) {
                latestKpiMap.set(employeeId, performanceRecord);
            }
        });

        const uniqueData = Array.from(latestKpiMap.values());
        uniqueData.sort((a, b) => b.kpi - a.kpi);
        setRankingData(uniqueData);

    } catch (error: any) {
        toast.error("Gagal memuat data Ranking Dashboard.");
        console.error(error);
    } finally {
        setLoadingRanking(false);
    }
  }, []);
  
  // --- FUNGSI BARU: FETCH DATA UNTUK CHARTS ---
  const fetchChartData = useCallback(async () => {
    setLoadingCharts(true);
    try {
      // 1. Fetch Commission Breakdown
      const { data: commsData, error: commsError } = await supabase
        .from('commissions')
        .select('gross_commission, net_commission, paid_commission');
        
      if (commsError) throw commsError;

      const gross = commsData.reduce((acc, c) => acc + (c.gross_commission || 0), 0);
      const net = commsData.reduce((acc, c) => acc + (c.net_commission || 0), 0);
      const paid = commsData.reduce((acc, c) => acc + (c.paid_commission || 0), 0);
      
      setCommissionData([
        { name: "Kotor", value: gross, color: CHART_COLORS.blue },
        { name: "Bersih", value: net, color: CHART_COLORS.green },
        { name: "Cair", value: paid, color: CHART_COLORS.yellow },
      ]);

      // 2. Fetch Group Performance (dari KPI data)
      const { data: groupPerfData, error: groupPerfError } = await supabase
        .from('kpi_targets')
        .select(`
          actual_sales,
          employees ( groups ( name ) )
        `);
        
      if (groupPerfError) throw groupPerfError;
      
      const groupOmsetMap = new Map<string, number>();
      (groupPerfData as any[]).forEach(item => {
        const groupName = item.employees?.groups?.name || "Tanpa Grup";
        const currentOmset = groupOmsetMap.get(groupName) || 0;
        groupOmsetMap.set(groupName, currentOmset + (item.actual_sales || 0));
      });

      const groupDataArray = Array.from(groupOmsetMap.entries())
        .map(([name, omset]) => ({ name, omset }))
        .sort((a, b) => b.omset - a.omset) // Urutkan dari terbesar
        .slice(0, 5); // Ambil top 5
        
      setGroupData(groupDataArray);
      
      // 3. Fetch Account Platform Breakdown
      const { data: accData, error: accError } = await supabase
        .from('accounts')
        .select('platform')
        .in('platform', ['shopee', 'tiktok']);
        
      if (accError) throw accError;
      
      let shopeeCount = 0;
      let tiktokCount = 0;
      (accData as any[]).forEach(acc => {
        if (acc.platform === 'shopee') shopeeCount++;
        if (acc.platform === 'tiktok') tiktokCount++;
      });
      
      setAccountData([
        { name: "Shopee", value: shopeeCount, color: CHART_COLORS.shopee },
        { name: "TikTok", value: tiktokCount, color: CHART_COLORS.tiktok },
      ]);

    } catch (error: any) {
        toast.error("Gagal memuat data Charts Dashboard.");
        console.error(error);
    } finally {
      setLoadingCharts(false);
    }
  }, []);
  
  
  useEffect(() => {
    if (profile) {
        fetchRankingData();
        fetchChartData();
    }
  }, [profile, fetchRankingData, fetchChartData]);
  
  // Filter Ranking Data berdasarkan Search Term
  const filteredRankingData = rankingData.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.group.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // --- DATA DUMMY UNTUK CHART TREN (Sementara) ---
  const dummySalesData = [
    { name: "Mon", sales: 4000, commission: 2400 },
    { name: "Tue", sales: 3000, commission: 1398 },
    { name: "Wed", sales: 2000, commission: 9800 },
    { name: "Thu", sales: 2780, commission: 3908 },
    { name: "Fri", sales: 1890, commission: 4800 },
    { name: "Sat", sales: 2390, commission: 3800 },
    { name: "Sun", sales: 3490, commission: 4300 },
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
              <Button onClick={handleFilterSubmit} className="gap-2">
                <Search className="h-4 w-4" /> Terapkan Filter
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
               <CardDescription>Chart ini masih menggunakan data dummy. Fetch data real-time harian/mingguan akan ditambahkan.</CardDescription>
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
                    stroke={CHART_COLORS.blue}
                    strokeWidth={2}
                    name="Omset"
                  />
                  <Line
                    type="monotone"
                    dataKey="commission"
                    stroke={CHART_COLORS.green}
                    strokeWidth={2}
                    name="Komisi"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Chart Breakdown Komisi (REAL DATA) */}
          <Card>
            <CardHeader>
              <CardTitle>Breakdown Komisi (All Time)</CardTitle>
            </CardHeader>
            <CardContent>
             {loadingCharts ? (
                 <div className="flex justify-center items-center h-[300px]">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                 </div>
             ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={commissionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" tickFormatter={(val) => formatCurrencyForChart(val)} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                        formatter={(value: number) => formatCurrencyForChart(value)}
                    />
                    <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 8, 8, 0]} name="Nilai">
                       {commissionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                </BarChart>
              </ResponsiveContainer>
             )}
            </CardContent>
          </Card>
        </div>

        {/* --- Charts Row 2 & Ranking --- */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Chart Performa Group (REAL DATA) */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Performa Group (Top 5 Omset)</CardTitle>
            </CardHeader>
            <CardContent>
             {loadingCharts ? (
                 <div className="flex justify-center items-center h-[300px]">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                 </div>
             ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={groupData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" tickFormatter={(val) => formatCurrencyForChart(val)} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    formatter={(value: number) => formatCurrencyForChart(value)}
                  />
                  <Bar dataKey="omset" fill={CHART_COLORS.blue} radius={[0, 8, 8, 0]} name="Omset" />
                </BarChart>
              </ResponsiveContainer>
             )}
            </CardContent>
          </Card>
          
          {/* Chart Performa Akun (REAL DATA) */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Breakdown Platform Akun</CardTitle>
            </CardHeader>
            <CardContent>
            {loadingCharts ? (
                 <div className="flex justify-center items-center h-[300px]">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                 </div>
             ) : (
              <ResponsiveContainer width="100%" height={300}>
                 <PieChart>
                  <Pie
                    data={accountData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {accountData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} Akun`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
             )}
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
                        .slice(0, 5) // Tampilkan Top 5
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