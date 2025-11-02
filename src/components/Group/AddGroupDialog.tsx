import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

// Tipe data untuk dropdown leader
interface LeaderProfile {
  id: string; // Ini adalah profile_id
  full_name: string;
}

// Skema validasi Zod
const groupFormSchema = z.object({
  name: z.string().min(3, { message: "Nama grup wajib diisi (min. 3 karakter)." }),
  description: z.string().optional(),
  leader_id: z.string().uuid({ message: "Leader harus dipilih." }), // profile_id dari leader
});

type GroupFormValues = z.infer<typeof groupFormSchema>;

interface AddGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void; // Untuk refresh list grup
}

export const AddGroupDialog = ({ open, onOpenChange, onSuccess }: AddGroupDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [leaders, setLeaders] = useState<LeaderProfile[]>([]);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      description: "",
      leader_id: undefined,
    },
  });

  // Fetch data leader (user dengan role 'leader') untuk dropdown
  useEffect(() => {
    if (open) {
      const fetchLeaders = async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "leader");
        
        if (error) {
          toast.error("Gagal memuat data leader.");
        } else {
          setLeaders(data || []);
        }
      };
      fetchLeaders();
    }
  }, [open]);

  const onSubmit = async (values: GroupFormValues) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("groups")
        .insert({
          name: values.name,
          description: values.description,
          leader_id: values.leader_id,
        });

      if (error) {
        if (error.code === '23505') { // Error unique constraint
          throw new Error("Nama grup sudah ada. Silakan gunakan nama lain.");
        }
        throw error;
      }

      toast.success(`Grup "${values.name}" berhasil dibuat.`);
      form.reset();
      onSuccess(); // Panggil callback sukses (refresh list & tutup dialog)
    } catch (error: any) {
      console.error(error);
      toast.error(`Terjadi kesalahan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Buat Grup Baru</DialogTitle>
          <DialogDescription>
            Buat grup baru dan tentukan siapa leader yang akan mengelolanya.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Grup</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Grup A (Live Pagi)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="leader_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leader Grup</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih leader untuk grup ini..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {leaders.length === 0 && (
                        <SelectItem value="disabled" disabled>
                          Memuat data leader...
                        </SelectItem>
                      )}
                      {leaders.map((leader) => (
                        <SelectItem key={leader.id} value={leader.id}>
                          {leader.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi (Opsional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tulis deskripsi singkat tentang grup ini..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Grup
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};