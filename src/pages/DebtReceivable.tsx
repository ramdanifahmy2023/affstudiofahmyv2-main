import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Download, Loader2, ArrowUp, ArrowDown } from "lucide-react";
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
import { format, isPast } from "date-fns";
import { AddDebtReceivableDialog } from "@/components/DebtReceivable/AddDebtReceivableDialog";
import { cn } from "@/lib/utils";
// PERBAIKAN: Import DropdownMenu components yang hilang
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Tipe data dari Supabase
type DebtReceivableData = {
  id: string;
  transaction_date: string;
  type: "debt" | "receivable";
  counterparty: string;
  amount: number;
  due_date: string | null;
  status: string | null;
  description: string | null;
};

const DebtReceivable = () => {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<DebtReceivableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("debt");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"debt" | "receivable">("debt");

  // Cek hak akses
  const canManage = profile?.role === "superadmin"; // Full CRUD
  const canCreateRead = profile?.role === "superadmin" || profile?.role === "leader" || profile?.role === "admin"; // Create & Read

  // Helper format
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return format(new Date(`${dateString}T00:00:00`), "dd MMM yyyy");
    } catch (e) { return "-"; }
  }

  // Fetch data
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // Hanya fetch data jika memiliki hak akses 'Read'
      if (!canCreateRead && profile?.role !== 'viewer') {
        setTransactions([]);
        // Tidak perlu toast error di sini, ProtectedRoute akan menangani jika akses benar-benar ditolak
        return;
      }
      
      const { data, error } = await supabase
        .from("debt_receivable")
        .select(`
          id,
          transaction_date,
          type,
          counterparty,
          amount,
          due_date,
          status,
          description
        `)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setTransactions(data as any);
    } catch (error: any) {
      toast.error("Gagal memuat data Hutang Piutang.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [profile]); // Refresh saat profile berubah (untuk RLS/Akses)

  // Pisahkan data
  const debts = transactions.filter((t) => t.type === "debt");
  const receivables = transactions.filter((t) => t.type === "receivable");

  // Kalkulasi Summary
  const totalDebt = debts.reduce((sum, item) => sum + item.amount, 0);
  const totalReceivable = receivables.reduce((sum, item) => sum + item.amount, 0);
  const netPosition = totalReceivable - totalDebt;

  const getStatusBadge = (status: string | null, dueDate: string | null) => {
    if (status === 'Lunas') {
      return <Badge className="bg-success">Lunas</Badge>;
    }
    
    if (status === 'Cicilan') {
      return <Badge variant="secondary">Cicilan</Badge>;
    }
    
    // Default: Belum Lunas
    if (dueDate && isPast(new Date(`${dueDate}T00:00:00`))) {
      return <Badge variant="destructive">Jatuh Tempo</Badge>;
    }
    
    return <Badge variant="outline">Belum Lunas</Badge>;
  }

  const handleOpenModal = (type: "debt" | "receivable") => {
    setModalType(type);
    setIsModalOpen(true);
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Saldo Hutang Piutang</h1>
            <p className="text-muted-foreground">Kelola dan lacak hutang dan piutang perusahaan.</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowDown className="h-4 w-4 text-destructive" />
                Total Hutang
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(totalDebt)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowUp className="h-4 w-4 text-success" />
                Total Piutang
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(totalReceivable)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Position
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  netPosition >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(netPosition)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {netPosition >= 0 ? "Surplus Piutang" : "Defisit Hutang"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card>
          <CardHeader className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="debt">Hutang (Merah)</TabsTrigger>
                  <TabsTrigger value="receivable">Piutang (Hijau)</TabsTrigger>
                </TabsList>
                {canCreateRead && (
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                       <Button className="gap-2">
                         <Plus className="h-4 w-4" />
                         Tambah Transaksi
                       </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       <DropdownMenuItem onClick={() => handleOpenModal('debt')}>
                           Catat Hutang
                       </DropdownMenuItem>
                       <DropdownMenuItem onClick={() => handleOpenModal('receivable')}>
                           Catat Piutang
                       </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </Tabs>
            <div className="flex items-center gap-4 pt-4 border-t">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cari nama pihak..." className="pl-10 w-full" />
              </div>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export (Soon)
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                {/* Hutang Tab */}
                <TabsContent value="debt" className="mt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Pihak</TableHead>
                        <TableHead className="text-right">Nominal</TableHead>
                        <TableHead>Jatuh Tempo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {debts.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center h-24">
                              Tidak ada data hutang.
                            </TableCell>
                          </TableRow>
                       )}
                      {debts.map((item) => (
                        <TableRow key={item.id} className={item.status !== 'Lunas' && item.due_date && isPast(new Date(`${item.due_date}T00:00:00`)) ? 'bg-destructive/10 hover:bg-destructive/20' : ''}>
                          <TableCell>{formatDate(item.transaction_date)}</TableCell>
                          <TableCell className="font-medium">{item.counterparty}</TableCell>
                          <TableCell className="text-right font-medium text-destructive">
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell className={item.status !== 'Lunas' && item.due_date && isPast(new Date(`${item.due_date}T00:00:00`)) ? 'font-bold text-destructive' : ''}>
                            {formatDate(item.due_date)}
                          </TableCell>
                          <TableCell>{getStatusBadge(item.status, item.due_date)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{item.description || '-'}</TableCell>
                          <TableCell>
                            {canManage && (
                               <Button variant="ghost" size="sm">Edit</Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                {/* Piutang Tab */}
                <TabsContent value="receivable" className="mt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Pihak</TableHead>
                        <TableHead className="text-right">Nominal</TableHead>
                        <TableHead>Jatuh Tempo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                       {receivables.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center h-24">
                              Tidak ada data piutang.
                            </TableCell>
                          </TableRow>
                       )}
                      {receivables.map((item) => (
                        <TableRow key={item.id} className={item.status !== 'Lunas' && item.due_date && isPast(new Date(`${item.due_date}T00:00:00`)) ? 'bg-warning/10 hover:bg-warning/20' : ''}>
                          <TableCell>{formatDate(item.transaction_date)}</TableCell>
                          <TableCell className="font-medium">{item.counterparty}</TableCell>
                          <TableCell className="text-right font-medium text-success">
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell className={item.status !== 'Lunas' && item.due_date && isPast(new Date(`${item.due_date}T00:00:00`)) ? 'font-bold text-warning' : ''}>
                            {formatDate(item.due_date)}
                          </TableCell>
                          <TableCell>{getStatusBadge(item.status, item.due_date)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{item.description || '-'}</TableCell>
                          <TableCell>
                            {canManage && (
                               <Button variant="ghost" size="sm">Edit</Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Render Dialog */}
      {canCreateRead && (
         <AddDebtReceivableDialog
           open={isModalOpen}
           type={modalType}
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

export default DebtReceivable;