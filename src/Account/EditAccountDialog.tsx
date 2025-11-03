// src/Account/EditAccountDialog.tsx

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

// Import tipe data dari Accounts.tsx
type AccountData = {
  id: string;
  platform: "shopee" | "tiktok";
  username: string;
  email: string;
  phone: string | null;
  account_status: "active" | "banned_temporary" | "banned_permanent" | null;
  data_status: "empty" | "in_progress" | "rejected" | "verified" | null;
  groups: { name: string } | null;
};

// Tipe Enums dari Supabase
type AccountPlatform = "shopee" | "tiktok";
type AccountStatus = "active" | "banned_temporary" | "banned_permanent";
type AccountDataStatus = "empty" | "in_progress" | "rejected" | "verified";

// Skema validasi Zod (diperbarui untuk menangani null dari DB)
const accountFormSchema = z.object({
  platform: z.enum(["shopee", "tiktok"]),
  username: z.string().min(3, { message: "Username wajib diisi." }),
  email: z.string().email({ message: "Format email tidak valid." }),
  password: z.string().optional(), // Password opsional saat edit
  phone: z.string().optional().nullable(),
  account_status: z.enum(["active", "banned_temporary", "banned_permanent"]),
  data_status: z.enum(["empty", "in_progress", "rejected", "verified"]),
  // Karena kolom ini tidak ada di DB, kita biarkan opsional di form
  link_profil: z.string().url({ message: "URL tidak valid" }).optional().or(z.literal('')),
  keterangan: z.string().optional(),
  // Field untuk group_id (jika diperlukan untuk edit alokasi)
  group_id: z.string().uuid().optional().nullable(),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface EditAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  account: AccountData | null;
}

export const EditAccountDialog = ({ open, onOpenChange, onSuccess, account }: EditAccountDialogProps) => {
  const [loading, setLoading] = useState(false);
  // Tambahkan state untuk daftar group jika Anda ingin mengedit alokasi di sini.
  // Karena kita fokus CRUD, kita akan skip alokasi group untuk saat ini.

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    // Default values akan diisi di useEffect
    defaultValues: {
        username: "",
        email: "",
        password: "",
        phone: null,
        account_status: "active",
        data_status: "empty",
        platform: "shopee",
        group_id: null,
        link_profil: "",
        keterangan: "",
    }
  });
  
  // Isi form saat data akun tersedia
  useEffect(() => {
    if (account && open) {
      form.reset({
        platform: account.platform,
        username: account.username,
        email: account.email,
        phone: account.phone || "",
        account_status: (account.account_status || "active") as AccountStatus,
        data_status: (account.data_status || "empty") as AccountDataStatus,
        // Kita tidak bisa mengisi password lama, jadi biarkan kosong/opsional
        password: "",
        // Asumsi link_profil dan keterangan tidak di-fetch, jadi biarkan kosong
        link_profil: "",
        keterangan: "", 
        group_id: account.groups?.name || null // Ini perlu penyesuaian jika Anda ingin alokasi group
      });
    }
  }, [account, open, form]);


  const onSubmit = async (values: AccountFormValues) => {
    if (!account) return;

    setLoading(true);
    try {
      const updateData: any = {
          platform: values.platform as AccountPlatform,
          username: values.username,
          email: values.email,
          phone: values.phone || null,
          account_status: values.account_status as AccountStatus,
          data_status: values.data_status as AccountDataStatus,
          // group_id: values.group_id // Jika ada field group_id di form
      };

      // Hanya update password jika diisi
      if (values.password) {
          updateData.password = values.password;
      }

      const { error } = await supabase
        .from("accounts")
        .update(updateData)
        .eq("id", account.id);

      if (error) {
        if (error.code === '23505') { 
          if (error.message.includes("accounts_username_key")) {
             throw new Error("Username ini sudah terdaftar. Gunakan username unik.");
          }
        }
        throw error;
      }

      toast.success(`Akun "${values.username}" berhasil diperbarui.`);
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(`Gagal memperbarui akun: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Akun: {account?.username}</DialogTitle>
          <DialogDescription>
            Perbarui detail akun affiliate. Kosongkan password jika tidak ingin diubah.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="platform"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Platform (Wajib)</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value="shopee" />
                        </FormControl>
                        <FormLabel className="font-normal">Shopee</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value="tiktok" />
                        </FormControl>
                        <FormLabel className="font-normal">TikTok</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="@username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No. HP</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="0812..." {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="akun@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password (Kosongkan jika tidak diubah)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="account_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Akun</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih status..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Aktif</SelectItem>
                        <SelectItem value="banned_temporary">Banned Sementara</SelectItem>
                        <SelectItem value="banned_permanent">Banned Permanen</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="data_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Data</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih status..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="empty">Kosong</SelectItem>
                        <SelectItem value="in_progress">Proses Pengajuan</SelectItem>
                        <SelectItem value="rejected">Ditolak</SelectItem>
                        <SelectItem value="verified">Verifikasi Berhasil</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="link_profil"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Link Profil (Opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://shopee.co.id/..." {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               {/* Karena keterangan tidak ada di DB, kita komentar atau hapus jika mengganggu */}
               {/* <FormField
                control={form.control}
                name="keterangan"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Keterangan (Opsional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Catatan tambahan..." {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};