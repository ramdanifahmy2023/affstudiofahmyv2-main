import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Smartphone, Download, Loader2 } from "lucide-react";
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
// IMPORT BARU:
import { AddDeviceDialog } from "@/components/Device/AddDeviceDialog";

// Tipe data untuk device
type DeviceData = {
  id: string;
  device_id: string;
  imei: string;
  google_account: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  groups: { // Data dari tabel 'groups'
    name: string;
  } | null;
};

const Devices = () => {
  const { profile } = useAuth();
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<DeviceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false); // <-- STATE UNTUK DIALOG

  const canManageDevices =
    profile?.role === "superadmin" || profile?.role === "leader";

  const formatCurrency = (amount: number | null) => {
    if (amount === null || isNaN(amount)) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      // Tambahkan 'T00:00:00' untuk menghindari masalah timezone
      return format(new Date(`${dateString}T00:00:00`), "dd MMM yyyy");
    } catch (e) {
      console.warn("Invalid date format:", dateString);
      return "-";
    }
  }

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("devices")
        .select(`
          id,
          device_id,
          imei,
          google_account,
          purchase_date,
          purchase_price,
          groups ( name )
        `);

      if (error) throw error;
      
      setDevices(data as any);
      setFilteredDevices(data as any);

    } catch (error: any) {
      toast.error("Gagal memuat data device.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    const results = devices.filter((device) =>
      device.device_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.imei.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDevices(results);
  }, [searchTerm, devices]);
  
  const handleAddDevice = () => {
     setIsModalOpen(true); // <-- GANTI FUNGSI INI
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Inventaris Device</h1>
            <p className="text-muted-foreground">
              Kelola device tim dan alokasinya.
            </p>
          </div>
          {canManageDevices && (
            <Button className="gap-2" onClick={handleAddDevice}>
              <Plus className="h-4 w-4" />
              Tambah Device
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Total Devices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : devices.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Di semua grup
              </p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Investasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : formatCurrency(devices.reduce((acc, d) => acc + (d.purchase_price || 0), 0))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total nilai aset device
              </p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Device Teralokasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                 {loading ? "..." : devices.filter(d => d.groups).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Device yang sudah masuk grup
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
                  placeholder="Cari berdasarkan Device ID atau IMEI..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline">Filter (Soon)</Button>
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
                    <TableHead>Device ID</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Akun Google</TableHead>
                    <TableHead>Grup</TableHead>
                    <TableHead>Tgl. Beli</TableHead>
                    <TableHead className="text-right">Harga Beli</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDevices.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={7} className="text-center h-24">
                         {searchTerm ? "Device tidak ditemukan." : "Belum ada data device."}
                       </TableCell>
                     </TableRow>
                  )}
                  {filteredDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">
                        {device.device_id}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {device.imei}
                      </TableCell>
                      <TableCell className="text-sm">
                        {device.google_account || "-"}
                      </TableCell>
                      <TableCell>
                        {device.groups ? (
                          <Badge variant="outline">{device.groups.name}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(device.purchase_date)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(device.purchase_price)}
                      </TableCell>
                      <TableCell>
                        {canManageDevices && (
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
      
      {/* RENDER DIALOG TAMBAH DEVICE */}
      {canManageDevices && (
         <AddDeviceDialog
           open={isModalOpen}
           onOpenChange={setIsModalOpen}
           onSuccess={() => {
             setIsModalOpen(false); // Tutup dialog
             fetchDevices(); // Refresh data
           }}
         />
       )}
    </MainLayout>
  );
};

export default Devices;