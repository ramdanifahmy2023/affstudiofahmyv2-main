import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Download, Loader2, ArrowUpRight, ArrowDownLeft } from "lucide-react";
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
import { AddDebtDialog } from "@/components/Debt/AddDebtDialog";
import { cn } from "@/lib/utils";

// Tipe data dari Supabase
type DebtData = {
  id: string;
  created_at: string;
  type: "debt" | "receivable";
  counterparty: string;
  amount: number;
  due_date: string | null;
  status: string | null;
  groups: { name: string } | null;
};

const DebtReceivable = () => {
  const { profile } = useAuth();
  const [data, setData] = useState<DebtData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("debt");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Hak akses berdasarkan blueprint [cite: 103, 104, 105]
  const canCreate =
    profile?.role === "superadmin" ||
    profile?.role === "leader" ||
    profile?.role === "admin";
  const canManage = profile?.role === "superadmin";

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
      return format(new Date(dateString), "dd MMM yyyy");
    } catch (e) { return "-"; }
  }

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("debt_receivable")
        .select(`
          id,
          created_at,
          type,
          counterparty,
          amount,
          due_date,
          status,
          groups ( name )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setData(data as any);
    } catch (error: any) {
      toast.error("Gagal memuat data hutang piutang.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Pisahkan data untuk tabel dan summary
  const debts = data.filter(
    (t) =>
      t.type === "debt" &&
      t.counterparty.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const receivables = data.filter(
    (t) =>
      t.type === "receivable" &&
      t.counterparty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDebt = debts.filter(s => s.status !== 'Lunas').reduce((sum, item) => sum + item.amount, 0);
  const totalReceivable = receivables.filter(s => s.status !== 'Lunas').reduce((sum, item) => sum + item.amount, 0);
  const netPosition = totalReceivable - totalDebt;

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "Lunas":
        return <Badge className="bg-success">Lunas</Badge>;
      case "Cicilan":
        return <Badge variant="secondary">Cicilan</Badge>;
      case "Belum Lunas":
        return <Badge variant="destructive">Belum Lunas</Badge>;
      default:
        return <Badge variant="outline">{status || "Pending"}</Badge>;
    }
  };
  
  const renderTable = (items: DebtData[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tanggal Dibuat</TableHead>
          <TableHead>Pihak Terkait</TableHead>
          <TableHead>Grup</TableHead>
          <TableHead>Jatuh Tempo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Nominal</TableHead>
          {canManage && <TableHead>Action</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={canManage ? 7 : 6} className="h-24 text-center">
              {searchTerm ? "Tidak ada data ditemukan." : "Belum ada data."}
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{formatDate(item.created_at)}</TableCell>
              <TableCell className="font-medium">{item.counterparty}</TableCell>
              <TableCell>
                {item.groups ? (
                  <Badge variant="outline">{item.groups.name}</Badge>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>{formatDate(item.due_date)}</TableCell>
              <TableCell>{getStatusBadge(item.status)}</TableCell>
              <TableCell className={cn(
                  "text-right font-medium",
                  item.type === 'debt' ? 'text-destructive' : 'text-success'
                )}>
                {formatCurrency(item.amount)}
              </TableCell>
              {canManage && (
                <TableCell>
                  <Button variant="ghost" size="sm">Edit</Button>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Saldo Hutang & Piutang</h1>
            <p className="text-muted-foreground">Lacak semua kewajiban dan tagihan.</p>
          </div>
          {canCreate && (
            <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Tambah Catatan
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4 text-destructive" />
                Total Hutang (Belum Lunas)
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
                <ArrowUpRight className="h-4 w-4 text-success" />
                Total Piutang (Belum Lunas)
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
                Posisi Keuangan (Net)
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
            </CardContent>
          </Card>
        </div>

        {/* Tabs and Table */}
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="debt">Hutang (Kewajiban)</TabsTrigger>
                  <TabsTrigger value="receivable">Piutang (Tagihan)</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Cari nama pihak..." 
                      className="pl-10 w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
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
                {/* Hutang Tab [cite: 106] */}
                <TabsContent value="debt" className="mt-0">
                  {renderTable(debts)}
                </TabsContent>

                {/* Piutang Tab [cite: 107] */}
                <TabsContent value="receivable" className="mt-0">
                  {renderTable(receivables)}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Render Dialog */}
      {canCreate && (
         <AddDebtDialog
           open={isModalOpen}
           onOpenChange={setIsModalOpen}
           onSuccess={() => {
             setIsModalOpen(false); // Tutup dialog
             fetchData(); // Refresh data
           }}
         />
       )}
    </MainLayout>
  );
};

export default DebtReceivable;