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

// Skema validasi Zod
const accountFormSchema = z.object({
  platform: z.enum(["shopee", "tiktok"]),
  username: z.string().min(3, { message: "Username wajib diisi." }),
  email: z.string().email({ message: "Format email tidak valid." }),
  // Password opsional saat edit (dikosongkan = tidak diubah)
  password: z.string().optional(), 
  phone: z.string().optional().nullable().or(z.literal('')),
  account_status: z.enum(["active", "banned_temporary", "banned_permanent"]),
  data_status: z.enum(["empty", "in_progress", "rejected", "verified"]),
  // Field non-DB, hanya untuk UI
  link_profil: z.string().url({ message: "URL tidak valid" }).optional().or(z.literal('')),
  keterangan: z.string().optional(),
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

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
        username: "",
        email: "",
        password: "",
        phone: null,
        account_status: "active",
        data_status: "empty",
        platform: "shopee",
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
        phone: account.phone || "", // Null -> "" untuk input field
        account_status: (account.account_status || "active") as AccountStatus,
        data_status: (account.data_status || "empty") as AccountDataStatus,
        password: "", // Selalu kosongkan password saat reset
        link_profil: "",
        keterangan: "", 
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
          // Menggunakan `|| null` agar string kosong dari form berubah jadi NULL di DB
          phone: values.phone || null, 
          account_status: values.account_status as AccountStatus,
          data_status: values.data_status as AccountDataStatus,
      };

      // Hanya update password jika diisi (minimal 8 karakter)
      if (values.password && values.password.length >= 8) {
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
                    <FormLabel>No. HP (Opsional)</FormLabel>
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
                      {/* Pastikan minimal 8 karakter jika diisi */}
                      <Input type="password" placeholder="•••••••• (min. 8)" {...field} />
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