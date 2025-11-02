import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Download, Loader2 } from "lucide-react";
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
// IMPORT BARU
import { AddCommissionDialog } from "@/components/Commission/AddCommissionDialog";
import { cn } from "@/lib/utils";

// Tipe data dari Supabase
type CommissionData = {
  id: string;
  period: string;
  gross_commission: number;
  net_commission: number;
  paid_commission: number;
  payment_date: string | null;
  accounts: { // Data dari join
    username: string;
    platform: string;
  } | null;
};

const Commissions = () => {
  const { profile } = useAuth();
  const [commissions, setCommissions] = useState<CommissionData[]>([]);
  const [filteredCommissions, setFilteredCommissions] = useState<CommissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Cek hak akses
  const canManageCommissions =
    profile?.role === "superadmin" || profile?.role === "leader";
    
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
    } catch (e) {
      return "-";
    }
  }

  // Fetch data
  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("commissions")
        .select(`
          id,
          period,
          gross_commission,
          net_commission,
          paid_commission,
          payment_date,
          accounts ( username, platform )
        `);
      if (error) throw error;
      setCommissions(data as any);
      setFilteredCommissions(data as any);
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

  // Efek untuk filtering
  useEffect(() => {
    const results = commissions.filter((comm) =>
      comm.accounts?.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCommissions(results);
  }, [searchTerm, commissions]);

  // Kalkulasi untuk summary cards
  const totalKotor = commissions.reduce((acc, c) => acc + c.gross_commission, 0);
  const totalBersih = commissions.reduce((acc, c) => acc + c.net_commission, 0);
  const totalCair = commissions.reduce((acc, c) => acc + c.paid_commission, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Data Komisi</h1>
            <p className="text-muted-foreground">Lacak data komisi affiliate</p>
          </div>
          {canManageCommissions && (
            <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Tambah Komisi
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Komisi Kotor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalKotor)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Dari semua akun
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Komisi Bersih
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalBersih)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Setelah potongan
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Komisi Cair
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{formatCurrency(totalCair)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Berhasil dibayarkan
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari berdasarkan username..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export (Soon)
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-right">Komisi Kotor</TableHead>
                    <TableHead className="text-right">Komisi Bersih</TableHead>
                    <TableHead className="text-right">Komisi Cair</TableHead>
                    <TableHead>Tgl. Cair</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCommissions.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={8} className="text-center h-24">
                         {searchTerm ? "Data komisi tidak ditemukan." : "Belum ada data komisi."}
                       </TableCell>
                     </TableRow>
                  )}
                  {filteredCommissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell className="font-medium">
                        {commission.accounts?.username || "Akun Dihapus"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            commission.accounts?.platform === "shopee" ? "default" : "secondary"
                          }
                           className={cn(commission.accounts?.platform === "shopee" ? "bg-[#FF6600] hover:bg-[#FF6600]/90" : "bg-black hover:bg-black/90 text-white")}
                        >
                          {commission.accounts?.platform || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>{commission.period}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(commission.gross_commission)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(commission.net_commission)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-success">
                        {formatCurrency(commission.paid_commission)}
                      </TableCell>
                      <TableCell>
                        {formatDate(commission.payment_date)}
                      </TableCell>
                      <TableCell>
                        {canManageCommissions && (
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Render Dialog Tambah Komisi */}
      {canManageCommissions && (
         <AddCommissionDialog
           open={isModalOpen}
           onOpenChange={setIsModalOpen}
           onSuccess={() => {
             setIsModalOpen(false); // Tutup dialog
             fetchCommissions(); // Refresh data
           }}
         />
       )}
    </MainLayout>
  );
};

export default Commissions;