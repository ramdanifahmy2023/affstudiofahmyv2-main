// src/components/Knowledge/DeleteKnowledgeAlert.tsx

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
import { ProcessedKnowledgeData } from "@/pages/Knowledge";

interface DeleteKnowledgeAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  knowledgeToDelete: ProcessedKnowledgeData | null;
}

export const DeleteKnowledgeAlert = ({ open, onOpenChange, onSuccess, knowledgeToDelete }: DeleteKnowledgeAlertProps) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!knowledgeToDelete) return;

    setLoading(true);
    toast.info(`Menghapus materi: ${knowledgeToDelete.title}...`);

    try {
      const { error } = await supabase
        .from("knowledge_base")
        .delete()
        .eq("id", knowledgeToDelete.id);

      if (error) throw error;

      toast.success(`Materi "${knowledgeToDelete.title}" berhasil dihapus.`);
      onSuccess();
    } catch (error: any) {
      toast.error("Gagal menghapus materi.", {
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
          <AlertDialogTitle>Hapus Materi Ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Anda yakin ingin menghapus materi 
            <strong className="text-destructive"> {knowledgeToDelete?.title}</strong>?
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
            Ya, Hapus Materi
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};