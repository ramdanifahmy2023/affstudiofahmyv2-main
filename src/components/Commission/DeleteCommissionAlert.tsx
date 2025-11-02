// src/components/Commission/DeleteCommissionAlert.tsx

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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { CommissionData } from "@/pages/Commissions";

interface DeleteCommissionAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  commission: CommissionData | null;
}

export const DeleteCommissionAlert = ({ open, onOpenChange, onSuccess, commission }: DeleteCommissionAlertProps) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!commission) return;

    setLoading(true);
    toast.info(`Menghapus data komisi...`);

    try {
      const { error } = await supabase
        .from("commissions")
        .delete()
        .eq("id", commission.id);

      if (error) throw error;

      toast.success(`Data komisi berhasil dihapus.`);
      onSuccess();
    } catch (error: any) {
      toast.error("Gagal menghapus data.", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini akan menghapus data komisi periode{" "}
            <strong className="text-destructive">{commission?.period}</strong>{" "}
            untuk akun{" "}
            <strong className="text-destructive">
              {commission?.accounts.username}
            </strong>
            .
            <br />
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
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ya, Hapus Data
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};