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
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client"; 
import { Loader2, AlertTriangle } from "lucide-react";
import { EmployeeProfile } from "@/pages/Employees";

interface DeleteEmployeeAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeToDelete: EmployeeProfile | null;
}

export const DeleteEmployeeAlert = ({ isOpen, onClose, onSuccess, employeeToDelete }: DeleteEmployeeAlertProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!employeeToDelete) return;

    setLoading(true);
    toast({
      title: "Proses Menonaktifkan",
      description: `Menonaktifkan akun ${employeeToDelete.full_name}...`,
    });

    try {
      // Step 1: Disable auth user via Edge Function (FIX Issue #8)
      // Ini mencegah user login dengan kredensial lama mereka.
      const { data: disableData, error: disableError } = await supabase.functions.invoke("disable-user", {
        body: {
          // ⚠️ PENTING: Gunakan profile_id karena itu adalah ID user di tabel auth.users
          userId: employeeToDelete.profile_id, 
          reason: "Employee account deactivated by admin",
        },
      });

      if (disableError || disableData?.success === false) {
        console.warn("Gagal menonaktifkan akun Auth. Melanjutkan dengan soft delete Profile.", disableError || disableData?.error);
      }

      // Step 2: Update profile status to inactive (Soft Delete di DB)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ status: "inactive" })
        .eq("id", employeeToDelete.profile_id);

      if (profileError) throw profileError;

      toast({
        title: "Karyawan Dinonaktifkan",
        description: `Akun ${employeeToDelete.full_name} berhasil dimatikan dan tidak bisa login lagi.`,
        variant: "default",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal Menonaktifkan Karyawan",
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
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <AlertDialogTitle>Konfirmasi Menonaktifkan Karyawan</AlertDialogTitle>
          </div>
        </AlertDialogHeader>
        <AlertDialogDescription>
          Anda yakin ingin **menonaktifkan** akun **{employeeToDelete?.full_name}**?
          Tindakan ini akan mengubah status akun menjadi **Inactive** dan **mencegah** karyawan tersebut login kembali.
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            className="bg-destructive hover:bg-destructive/90"
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Ya, Nonaktifkan'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};