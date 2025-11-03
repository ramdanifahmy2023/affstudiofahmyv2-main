// src/components/Debt/AddDebtDialog.tsx

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
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

// Tipe data untuk dropdown Group
interface Group {
  id: string;
  name: string;
}

// === HELPER UNTUK FORMAT/PARSE (Pola yang sama dengan Cashflow/Commission) ===
const formatCurrencyInput = (value: string | number) => {
   if (typeof value === 'number') value = value.toString();
   if (!value) return "";
   const num = value.replace(/[^0-9]/g, "");
   if (num === "0") return "0";
   return num ? new Intl.NumberFormat("id-ID").format(parseInt(num)) : "";
};

const parseCurrencyInput = (value: string) => {
   return parseFloat(value.replace(/[^0-9]/g, "")) || 0;
};
// ============================================================================


// Skema validasi Zod berdasarkan blueprint
const debtFormSchema = z.object({
  type: z.enum(["debt", "receivable"], {
    required_error: "Tipe wajib dipilih.",
  }),
  transaction_date: z.date({ required_error: "Tanggal wajib diisi." }),
  counterparty: z.string().min(3, { message: "Nama pihak wajib diisi." }),
  // === PERBAIKAN DI SINI: Menyimpan sebagai string mentah, validasi di onSubmit ===
  amount: z.string() 
    .min(1, { message: "Nominal wajib diisi." })
    .refine((val) => parseCurrencyInput(val) > 0, { message: "Nominal harus lebih dari 0." }),
  // ==============================================================================
  due_date: z.date().optional().nullable(),
  status: z.enum(["Belum Lunas", "Cicilan", "Lunas"], {
    required_error: "Status wajib dipilih.",
  }),
  description: z.string().optional(),
  group_id: z.string().uuid().optional().nullable(),
});

type DebtFormValues = z.infer<typeof debtFormSchema>;

interface AddDebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void; // Untuk refresh list
}

export const AddDebtDialog = ({ open, onOpenChange, onSuccess }: AddDebtDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);

  const form = useForm<DebtFormValues>({
    resolver: zodResolver(debtFormSchema),
    defaultValues: {
      type: undefined,
      transaction_date: new Date(),
      counterparty: "",
      amount: "0", // Menggunakan string kosong sebagai default
      due_date: null,
      status: "Belum Lunas",
      description: "",
      group_id: null,
    },
  });
  
  // Fetch data group untuk dropdown
  useEffect(() => {
    if (open) {
      const fetchGroups = async () => {
        const { data, error } = await supabase.from("groups").select("id, name");
        if (error) {
          toast.error("Gagal memuat data grup.");
        } else {
          setGroups(data || []);
        }
      };
      fetchGroups();
      form.reset({
        type: undefined,
        transaction_date: new Date(),
        counterparty: "",
        amount: "0",
        due_date: null,
        status: "Belum Lunas",
        description: "",
        group_id: null,
      });
    }
  }, [open, form]);

  const onSubmit = async (values: DebtFormValues) => {
    setLoading(true);
    try {
      // Parse amount string menjadi number di sini
      const finalAmount = parseCurrencyInput(values.amount);
      if (isNaN(finalAmount) || finalAmount <= 0) {
        throw new Error("Nominal tidak valid atau kosong.");
      }

      const { error } = await supabase
        .from("debt_receivable")
        .insert({
          type: values.type,
          created_at: format(values.transaction_date, "yyyy-MM-dd"),
          counterparty: values.counterparty,
          amount: finalAmount, // Kirim sebagai number
          due_date: values.due_date ? format(values.due_date, "yyyy-MM-dd") : null,
          status: values.status,
          description: values.description,
          group_id: values.group_id,
        });

      if (error) throw error;

      toast.success(`Data ${values.type === 'debt' ? 'Hutang' : 'Piutang'} berhasil dicatat.`);
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
          <DialogTitle>Tambah Data Hutang/Piutang</DialogTitle>
          <DialogDescription>
            Catat transaksi hutang (kewajiban) atau piutang (tagihan) baru.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe Transaksi</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tipe..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="debt">Hutang (Kita berhutang)</SelectItem>
                        <SelectItem value="receivable">Piutang (Kita menagih)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="transaction_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Tanggal Transaksi</FormLabel>
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
            </div>
            
            <FormField
              control={form.control}
              name="counterparty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Pihak</FormLabel>
                  <FormControl>
                    <Input placeholder="Cth: Supplier XYZ atau Nama Karyawan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nominal (IDR)</FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        placeholder="1.000.000"
                        // --- PERBAIKAN: Gunakan string mentah di onChange ---
                        value={formatCurrencyInput(field.value)}
                        onChange={e => field.onChange(e.target.value)}
                        // -------------------------
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih status pembayaran..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Belum Lunas">Belum Lunas</SelectItem>
                        <SelectItem value="Cicilan">Cicilan</SelectItem>
                        <SelectItem value="Lunas">Lunas</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Jatuh Tempo (Opsional)</FormLabel>
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
                        <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="group_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terkait Grup (Opsional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih grup terkait..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                       <SelectItem value="none">-- Tidak ada group --</SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
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
                    <FormLabel>Keterangan (Opsional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Catatan tambahan..." {...field} value={field.value ?? ""} />
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
                Simpan Catatan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};