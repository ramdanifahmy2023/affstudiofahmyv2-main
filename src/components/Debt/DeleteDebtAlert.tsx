// src/components/Debt/DeleteDebtAlert.tsx

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

// Tipe data Hutang/Piutang yang dibutuhkan
interface DebtData {
  id: string;
  type: "debt" | "receivable";
  counterparty: string;
  amount: number;
}

interface DeleteDebtAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  debt: DebtData | null;
}

export const DeleteDebtAlert = ({ open, onOpenChange, onSuccess, debt }: DeleteDebtAlertProps) => {
  const [loading, setLoading] = useState(false);
  
  const debtType = debt?.type === 'debt' ? 'Hutang' : 'Piutang';
  const formattedAmount = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(debt?.amount || 0);

  const handleDelete = async () => {
    if (!debt) return;

    setLoading(true);
    toast.info(`Menghapus data ${debtType}...`);

    try {
      const { error } = await supabase
        .from("debt_receivable")
        .delete()
        .eq("id", debt.id);

      if (error) throw error;

      toast.success(`Data ${debtType} berhasil dihapus.`);
      onSuccess();
    } catch (error: any) {
      toast.error(`Gagal menghapus data ${debtType}.`, {
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
          <AlertDialogTitle>Hapus {debtType} Ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Anda yakin ingin menghapus data {debtType} dengan pihak{" "}
            <strong className="text-destructive">{debt?.counterparty}</strong>{" "}
            senilai{" "}
            <strong className="text-destructive">
              {formattedAmount}
            </strong>
            ?
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