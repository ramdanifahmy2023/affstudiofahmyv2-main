// src/components/Asset/DeleteAssetAlert.tsx

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast"; // <-- Import useToast

// Definisi ulang tipe data (harus sama dengan AssetData di Asset.tsx)
interface AssetData {
  id: string;
  name: string;
}

interface DeleteAssetAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  asset: AssetData | null;
}

export const DeleteAssetAlert = ({ open, onOpenChange, onSuccess, asset }: DeleteAssetAlertProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!asset) return;

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from("assets")
        .delete()
        .eq("id", asset.id);

      if (error) throw error;

      toast({
        title: "Aset Berhasil Dihapus",
        description: `Aset "${asset.name}" telah dihapus dari inventaris.`,
        variant: "default",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal Menghapus Aset",
        description: `Terjadi kesalahan: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Aset Ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Anda yakin ingin menghapus aset <strong>{asset?.name}</strong>?
            Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Menghapus..." : "Ya, Hapus Aset"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};