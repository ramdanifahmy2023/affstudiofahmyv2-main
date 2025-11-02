// src/components/Employee/DeleteEmployeeAlert.tsx

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
import { EmployeeProfile } from "@/pages/Employees";

interface DeleteEmployeeAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeToDelete: EmployeeProfile | null;
}

export const DeleteEmployeeAlert = ({
  isOpen,
  onClose,
  onSuccess,
  employeeToDelete,
}: DeleteEmployeeAlertProps) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!employeeToDelete) return;

    setLoading(true);
    toast.info(`Menonaktifkan akun ${employeeToDelete.full_name}...`);

    try {
      // Kita lakukan 'Soft Delete' dengan mengubah status di tabel 'profiles'
      // Menghapus user dari 'auth.users' memerlukan hak admin service_role
      // dan sebaiknya dilakukan via Edge Function.
      // Untuk simplifikasi, kita update statusnya saja menjadi 'inactive'.
      const { error } = await supabase
        .from("profiles")
        .update({ status: "inactive" })
        .eq("id", employeeToDelete.profile_id);

      if (error) throw error;

      toast.success("Karyawan berhasil dinonaktifkan (dihapus).");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error("Gagal menghapus karyawan.", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Anda yakin ingin menghapus?</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini akan menonaktifkan akun karyawan{" "}
            <strong>{employeeToDelete?.full_name}</strong>.
            Data tidak dapat dikembalikan, namun akun hanya akan berstatus 'inactive'.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={loading}>
            Batal
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Menghapus..." : "Ya, Hapus"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};