// src/pages/ProfitLoss.tsx

import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator, // Import Separator
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Download,
  TrendingUp,
  TrendingDown,
  Loader2,
  Percent,
  CalendarIcon, // <-- 1. IMPORT BARU
  Printer, // <-- 1. IMPORT BARU
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useExport } from "@/hooks/useExport";
// --- 2. IMPORT TAMBAHAN UNTUK FILTER ---
import { format, subDays, parseISO } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// ---------------------------------------

// Definisi Tipe
type CashflowData = { type: "income" | "expense"; amount: number; category: string | null; description: string };
type CommissionData = { paid_commission: number };
type SummaryItem = { name: string; value: number; color: string };
// Tipe baru untuk filter
type Group = { id: string; name: string };

const ProfitLoss = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [expenseBreakdown, setExpenseBreakdown] = useState<SummaryItem[]>([]);
  const [taxRate, setTaxRate] = useState(0.1); 
  
  // --- 3. STATE BARU UNTUK FILTER ---
  const [filterDateStart, setFilterDateStart] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [filterDateEnd, setFilterDateEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterGroup, setFilterGroup] = useState("all");
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  // ------------------------------------
  
  // Ambil hook export
  const { exportToPDF, exportToCSV, isExporting, printData } = useExport();

  const canRead = profile?.role === "superadmin" || profile?.role === "admin" || profile?.role === "leader" || profile?.role === "viewer";
  
  const formatCurrency = (amount: number, style: 'currency' | 'decimal' = 'currency') => {
    return new Intl.NumberFormat("id-ID", {
      style: style,
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  // --- 4. MODIFIKASI FUNGSI FETCHDATA ---
  const fetchData = useCallback(async (startDate: string, endDate: string, groupId: string) => {
    setLoading(true);
    if (!canRead && profile) {
        toast.error("Anda tidak memiliki akses untuk melihat halaman ini.");
        setLoading(false);
        return;
    }

    try {
      // 1. Ambil Pendapatan (Komisi Cair)
      let commsQuery = supabase
        .from("commissions")
        .select(`paid_commission, accounts!inner(group_id)`) // !inner join
        .gte('payment_date', startDate)
        .lte('payment_date', endDate);
        
      if (groupId !== 'all') {
        commsQuery = commsQuery.eq('accounts.group_id', groupId);
      }
      
      const { data: commsData, error: commsError } = await commsQuery;
      if (commsError) throw commsError;
      
      const totalPaidCommission = (commsData as CommissionData[]).reduce((sum, c) => sum + (c.paid_commission || 0), 0);
      setTotalIncome(totalPaidCommission);

      // 2. Ambil Pengeluaran (Cashflow)
      let cfQuery = supabase
        .from("cashflow")
        .select(`type, amount, category, description`)
        .eq('type', 'expense')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

      if (groupId !== 'all') {
        cfQuery = cfQuery.eq('group_id', groupId);
      }

      const { data: cfData, error: cfError } = await cfQuery;
      if (cfError) throw cfError;

      const expenseItems = (cfData as CashflowData[]).filter(item => item.type === 'expense');
      const totalExpenses = expenseItems.reduce((sum, item) => sum + item.amount, 0);
      setTotalExpense(totalExpenses);

      // 3. Hitung Breakdown (tetap sama, tapi datanya sudah terfilter)
      const breakdown: { [key: string]: number } = {
          'Fixed Cost': 0,
          'Variable Cost': 0,
          'Lainnya': 0,
      };

      expenseItems.forEach(item => {
        if (item.category === 'fixed' || item.category === 'Fix Cost') { 
            breakdown['Fixed Cost'] += item.amount;
        } else if (item.category === 'variable' || item.category === 'Variable Cost') {
            breakdown['Variable Cost'] += item.amount;
        } else {
            breakdown['Lainnya'] += item.amount; 
        }
      });
      
      const chartData: SummaryItem[] = Object.entries(breakdown)
        .filter(([, value]) => value > 0)
        .map(([name, value], index) => ({ 
            name, 
            value,
            color: `hsl(var(--chart-${index + 1}))` 
        }));
        
      setExpenseBreakdown(chartData);

    } catch (error: any) {
      toast.error("Gagal memuat data Laba Rugi: " + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [profile, canRead]); // Tambahkan dependensi

  // --- 5. USEEFFECT UNTUK MEMANGGIL FETCH DATA ---
  useEffect(() => {
    if(profile) { 
      fetchData(filterDateStart, filterDateEnd, filterGroup);
    }
  }, [profile, filterDateStart, filterDateEnd, filterGroup, fetchData]);
  
  // --- 6. USEEFFECT BARU UNTUK FETCH GROUPS ---
  useEffect(() => {
    const fetchGroups = async () => {
        const { data, error } = await supabase.from("groups").select("id, name");
        if (data) {
            setAvailableGroups(data);
        }
    };
    fetchGroups();
  }, []);
  
  // Perhitungan Laba Rugi (otomatis update saat state berubah)
  const labaKotor = totalIncome - totalExpense; 
  const taxAmount = labaKotor * taxRate;       
  const labaBersih = labaKotor - taxAmount;     
  
  const financialSummaryData = [
    { name: 'Pendapatan (Komisi Cair)', Amount: totalIncome, fill: 'hsl(var(--success))' },
    { name: 'Pengeluaran', Amount: totalExpense, fill: 'hsl(var(--destructive))' },
    { name: 'Laba Kotor', Amount: labaKotor, fill: 'hsl(var(--chart-1))' },
  ];
  
  // --- 7. MODIFIKASI FUNGSI HANDLE EXPORT ---
  const handleExport = (type: 'pdf' | 'csv' | 'print') => {
    const columns = [
      { header: 'Deskripsi', dataKey: 'description' },
      { header: 'Nominal (Rp)', dataKey: 'amount' },
    ];
    
    // Data yang diekspor adalah data yang sudah dihitung (terfilter)
    const exportData = [
      { description: `Total Pendapatan (Filter)`, amount: totalIncome },
      { description: `Total Pengeluaran (Filter)`, amount: -totalExpense },
      { description: 'Laba Kotor', amount: labaKotor },
      { description: `Pajak (${(taxRate * 100).toFixed(0)}%)`, amount: -taxAmount },
      { description: 'Laba Bersih (Net Income)', amount: labaBersih },
    ];

    const options = {
        filename: `Laporan_Laba_Rugi_${filterDateStart}_sd_${filterDateEnd}`,
        title: `Laporan Laba Rugi (${formatDate(filterDateStart)} - ${formatDate(filterDateEnd)})`,
        data: exportData,
        columns,
    };
    
    if (type === 'pdf') {
        exportToPDF(options);
    } else if (type === 'csv') {
        exportToCSV(options);
    } else {
        printData(options);
    }
  };


  if (loading && !profile) { // Loading awal
      return (
         <MainLayout>
           <div className="flex justify-center items-center h-[calc(100vh-100px)]">
             <Loader2 className="h-10 w-10 animate-spin text-primary" />
           </div>
         </MainLayout>
      );
  }

  if (!canRead) {
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
            <h1 className="text-3xl font-bold">Laba Rugi Bisnis</h1>
            <p className="text-muted-foreground">Perhitungan otomatis dari Komisi Cair dan Pengeluaran Cashflow.</p>
          </div>
          {/* --- 8. PERBARUI TOMBOL EXPORT --- */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2" disabled={isExporting}>
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
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('print')} disabled={isExporting}>
                    <Printer className="mr-2 h-4 w-4" />
                    Cetak Halaman
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* --------------------------------- */}
        </div>
        
        {/* --- 9. TAMBAHKAN UI FILTER BARU --- */}
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Filter Data</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Filter Tanggal Mulai */}
                    <div className="space-y-2">
                        <Label htmlFor="date-start">Tanggal Mulai</Label>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            id="date-start"
                            variant={"outline"}
                            className={cn("w-full justify-start text-left font-normal", !filterDateStart && "text-muted-foreground")}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filterDateStart ? format(parseISO(filterDateStart), "PPP") : <span>Pilih tanggal</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                            mode="single"
                            selected={parseISO(filterDateStart)}
                            onSelect={(date) => date && setFilterDateStart(format(date, "yyyy-MM-dd"))}
                            initialFocus
                            />
                        </PopoverContent>
                        </Popover>
                    </div>
                    
                    {/* Filter Tanggal Selesai */}
                    <div className="space-y-2">
                        <Label htmlFor="date-end">Tanggal Selesai</Label>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            id="date-end"
                            variant={"outline"}
                            className={cn("w-full justify-start text-left font-normal", !filterDateEnd && "text-muted-foreground")}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filterDateEnd ? format(parseISO(filterDateEnd), "PPP") : <span>Pilih tanggal</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                            mode="single"
                            selected={parseISO(filterDateEnd)}
                            onSelect={(date) => date && setFilterDateEnd(format(date, "yyyy-MM-dd"))}
                            initialFocus
                            />
                        </PopoverContent>
                        </Popover>
                    </div>

                    {/* Filter Grup */}
                    <div className="space-y-2">
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
                </div>
            </CardContent>
        </Card>
        {/* ---------------------------------- */}


        {/* Summary Cards (Sekarang ter-filter) */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-success/5 border-success/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-success flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total Pendapatan (Filter)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {loading ? <Loader2 className="h-6 w-6 animate-spin"/> : formatCurrency(totalIncome)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-destructive/5 border-destructive/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Total Pengeluaran (Filter)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {loading ? <Loader2 className="h-6 w-6 animate-spin"/> : formatCurrency(totalExpense)}
              </div>
            </CardContent>
          </Card>
          <Card className={cn(labaKotor >= 0 ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20')}>
            <CardHeader className="pb-3">
              <CardTitle className={cn("text-sm font-medium", labaKotor >= 0 ? 'text-primary' : 'text-destructive')}>
                Laba Kotor (Gross Profit)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", labaKotor >= 0 ? 'text-primary' : 'text-destructive')}>
                 {loading ? <Loader2 className="h-6 w-6 animate-spin"/> : formatCurrency(labaKotor)}
              </div>
            </CardContent>
          </Card>
           <Card className={cn(labaBersih >= 0 ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20')}>
            <CardHeader className="pb-3">
              <CardTitle className={cn("text-sm font-medium", labaBersih >= 0 ? 'text-success' : 'text-destructive')}>
                Laba Bersih (Net Income)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", labaBersih >= 0 ? 'text-success' : 'text-destructive')}>
                 {loading ? <Loader2 className="h-6 w-6 animate-spin"/> : formatCurrency(labaBersih)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Tax Calculation */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Perbandingan Posisi Keuangan (Filter)</CardTitle>
              <CardDescription>Pendapatan, Pengeluaran, dan Laba Kotor berdasarkan filter.</CardDescription>
            </CardHeader>
            <CardContent>
             {loading ? (
                <div className="flex justify-center items-center h-[300px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={financialSummaryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickFormatter={(value) => formatCurrency(value, 'decimal')} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="Amount" radius={[4, 4, 0, 0]}>
                     {financialSummaryData.map((entry, index) => (
                      <Bar key={`cell-${index}`} dataKey="Amount" fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
             )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Perhitungan Pajak & Laba Bersih</CardTitle>
              <CardDescription>Asumsi Pajak Bisnis ({Math.round(taxRate * 100)}% dari Laba Kotor).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none flex items-center gap-2">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    Tarif Pajak (Perubahan Manual) 
                </label>
                <div className="flex items-center gap-2">
                   <Input
                       type="number"
                       min="0"
                       max="1"
                       step="0.01"
                       value={taxRate}
                       onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                       className="w-24 text-right"
                   />
                   <span className="text-muted-foreground text-sm">({(taxRate * 100).toFixed(0)}%)</span>
                </div>
              </div>
              
              <div className="space-y-2 pt-3 border-t">
                  <div className="flex justify-between">
                     <span className="text-sm">Laba Kotor</span>
                     <span className="font-medium">{loading ? "..." : formatCurrency(labaKotor)}</span>
                  </div>
                  <div className="flex justify-between">
                     <span className="text-sm text-destructive">Pajak ({taxRate * 100}%)</span>
                     <span className="font-medium text-destructive">{loading ? "..." : formatCurrency(taxAmount)}</span>
                  </div>
                   <div className="flex justify-between border-t pt-2">
                     <span className="font-bold">Laba Bersih</span>
                     <span className={cn("font-bold", labaBersih >= 0 ? "text-success" : "text-destructive")}>
                       {loading ? "..." : formatCurrency(labaBersih)}
                     </span>
                  </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
           <CardHeader>
             <CardTitle>Breakdown Pengeluaran (Filter)</CardTitle>
           </CardHeader>
           <CardContent>
             {loading ? (
                <div className="flex justify-center items-center h-[300px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : expenseBreakdown.length === 0 ? (
                <div className="flex justify-center items-center h-[300px]">
                  <p className="text-muted-foreground">Tidak ada data pengeluaran untuk filter ini.</p>
                </div>
              ) : (
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={expenseBreakdown} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tickFormatter={(value) => formatCurrency(value, 'decimal')} stroke="hsl(var(--muted-foreground))" />
                        <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" width={100} />
                        <Tooltip
                            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }}
                            formatter={(value: number) => formatCurrency(value)}
                        />
                        <Bar dataKey="value" name="Total Pengeluaran" fill="hsl(var(--destructive))" radius={[0, 8, 8, 0]}>
                           {expenseBreakdown.map((entry, index) => (
                               <Bar key={`bar-${index}`} dataKey="value" fill={entry.color} />
                           ))}
                        </Bar>
                    </BarChart>
                  </ResponsiveContainer>
              )}
           </CardContent>
        </Card>
        
      </div>
    </MainLayout>
  );
};

export default ProfitLoss;