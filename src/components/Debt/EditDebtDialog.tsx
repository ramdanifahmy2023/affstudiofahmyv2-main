// src/components/Debt/EditDebtDialog.tsx

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
import { DebtData } from "@/pages/DebtReceivable"; // Import tipe data
// --- 1. IMPORT HELPER BARU ---
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/utils";

// Tipe data untuk dropdown Group
interface Group {
  id: string;
  name: string;
}

// --- 2. HAPUS HELPER LOKAL ---


// Skema validasi Zod (diperbarui untuk menggunakan string input)
const debtFormSchema = z.object({
  type: z.enum(["debt", "receivable"]),
  transaction_date: z.date({ required_error: "Tanggal wajib diisi." }),
  counterparty: z.string().min(3, { message: "Nama pihak wajib diisi." }),
  amount: z.string() 
    .min(1, { message: "Nominal wajib diisi." })
    .refine((val) => parseCurrencyInput(val) > 0, { message: "Nominal harus lebih dari 0." }),
  due_date: z.date().optional().nullable(),
  status: z.enum(["Belum Lunas", "Cicilan", "Lunas"], {
    required_error: "Status wajib dipilih.",
  }),
  description: z.string().optional().nullable(),
  group_id: z.string().optional().nullable(),
});

type DebtFormValues = z.infer<typeof debtFormSchema>;

interface EditDebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  debt: DebtData | null;
}

export const EditDebtDialog = ({ open, onOpenChange, onSuccess, debt }: EditDebtDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  
  const form = useForm<DebtFormValues>({
    resolver: zodResolver(debtFormSchema),
    defaultValues: { amount: "0", status: "Belum Lunas", description: null, group_id: "none" },
  });

  // Fetch data group & isi form
  useEffect(() => {
    if (open && debt) {
      // Fetch Groups
      supabase.from("groups").select("id, name").then(({ data }) => {
        if (data) setGroups(data || []);
      });
      
      // Isi Form
      const groupId = debt.group_id || "none";
      
      form.reset({
        type: debt.type,
        transaction_date: new Date(debt.created_at.includes('T') ? debt.created_at : `${debt.created_at}T00:00:00`),
        counterparty: debt.counterparty,
        amount: debt.amount.toString(), // Ubah number ke string
        due_date: debt.due_date ? new Date(debt.due_date + "T00:00:00") : null,
        status: debt.status as any,
        description: debt.description,
        group_id: groupId,
      });
    }
  }, [open, debt, form]);

  const onSubmit = async (values: DebtFormValues) => {
    if (!debt) return;
    setLoading(true);
    try {
      // --- 3. GUNAKAN HELPER BARU (string -> number) ---
      const finalGroupId = values.group_id === "none" ? null : values.group_id;
      const finalAmount = parseCurrencyInput(values.amount);
      if (isNaN(finalAmount) || finalAmount <= 0) {
        throw new Error("Nominal tidak valid atau kosong.");
      }

      const { error } = await supabase
        .from("debt_receivable")
        .update({
          type: values.type,
          created_at: format(values.transaction_date, "yyyy-MM-dd"),
          counterparty: values.counterparty,
          amount: finalAmount,
          due_date: values.due_date ? format(values.due_date, "yyyy-MM-dd") : null,
          status: values.status,
          description: values.description,
          group_id: finalGroupId,
        })
        .eq("id", debt.id);

      if (error) throw error;

      toast.success(`Data ${values.type === 'debt' ? 'Hutang' : 'Piutang'} berhasil diperbarui.`);
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(`Terjadi kesalahan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const dialogTitle = debt?.type === "debt" ? "Edit Hutang" : "Edit Piutang";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Perbarui detail transaksi dengan pihak {debt?.counterparty}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Type & Counterparty */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe Transaksi</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="debt">Hutang (Kewajiban)</SelectItem>
                        <SelectItem value="receivable">Piutang (Tagihan)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="counterparty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Pihak</FormLabel>
                    <FormControl>
                      <Input placeholder="Cth: Bank BCA / Budi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Tanggal & Nominal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <FormField
                control={form.control}
                name="transaction_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Tanggal Catat</FormLabel>
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
                        <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nominal (IDR)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="1000000"
                       value={formatCurrencyInput(field.value)}
                       // --- PERBAIKAN: Gunakan string mentah di onChange ---
                       onChange={e => field.onChange(e.target.value)}
                       // ----------------------------------------------------
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status & Group */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih status..." />
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
            
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keterangan (Opsional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detail perjanjian..." {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Batal
              </Button>
              <Button type="submit" disabled={loading} className={debt?.type === 'debt' ? 'bg-destructive hover:bg-destructive/90' : ''}>
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