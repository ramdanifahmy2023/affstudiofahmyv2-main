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
// --- 1. IMPORT BARU UNTUK TANGGAL ---
import { format, subDays, eachDayOfInterval, parseISO } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";
// --- TAMBAHAN IMPORT UNTUK FILTER ---
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// ------------------------------------

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
// --- Tipe Data Baru untuk Sales Trend ---
type SalesTrendData = {
  date: string; // Format 'dd MMM'
  sales: number;
  commission: number;
};

// --- Tipe Data Baru untuk Filter Group ---
type Group = { id: string; name: string };
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
  // --- 2. UPDATE FILTER STATE DENGAN DEFAULT 30 HARI ---
  const [filterDateStart, setFilterDateStart] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [filterDateEnd, setFilterDateEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  // ----------------------------------------------------
  
  // --- TAMBAHAN FILTER GROUP ---
  const [filterGroup, setFilterGroup] = useState("all");
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  // -----------------------------
  
  // State untuk Data Real-time
  const [loadingRanking, setLoadingRanking] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [rankingData, setRankingData] = useState<EmployeePerformance[]>([]);
  const [commissionData, setCommissionData] = useState<CommissionBreakdown[]>([]);
  const [groupData, setGroupData] = useState<GroupPerformance[]>([]);
  const [accountData, setAccountData] = useState<AccountPlatform[]>([]);
  // --- 3. STATE BARU UNTUK SALES TREND ---
  const [salesTrendData, setSalesTrendData] = useState<SalesTrendData[]>([]);
  
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
    
  // --- 4. FUNGSI BARU UNTUK MENGGABUNGKAN FETCH ---
  const fetchData = useCallback(async (startDate: string, endDate: string, groupId: string) => { // ADD groupId
    setLoadingRanking(true);
    setLoadingCharts(true);
    
    // Validasi tanggal
    if (!startDate || !endDate || parseISO(startDate) > parseISO(endDate)) {
        toast.error("Rentang tanggal tidak valid.");
        setLoadingRanking(false);
        setLoadingCharts(false);
        return;
    }
    
    // Panggil kedua fungsi fetch secara paralel
    await Promise.all([
      fetchRankingData(startDate, endDate, groupId), // PASS groupId
      fetchChartData(startDate, endDate, groupId)    // PASS groupId
    ]);
  }, []);

  
  // --- FETCH RANKING DATA (REAL) ---
  // (Menerima parameter tanggal DAN GROUP)
  const fetchRankingData = useCallback(async (startDate: string, endDate: string, groupId: string) => { // ADD groupId
    setLoadingRanking(true);
    try {
        const twoMonthsAgo = format(subDays(parseISO(startDate), 30), "yyyy-MM-dd");
    
        let query = supabase
            .from('kpi_targets')
            .select(`
                sales_target,
                commission_target,
                attendance_target,
                actual_sales,
                actual_commission,
                actual_attendance,
                employees!inner (
                    id,
                    profiles ( full_name ),
                    groups ( name, id )
                ),
                target_month
            `)
            .gte('target_month', twoMonthsAgo)
            .order('target_month', { ascending: false });

        // Terapkan filter grup pada join employees
        if (groupId !== "all") {
             query = query.eq('employees.group_id', groupId);
        }

        const { data: kpiResults, error: kpiError } = await query;
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
  // (Menerima parameter tanggal DAN GROUP)
  const fetchChartData = useCallback(async (startDate: string, endDate: string, groupId: string) => { // ADD groupId
    setLoadingCharts(true);
    try {
      // 1. Fetch Commission Breakdown (Berdasarkan filter tanggal)
      let commsQuery = supabase
        .from('commissions')
        .select('gross_commission, net_commission, paid_commission, accounts!inner(group_id)')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate);
        
      if (groupId !== 'all') {
          commsQuery = commsQuery.eq('accounts.group_id', groupId); // Terapkan filter grup
      }
        
      const { data: commsData, error: commsError } = await commsQuery;
      if (commsError) throw commsError;

      const gross = commsData.reduce((acc, c) => acc + (c.gross_commission || 0), 0);
      const net = commsData.reduce((acc, c) => acc + (c.net_commission || 0), 0);
      const paid = commsData.reduce((acc, c) => acc + (c.paid_commission || 0), 0);
      
      setCommissionData([
        { name: "Kotor", value: gross, color: CHART_COLORS.blue },
        { name: "Bersih", value: net, color: CHART_COLORS.green },
        { name: "Cair", value: paid, color: CHART_COLORS.yellow },
      ]);

      // 2. Fetch Group Performance (dari KPI data, All Time)
      let groupPerfQuery = supabase
        .from('kpi_targets')
        .select(`
          actual_sales,
          employees!inner ( groups ( name, id ) )
        `);
      
      // Filter Group di sini juga (untuk Group Performance chart)
      if (groupId !== 'all') {
          groupPerfQuery = groupPerfQuery.eq('employees.groups.id', groupId);
      }
        
      const { data: groupPerfData, error: groupPerfError } = await groupPerfQuery;
      if (groupPerfError) throw groupPerfError;
      
      const groupOmsetMap = new Map<string, number>();
      (groupPerfData as any[]).forEach(item => {
        const groupName = item.employees?.groups?.name || "Tanpa Grup";
        const currentOmset = groupOmsetMap.get(groupName) || 0;
        groupOmsetMap.set(groupName, currentOmset + (item.actual_sales || 0));
      });

      const groupDataArray = Array.from(groupOmsetMap.entries())
        .map(([name, omset]) => ({ name, omset }))
        .sort((a, b) => b.omset - a.omset) 
        .slice(0, 5); 
        
      setGroupData(groupDataArray);
      
      // 3. Fetch Account Platform Breakdown (Tidak terpengaruh filter tanggal)
      let accQuery = supabase
        .from('accounts')
        .select('platform, group_id')
        .in('platform', ['shopee', 'tiktok']);
        
      if (groupId !== 'all') {
         accQuery = accQuery.eq('group_id', groupId); // Terapkan filter grup
      }
        
      const { data: accData, error: accError } = await accQuery;
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
      
      // 4. FETCH DATA UNTUK SALES TREND (DAILY REPORTS & COMMISSIONS)
      
      // A. Fetch Daily Reports (Omset)
      let salesQuery = supabase
          .from('daily_reports')
          .select('report_date, total_sales, devices!inner(group_id)')
          .gte('report_date', startDate)
          .lte('report_date', endDate);
          
      if (groupId !== 'all') {
           // Gunakan .filter() untuk memastikan filter group_id di join devices
           salesQuery = salesQuery.eq('devices.group_id', groupId); 
      }
          
      const { data: salesData, error: salesError } = await salesQuery;
      if (salesError) throw salesError;
      
      // B. Fetch Commissions (Komisi Cair)
      let commTrendQuery = supabase
          .from('commissions')
          .select('payment_date, paid_commission, accounts!inner(group_id)')
          .gte('payment_date', startDate)
          .lte('payment_date', endDate);
          
      if (groupId !== 'all') {
           // Gunakan .filter() untuk memastikan filter group_id di join accounts
           commTrendQuery = commTrendQuery.eq('accounts.group_id', groupId); 
      }
          
      const { data: commissionTrendData, error: commissionTrendError } = await commTrendQuery;
      if (commissionTrendError) throw commissionTrendError;
      
      // C. Proses & Gabungkan Data
      const trendMap = new Map<string, { date: string, sales: number, commission: number }>();
      const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });

      // Inisialisasi Map
      days.forEach(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dateLabel = format(day, 'dd MMM', { locale: indonesiaLocale });
          trendMap.set(dateKey, { date: dateLabel, sales: 0, commission: 0 });
      });
      
      // Agregasi Omset Harian
      (salesData as any[]).forEach(report => {
          const dateKey = report.report_date;
          if (trendMap.has(dateKey)) {
              const current = trendMap.get(dateKey)!;
              current.sales += (report.total_sales || 0);
              trendMap.set(dateKey, current);
          }
      });
      
      // Agregasi Komisi Cair Harian
      (commissionTrendData as any[]).forEach(comm => {
          const dateKey = comm.payment_date;
           if (dateKey && trendMap.has(dateKey)) {
              const current = trendMap.get(dateKey)!;
              current.commission += (comm.paid_commission || 0);
              trendMap.set(dateKey, current);
          }
      });
      
      setSalesTrendData(Array.from(trendMap.values()));

    } catch (error: any) {
        toast.error("Gagal memuat data Charts Dashboard.");
        console.error(error);
    } finally {
      setLoadingCharts(false);
    }
  }, []);
  
  
  // --- Fetch Groups Effect ---
  useEffect(() => {
    const fetchGroups = async () => {
        const { data, error } = await supabase.from("groups").select("id, name");
        if (data) {
            setAvailableGroups(data);
        } else if (error) {
            toast.error("Gagal memuat daftar grup.");
        }
    };
    fetchGroups();
  }, []);
  
  // --- 5. UPDATE USEEFFECT UNTUK MEMANGGIL FETCHDATA ---
  useEffect(() => {
    if (profile) {
        // Panggil fetchData dengan semua filter
        fetchData(filterDateStart, filterDateEnd, filterGroup);
    }
  }, [profile, fetchData, filterDateStart, filterDateEnd, filterGroup]); // ADD filterGroup
  
  // --- 6. UPDATE HANDLER FILTER ---
  const handleFilterSubmit = () => {
    // Memanggil fetchData sudah cukup karena dipicu oleh perubahan state filter
    fetchData(filterDateStart, filterDateEnd, filterGroup);
  };
  
  // Filter Ranking Data berdasarkan Search Term
  const filteredRankingData = rankingData.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.group.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
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
              {/* --- TAMBAHAN FILTER GROUP --- */}
              <div className="flex-1 min-w-[150px] space-y-1">
                <Label htmlFor="filter-group">Group</Label>
                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger id="filter-group" className="w-full">
                    <SelectValue placeholder="Semua Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Group</SelectItem>
                    {availableGroups.map(group => (
                      <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* --- AKHIR TAMBAHAN FILTER GROUP --- */}
              
              {/* --- 7. AKTIFKAN TOMBOL FILTER --- */}
              <Button onClick={handleFilterSubmit} className="gap-2" disabled={loadingCharts || loadingRanking}>
                { (loadingCharts || loadingRanking) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )} 
                Terapkan Filter
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* === KOMPONEN METRIK REAL TIME === */}
        <DashboardStats />
        {/* ================================== */}

        {/* --- Charts Row 1 --- */}
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
          {/* --- 8. UPDATE CHART TREN OMSET (REAL DATA) --- */}
          <Card className="lg:col-span-2"> 
            <CardHeader>
              <CardTitle>Tren Omset & Komisi Cair</CardTitle>
               <CardDescription>Menampilkan data harian berdasarkan filter tanggal dan group.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCharts ? (
                 <div className="flex justify-center items-center h-[300px]">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                 </div>
               ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(val) => formatCurrencyForChart(val)} />
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
                      name="Omset Harian"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="commission"
                      stroke={CHART_COLORS.green}
                      strokeWidth={2}
                      name="Komisi Cair"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          {/* --- AKHIR PERUBAHAN CHART TREN --- */}

          {/* Chart Breakdown Komisi (REAL DATA) */}
          <Card>
            <CardHeader>
              <CardTitle>Breakdown Komisi (Filter)</CardTitle>
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
              <CardDescription>Berdasarkan total omset aktual di KPI (All Time, sesuai filter Group).</CardDescription>
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
              <CardDescription>Total akun terdaftar (All Time, sesuai filter Group).</CardDescription>
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
              <CardDescription>Berdasarkan Total KPI aktual (sesuai filter Group).</CardDescription>
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