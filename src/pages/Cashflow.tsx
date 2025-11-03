// src/pages/Cashflow.tsx (FIXED VERSION)

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
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Scale,
  Link as LinkIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Import dialog-dialog
import { AddTransactionDialog } from "@/components/Cashflow/AddTransactionDialog";
import { EditTransactionDialog } from "@/components/Cashflow/EditTransactionDialog";
import { DeleteTransactionAlert } from "@/components/Cashflow/DeleteTransactionAlert";

// Tipe data untuk Transaksi
export type TransactionData = {
  id: string;
  transaction_date: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  proof_url: string | null;
  groups: {
    id: string;
    name: string;
  } | null;
  profiles: {
    id: string;
    full_name: string;
  } | null;
};

// Tipe untuk dialog
type DialogState = {
  add: boolean;
  edit: TransactionData | null;
  delete: TransactionData | null;
};

const Cashflow = () => {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "income" | "expense">("all");
  const [dialogs, setDialogs] = useState<DialogState>({
    add: false,
    edit: null,
    delete: null,
  });

  // ✅ PERBAIKAN: Cek apakah profile sudah ter-load
  const canManage = profile && (
    profile.role === "superadmin" ||
    profile.role === "leader" ||
    profile.role === "admin"
  );
  const canDelete = profile && profile.role === "superadmin";

  // Helper format
  const formatCurrency = (amount: number | null) => {
    if (amount === null || isNaN(amount)) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString + "T00:00:00");
      if (isNaN(date.getTime())) return "-";
      return format(date, "dd MMM yyyy", { locale: indonesiaLocale });
    } catch {
      return "-";
    }
  };

  // Fungsi ambil data
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cashflow")
        .select(
          `
          id,
          transaction_date,
          type,
          category,
          amount,
          description,
          proof_url,
          groups ( id, name ),
          profiles ( id, full_name )
        `
        )
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      
      // ✅ PERBAIKAN: Validasi data yang diterima
      const validatedData = (data || []).map((item: any) => ({
        ...item,
        amount: typeof item.amount === 'number' ? item.amount : 0,
        transaction_date: item.transaction_date || new Date().toISOString().split('T')[0],
      }));
      
      setTransactions(validatedData as TransactionData[]);
    } catch (error: any) {
      console.error("Error fetching cashflow:", error);
      toast.error("Gagal memuat data cashflow: " + (error?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // ✅ PERBAIKAN: Perhitungan Summary dengan validasi
  const { totalIncome, totalExpense, netBalance } = transactions.reduce(
    (acc, t) => {
      const amount = typeof t.amount === 'number' ? t.amount : 0;
      if (t.type === 'income') acc.totalIncome += amount;
      if (t.type === 'expense') acc.totalExpense += amount;
      acc.netBalance = acc.totalIncome - acc.totalExpense;
      return acc;
    },
    { totalIncome: 0, totalExpense: 0, netBalance: 0 }
  );

  // Filter data untuk tabel
  const filteredTransactions = transactions.filter(t => {
    if (activeTab === 'all') return true;
    return t.type === activeTab;
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Arus Kas (Cashflow)</h1>
            <p className="text-muted-foreground">
              Kelola semua pemasukan dan pengeluaran.
            </p>
          </div>
          {canManage && (
            <Button
              className="gap-2"
              onClick={() => setDialogs({ ...dialogs, add: true })}
            >
              <Plus className="h-4 w-4" />
              Tambah Transaksi
            </Button>
          )}
        </div>

        {/* KARTU SUMMARY */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pemasukan</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {formatCurrency(totalIncome)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(totalExpense)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo (Net)</CardTitle>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                netBalance >= 0 ? "text-success" : "text-destructive"
              )}>
                {formatCurrency(netBalance)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs dan Tabel Data */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="all">Semua Transaksi</TabsTrigger>
            <TabsTrigger value="income">Pemasukan</TabsTrigger>
            <TabsTrigger value="expense">Pengeluaran</TabsTrigger>
          </TabsList>

          <Card className="mt-4">
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Deskripsi</TableHead>
                        <TableHead>Grup</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Oleh</TableHead>
                        <TableHead>Bukti</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                        {canManage && <TableHead className="w-20">Aksi</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={canManage ? 8 : 7} className="text-center h-24">
                            Belum ada data transaksi.
                          </TableCell>
                        </TableRow>
                      )}
                      {filteredTransactions.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="whitespace-nowrap">{formatDate(t.transaction_date)}</TableCell>
                          <TableCell className="font-medium max-w-xs truncate">
                            {t.description}
                          </TableCell>
                          <TableCell>
                            {t.groups ? (
                              <Badge variant="outline" className="whitespace-nowrap">{t.groups.name}</Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="whitespace-nowrap">{t.category}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {t.profiles?.full_name || "-"}
                          </TableCell>
                          <TableCell>
                            {t.proof_url ? (
                              <Button variant="outline" size="sm" asChild>
                                <a href={t.proof_url} target="_blank" rel="noopener noreferrer">
                                  <LinkIcon className="h-4 w-4" />
                                </a>
                              </Button>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right font-bold whitespace-nowrap",
                            t.type === 'income' ? "text-success" : "text-destructive"
                          )}>
                            {t.type === 'expense' && "-"}
                            {formatCurrency(t.amount)}
                          </TableCell>
                          {canManage && (
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setDialogs({ ...dialogs, edit: t })
                                    }
                                  >
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                  {canDelete && (
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() =>
                                        setDialogs({ ...dialogs, delete: t })
                                      }
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" /> Hapus
                                    </DropdownMenuItem>
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
        </Tabs>
      </div>

      {/* RENDER SEMUA DIALOG */}
      {canManage && (
        <>
          <AddTransactionDialog
            open={dialogs.add}
            onOpenChange={(open) => setDialogs({ ...dialogs, add: open })}
            onSuccess={() => {
              setDialogs({ ...dialogs, add: false });
              fetchTransactions();
            }}
          />
          <EditTransactionDialog
            open={!!dialogs.edit}
            onOpenChange={(open) =>
              setDialogs({ ...dialogs, edit: open ? dialogs.edit : null })
            }
            onSuccess={() => {
              setDialogs({ ...dialogs, edit: null });
              fetchTransactions();
            }}
            transaction={dialogs.edit}
          />
          <DeleteTransactionAlert
            open={!!dialogs.delete}
            onOpenChange={(open) =>
              setDialogs({ ...dialogs, delete: open ? dialogs.delete : null })
            }
            onSuccess={() => {
              setDialogs({ ...dialogs, delete: null });
              fetchTransactions();
            }}
            transaction={dialogs.delete}
          />
        </>
      )}
    </MainLayout>
  );
};

export default Cashflow;