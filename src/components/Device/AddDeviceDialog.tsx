// src/components/Device/AddDeviceDialog.tsx

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Skema validasi Zod berdasarkan blueprint 
const deviceFormSchema = z.object({
  device_id: z.string().min(1, { message: "ID Device wajib diisi." }),
  imei: z.string().length(15, { message: "IMEI harus tepat 15 digit." }).regex(/^\d+$/, { message: "IMEI hanya boleh berisi angka." }),
  google_account: z.string().email({ message: "Format email Akun Google tidak valid." }),
  purchase_date: z.date().optional().nullable(),
  // PERBAIKAN: Tangani empty string ("") dari input optional sebagai `null`
  purchase_price: z.preprocess(
    (a) => (a === "" || a === null || a === undefined ? null : parseFloat(String(a).replace(/[^0-9.]/g, ''))),
    z.number().positive().optional().nullable()
  ),
  screenshot_url: z.string().url({ message: "Format URL tidak valid." }).optional().nullable().or(z.literal('')),
});

type DeviceFormValues = z.infer<typeof deviceFormSchema>;

interface AddDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void; // Untuk refresh list device
}

export const AddDeviceDialog = ({ open, onOpenChange, onSuccess }: AddDeviceDialogProps) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceFormSchema),
    defaultValues: {
      device_id: "",
      imei: "",
      google_account: "",
      purchase_date: null,
      purchase_price: undefined, // undefined lebih baik untuk input number opsional di form
      screenshot_url: "",
    },
  });

  const onSubmit = async (values: DeviceFormValues) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("devices")
        .insert({
          device_id: values.device_id,
          imei: values.imei,
          google_account: values.google_account,
          purchase_date: values.purchase_date ? format(values.purchase_date, "yyyy-MM-dd") : null,
          purchase_price: values.purchase_price,
          screenshot_url: values.screenshot_url,
          // group_id akan di-set saat alokasi, bukan saat pembuatan
        });

      if (error) {
        if (error.code === '23505') { // Error unique constraint
          if (error.message.includes("devices_device_id_key")) {
             throw new Error("ID Device ini sudah terdaftar. Gunakan ID unik.");
          }
          if (error.message.includes("devices_imei_key")) {
             throw new Error("IMEI ini sudah terdaftar.");
          }
        }
        throw error;
      }

      toast.success(`Device "${values.device_id}" berhasil ditambahkan.`);
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Tambah Device Baru</DialogTitle>
          <DialogDescription>
            Masukkan detail inventaris untuk device baru.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="device_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Device (Unik)</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: HP-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="imei"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IMEI (Unik, 15 Digit)</FormLabel>
                    <FormControl>
                      <Input placeholder="123456789012345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="google_account"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Akun Google</FormLabel>
                    <FormControl>
                      <Input placeholder="akun.device@gmail.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchase_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Tanggal Beli (Opsional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchase_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga Beli (Opsional)</FormLabel>
                    <FormControl>
                      {/* PERBAIKAN: Mengikat nilai number/undefined/null ke input yang benar */}
                      <Input 
                        type="number" 
                        placeholder="3500000" 
                        {...field} 
                        // Tampilkan string kosong jika nilainya undefined atau null
                        value={field.value === undefined || field.value === null ? '' : field.value}
                        // Kirim undefined jika input kosong, atau parse ke float
                        onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="screenshot_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link Screenshot (Opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} value={field.value ?? ""} />
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
                Simpan Device
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};