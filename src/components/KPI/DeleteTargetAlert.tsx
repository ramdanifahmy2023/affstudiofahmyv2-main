// src/components/KPI/DeleteTargetAlert.tsx

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
import { KpiData } from "@/pages/KPI";
import { format } from "date-fns";

interface DeleteTargetAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  kpiToDelete: KpiData | null;
}

export const DeleteTargetAlert = ({ open, onOpenChange, onSuccess, kpiToDelete }: DeleteTargetAlertProps) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!kpiToDelete) return;

    setLoading(true);
    toast.info(`Menghapus target KPI...`);

    try {
      const { error } = await supabase
        .from("kpi_targets")
        .delete()
        .eq("id", kpiToDelete.id);

      if (error) throw error;

      toast.success(`Target KPI bulan ${format(new Date(kpiToDelete.target_month), "MMM yyyy")} berhasil dihapus.`);
      onSuccess();
    } catch (error: any) {
      toast.error("Gagal menghapus target.", {
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
          <AlertDialogTitle>Hapus Target KPI Ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Anda yakin ingin menghapus target KPI untuk karyawan{" "}
            <strong className="text-destructive">
              {kpiToDelete?.employees?.profiles?.full_name || 'N/A'}
            </strong>{" "}
            bulan{" "}
             <strong className="text-destructive">
              {kpiToDelete ? format(new Date(kpiToDelete.target_month), "MMM yyyy") : '-'}
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
            Ya, Hapus Target
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};