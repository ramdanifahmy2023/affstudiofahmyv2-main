// src/components/Asset/AddAssetDialog.tsx

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast"; 
import { format } from "date-fns";
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
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
// --- 1. IMPORT HELPER BARU ---
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/utils";

// Tipe data untuk dropdown Karyawan
interface Employee {
  id: string; // employee_id
  full_name: string;
}

// Skema validasi Zod
const assetFormSchema = z.object({
  purchase_date: z.date({ required_error: "Tanggal pembelian wajib diisi." }),
  name: z.string().min(3, { message: "Nama aset wajib diisi (min. 3 karakter)." }),
  category: z.enum(["Elektronik", "Furniture", "Kendaraan", "Lainnya"], {
    required_error: "Kategori wajib dipilih.",
  }),
  // --- 2. UBAH ZOD KE STRING & TAMBAH VALIDASI ANGKA ---
  purchase_price: z.string() // Ini adalah Harga Satuan
    .min(1, { message: "Harga satuan wajib diisi." })
    .refine((val) => parseCurrencyInput(val) > 0, { message: "Harga harus lebih dari 0." }),
  quantity: z.preprocess( 
    (a) => parseInt(String(a).replace(/[^0-9]/g, ""), 10),
    z.number().min(1, { message: "Jumlah (Qty) wajib diisi (min. 1)." })
  ),
  condition: z.enum(["Baru", "Bekas"], { required_error: "Kondisi wajib dipilih." }),
  assigned_to: z.string().uuid().optional().nullable(), // employee_id (dari tabel employees)
  notes: z.string().optional().nullable(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

interface AddAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void; // Untuk refresh list
}

export const AddAssetDialog = ({ open, onOpenChange, onSuccess }: AddAssetDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const { toast } = useToast(); 

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      purchase_date: new Date(),
      name: "",
      category: undefined,
      purchase_price: "0",
      quantity: 1,
      condition: "Baru",
      assigned_to: "none", // Default ke "none"
      notes: "",
    },
  });
  
  // --- 3. HAPUS HELPER LOKAL ---

  // Fetch data karyawan untuk dropdown "Assigned To"
  useEffect(() => {
    if (open) {
      // Reset form setiap kali dialog dibuka
      form.reset({
        purchase_date: new Date(),
        name: "",
        category: undefined,
        purchase_price: "0",
        quantity: 1,
        condition: "Baru",
        assigned_to: "none",
        notes: "",
      });

      const fetchEmployees = async () => {
        try {
          // Ambil data dari tabel 'employees' dan join 'profiles'
          const { data, error } = await supabase
            .from("employees")
            .select(`
              id, 
              profiles ( full_name )
            `);
            
          if (error) throw error;

          const mappedData = data
            .map((emp: any) => ({
              id: emp.id,
              full_name: emp.profiles?.full_name || 'Tanpa Nama', // Handle jika profil null
            }))
            .sort((a, b) => a.full_name.localeCompare(b.full_name)); // Urutkan nama
            
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
  }, [open, form, toast]); 

  const onSubmit = async (values: AssetFormValues) => {
    setLoading(true);
    try {
      // --- 4. GUNAKAN HELPER BARU (string -> number) ---
      const finalPrice = parseCurrencyInput(values.purchase_price);
      const totalPrice = finalPrice * values.quantity;
      const finalAssignedTo = values.assigned_to === "none" ? null : values.assigned_to;

      const { error } = await supabase
        .from("assets")
        .insert({
          purchase_date: format(values.purchase_date, "yyyy-MM-dd"),
          name: values.name,
          category: values.category,
          purchase_price: totalPrice, // Total Harga (Harga Satuan * Qty)
          current_value: totalPrice, // Nilai saat ini = harga beli
          condition: values.condition,
          assigned_to: finalAssignedTo,
          notes: values.notes,
        });

      if (error) throw error;

      toast({
        title: "Aset Berhasil Ditambahkan",
        description: `Aset "${values.name}" telah tersimpan.`,
      });
      onSuccess(); // Refresh list & tutup dialog
      
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan Aset",
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
          <DialogTitle>Tambah Aset Baru</DialogTitle>
          <DialogDescription>
            Masukkan data inventaris aset perusahaan sesuai blueprint.
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih kategori..." />
                        </SelectTrigger>
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <FormLabel>Harga Satuan (Rp)</FormLabel>
                    <FormControl>
                      {/* --- 5. GUNAKAN HELPER BARU --- */}
                      <Input type="text" placeholder="5.000.000"
                       value={formatCurrencyInput(field.value)}
                       onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jumlah (Qty)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 1)} />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <Select onValueChange={field.onChange} value={field.value ?? "none"}>
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
                Simpan Aset
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};