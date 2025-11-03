// src/Account/DeleteAccountAlert.tsx

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

// Tipe data akun yang dibutuhkan
interface AccountData {
  id: string;
  username: string;
}

interface DeleteAccountAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  account: AccountData | null;
}

export const DeleteAccountAlert = ({ open, onOpenChange, onSuccess, account }: DeleteAccountAlertProps) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!account) return;

    setLoading(true);
    toast.info(`Menghapus akun "${account.username}"...`);

    try {
      const { error } = await supabase
        .from("accounts")
        .delete()
        .eq("id", account.id);

      if (error) throw error;

      toast.success(`Akun "${account.username}" berhasil dihapus.`);
      onSuccess();
    } catch (error: any) {
      toast.error("Gagal menghapus akun.", {
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
          <AlertDialogTitle>Hapus Akun: {account?.username}?</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini akan menghapus permanen akun{" "}
            <strong className="text-destructive">{account?.username}</strong>{" "}
            dari database. Semua data komisi yang terkait akan terlepas (unlinked).
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
            Ya, Hapus Akun
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};