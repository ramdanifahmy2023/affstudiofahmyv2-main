// src/components/Cashflow/DeleteTransactionAlert.tsx

import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { TransactionData } from "@/pages/Cashflow";

interface DeleteTransactionAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  transaction: TransactionData | null;
}

export const DeleteTransactionAlert = ({ open, onOpenChange, onSuccess, transaction }: DeleteTransactionAlertProps) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!transaction) return;

    setLoading(true);
    toast.info(`Menghapus transaksi...`);

    try {
      const { error } = await supabase
        .from("cashflow")
        .delete()
        .eq("id", transaction.id);

      if (error) throw error;

      toast.success(`Transaksi "${transaction.description}" berhasil dihapus.`);
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
            Tindakan ini akan menghapus transaksi{" "}
            <strong className="text-destructive">{transaction?.description}</strong>{" "}
            senilai{" "}
            <strong className="text-destructive">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
              }).format(transaction?.amount || 0)}
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
            Ya, Hapus Transaksi
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};