// src/pages/Asset.tsx

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Download,
  Loader2,
  DollarSign,
  Archive,
  PieChart as PieIcon,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { id as indonesianLocale } from "date-fns/locale";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer, 
} from "recharts";
import { AddAssetDialog } from "@/components/Asset/AddAssetDialog";
import { EditAssetDialog } from "@/components/Asset/EditAssetDialog"; 
import { DeleteAssetAlert } from "@/components/Asset/DeleteAssetAlert"; 
import { cn } from "@/lib/utils";


// Tipe data dari Supabase (Query lengkap untuk Edit)
export type AssetData = {
  id: string;
  name: string;
  category: string;
  purchase_date: string;
  purchase_price: number;
  condition: string | null;
  assigned_to: string | null; 
  notes: string | null; 
};

// Tipe untuk data Pie Chart [cite: 101]
type ChartData = {
  name: string;
  value: number;
};

// Warna Chart [cite: 25]
const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const Assets = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<AssetData[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");


  // --- State untuk Modal/Dialog ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetData | null>(null);
  // ---------------------------------

  const canManageAssets =
    profile?.role === "superadmin" || profile?.role === "admin";
    
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`), "dd MMM yyyy", { locale: indonesianLocale });
    } catch (e) { return "-"; }
  }

  const fetchAssets = async () => {
    setLoading(true);
    try {
      // Query semua field yg dibutuhkan untuk Edit
      const { data, error } = await supabase
        .from("assets")
        .select(`
          id,
          name,
          category,
          purchase_date,
          purchase_price,
          condition,
          assigned_to,
          notes 
        `)
        .order("purchase_date", { ascending: false });

      if (error) throw error;
      setAssets(data || []);
      
      const dataForFilter = data || [];
      
      // Hitung breakdown untuk Pie Chart [cite: 101]
      const breakdown: { [key: string]: number } = {};
      dataForFilter.forEach(asset => {
        breakdown[asset.category] = (breakdown[asset.category] || 0) + 1;
      });
      setChartData(Object.entries(breakdown).map(([name, value]) => ({ name, value })));
      
      // Update filtered list (setelah fetch)
      setFilteredAssets(dataForFilter);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal Memuat Data",
        description: "Terjadi kesalahan saat memuat data aset."
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);
  
  // Efek untuk filtering lokal
  useEffect(() => {
    const results = assets.filter((asset) =>
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAssets(results);
  }, [searchTerm, assets]);


  // --- Fungsi helper untuk buka modal ---
  const handleEditClick = (asset: AssetData) => {
    setSelectedAsset(asset);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (asset: AssetData) => {
    setSelectedAsset(asset);
    setIsDeleteAlertOpen(true);
  };

  const handleSuccess = () => {
     // Tutup semua modal dan refresh data
     setIsAddModalOpen(false);
     setIsEditModalOpen(false);
     setIsDeleteAlertOpen(false);
     setSelectedAsset(null);
     fetchAssets();
  };
  // -------------------------------------

  const totalValue = assets.reduce((acc, asset) => acc + (asset.purchase_price || 0), 0); // [cite: 99]
  const totalItems = assets.length; // [cite: 100]

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Manajemen Aset</h1>
            <p className="text-muted-foreground">
              Kelola inventaris aset perusahaan.
            </p>
          </div>
          {canManageAssets && (
            <Button className="gap-2 w-full sm:w-auto" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Tambah Aset
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Nilai Aset [cite: 99]
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
                Jumlah Item Aset [cite: 100]
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Table */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama aset..."
                    className="pl-10 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" className="gap-2 w-full sm:w-auto" disabled>
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal Beli</TableHead>
                        <TableHead>Nama Aset</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Kondisi</TableHead>
                        <TableHead className="text-right">Total Harga</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAssets.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center h-24">
                            {searchTerm ? "Aset tidak ditemukan." : "Belum ada data aset."}
                          </TableCell>
                        </TableRow>
                      )}
                      {filteredAssets.map((asset) => (
                        <TableRow key={asset.id}>
                          <TableCell>{formatDate(asset.purchase_date)}</TableCell>
                          <TableCell className="font-medium">{asset.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{asset.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={asset.condition === "Baru" ? "default" : (asset.condition === "Bekas" ? "secondary" : "outline")}
                              className={cn(asset.condition === "Baru" ? "bg-green-600 hover:bg-green-600/90" : "")}
                            >
                              {asset.condition || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(asset.purchase_price)}
                          </TableCell>
                          <TableCell className="text-center">
                            {canManageAssets ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditClick(asset)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => handleDeleteClick(asset)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Hapus
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <span>-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Pie Chart */}
          <Card className="lg:col-span-1">
             <CardHeader>
               <CardTitle>Breakdown Aset by Kategori</CardTitle> [cite: 101]
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
                     {chartData.map((_entry, index) => (
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
      
      {/* --- Render Semua Dialog --- */}
       {canManageAssets && (
         <>
           {/* Tambah Aset Dialog */}
           <AddAssetDialog
             open={isAddModalOpen}
             onOpenChange={setIsAddModalOpen}
             onSuccess={handleSuccess}
           />
           
           {/* Edit Aset Dialog */}
           <EditAssetDialog
             open={isEditModalOpen}
             onOpenChange={setIsEditModalOpen}
             asset={selectedAsset}
             onSuccess={handleSuccess}
           />
           
           {/* Delete Aset Alert */}
           <DeleteAssetAlert
             open={isDeleteAlertOpen}
             onOpenChange={setIsDeleteAlertOpen}
             asset={selectedAsset}
             onSuccess={handleSuccess}
           />
         </>
       )}
       {/* --------------------------- */}
    </MainLayout>
  );
};

export default Assets;