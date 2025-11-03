// src/components/DebtReceivable/AddDebtReceivableDialog.tsx

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
// --- 1. IMPORT HELPER BARU ---
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/utils";


// Tipe data untuk dropdown Group
interface Group {
  id: string;
  name: string;
}

// --- 2. HAPUS HELPER LOKAL ---


// Skema validasi Zod (diperbarui untuk menggunakan string input)
const debtReceivableFormSchema = z.object({
  type: z.enum(["debt", "receivable"], {
    required_error: "Tipe wajib dipilih.",
  }),
  transaction_date: z.date({ required_error: "Tanggal wajib diisi." }),
  counterparty: z.string().min(3, { message: "Nama pihak wajib diisi." }),
  amount: z.string() 
    .min(1, { message: "Nominal wajib diisi." })
    .refine((val) => parseCurrencyInput(val) > 0, { message: "Nominal harus lebih dari 0." }),
  due_date: z.date().optional().nullable(),
  status: z.enum(["Belum Lunas", "Cicilan", "Lunas"], {
    required_error: "Status wajib dipilih.",
  }),
  description: z.string().optional(),
  group_id: z.string().optional().nullable(),
});

type DebtReceivableFormValues = z.infer<typeof debtReceivableFormSchema>;

interface AddDebtReceivableDialogProps {
  open: boolean;
  type: "debt" | "receivable"; // Untuk menentukan type
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void; // Untuk refresh list
}

export const AddDebtReceivableDialog = ({ 
    open, 
    type, 
    onOpenChange, 
    onSuccess 
}: AddDebtReceivableDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);

  // Default values diset di sini
  const form = useForm<DebtReceivableFormValues>({
    resolver: zodResolver(debtReceivableFormSchema),
    defaultValues: {
      type: type,
      transaction_date: new Date(),
      counterparty: "",
      amount: "0",
      due_date: null,
      status: "Belum Lunas",
      description: "",
      group_id: "none",
    },
  });

  // Sinkronkan tipe saat dialog dibuka/diganti & fetch groups
  useEffect(() => {
    if (open) {
      // Reset form
      form.reset({
        type: type, // Gunakan prop type yang masuk
        transaction_date: new Date(),
        counterparty: "",
        amount: "0",
        due_date: null,
        status: "Belum Lunas",
        description: "",
        group_id: "none",
      });
      
      // Fetch Groups
      const fetchGroups = async () => {
        const { data, error } = await supabase.from("groups").select("id, name");
        if (error) {
          toast.error("Gagal memuat data grup.");
        } else {
          setGroups(data || []);
        }
      };
      fetchGroups();
    }
  }, [open, type, form]); // Trigger saat open atau type berubah

  const onSubmit = async (values: DebtReceivableFormValues) => {
    setLoading(true);
    try {
      // --- 3. GUNAKAN HELPER BARU (string -> number) ---
      const finalAmount = parseCurrencyInput(values.amount);
      if (finalAmount <= 0) {
        throw new Error("Nominal tidak valid atau kosong.");
      }
      
      const finalGroupId = values.group_id === "none" ? null : values.group_id;

      const { error } = await supabase
        .from("debt_receivable")
        .insert({
          type: values.type,
          created_at: format(values.transaction_date, "yyyy-MM-dd"), // Gunakan created_at untuk tanggal
          counterparty: values.counterparty,
          amount: finalAmount, // Kirim sebagai number
          due_date: values.due_date ? format(values.due_date, "yyyy-MM-dd") : null,
          status: values.status,
          description: values.description,
          group_id: finalGroupId,
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

  const dialogTitle = type === "debt" ? "Catat Hutang Baru" : "Catat Piutang Baru";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Catat transaksi hutang (kewajiban) atau piutang (tagihan) baru.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Tipe Transaksi (Di-disable karena ditentukan oleh prop) */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Tipe Transaksi</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value} disabled={true}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debt">Hutang (Kita berhutang)</SelectItem>
                        <SelectItem value="receivable">Piutang (Kita menagih)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        value={formatCurrencyInput(field.value)}
                        // --- PERBAIKAN: Gunakan string mentah di onChange ---
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
                  name="group_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Terkait Grup (Opsional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? "none"}>
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
            </div>

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
              <Button type="submit" disabled={loading} className={type === 'debt' ? 'bg-destructive hover:bg-destructive/90' : ''}>
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