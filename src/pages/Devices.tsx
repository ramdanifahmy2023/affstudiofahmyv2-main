// src/pages/Devices.tsx

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Smartphone,
  Download,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  DollarSign,
  Archive,
  Printer, // <-- 1. IMPORT IKON BARU
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

import { useExport } from "@/hooks/useExport";
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

// TIPE DATA BARU UNTUK FILTER
type Group = {
  id: string;
  name: string;
};

// Tipe untuk dialog
type DialogState = {
  add: boolean;
  edit: DeviceData | null;
  delete: DeviceData | null;
};


const Devices = () => {
  const { profile } = useAuth();
  const [devices, setDevices] = useState<DeviceData[]>([]); // Master list
  const [filteredDevices, setFilteredDevices] = useState<DeviceData[]>([]); // List yang ditampilkan
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  
  const [dialogs, setDialogs] = useState<DialogState>({
    add: false,
    edit: null,
    delete: null,
  });

  // --- 2. TAMBAHKAN 'printData' DARI HOOK ---
  const { exportToPDF, exportToCSV, isExporting, printData } = useExport();

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
      setFilteredDevices(data as any); // Set data awal untuk filtered list

    } catch (error: any) {
      toast.error("Gagal memuat data device.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  // --- 3. MODIFIKASI FUNGSI HANDLE EXPORT ---
  const exportDevices = (type: 'pdf' | 'csv' | 'print') => {
    const columns = [
      { header: 'ID Device', dataKey: 'device_id' },
      { header: 'IMEI', dataKey: 'imei' },
      { header: 'Akun Google', dataKey: 'google_account' },
      { header: 'Group', dataKey: 'group_name' },
      { header: 'Tgl Beli', dataKey: 'purchase_date_formatted' },
      { header: 'Harga Beli (Rp)', dataKey: 'purchase_price_formatted' },
      { header: 'Link Bukti', dataKey: 'screenshot_url' },
    ];
    
    // Gunakan filteredDevices untuk export
    const exportData = filteredDevices.map(d => ({
        ...d,
        google_account: d.google_account || '-', // Pastikan null menjadi '-'
        group_name: d.groups?.name || '-',
        purchase_date_formatted: formatDate(d.purchase_date),
        purchase_price_formatted: formatCurrency(d.purchase_price),
        purchase_price_raw: d.purchase_price || 0,
        screenshot_url: d.screenshot_url || '-', // Pastikan null menjadi '-'
    }));

    const options = {
        filename: 'Inventaris_Device',
        title: 'Laporan Inventaris Device',
        data: exportData,
        columns,
    };
    
    if (type === 'pdf') {
        exportToPDF(options);
    } else if (type === 'csv') {
        exportToCSV(options);
    } else {
        printData(options);
    }
  };


  useEffect(() => {
    fetchDevices(); // Ambil master list devices
    
    // Ambil daftar grup untuk filter
    const fetchGroups = async () => {
      const { data } = await supabase.from("groups").select("id, name");
      if (data) {
        setAvailableGroups(data);
      }
    };
    fetchGroups();
  }, []);

  useEffect(() => {
    let results = [...devices]; // Mulai dengan master list

    // Filter berdasarkan Grup
    if (filterGroup !== "all") {
      results = results.filter((device) => device.group_id === filterGroup);
    }
    
    // Filter berdasarkan Search Term
    if (searchTerm.trim() !== "") {
      const lowerSearch = searchTerm.toLowerCase();
      results = results.filter((device) =>
        device.device_id.toLowerCase().includes(lowerSearch) ||
        device.imei.toLowerCase().includes(lowerSearch) ||
        (device.google_account && device.google_account.toLowerCase().includes(lowerSearch))
      );
    }
    
    setFilteredDevices(results);
  }, [searchTerm, filterGroup, devices]);
  
  
  const handleEditClick = (device: DeviceData) => {
    setDialogs({ ...dialogs, edit: device });
  };

  const handleDeleteClick = (device: DeviceData) => {
    setDialogs({ ...dialogs, delete: device });
  };
  
  const handleSuccess = () => {
     setDialogs({ add: false, edit: null, delete: null });
     fetchDevices(); // Panggil ulang master data setelah ada perubahan
  }

  // Kalkulasi summary dari master list (bukan data terfilter)
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

        {/* UI FILTER BARU */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row items-end gap-4">
              {/* Filter Search */}
              <div className="flex-1 w-full space-y-2">
                <Label htmlFor="search-device">Cari (ID Device, IMEI, Akun Google)</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-device"
                    placeholder="Cari device..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Filter Grup */}
              <div className="flex-1 w-full space-y-2">
                <Label htmlFor="filter-group">Filter Grup</Label>
                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger id="filter-group" className="w-full">
                    <SelectValue placeholder="Pilih Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Group</SelectItem>
                    {availableGroups.map(group => (
                      <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

               {/* Tombol Export */}
              <div className="flex-shrink-0">
                {/* --- 4. TAMBAHKAN OPSI CETAK DI SINI --- */}
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
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => exportDevices('print')} disabled={isExporting}>
                          <Printer className="mr-2 h-4 w-4" />
                          Cetak Halaman
                      </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* ------------------------------------- */}
              </div>
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
                    {/* Gunakan filteredDevices untuk render tabel */}
                    {filteredDevices.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={canManageDevices ? 7 : 6} className="text-center h-24">
                           {searchTerm || filterGroup !== 'all' ? "Device tidak ditemukan." : "Belum ada data device."}
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
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          className="text-destructive"
                                          onClick={() => handleDeleteClick(device)}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Hapus Device
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