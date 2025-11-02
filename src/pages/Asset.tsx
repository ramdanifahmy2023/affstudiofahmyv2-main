import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Download, Loader2, DollarSign, Archive, PieChart as PieIcon } from "lucide-react";
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
import { AddAssetDialog } from "@/components/Asset/AddAssetDialog"; // IMPORT BARU
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Tipe data dari Supabase
type AssetData = {
  id: string;
  name: string;
  category: string;
  purchase_date: string;
  purchase_price: number; // Ini adalah Total Harga (Harga Satuan * Qty)
  condition: string | null;
  // Kita tidak mengambil Qty karena tidak ada di DB
};

// Tipe untuk data Pie Chart
type ChartData = {
  name: string;
  value: number;
};

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

const Assets = () => {
  const { profile } = useAuth();
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Cek hak akses [cite: 51]
  const canManageAssets =
    profile?.role === "superadmin" || profile?.role === "admin";
    
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
  const fetchAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("assets")
        .select(`
          id,
          name,
          category,
          purchase_date,
          purchase_price,
          condition
        `)
        .order("purchase_date", { ascending: false });

      if (error) throw error;
      setAssets(data || []);
      
      // Proses data untuk Pie Chart [cite: 222]
      const breakdown: { [key: string]: number } = {};
      (data || []).forEach(asset => {
        breakdown[asset.category] = (breakdown[asset.category] || 0) + 1;
      });
      setChartData(Object.entries(breakdown).map(([name, value]) => ({ name, value })));

    } catch (error: any) {
      toast.error("Gagal memuat data aset.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const totalValue = assets.reduce((acc, asset) => acc + asset.purchase_price, 0);
  const totalItems = assets.length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manajemen Aset</h1>
            <p className="text-muted-foreground">
              Kelola inventaris aset perusahaan.
            </p>
          </div>
          {canManageAssets && (
            <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Tambah Aset
            </Button>
          )}
        </div>

        {/* Summary Cards [cite: 220, 221] */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Nilai Aset
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(totalValue)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Archive className="h-4 w-4" />
                Jumlah Item Aset
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                 {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : totalItems}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <PieIcon className="h-4 w-4" />
                Jumlah Kategori
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : chartData.length}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Table */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama aset..."
                    className="pl-10"
                    // TODO: Implement search state
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
                      <TableHead>Tanggal Beli</TableHead>
                      <TableHead>Nama Aset</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Kondisi</TableHead>
                      <TableHead className="text-right">Total Harga</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">
                          Belum ada data aset.
                        </TableCell>
                      </TableRow>
                    )}
                    {assets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>{formatDate(asset.purchase_date)}</TableCell>
                        <TableCell className="font-medium">{asset.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{asset.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={asset.condition === "Baru" ? "default" : "secondary"}>
                            {asset.condition}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(asset.purchase_price)}
                        </TableCell>
                        <TableCell>
                          {canManageAssets && (
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
          
          {/* Pie Chart [cite: 222] */}
          <Card className="md:col-span-1">
             <CardHeader>
               <CardTitle>Breakdown Aset by Kategori</CardTitle>
             </CardHeader>
             <CardContent>
               <ResponsiveContainer width="100%" height={300}>
                 <PieChart>
                   <Pie
                     data={chartData}
                     cx="50%"
                     cy="50%"
                     labelLine={false}
                     label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                     outerRadius={100}
                     fill="#8884d8"
                     dataKey="value"
                   >
                     {chartData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    formatter={(value: number) => `${value} item`}
                  />
                   <Legend />
                 </PieChart>
               </ResponsiveContainer>
             </CardContent>
           </Card>
        </div>
      </div>
      
      {/* Render Dialog Tambah Aset */}
       {canManageAssets && (
         <AddAssetDialog
           open={isModalOpen}
           onOpenChange={setIsModalOpen}
           onSuccess={() => {
             setIsModalOpen(false); // Tutup dialog
             fetchAssets(); // Refresh data
           }}
         />
       )}
    </MainLayout>
  );
};

export default Assets;