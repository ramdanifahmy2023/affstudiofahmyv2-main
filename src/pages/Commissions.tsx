// src/pages/Commissions.tsx

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DropdownMenuSeparator, // <-- 1. IMPORT SEPARATOR
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
  Download, // <-- 2. IMPORT DOWNLOAD ICON
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";

// Import dialog-dialog
import { AddCommissionDialog } from "@/components/Commission/AddCommissionDialog";
import { EditCommissionDialog } from "@/components/Commission/EditCommissionDialog";
import { DeleteCommissionAlert } from "@/components/Commission/DeleteCommissionAlert";
import { useExport } from "@/hooks/useExport"; // <-- 3. IMPORT USE EXPORT

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

  // --- 4. INISIALISASI HOOK EXPORT ---
  const { exportToPDF, exportToCSV, isExporting } = useExport();

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
    return amount.toString(); // Export angka mentah untuk CSV
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString + "T00:00:00"); 
    return format(date, "dd MMM yyyy", { locale: indonesiaLocale });
  };
  
  const formatDateForExport = (dateString: string | null) => {
    if (!dateString) return "-";
    return dateString; // Format YYYY-MM-DD
  };


  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
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
          accounts ( id, username )
        `
        )
        .order("period_start", { ascending: false });

      if (error) throw error;
      setCommissions(data as any);
      
      const gross = data.reduce((acc, c) => acc + (c.gross_commission || 0), 0);
      const net = data.reduce((acc, c) => acc + (c.net_commission || 0), 0);
      const paid = data.reduce((acc, c) => acc + (c.paid_commission || 0), 0);
      setSummary({ gross, net, paid });

    } catch (error: any) {
      toast.error("Gagal memuat data komisi.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, []);
  
  // --- 5. FUNGSI HANDLE EXPORT ---
  const handleExport = (type: 'pdf' | 'csv') => {
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
        // Gunakan angka mentah untuk CSV/PDF
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
    } else {
        exportToCSV(options);
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

        {/* --- KARTU SUMMARY --- */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Komisi Kotor</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.gross)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Komisi Bersih</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.net)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Komisi Cair</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {formatCurrency(summary.paid)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabel Data */}
        <Card>
          <CardHeader>
            {/* --- 6. GANTI BUTTON EXPORT DENGAN DROPDOWN --- */}
            <div className="flex justify-between items-center">
              <CardTitle>Riwayat Komisi</CardTitle>
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
             {/* ------------------------------------------- */}
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
                          Belum ada data komisi.
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
      </div>

      {canManage && (
        <>
          <AddCommissionDialog
            open={dialogs.add}
            onOpenChange={(open) => setDialogs({ ...dialogs, add: open })}
            onSuccess={() => {
              setDialogs({ ...dialogs, add: false });
              fetchCommissions(); 
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
                fetchCommissions(); 
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
                fetchCommissions(); 
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