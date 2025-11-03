// src/components/Device/EditDeviceDialog.tsx

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; 

// Tipe data device yang dibutuhkan untuk edit (mirip DeviceData dari Devices.tsx)
interface DeviceData {
  id: string;
  device_id: string;
  imei: string;
  google_account: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  screenshot_url: string | null;
  group_id: string | null; 
}

interface Group {
    id: string;
    name: string;
}

// Skema validasi Zod
const deviceFormSchema = z.object({
  device_id: z.string().min(1, { message: "ID Device wajib diisi." }),
  imei: z.string().length(15, { message: "IMEI harus tepat 15 digit." }).regex(/^\d+$/, { message: "IMEI hanya boleh berisi angka." }),
  google_account: z.string().email({ message: "Format email Akun Google tidak valid." }),
  purchase_date: z.date().optional().nullable(),
  purchase_price: z.preprocess(
    (a) => (a === "" || a === null || a === undefined ? null : parseFloat(String(a).replace(/[^0-9.]/g, ''))),
    z.number().positive().optional().nullable()
  ),
  screenshot_url: z.string().url({ message: "Format URL tidak valid." }).optional().nullable().or(z.literal('')),
  group_id: z.string().optional().nullable(), 
});

type DeviceFormValues = z.infer<typeof deviceFormSchema>;

interface EditDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  device: DeviceData | null;
}

export const EditDeviceDialog = ({ open, onOpenChange, onSuccess, device }: EditDeviceDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);

  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceFormSchema),
    defaultValues: {
        purchase_price: undefined,
        screenshot_url: "",
        group_id: "no-group",
    }
  });

  // Fetch Groups untuk dropdown alokasi
  useEffect(() => {
    supabase.from("groups").select("id, name").order("name")
      .then(({ data }) => {
        if (data) setGroups(data);
      });
  }, []);

  // Isi form saat data device tersedia
  useEffect(() => {
    if (device && open) {
      form.reset({
        device_id: device.device_id,
        imei: device.imei,
        google_account: device.google_account || "",
        purchase_date: device.purchase_date ? new Date(device.purchase_date + "T00:00:00") : null,
        // Set purchase_price ke undefined/null jika 0 atau null untuk input number
        purchase_price: (device.purchase_price === 0 || device.purchase_price === null) ? undefined : device.purchase_price,
        screenshot_url: device.screenshot_url || "",
        group_id: device.group_id || "no-group", // Default ke 'no-group'
      });
    }
  }, [device, open, form]);

  const onSubmit = async (values: DeviceFormValues) => {
    if (!device) return;

    setLoading(true);
    try {
      // Konversi "no-group" ke null
      const finalGroupId = values.group_id === "no-group" ? null : values.group_id;

      const { error } = await supabase
        .from("devices")
        .update({
          device_id: values.device_id,
          imei: values.imei,
          google_account: values.google_account,
          purchase_date: values.purchase_date ? format(values.purchase_date, "yyyy-MM-dd") : null,
          purchase_price: values.purchase_price,
          screenshot_url: values.screenshot_url,
          group_id: finalGroupId, // Update alokasi group
        })
        .eq("id", device.id);

      if (error) throw error;

      toast.success(`Device "${values.device_id}" berhasil diperbarui.`);
      onSuccess();
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
          <DialogTitle>Edit Device: {device?.device_id}</DialogTitle>
          <DialogDescription>
            Perbarui detail inventaris dan alokasi group.
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
                    <FormLabel>IMEI (15 Digit)</FormLabel>
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
                name="group_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alokasi Group</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "no-group"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="no-group">-- Tidak ada group --</SelectItem>
                        {groups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <Input 
                        type="number" 
                        placeholder="3500000" 
                        {...field} 
                        // Pastikan nilai 0 atau null diubah ke string kosong untuk input number
                        value={field.value === undefined || field.value === null ? '' : field.value}
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
                  <FormItem className="md:col-span-2">
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
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};