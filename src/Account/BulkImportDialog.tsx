// src/Account/BulkImportDialog.tsx

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, FileCheck2, FileWarning, Upload } from "lucide-react";
import Papa from "papaparse"; // Import Papaparse

// Tipe Enums dari Supabase (untuk validasi)
type AccountPlatform = "shopee" | "tiktok";
type AccountStatus = "active" | "banned_temporary" | "banned_permanent";
type AccountDataStatus = "empty" | "in_progress" | "rejected" | "verified";

// Tipe data baris CSV
interface CsvRow {
  platform: AccountPlatform;
  username: string;
  email: string;
  password: string;
  phone?: string | null;
  account_status?: AccountStatus | null;
  data_status?: AccountDataStatus | null;
}

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const BulkImportDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: BulkImportDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("Belum ada file dipilih");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0];
      if (selectedFile.type !== "text/csv") {
        toast.error("Format file salah. Harap unggah file .csv");
        return;
      }
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleClose = () => {
    setFile(null);
    setFileName("Belum ada file dipilih");
    setLoading(false);
    onOpenChange(false);
  };

  const handleImport = () => {
    if (!file) {
      toast.error("Harap pilih file CSV terlebih dahulu.");
      return;
    }

    setLoading(true);
    toast.info(`Memulai import dari ${file.name}...`);

    Papa.parse<CsvRow>(file, {
      header: true, // Anggap baris pertama adalah header
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        
        // 1. Validasi dan Transformasi Data
        const accountsToInsert = rows.map((row, index) => {
          // Validasi dasar
          if (!row.platform || !row.username || !row.email || !row.password) {
            toast.warning(`Data di baris ${index + 2} tidak lengkap (platform, username, email, password wajib diisi).`);
            return null;
          }
          if (row.platform !== 'shopee' && row.platform !== 'tiktok') {
            toast.warning(`Data platform di baris ${index + 2} tidak valid (gunakan 'shopee' atau 'tiktok').`);
            return null;
          }

          return {
            platform: row.platform,
            username: row.username.trim(),
            email: row.email.trim(),
            password: row.password, // Password tidak di-trim
            phone: row.phone || null,
            account_status: (row.account_status || "active") as AccountStatus,
            data_status: (row.data_status || "empty") as AccountDataStatus,
          };
        }).filter((acc): acc is CsvRow => acc !== null); // Filter baris yang gagal validasi

        if (accountsToInsert.length === 0) {
          toast.error("Tidak ada data valid yang ditemukan dalam file CSV.");
          setLoading(false);
          return;
        }

        // 2. Kirim ke Supabase
        try {
          const { error } = await supabase
            .from("accounts")
            .insert(accountsToInsert as any); // 'any' untuk menyederhanakan tipe insert

          if (error) {
             if (error.code === '23505' && error.message.includes("accounts_username_key")) {
                 throw new Error("Gagal: Terdapat satu atau lebih username yang sudah terdaftar di database.");
             }
             throw error;
          }

          toast.success(`Berhasil! ${accountsToInsert.length} akun berhasil diimpor.`);
          onSuccess(); // Refresh tabel
          handleClose(); // Tutup dialog

        } catch (error: any) {
          console.error(error);
          toast.error("Gagal mengimpor data.", {
            description: error.message,
          });
        } finally {
          setLoading(false);
        }
      },
      error: (error: any) => {
        toast.error("Gagal membaca file CSV.", { description: error.message });
        setLoading(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Akun (Bulk CSV)</DialogTitle>
          <DialogDescription>
            Unggah file CSV untuk menambahkan banyak akun sekaligus.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <FileWarning className="h-4 w-4" />
          <AlertTitle>Format CSV Wajib!</AlertTitle>
          <AlertDescription>
            Pastikan file CSV Anda memiliki header:{" "}
            <strong>platform, username, email, password</strong>.
            <br />
            Header opsional: <strong>phone, account_status, data_status</strong>.
            <br />
            Nilai 'platform' harus 'shopee' atau 'tiktok'.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="file-upload">Pilih File CSV</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Pilih File...
            </Button>
            <Input
              id="file-upload"
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".csv"
              onChange={handleFileChange}
            />
            <Input
              value={fileName}
              readOnly
              disabled
              className="flex-1"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={loading || !file}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileCheck2 className="mr-2 h-4 w-4" />
            )}
            {loading ? "Mengimpor..." : "Mulai Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};