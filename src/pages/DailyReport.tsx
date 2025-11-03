// src/pages/DailyReport.tsx

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, FileText, Save, Plus, AlertCircle, Loader2 } from "lucide-react"; 
import { format } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  DeviceReport,
  DeviceReportForm,
} from "@/components/Report/DeviceReportForm";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";

// Tipe data sederhana untuk dropdown (Device dan Account)
interface Item {
    id: string;
    name: string;
}

const DailyReport = () => {
  const { profile, employee } = useAuth();
  const [date, setDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false); // State untuk loading data dropdown

  // State untuk multi-device reports
  const [deviceReports, setDeviceReports] = useState<DeviceReport[]>([
    {
      id: uuidv4(),
      deviceId: "",
      accountId: "",
      shift: "",
      liveStatus: "",
      kategoriProduk: "",
      openingBalance: 0,
      closingBalance: 0,
    },
  ]);

  // Data dinamis dari Supabase
  const [availableDevices, setAvailableDevices] = useState<Item[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<Item[]>([]);
  const [groupName, setGroupName] = useState<string | null>(null);

  // === LOGIKA FETCH DATA DROPDOWN BERDASARKAN GROUP ===
  useEffect(() => {
    const fetchDropdownData = async () => {
      setLoadingData(true);
      
      // Group ID adalah KUNCI utama
      if (!employee || !employee.group_id) {
        setGroupName("Belum teralokasi");
        setAvailableDevices([]);
        setAvailableAccounts([]);
        setLoadingData(false);
        return;
      }
      
      try {
        // 1. Fetch Group Name
        const { data: groupData } = await supabase
          .from('groups')
          .select('name')
          .eq('id', employee.group_id)
          .single();
        setGroupName(groupData?.name || "Grup Tidak Ditemukan");

        // 2. Fetch Devices (device_id, id) berdasarkan group_id
        const { data: devicesData } = await supabase
          .from('devices')
          .select('id, device_id') 
          .eq('group_id', employee.group_id);
        
        setAvailableDevices(devicesData?.map(d => ({ id: d.id, name: d.device_id })) || []);

        // 3. Fetch Accounts (username, id) berdasarkan group_id
        const { data: accountsData } = await supabase
          .from('accounts')
          .select('id, username')
          .eq('group_id', employee.group_id);
          
        setAvailableAccounts(accountsData?.map(a => ({ id: a.id, name: a.username })) || []);
        
        if (!devicesData?.length || !accountsData?.length) {
           toast.warning("Grup Anda belum memiliki alokasi Device atau Akun. Silakan hubungi Leader/Admin.");
        }

      } catch (error: any) {
        console.error("Error fetching group data for dropdowns:", error.message);
        toast.error("Gagal memuat data Device & Akun.", { description: error.message });
      } finally {
        setLoadingData(false);
      }
    };
    
    if (employee) {
      fetchDropdownData();
    }
  }, [employee]);

  // Handler untuk menambah device report baru
  const addDeviceReport = () => {
    if (deviceReports.length >= 10) {
      toast.warning("Anda sudah mencapai batas maksimum 10 device.");
      return;
    }
    setDeviceReports([
      ...deviceReports,
      {
        id: uuidv4(),
        deviceId: "",
        accountId: "",
        shift: deviceReports[0]?.shift || "", // Ambil shift dari form pertama
        liveStatus: "",
        kategoriProduk: "",
        openingBalance: 0,
        closingBalance: 0,
      },
    ]);
  };

  // Handler untuk menghapus device report
  const removeDeviceReport = (id: string) => {
    if (deviceReports.length <= 1) {
      toast.error("Minimal harus ada 1 laporan device.");
      return;
    }
    setDeviceReports(deviceReports.filter((report) => report.id !== id));
  };

  // Handler untuk update data di child component
  const updateDeviceReport = (
    id: string,
    field: keyof DeviceReport,
    value: any
  ) => {
    setDeviceReports((prevReports) =>
      prevReports.map((report) =>
        report.id === id ? { ...report, [field]: value } : report
      )
    );
  };

  // --- FUNGSI HANDLE SUBMIT ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employee) {
      toast.error("Gagal memuat data karyawan. Silakan login ulang.");
      return;
    }

    setLoading(true);
    toast.info("Sedang mengirim laporan...");

    // Validasi
    for (const report of deviceReports) {
      if (
        !report.shift ||
        !report.deviceId ||
        !report.accountId ||
        !report.liveStatus ||
        !report.kategoriProduk
      ) {
        toast.error(
          `Laporan device belum lengkap. Pastikan semua field terisi.`
        );
        setLoading(false);
        return;
      }
      if (report.closingBalance < report.openingBalance) {
        toast.error(
          `Omset Akhir tidak boleh lebih kecil dari Omset Awal.`
        );
        setLoading(false);
        return;
      }
    }

    try {
      // Format tanggal ke 'YYYY-MM-DD'
      const formattedDate = format(date, "yyyy-MM-dd");
      
      // Siapkan payload untuk semua device report
      const reportPayloads = deviceReports.map((report) => ({
        employee_id: employee.id, 
        report_date: formattedDate,
        
        // HILANGKAN shift_status: Supabase akan menggunakan DEFAULT value (smooth)
        // shift_status: report.liveStatus === 'Lancar' ? 'smooth' : 'dead_relive', 
        
        opening_balance: report.openingBalance,
        closing_balance: report.closingBalance,
        total_sales: report.closingBalance - report.openingBalance,
        notes: notes,
        
        // Kolom tambahan (diasumsikan sudah ditambahkan via SQL)
        device_id: report.deviceId, 
        account_id: report.accountId, 
        live_status: report.liveStatus, 
        kategori_produk: report.kategoriProduk,
        shift_number: report.shift, // Mengirim nomor shift (1, 2, 3)
      }));

      // Insert semua laporan device sekaligus
      const { error: deviceError } = await supabase
        .from("daily_reports")
        .insert(reportPayloads as any); 

      if (deviceError) throw deviceError;

      toast.success("Laporan harian berhasil dikirim!");
      toast.info("Absen keluar Anda telah otomatis tercatat.");

      // Reset form
      setNotes("");
      setDeviceReports([
        {
          id: uuidv4(),
          deviceId: "",
          accountId: "",
          shift: "",
          liveStatus: "",
          kategoriProduk: "",
          openingBalance: 0,
          closingBalance: 0,
        },
      ]);
    } catch (error: any) {
      console.error(error);
      toast.error(
        `Gagal mengirim laporan: ${error.message || "Error tidak diketahui"}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Hitung total omset dari semua device
  const totalOmset = deviceReports.reduce(
    (acc, report) => acc + (report.closingBalance - report.openingBalance),
    0
  );

  return (
    <MainLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Jurnal Laporan Harian</h1>
            <p className="text-muted-foreground">
              Khusus Staff: Laporan omset harian per shift.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Hanya Staff</span>
          </div>
        </div>

        {/* Master Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Laporan</CardTitle>
            <CardDescription>
              Data ini akan digunakan untuk semua laporan device di bawah.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Tanggal Laporan */}
              <div className="space-y-2">
                <Label htmlFor="date">Tanggal Laporan</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? (
                        format(date, "PPP", { locale: indonesiaLocale })
                      ) : (
                        <span>Pilih tanggal</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(newDate) => newDate && setDate(newDate)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Auto-fill Nama */}
              <div className="space-y-2">
                <Label htmlFor="employee-name">Nama Karyawan</Label>
                <Input
                  id="employee-name"
                  value={profile?.full_name || "Memuat..."}
                  disabled
                  readOnly
                  className="bg-muted/50"
                />
              </div>

              {/* Auto-fill Group */}
              <div className="space-y-2">
                <Label htmlFor="employee-group">Group</Label>
                <Input
                  id="employee-group"
                  value={loadingData ? "Memuat..." : (groupName || "Belum Teralokasi")}
                  disabled
                  readOnly
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  Device & Akun disaring berdasarkan group Anda.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {loadingData && (
             <div className="flex justify-center items-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Memuat Device & Akun...</span>
             </div>
        )}

        {/* Multi-Device Report Forms */}
        <div className="space-y-4">
          {deviceReports.map((report, index) => (
            <DeviceReportForm
              key={report.id}
              report={report}
              reportDate={date}
              reportIndex={index}
              onUpdate={updateDeviceReport}
              onRemove={removeDeviceReport}
              devices={availableDevices} // Gunakan data real
              accounts={availableAccounts} // Gunakan data real
            />
          ))}
        </div>

        {/* Tombol Tambah Device */}
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={addDeviceReport}
          disabled={deviceReports.length >= 10 || loadingData}
        >
          <Plus className="h-4 w-4" />
          Tambah Laporan Device (Max 10)
        </Button>

        {/* Summary & Submit */}
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Laporan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Total Omset Hari Ini */}
              <div className="space-y-2">
                <Label>Total Omset Keseluruhan</Label>
                <Input
                  value={new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                  }).format(totalOmset)}
                  readOnly
                  disabled
                  className="text-2xl font-bold h-12 border-none bg-transparent p-0"
                />
              </div>

              {/* Catatan */}
              <div className="space-y-2">
                <Label htmlFor="notes">Catatan (Opsional)</Label>
                <Input 
                  id="notes"
                  placeholder="Tambah catatan tentang laporan hari ini..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-start gap-4">
            <div className="flex gap-2">
              <Button type="submit" className="gap-2" disabled={loading || loadingData || availableDevices.length === 0}>
                <Save className="h-4 w-4" />
                {loading ? "Menyimpan..." : "Kirim Laporan & Absen Keluar"}
              </Button>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm text-primary">
              <AlertCircle className="h-5 w-5" />
              <p>
                Mengirim laporan ini akan otomatis mencatat{" "}
                <strong>Absen Keluar</strong> Anda untuk hari ini.
              </p>
            </div>
          </CardFooter>
        </Card>
      </form>
    </MainLayout>
  );
};

export default DailyReport;