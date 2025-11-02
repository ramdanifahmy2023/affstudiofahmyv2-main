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

// Skema validasi Zod
const debtReceivableFormSchema = z.object({
  type: z.enum(["debt", "receivable"]),
  transaction_date: z.date({ required_error: "Tanggal wajib diisi." }),
  counterparty: z.string().min(3, { message: "Nama pihak wajib diisi." }),
  amount: z.preprocess(
    (a) => parseFloat(String(a).replace(/[^0-9]/g, "")),
    z.number().min(1, { message: "Nominal wajib diisi." })
  ),
  due_date: z.date({ required_error: "Jatuh tempo wajib diisi." }).nullable(),
  status: z.enum(["Belum Lunas", "Cicilan", "Lunas"], {
    required_error: "Status wajib dipilih.",
  }),
  description: z.string().optional(),
});

type DebtReceivableFormValues = z.infer<typeof debtReceivableFormSchema>;

interface AddDebtReceivableDialogProps {
  open: boolean;
  type: "debt" | "receivable"; // Untuk menentukan tab default
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

  const form = useForm<DebtReceivableFormValues>({
    resolver: zodResolver(debtReceivableFormSchema),
    defaultValues: {
      type: type,
      transaction_date: new Date(),
      counterparty: "",
      amount: 0,
      due_date: null,
      status: "Belum Lunas",
      description: "",
    },
  });

  // Sinkronkan tipe saat dialog dibuka/diganti
  useEffect(() => {
      form.reset({
          ...form.getValues(),
          type: type,
          // Reset status jika perlu, tapi kita biarkan default dulu
      }, { keepDefaultValues: true });
  }, [type, form]);
  
  // Helper untuk format mata uang
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
    }).format(value);
  };

  const onSubmit = async (values: DebtReceivableFormValues) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("debt_receivable")
        .insert({
          ...values,
          type: values.type,
          transaction_date: format(values.transaction_date, "yyyy-MM-dd"),
          amount: values.amount,
          counterparty: values.counterparty,
          due_date: values.due_date ? format(values.due_date, "yyyy-MM-dd") : null,
          status: values.status,
          description: values.description,
        });

      if (error) throw error;

      toast.success(`${values.type === 'debt' ? 'Hutang' : 'Piutang'} berhasil dicatat.`);
      form.reset();
      onSuccess(); // Refresh list & tutup dialog
    } catch (error: any) {
      console.error(error);
      toast.error(`Gagal mencatat transaksi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const dialogTitle = type === "debt" ? "Catat Hutang Baru" : "Catat Piutang Baru";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Masukkan detail {type === "debt" ? "hutang" : "piutang"} dengan pihak terkait.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Tipe Transaksi - Hidden Field */}
            <input type="hidden" {...form.register("type")} />

            <div className="grid grid-cols-2 gap-4">
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
                    <FormLabel>Jatuh Tempo</FormLabel>
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
                  <FormLabel>Nama Pihak {type === "debt" ? "Pemberi Hutang" : "Pengutang"}</FormLabel>
                  <FormControl>
                    <Input placeholder="Cth: Bank BCA / Budi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nominal (IDR)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="1000000"
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keterangan (Opsional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detail perjanjian, bunga, atau catatan lainnya..." {...field} />
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
                Simpan {type === 'debt' ? 'Hutang' : 'Piutang'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};