// src/components/Device/DeleteDeviceAlert.tsx

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

// Tipe data device yang dibutuhkan
interface DeviceData {
  id: string;
  device_id: string;
}

interface DeleteDeviceAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  device: DeviceData | null;
}

export const DeleteDeviceAlert = ({ open, onOpenChange, onSuccess, device }: DeleteDeviceAlertProps) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!device) return;

    setLoading(true);
    toast.info(`Menghapus device "${device.device_id}"...`);

    try {
      const { error } = await supabase
        .from("devices")
        .delete()
        .eq("id", device.id);

      if (error) throw error;

      toast.success(`Device "${device.device_id}" berhasil dihapus.`);
      onSuccess();
    } catch (error: any) {
      toast.error("Gagal menghapus device.", {
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
          <AlertDialogTitle>Hapus Device: {device?.device_id}?</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini akan menghapus permanen device{" "}
            <strong className="text-destructive">{device?.device_id}</strong>{" "}
            dari inventaris.
            <br />
            Semua data riwayat yang terhubung akan tetap tersimpan, namun tindakan ini tidak dapat dibatalkan.
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
            Ya, Hapus Device
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};