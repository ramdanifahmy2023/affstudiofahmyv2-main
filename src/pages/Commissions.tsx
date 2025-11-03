// src/pages/Commissions.tsx

import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Plus,
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  DollarSign,
  TrendingUp,
  Wallet,
  Download,
  CalendarIcon,
  Search,
  Printer, 
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays, parseISO } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";

// Import dialog-dialog
import { AddCommissionDialog } from "@/components/Commission/AddCommissionDialog";
import { EditCommissionDialog } from "@/components/Commission/EditCommissionDialog";
import { DeleteCommissionAlert } from "@/components/Commission/DeleteCommissionAlert";
import { useExport } from "@/hooks/useExport";
import { cn } from "@/lib/utils";

// Tipe data untuk komisi
export type CommissionData = {
  id: string;
  period: string;
  period_start: string;
  period_end: string;
  gross_commission: number;
  net_commission: number;
  paid_commission: number;
  payment_date: string | null;
  accounts: {
    id: string;
    username: string;
    group_id: string | null;
  };
};

// Tipe untuk dialog
type DialogState = {
  add: boolean;
  edit: CommissionData | null;
  delete: CommissionData | null;
};

// Tipe untuk summary
type CommissionSummary = {
  gross: number;
  net: number;
  paid: number;
};

// Tipe untuk filter grup
type Group = {
  id: string;
  name: string;
};

const Commissions = () => {
  const { profile } = useAuth();
  const [commissions, setCommissions] = useState<CommissionData[]>([]);
  const [summary, setSummary] = useState<CommissionSummary>({ gross: 0, net: 0, paid: 0 });
  const [loading, setLoading] = useState(true);
  const [dialogs, setDialogs] = useState<DialogState>({
    add: false,
    edit: null,
    delete: null,
  });

  const [filterDateStart, setFilterDateStart] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [filterDateEnd, setFilterDateEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterGroup, setFilterGroup] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);

  // --- 2. HANYA DEKLARASI useExport ---
  const { exportToPDF, exportToCSV, isExporting, printData } = useExport();

  const canManage =
    profile?.role === "superadmin" ||
    profile?.role === "leader" ||
    profile?.role === "admin";
    
  const canDelete = profile?.role === "superadmin";

  // Helper format
  const formatCurrency = (amount: number | null) => {
    if (amount === null || isNaN(amount)) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatCurrencyForExport = (amount: number | null) => {
    if (amount === null || isNaN(amount)) return "0";
    return amount.toString();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString + "T00:00:00"); 
    return format(date, "dd MMM yyyy", { locale: indonesiaLocale });
  };
  
  const formatDateForExport = (dateString: string | null) => {
    if (!dateString) return "-";
    return dateString;
  };

  const fetchCommissions = useCallback(async (
    startDate: string,
    endDate: string,
    groupId: string,
    search: string
  ) => {
    setLoading(true);
    try {
      let query = supabase
        .from("commissions")
        .select(
          `
          id,
          period,
          period_start,
          period_end,
          gross_commission,
          net_commission,
          paid_commission,
          payment_date,
          accounts!inner ( id, username, group_id )
        `
        )
        // --- 3. FILTER UTAMA BERDASARKAN RENTANG WAKTU (period_start) ---
        .gte("period_start", startDate)
        .lte("period_start", endDate)
        // -----------------------------------------------------------------
        .order("period_start", { ascending: false });

      // --- 4. FILTER GROUP PADA TABEL YANG DIJOIN (accounts) ---
      if (groupId !== "all") {
        query = query.eq("accounts.group_id", groupId);
      }
      
      // --- 5. FILTER SEARCH PADA USERNAME ---
      if (search.trim() !== "") {
         query = query.ilike("accounts.username", `%${search.trim()}%`);
      }
      // --------------------------------------------------------

      const { data, error } = await query;

      if (error) throw error;
      setCommissions(data as any);
      
      const gross = data.reduce((acc, c) => acc + (c.gross_commission || 0), 0);
      const net = data.reduce((acc, c) => acc + (c.net_commission || 0), 0);
      const paid = data.reduce((acc, c) => acc + (c.paid_commission || 0), 0);
      setSummary({ gross, net, paid });

    } catch (error: any) {
      toast.error("Gagal memuat data komisi.", {
        description: error.message,
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- 6. useEffect untuk memicu fetch data saat filter berubah ---
  useEffect(() => {
    if (profile) { 
        fetchCommissions(filterDateStart, filterDateEnd, filterGroup, searchTerm);
    }
  }, [profile, fetchCommissions, filterDateStart, filterDateEnd, filterGroup, searchTerm]);

  // --- 7. useEffect untuk mengambil daftar group ---
  useEffect(() => {
    const fetchGroups = async () => {
        const { data, error } = await supabase.from("groups").select("id, name");
        if (data) {
            setAvailableGroups(data);
        }
    };
    fetchGroups();
  }, []);
  
  // FUNGSI HANDLE EXPORT (TETAP SAMA, TIDAK DIUBAH)
  const handleExport = (type: 'pdf' | 'csv' | 'print') => {
    const columns = [
      { header: 'Akun', dataKey: 'account_username' },
      { header: 'Periode', dataKey: 'period' },
      { header: 'Tgl Mulai', dataKey: 'period_start' },
      { header: 'Tgl Selesai', dataKey: 'period_end' },
      { header: 'Tgl Cair', dataKey: 'payment_date_formatted' },
      { header: 'Komisi Kotor (Rp)', dataKey: 'gross_commission' },
      { header: 'Komisi Bersih (Rp)', dataKey: 'net_commission' },
      { header: 'Komisi Cair (Rp)', dataKey: 'paid_commission' },
    ];
    
    const exportData = commissions.map(c => ({
        ...c,
        account_username: c.accounts?.username || 'N/A',
        payment_date_formatted: formatDateForExport(c.payment_date),
        gross_commission: c.gross_commission || 0,
        net_commission: c.net_commission || 0,
        paid_commission: c.paid_commission || 0,
    }));

    const options = {
        filename: 'Laporan_Data_Komisi',
        title: 'Laporan Data Komisi Affiliate',
        data: exportData,
        columns,
    };
    
    if (type === 'pdf') {
        exportToPDF(options);
    } else if (type === 'csv') {
        exportToCSV(options);
    } else {
        // Panggil fungsi printData baru dari hook
        printData(options); 
    }
  };


  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Data Komisi Affiliate</h1>
            <p className="text-muted-foreground">
              Kelola data komisi kotor, bersih, dan cair.
            </p>
          </div>
          {canManage && (
            <Button
              className="gap-2"
              onClick={() => setDialogs({ ...dialogs, add: true })}
            >
              <Plus className="h-4 w-4" />
              Input Komisi
            </Button>
          )}
        </div>

        {/* KARTU SUMMARY */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Komisi Kotor (Filter)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.gross)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Komisi Bersih (Filter)</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.net)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Komisi Cair (Filter)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {formatCurrency(summary.paid)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* UI FILTER BARU */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Filter Tanggal Mulai */}
              <div className="flex-1 space-y-2">
                <Label htmlFor="date-start">Tanggal Mulai Periode</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-start"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filterDateStart && "text-muted-foreground"
                      )}
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
              <div className="flex-1 space-y-2">
                <Label htmlFor="date-end">Tanggal Selesai Periode</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-end"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filterDateEnd && "text-muted-foreground"
                      )}
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

            </div>
          </CardHeader>

          {/* Tabel Data */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Riwayat Komisi</CardTitle>
                <div className="flex items-center gap-2">
                  {/* Filter Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari username..."
                      className="pl-10 w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  {/* Tombol Export */}
                  {/* --- 8. PERBAIKAN: Tombol Export sudah ada dan menggunakan useExport. Karena Anda ingin skip implementasi, kita biarkan fungsinya memanggil hook yang sudah ada. --- */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2" disabled={isExporting || commissions.length === 0}>
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
                  {/* ------------------------------------- */}
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
                        <TableHead>Akun</TableHead>
                        <TableHead>Periode</TableHead>
                        <TableHead>Tgl. Komisi Cair</TableHead>
                        <TableHead className="text-right">Kotor</TableHead>
                        <TableHead className="text-right">Bersih</TableHead>
                        <TableHead className="text-right">Cair</TableHead>
                        {canManage && <TableHead>Aksi</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center h-24">
                            Tidak ada data komisi untuk filter yang dipilih.
                          </TableCell>
                        </TableRow>
                      )}
                      {commissions.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">
                            {c.accounts?.username || "N/A"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <Badge
                                variant="secondary"
                                className="w-fit"
                              >
                                {c.period}
                              </Badge>
                              <span className="text-xs text-muted-foreground mt-1">
                                {formatDate(c.period_start)} - {formatDate(c.period_end)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(c.payment_date)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(c.gross_commission)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(c.net_commission)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-success">
                            {formatCurrency(c.paid_commission)}
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
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setDialogs({ ...dialogs, edit: c })
                                    }
                                  >
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                  {canDelete && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() =>
                                          setDialogs({ ...dialogs, delete: c })
                                        }
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" /> Hapus
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
        </Card>
      </div>

      {canManage && (
        <>
          <AddCommissionDialog
            open={dialogs.add}
            onOpenChange={(open) => setDialogs({ ...dialogs, add: open })}
            onSuccess={() => {
              setDialogs({ ...dialogs, add: false });
              // Panggil ulang fetch dengan filter saat ini
              fetchCommissions(filterDateStart, filterDateEnd, filterGroup, searchTerm); 
            }}
          />
          {dialogs.edit && (
            <EditCommissionDialog
              open={!!dialogs.edit}
              onOpenChange={(open) =>
                setDialogs({ ...dialogs, edit: open ? dialogs.edit : null })
              }
              onSuccess={() => {
                setDialogs({ ...dialogs, edit: null });
                fetchCommissions(filterDateStart, filterDateEnd, filterGroup, searchTerm);
              }}
              commission={dialogs.edit}
            />
          )}
          {canDelete && dialogs.delete && (
            <DeleteCommissionAlert
              open={!!dialogs.delete}
              onOpenChange={(open) =>
                setDialogs({ ...dialogs, delete: open ? dialogs.delete : null })
              }
              onSuccess={() => {
                setDialogs({ ...dialogs, delete: null });
                fetchCommissions(filterDateStart, filterDateEnd, filterGroup, searchTerm);
              }}
              commission={dialogs.delete}
            />
          )}
        </>
      )}
    </MainLayout>
  );
};

export default Commissions;