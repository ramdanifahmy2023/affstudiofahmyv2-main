// src/components/Asset/DeleteAssetAlert.tsx
// KODE LENGKAP & BENAR

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";

// Tipe data Aset yang akan dihapus
type AssetToDelete = {
  id: string;
  name: string;
};

interface DeleteAssetAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetToDelete | null;
  onSuccess: () => void;
}

export const DeleteAssetAlert = ({ open, onOpenChange, asset, onSuccess }: DeleteAssetAlertProps) => {
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
        title: "Aset Dihapus",
        description: `Aset "${asset.name}" telah berhasil dihapus.`,
      });
      onSuccess(); // Refresh tabel dan tutup modal
      
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
          <AlertDialogTitle>Anda yakin ingin menghapus aset ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus aset{" "}
            <span className="font-semibold text-foreground">"{asset?.name}"</span>{" "}
            secara permanen dari database.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Ya, Hapus
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};