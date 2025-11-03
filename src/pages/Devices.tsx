// src/pages/Devices.tsx

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Smartphone, Download, Loader2, MoreHorizontal, Pencil, Trash2, DollarSign, Archive } from "lucide-react";
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
import { toast } from "sonner";
import { format } from "date-fns";

// IMPORT HOOK BARU
import { useExport } from "@/hooks/useExport";
// IMPORT DIALOG
import { AddDeviceDialog } from "@/components/Device/AddDeviceDialog";
import { EditDeviceDialog } from "@/components/Device/EditDeviceDialog"; 
import { DeleteDeviceAlert } from "@/components/Device/DeleteDeviceAlert"; 
import { cn } from "@/lib/utils";


// Tipe data untuk device (Diperbarui untuk mencakup semua field yang di-fetch)
type DeviceData = {
  id: string;
  device_id: string;
  imei: string;
  google_account: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  screenshot_url: string | null;
  group_id: string | null; 
  groups: { 
    name: string;
  } | null;
};

// Tipe untuk dialog
type DialogState = {
  add: boolean;
  edit: DeviceData | null;
  delete: DeviceData | null;
};


const Devices = () => {
  const { profile } = useAuth();
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<DeviceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // State untuk Dialogs
  const [dialogs, setDialogs] = useState<DialogState>({
    add: false,
    edit: null,
    delete: null,
  });

  // INISIALISASI HOOK EXPORT
  const { exportToPDF, exportToCSV, isExporting } = useExport();

  const canManageDevices =
    profile?.role === "superadmin" || profile?.role === "leader";
  const canDelete = profile?.role === "superadmin";

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
          screenshot_url,
          group_id,
          groups ( name )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setDevices(data as any);

    } catch (error: any) {
      toast.error("Gagal memuat data device.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  // FUNGSI UNTUK EXPORT DATA
  const exportDevices = (type: 'pdf' | 'csv') => {
    const columns = [
      { header: 'ID Device', dataKey: 'device_id' },
      { header: 'IMEI', dataKey: 'imei' },
      { header: 'Akun Google', dataKey: 'google_account' },
      { header: 'Group', dataKey: 'group_name' },
      { header: 'Tgl Beli', dataKey: 'purchase_date_formatted' },
      { header: 'Harga Beli (Rp)', dataKey: 'purchase_price_formatted' },
      { header: 'Link Bukti', dataKey: 'screenshot_url' },
    ];
    
    // Siapkan data untuk export
    const exportData = filteredDevices.map(d => ({
        ...d,
        group_name: d.groups?.name || '-',
        purchase_date_formatted: formatDate(d.purchase_date),
        purchase_price_formatted: formatCurrency(d.purchase_price), // Format untuk display
        purchase_price_raw: d.purchase_price || 0, // Data mentah jika diperlukan
    }));

    const options = {
        filename: 'Inventaris_Device',
        title: 'Laporan Inventaris Device',
        data: exportData,
        columns,
    };
    
    if (type === 'pdf') {
        exportToPDF(options);
    } else {
        exportToCSV(options);
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
  
  // Handlers untuk Dialog
  const handleEditClick = (device: DeviceData) => {
    setDialogs({ ...dialogs, edit: device });
  };

  const handleDeleteClick = (device: DeviceData) => {
    setDialogs({ ...dialogs, delete: device });
  };
  
  const handleSuccess = () => {
     setDialogs({ add: false, edit: null, delete: null });
     fetchDevices(); // Refresh data
  }

  const totalInvestment = devices.reduce((acc, d) => acc + (d.purchase_price || 0), 0);
  const allocatedCount = devices.filter(d => d.groups).length;

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
            <Button className="gap-2" onClick={() => setDialogs({ ...dialogs, add: true })}>
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
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Investasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : formatCurrency(totalInvestment)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total nilai aset device
              </p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Archive className="h-4 w-4" />
                Device Teralokasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                 {loading ? "..." : allocatedCount}
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
              <Button variant="outline" disabled>Filter (Soon)</Button>
               {/* DROP DOWN MENU UNTUK EXPORT */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2" disabled={isExporting || filteredDevices.length === 0}>
                        <Download className="h-4 w-4" />
                        {isExporting ? 'Mengekspor...' : 'Export'}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportDevices('pdf')} disabled={isExporting}>
                        Export PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportDevices('csv')} disabled={isExporting}>
                        Export CSV
                    </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                      <TableHead>Device ID</TableHead>
                      <TableHead>IMEI</TableHead>
                      <TableHead>Akun Google</TableHead>
                      <TableHead>Grup</TableHead>
                      <TableHead>Tgl. Beli</TableHead>
                      <TableHead className="text-right">Harga Beli</TableHead>
                      {canManageDevices && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDevices.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={canManageDevices ? 7 : 6} className="text-center h-24">
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
                        {canManageDevices && (
                           <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditClick(device)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit Device
                                  </DropdownMenuItem>
                                  {canDelete && (
                                      <DropdownMenuItem 
                                        className="text-destructive"
                                        onClick={() => handleDeleteClick(device)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Hapus Device
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
      </div>
      
      {/* RENDER SEMUA DIALOG */}
      {canManageDevices && (
         <>
           <AddDeviceDialog
             open={dialogs.add}
             onOpenChange={(open) => setDialogs({ ...dialogs, add: open })}
             onSuccess={handleSuccess}
           />
           {dialogs.edit && (
             <EditDeviceDialog
               open={!!dialogs.edit}
               onOpenChange={(open) => setDialogs({ ...dialogs, edit: open ? dialogs.edit : null })}
               device={dialogs.edit}
               onSuccess={handleSuccess}
             />
           )}
           {canDelete && dialogs.delete && (
             <DeleteDeviceAlert
               open={!!dialogs.delete}
               onOpenChange={(open) => setDialogs({ ...dialogs, delete: open ? dialogs.delete : null })}
               device={dialogs.delete}
               onSuccess={handleSuccess}
             />
           )}
         </>
       )}
    </MainLayout>
  );
};

export default Devices;