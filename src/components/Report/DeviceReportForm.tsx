import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client"; // (Asumsi path)
import { toast } from "sonner";

// Tipe data untuk laporan per device
export interface DeviceReport {
  id: string; // ID unik sementara (uuid)
  deviceId: string;
  accountId: string;
  shift: string;
  liveStatus: string;
  kategoriProduk: string;
  openingBalance: number;
  closingBalance: number;
}

interface DeviceReportFormProps {
  report: DeviceReport;
  reportDate: Date;
  reportIndex: number;
  onUpdate: (id: string, field: keyof DeviceReport, value: any) => void;
  onRemove: (id: string) => void;
  // TODO: Ganti data dummy ini dengan fetch dari Supabase
  devices: { id: string; name: string }[]; 
  accounts: { id: string; name: string }[];
}

export const DeviceReportForm = ({
  report,
  reportDate,
  reportIndex,
  onUpdate,
  onRemove,
  devices,
  accounts,
}: DeviceReportFormProps) => {
  const [openingBalanceDisabled, setOpeningBalanceDisabled] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  // Helper untuk format mata uang
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const parseCurrency = (value: string) => {
    return Number(value.replace(/[^0-9]/g, "")) || 0;
  };

  // LOGIC SHIFT & STATUS LIVE (KRUSIAL)
  useEffect(() => {
    const applyLogic = async () => {
      setWarning(null);
      
      // 1. Logic Status Live
      if (report.liveStatus === "Mati/Relive") {
        onUpdate(report.id, "openingBalance", 0);
        setOpeningBalanceDisabled(true);
        return;
      }

      // 2. Logic Shift
      if (report.shift === "1") {
        onUpdate(report.id, "openingBalance", 0);
        setOpeningBalanceDisabled(true);
        return;
      }
      
      // 3. Logic Shift 2/3 (Lancar)
      setOpeningBalanceDisabled(false);
      if (report.shift && report.shift !== "1" && report.deviceId && report.liveStatus === "Lancar") {
        try {
          // TODO: Ganti 'device_reports_table' dengan nama tabel Anda
          // const { data, error } = await supabase
          //   .from('daily_reports') // atau tabel relasi device
          //   .select('closing_balance')
          //   .eq('device_id', report.deviceId)
          //   .eq('report_date', reportDate.toISOString().split('T')[0])
          //   .eq('shift', (parseInt(report.shift) - 1).toString())
          //   .single();

          // if (error || !data) {
          //   setWarning("Belum ada data saldo dari shift sebelumnya.");
          //   onUpdate(report.id, "openingBalance", 0);
          // } else {
          //   onUpdate(report.id, "openingBalance", data.closing_balance);
          // }
          
          // Placeholder logic (hapus jika sudah fetch Supabase)
          if (reportIndex > 0) {
             setWarning("Ini hanya simulasi, data saldo diambil dari device index sebelumnya.");
             // onUpdate(report.id, "openingBalance", 100000); // Ganti dengan data fetch
          } else {
             setWarning("Simulasi: Belum ada data saldo dari shift sebelumnya.");
             onUpdate(report.id, "openingBalance", 0);
          }

        } catch (err) {
          toast.error("Gagal mengambil saldo sebelumnya.");
          onUpdate(report.id, "openingBalance", 0);
        }
      } else {
         // Jika shift 2/3 tapi belum pilih device atau status
         onUpdate(report.id, "openingBalance", 0);
      }
    };

    applyLogic();
  }, [report.shift, report.liveStatus, report.deviceId, reportDate, report.id, onUpdate, reportIndex]);


  return (
    <Card className="border-border/70 relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 text-destructive hover:text-destructive"
        onClick={() => onRemove(report.id)}
        disabled={reportIndex === 0} // Tidak bisa hapus device pertama
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Shift */}
            <div className="space-y-2">
              <Label htmlFor={`shift-${report.id}`}>Shift</Label>
              <Select
                value={report.shift}
                onValueChange={(val) => onUpdate(report.id, "shift", val)}
              >
                <SelectTrigger id={`shift-${report.id}`}>
                  <SelectValue placeholder="Pilih Shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Shift 1</SelectItem>
                  <SelectItem value="2">Shift 2</SelectItem>
                  <SelectItem value="3">Shift 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Device */}
            <div className="space-y-2">
              <Label htmlFor={`device-${report.id}`}>Device</Label>
              <Select
                value={report.deviceId}
                onValueChange={(val) => onUpdate(report.id, "deviceId", val)}
              >
                <SelectTrigger id={`device-${report.id}`}>
                  <SelectValue placeholder="Pilih Device" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Akun */}
            <div className="space-y-2">
              <Label htmlFor={`account-${report.id}`}>Akun</Label>
              <Select
                value={report.accountId}
                onValueChange={(val) => onUpdate(report.id, "accountId", val)}
              >
                <SelectTrigger id={`account-${report.id}`}>
                  <SelectValue placeholder="Pilih Akun" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Status Live */}
            <div className="space-y-2">
              <Label htmlFor={`status-${report.id}`}>Status Live</Label>
              <Select
                value={report.liveStatus}
                onValueChange={(val) => onUpdate(report.id, "liveStatus", val)}
              >
                <SelectTrigger id={`status-${report.id}`}>
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lancar">Lancar</SelectItem>
                  <SelectItem value="Mati/Relive">Mati/Relive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Kategori Produk */}
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor={`kategori-${report.id}`}>Kategori Produk</Label>
              <Input
                id={`kategori-${report.id}`}
                placeholder="cth: Skincare"
                value={report.kategoriProduk}
                onChange={(e) => onUpdate(report.id, "kategoriProduk", e.target.value)}
              />
            </div>
            {/* Omset Awal */}
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor={`opening-${report.id}`}>Omset Awal</Label>
              <Input
                id={`opening-${report.id}`}
                placeholder="Rp 0"
                value={formatCurrency(report.openingBalance)}
                disabled={openingBalanceDisabled}
                readOnly={openingBalanceDisabled} // Tetap bisa dibaca
                className={openingBalanceDisabled ? "bg-muted/50" : ""}
                onChange={(e) => onUpdate(report.id, "openingBalance", parseCurrency(e.target.value))}
              />
              {warning && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {warning}
                </p>
              )}
            </div>
            {/* Omset Akhir */}
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor={`closing-${report.id}`}>Omset Akhir</Label>
              <Input
                id={`closing-${report.id}`}
                placeholder="Rp 0"
                value={formatCurrency(report.closingBalance)}
                onChange={(e) => onUpdate(report.id, "closingBalance", parseCurrency(e.target.value))}
              />
            </div>
             {/* Total Omset (Calculated) */}
             <div className="space-y-2 md:col-span-1">
              <Label>Total Omset Device</Label>
              <Input
                value={formatCurrency(report.closingBalance - report.openingBalance)}
                readOnly
                disabled
                className="font-bold text-lg h-10 border-none bg-transparent p-0"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};