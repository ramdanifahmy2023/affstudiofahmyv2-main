// src/components/Report/DeviceReportForm.tsx

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
import { supabase } from "@/integrations/supabase/client"; 
import { format } from "date-fns";
import { toast } from "sonner";
// --- 1. IMPORT HELPER BARU ---
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from "@/lib/utils";

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
  devices: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
  // --- TAMBAHAN: FUNGSI VALIDASI ---
  onValidate: (id: string, isValid: boolean) => void;
  // ---------------------------------
}

// --- 2. HAPUS HELPER LOKAL (parseCurrency & formatCurrencyInput) ---


export const DeviceReportForm = ({
  report,
  reportDate,
  reportIndex,
  onUpdate,
  onRemove,
  devices,
  accounts,
  onValidate, // <-- TERIMA FUNGSI BARU
}: DeviceReportFormProps) => {
  const [openingBalanceDisabled, setOpeningBalanceDisabled] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  // LOGIC SHIFT & STATUS LIVE (KRUSIAL)
  useEffect(() => {
    const applyLogic = async () => {
      setWarning(null);

      const { shift, liveStatus, deviceId } = report;

      // 1. Logic Status Live "Mati/Relive" (Prioritas utama)
      // Aturan: jika pilih status live mati & relive maka saldo awal 0 
      if (liveStatus === "Mati/Relive") {
        onUpdate(report.id, "openingBalance", 0);
        setOpeningBalanceDisabled(true);
        return;
      }

      // 2. Logic Shift 1
      // Aturan: Jika pilih "Shift 1", saldo awal otomatis 0 
      if (shift === "1") {
        onUpdate(report.id, "openingBalance", 0);
        setOpeningBalanceDisabled(true);
        return;
      }

      // 3. Logic Shift 2/3 (dan Status "Lancar")
      // Aturan: Jika pilih "Shift 2" atau "Shift 3", saldo awal otomatis diisi dari saldo akhir shift sebelumnya.
      if (shift && shift !== "1" && deviceId && liveStatus === "Lancar") {
        
        setOpeningBalanceDisabled(true); // Kunci input saldo saat sedang mencari/sukses

        try {
          const formattedDate = format(reportDate, "yyyy-MM-dd");
          // Shift sebelumnya adalah angka shift sekarang - 1
          const previousShift = (parseInt(shift) - 1).toString();

          const { data, error } = await supabase
            .from("daily_reports")
            .select("closing_balance")
            .eq("device_id", deviceId) 
            .eq("report_date", formattedDate)
            .eq("shift_number", previousShift) 
            .order("submitted_at", { ascending: false })
            .limit(1)
            .maybeSingle(); 

          if (error || !data) {
            setWarning(`Belum ada Laporan Harian untuk Shift ${previousShift} di Device ini.`);
            onUpdate(report.id, "openingBalance", 0);
          } else {
            // Sukses! Set Omset Awal = Omset Akhir shift sebelumnya
            onUpdate(report.id, "openingBalance", data.closing_balance);
          }
        } catch (err) {
          console.error("Gagal mengambil saldo sebelumnya:", err);
          toast.error("Gagal mengambil saldo sebelumnya.");
          onUpdate(report.id, "openingBalance", 0);
          setWarning("Gagal mengambil saldo dari server.");
        }
      } else {
        // Jika belum memilih shift/device/status live (default behavior)
        onUpdate(report.id, "openingBalance", 0);
        setOpeningBalanceDisabled(false);
      }
    };

    applyLogic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.shift, report.liveStatus, report.deviceId, reportDate, report.id]);
  
  // LOGIC VALIDASI SISI KLIEN (Wajib)
  useEffect(() => {
    // Periksa apakah semua field wajib (selain notes) sudah terisi
    const isValid = !!report.shift && 
                    !!report.deviceId && 
                    !!report.accountId && 
                    !!report.liveStatus && 
                    !!report.kategoriProduk &&
                    report.closingBalance >= report.openingBalance;

    onValidate(report.id, isValid);

  }, [report.shift, report.deviceId, report.accountId, report.liveStatus, report.kategoriProduk, report.openingBalance, report.closingBalance, report.id, onValidate]);


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
              <Label htmlFor={`shift-${report.id}`}>Shift *</Label>
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
              <Label htmlFor={`device-${report.id}`}>Device *</Label>
              <Select
                value={report.deviceId}
                onValueChange={(val) => onUpdate(report.id, "deviceId", val)}
              >
                <SelectTrigger id={`device-${report.id}`}>
                  <SelectValue placeholder="Pilih Device" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Akun */}
            <div className="space-y-2">
              <Label htmlFor={`account-${report.id}`}>Akun *</Label>
              <Select
                value={report.accountId}
                onValueChange={(val) => onUpdate(report.id, "accountId", val)}
              >
                <SelectTrigger id={`account-${report.id}`}>
                  <SelectValue placeholder="Pilih Akun" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Status Live */}
            <div className="space-y-2">
              <Label htmlFor={`status-${report.id}`}>Status Live *</Label>
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
              <Label htmlFor={`kategori-${report.id}`}>Kategori Produk *</Label>
              <Input
                id={`kategori-${report.id}`}
                placeholder="cth: Skincare"
                value={report.kategoriProduk}
                onChange={(e) =>
                  onUpdate(report.id, "kategoriProduk", e.target.value)
                }
              />
            </div>
            {/* Omset Awal */}
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor={`opening-${report.id}`}>Omset Awal</Label>
              <Input
                id={`opening-${report.id}`}
                placeholder="0"
                // --- 3. GUNAKAN HELPER BARU ---
                value={formatCurrencyInput(report.openingBalance)}
                disabled={openingBalanceDisabled}
                readOnly={openingBalanceDisabled}
                className={openingBalanceDisabled ? "bg-muted/50" : ""}
                onChange={(e) =>
                  onUpdate(
                    report.id,
                    "openingBalance",
                    parseCurrencyInput(e.target.value) // Helper baru return number
                  )
                }
              />
              {warning && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {warning}
                </p>
              )}
            </div>
            {/* Omset Akhir */}
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor={`closing-${report.id}`}>Omset Akhir *</Label>
              <Input
                id={`closing-${report.id}`}
                placeholder="0"
                // --- 4. GUNAKAN HELPER BARU ---
                value={formatCurrencyInput(report.closingBalance)}
                onChange={(e) =>
                  onUpdate(
                    report.id,
                    "closingBalance",
                    parseCurrencyInput(e.target.value) // Helper baru return number
                  )
                }
              />
              {report.closingBalance < report.openingBalance && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Omset Akhir tidak boleh &lt; Omset Awal.
                  </p>
              )}
            </div>
            {/* Total Omset (Calculated) */}
            <div className="space-y-2 md:col-span-1">
              <Label>Total Omset Device</Label>
              <Input
                value={formatCurrency(
                  report.closingBalance - report.openingBalance
                )}
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