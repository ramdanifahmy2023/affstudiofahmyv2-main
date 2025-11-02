import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription, // <-- PERBAIKAN: DialogDescription ditambahkan
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

// Tipe data untuk dropdown Karyawan
interface Employee {
  id: string; // employee_id
  full_name: string;
}

// Skema validasi Zod berdasarkan blueprint 
// Skema DB tidak punya Qty, tapi blueprint punya. Saya akan ikuti blueprint
// dan kita kalikan Qty * Harga saat insert.
const assetFormSchema = z.object({
  purchase_date: z.date({ required_error: "Tanggal pembelian wajib diisi." }),
  name: z.string().min(3, { message: "Nama aset wajib diisi." }),
  category: z.enum(["Elektronik", "Furniture", "Kendaraan", "Lainnya"], {
    required_error: "Kategori wajib dipilih.",
  }),
  purchase_price: z.preprocess( // Harga Satuan
    (a) => parseFloat(String(a).replace(/[^0-9]/g, "")),
    z.number().min(1, { message: "Harga beli wajib diisi." })
  ),
  quantity: z.preprocess(
    (a) => parseInt(String(a).replace(/[^0-9]/g, "")),
    z.number().min(1, { message: "Jumlah (Qty) wajib diisi." })
  ),
  condition: z.enum(["Baru", "Bekas"], { required_error: "Kondisi wajib dipilih." }),
  assigned_to: z.string().uuid().optional().nullable(), // employee_id
  notes: z.string().optional(),
  // Foto (file upload) akan ditangani terpisah
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

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      purchase_date: new Date(),
      name: "",
      category: undefined,
      purchase_price: 0,
      quantity: 1,
      condition: "Baru",
      assigned_to: null,
      notes: "",
    },
  });
  
  // Helper format mata uang
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Fetch data karyawan untuk dropdown "Assigned To"
  useEffect(() => {
    if (open) {
      const fetchEmployees = async () => {
        const { data, error } = await supabase
          .from("employees")
          .select("id, profiles ( full_name )");
        if (error) {
          toast.error("Gagal memuat daftar karyawan.");
        } else {
          const mappedData = data.map((emp: any) => ({
            id: emp.id,
            full_name: emp.profiles.full_name,
          }));
          setEmployees(mappedData || []);
        }
      };
      fetchEmployees();
      form.reset({ // Reset form saat dibuka
        purchase_date: new Date(),
        name: "",
        category: undefined,
        purchase_price: 0,
        quantity: 1,
        condition: "Baru",
        assigned_to: null,
        notes: "",
      });
    }
  }, [open, form]);

  const onSubmit = async (values: AssetFormValues) => {
    setLoading(true);
    try {
      // Skema DB tidak punya 'quantity', tapi punya 'purchase_price'
      [cite_start]// Blueprint [cite: 122, 123] punya 'Qty' dan 'Harga Satuan'
      // Kita asumsikan 'purchase_price' di DB adalah TOTAL HARGA
      const totalPrice = values.purchase_price * values.quantity;

      const { error } = await supabase
        .from("assets")
        .insert({
          purchase_date: format(values.purchase_date, "yyyy-MM-dd"),
          name: values.name,
          category: values.category,
          purchase_price: totalPrice, // Total Harga (Harga Satuan * Qty)
          current_value: totalPrice, // Nilai saat ini = harga beli
          condition: values.condition,
          assigned_to: values.assigned_to,
          notes: values.notes,
          // 'location' dan 'foto' belum ada di form
        });

      if (error) throw error;

      toast.success(`Aset "${values.name}" berhasil ditambahkan.`);
      onSuccess(); // Refresh list & tutup dialog
    } catch (error: any) {
      console.error(error);
      toast.error(`Terjadi kesalahan: ${error.message}`);
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
            Masukkan data inventaris aset perusahaan.
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
                  <FormItem className="flex flex-col">
                    <FormLabel>Tanggal Pembelian</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
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
                    <FormLabel>Harga Satuan (IDR)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="5000000"
                       onChange={(e) => field.onChange(formatCurrency(parseFloat(e.target.value.replace(/[^0-9]/g, "")) || 0))}
                       value={formatCurrency(field.value || 0)}
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
                      <Input type="number" min="1" {...field} />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih karyawan..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                      <Textarea placeholder="Cth: Pembelian di Toko XYZ, Garansi 1 thn" {...field} />
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
                Simpan Aset
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};