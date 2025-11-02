import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Download, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { AddTransactionDialog } from "@/components/Cashflow/AddTransactionDialog"; // IMPORT BARU

// Tipe data dari Supabase
type CashflowData = {
  id: string;
  transaction_date: string;
  type: "income" | "expense";
  category: "fixed" | "variable" | null;
  amount: number;
  description: string;
  proof_url: string | null;
  groups: { name: string } | null;
  profiles: { full_name: string } | null;
};

const Cashflow = () => {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<CashflowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("expense");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Cek hak akses
  const canAddTransaction =
    profile?.role === "superadmin" ||
    profile?.role === "leader" ||
    profile?.role === "admin";

  // Helper format
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(`${dateString}T00:00:00`), "dd MMM yyyy");
    } catch (e) { return "-"; }
  }

  // Fetch data
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cashflow")
        .select(`
          id,
          transaction_date,
          type,
          category,
          amount,
          description,
          proof_url,
          groups ( name ),
          profiles ( full_name )
        `)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setTransactions(data as any);
    } catch (error: any) {
      toast.error("Gagal memuat data cashflow.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Pisahkan data untuk tabel
  const expenses = transactions.filter((t) => t.type === "expense");
  const income = transactions.filter((t) => t.type === "income");

  // Kalkulasi untuk summary
  const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
  const netCashflow = totalIncome - totalExpense;
  const fixedCost = expenses
    .filter(e => e.category === 'fixed')
    .reduce((sum, item) => sum + item.amount, 0);
  const variableCost = expenses
    .filter(e => e.category === 'variable')
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cashflow & Pembukuan</h1>
            <p className="text-muted-foreground">Lacak pemasukan dan pengeluaran.</p>
          </div>
          {/* Tampilkan tombol HANYA jika diizinkan [cite: 373, 374] */}
          {canAddTransaction && (
            <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Tambah Transaksi
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                Total Pemasukan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(totalIncome)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Total Pengeluaran
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(totalExpense)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Cashflow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  netCashflow >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(netCashflow)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {netCashflow >= 0 ? "Surplus" : "Defisit"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="expense">Pengeluaran</TabsTrigger>
                  <TabsTrigger value="income">Pemasukan</TabsTrigger>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Cari..." className="pl-10 w-64" />
                  </div>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>
            </Tabs>
          </CardHeader>
          <CardContent>
            {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                {/* Expense Tab */}
                <TabsContent value="expense" className="mt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Grup</TableHead>
                        <TableHead className="text-right">Nominal</TableHead>
                        <TableHead>Bukti</TableHead>
                        <TableHead>Oleh</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>{formatDate(expense.transaction_date)}</TableCell>
                          <TableCell className="font-medium">
                            {expense.description}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                expense.category === "fixed" ? "default" : "secondary"
                              }
                            >
                              {expense.category === "fixed" ? "Fix Cost" : "Variable"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{expense.groups?.name || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-destructive">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell>
                            {expense.proof_url ? (
                               <Button variant="link" size="sm" asChild className="h-auto p-0">
                                 <a href={expense.proof_url} target="_blank" rel="noopener noreferrer">
                                   Lihat Bukti
                                 </a>
                               </Button>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {expense.profiles?.full_name || 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                {/* Income Tab */}
                <TabsContent value="income" className="mt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead>Grup</TableHead>
                        <TableHead className="text-right">Nominal</TableHead>
                        <TableHead>Oleh</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {income.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{formatDate(item.transaction_date)}</TableCell>
                          <TableCell className="font-medium">
                            {item.description}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.groups?.name || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-success">
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {item.profiles?.full_name || 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                {/* Summary Tab */}
                <TabsContent value="summary" className="mt-0">
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            Breakdown Pengeluaran
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Fixed Cost
                            </span>
                            <span className="font-medium">{formatCurrency(fixedCost)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Variable Cost
                            </span>
                            <span className="font-medium">{formatCurrency(variableCost)}</span>
                          </div>
                          <div className="border-t pt-3 flex items-center justify-between">
                            <span className="font-medium">Total</span>
                            <span className="font-bold text-destructive">
                              {formatCurrency(totalExpense)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Ringkasan Pemasukan</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Anda bisa tambahkan breakdown pemasukan di sini jika perlu */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Komisi Cair (Contoh)
                            </span>
                            <span className="font-medium">{formatCurrency(totalIncome)}</span>
                          </div>
                          <div className="border-t pt-3 flex items-center justify-between">
                            <span className="font-medium">Total</span>
                            <span className="font-bold text-success">
                              {formatCurrency(totalIncome)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Render Dialog Tambah Transaksi */}
      {canAddTransaction && (
         <AddTransactionDialog
           open={isModalOpen}
           onOpenChange={setIsModalOpen}
           onSuccess={() => {
             setIsModalOpen(false); // Tutup dialog
             fetchTransactions(); // Refresh data
           }}
         />
       )}
    </MainLayout>
  );
};

export default Cashflow;