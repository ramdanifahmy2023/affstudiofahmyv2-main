// src/components/Group/DeleteGroupAlert.tsx

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

interface DeleteGroupAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  group: { id: string; name: string } | null;
}

export const DeleteGroupAlert = ({
  isOpen,
  onClose,
  onSuccess,
  group,
}: DeleteGroupAlertProps) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!group) return;

    setLoading(true);
    toast.info(`Menghapus group "${group.name}"...`);

    try {
      // Panggil fungsi SQL 'delete_group' yang kita buat
      const { error } = await supabase.rpc("delete_group", {
        group_id_to_delete: group.id,
      });

      if (error) throw error;

      toast.success(`Group "${group.name}" berhasil dihapus.`);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error("Gagal menghapus group.", {
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
          <AlertDialogTitle>Apakah Anda benar-benar yakin?</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini akan menghapus group{" "}
            <strong className="text-destructive">{group?.name}</strong>. Semua
            karyawan, device, dan akun yang terhubung akan dilepaskan (tidak
            ikut terhapus).
            <br />
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
            Ya, Hapus Group
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};