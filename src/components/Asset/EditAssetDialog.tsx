// src/components/Asset/EditAssetDialog.tsx
// KODE LENGKAP & DIPERBARUI (FIX SYNTAX ERROR DI SELECT TRIGGER)

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { format, parseISO } from "date-fns";
import { id as indonesianLocale } from "date-fns/locale";

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
  SelectTrigger, // Pastikan komponen ini diimpor
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Tipe data untuk dropdown Karyawan
interface Employee {
  id: string; // employee_id
  full_name: string;
}

// Tipe data untuk Aset yang diedit
type AssetToEdit = {
  id: string;
  name: string;
  category: string;
  purchase_date: string;
  purchase_price: number;
  condition: string | null;
  assigned_to: string | null;
  notes: string | null;
};

// Skema validasi Zod
const assetFormSchema = z.object({
  purchase_date: z.date({ required_error: "Tanggal pembelian wajib diisi." }),
  name: z.string().min(3, { message: "Nama aset wajib diisi (min. 3 karakter)." }),
  category: z.enum(["Elektronik", "Furniture", "Kendaraan", "Lainnya"], {
    required_error: "Kategori wajib dipilih.",
  }),
  purchase_price: z.preprocess( // Ini adalah Harga TOTAL
    (a) => parseFloat(String(a).replace(/[^0-9]/g, "")),
    z.number().min(1, { message: "Harga total wajib diisi." })
  ),
  condition: z.enum(["Baru", "Bekas"]).optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(), // employee_id
  notes: z.string().optional().nullable(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

interface EditAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void; // Untuk refresh list
  asset: AssetToEdit | null;
}

export const EditAssetDialog = ({ open, onOpenChange, onSuccess, asset }: EditAssetDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const { toast } = useToast();

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
  });
  
  // Helper format mata uang
  const formatCurrencyInput = (value: string | number) => {
    const numberValue = Number(String(value).replace(/[^0-9]/g, ""));
    if (isNaN(numberValue)) return "0";
    return new Intl.NumberFormat("id-ID").format(numberValue);
  };
  
  const parseCurrencyInput = (value: string) => {
     return Number(String(value).replace(/[^0-9]/g, ""));
  };

  // Fetch data karyawan DAN set default values form
  useEffect(() => {
    if (open && asset) {
      // 1. Set default values form
      form.reset({
        name: asset.name,
        category: asset.category as any, // "Elektronik" | "Furniture" | etc.
        purchase_date: parseISO(asset.purchase_date), 
        purchase_price: asset.purchase_price,
        condition: asset.condition, // Skema sudah memperbolehkan null
        assigned_to: asset.assigned_to,
        notes: asset.notes,
      });

      // 2. Fetch karyawan
      const fetchEmployees = async () => {
        try {
          const { data, error } = await supabase
            .from("employees")
            .select(`id, profiles ( full_name )`);
          if (error) throw error;

          const mappedData = data
            .map((emp: any) => ({
              id: emp.id,
              full_name: emp.profiles?.full_name || 'Tanpa Nama',
            }))
            .sort((a, b) => a.full_name.localeCompare(b.full_name));
            
          setEmployees(mappedData || []);
        } catch (error: any) {
          toast({
            variant: "destructive",
            title: "Gagal Memuat Karyawan",
            description: "Terjadi kesalahan saat memuat daftar karyawan."
          });
          console.error("Error fetching employees:", error.message);
        }
      };
      
      fetchEmployees();
    }
  }, [open, asset, form, toast]);

  const onSubmit = async (values: AssetFormValues) => {
    if (!asset) return; // Guard clause

    setLoading(true);
    try {
      const { error } = await supabase
        .from("assets")
        .update({
          purchase_date: format(values.purchase_date, "yyyy-MM-dd"),
          name: values.name,
          category: values.category,
          purchase_price: values.purchase_price,
          current_value: values.purchase_price,
          condition: values.condition,
          assigned_to: values.assigned_to,
          notes: values.notes,
        })
        .eq('id', asset.id); // Kondisi WHERE

      if (error) throw error;

      toast({
        title: "Aset Berhasil Diperbarui",
        description: `Aset "${values.name}" telah tersimpan.`,
      });
      onSuccess(); // Refresh list & tutup dialog
      
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Gagal Memperbarui Aset",
        description: `Terjadi kesalahan: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Aset</DialogTitle>
          <DialogDescription>
            Perbarui data inventaris aset perusahaan.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Aset</FormLabel>
                    <FormControl>
                      <Input placeholder="Cth: Laptop HP Victus" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori Aset</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih kategori..." />
                        </SelectTrigger>
                        {/* --- PERBAIKAN: Mengganti </Trigger> menjadi </SelectTrigger> --- 
                        Anda dapat menghapus baris di bawah ini yang salah jika sudah terlanjur terinput:
                        </Trigger>
                        */}
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Elektronik">Elektronik</SelectItem>
                        <SelectItem value="Furniture">Furniture</SelectItem>
                        <SelectItem value="Kendaraan">Kendaraan</SelectItem>
                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchase_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col pt-2">
                    <FormLabel>Tanggal Pembelian</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "dd MMM yyyy", { locale: indonesianLocale }) : <span>Pilih tanggal</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
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
                    <FormLabel>Harga Total (Rp)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="15.000.000"
                       value={formatCurrencyInput(field.value || 0)}
                       onChange={(e) => {
                         field.onChange(parseCurrencyInput(e.target.value));
                       }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kondisi</FormLabel>
                      {/* value={field.value ?? ""} untuk Select component agar menerima null sebagai string kosong */}
                      <Select onValueChange={field.onChange} value={field.value ?? ""}> 
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kondisi..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Baru">Baru</SelectItem>
                          <SelectItem value="Bekas">Bekas</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="assigned_to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Diberikan ke (Opsional)</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value === "none" ? null : value);
                        }} 
                        value={field.value ?? "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih karyawan..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">-- Tidak diberikan --</SelectItem>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
             </div>
            
             <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keterangan (Opsional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Cth: Pembelian di Toko XYZ, Garansi 1 thn" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            
            <DialogFooter className="pt-4">
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