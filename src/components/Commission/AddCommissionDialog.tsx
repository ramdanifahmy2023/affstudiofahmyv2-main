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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Tipe data untuk dropdown Akun
interface Account {
  id: string;
  username: string;
}

// Skema validasi Zod
const commissionFormSchema = z.object({
  account_id: z.string().uuid({ message: "Akun wajib dipilih." }),
  period: z.enum(["M1", "M2", "M3", "M4", "M5"], {
    required_error: "Periode wajib dipilih.",
  }),
  period_start: z.date({ required_error: "Tanggal mulai periode wajib diisi." }),
  period_end: z.date({ required_error: "Tanggal akhir periode wajib diisi." }),
  gross_commission: z.preprocess(
    (a) => parseFloat(String(a).replace(/[^0-9]/g, "")),
    z.number().min(0, { message: "Komisi kotor wajib diisi." })
  ),
  net_commission: z.preprocess(
    (a) => parseFloat(String(a).replace(/[^0-9]/g, "")),
    z.number().min(0, { message: "Komisi bersih wajib diisi." })
  ),
  paid_commission: z.preprocess(
    (a) => parseFloat(String(a).replace(/[^0-9]/g, "")),
    z.number().min(0, { message: "Komisi cair wajib diisi." })
  ),
  payment_date: z.date().optional().nullable(),
});

type CommissionFormValues = z.infer<typeof commissionFormSchema>;

interface AddCommissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void; // Untuk refresh list
}

export const AddCommissionDialog = ({ open, onOpenChange, onSuccess }: AddCommissionDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const form = useForm<CommissionFormValues>({
    resolver: zodResolver(commissionFormSchema),
  });
  
  // Helper untuk format mata uang
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Fetch data akun untuk dropdown
  useEffect(() => {
    if (open) {
      const fetchAccounts = async () => {
        const { data, error } = await supabase
          .from("accounts")
          .select("id, username");
        if (error) {
          toast.error("Gagal memuat daftar akun.");
        } else {
          setAccounts(data || []);
        }
      };
      fetchAccounts();
    }
  }, [open]);

  const onSubmit = async (values: CommissionFormValues) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("commissions")
        .insert({
          account_id: values.account_id,
          period: values.period,
          period_start: format(values.period_start, "yyyy-MM-dd"),
          period_end: format(values.period_end, "yyyy-MM-dd"),
          gross_commission: values.gross_commission,
          net_commission: values.net_commission,
          paid_commission: values.paid_commission,
          payment_date: values.payment_date ? format(values.payment_date, "yyyy-MM-dd") : null,
        });

      if (error) throw error;

      toast.success("Data komisi berhasil ditambahkan.");
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
      <DialogContent className="sm:max-w-2xl max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Data Komisi</DialogTitle>
          <DialogDescription>
            Masukkan data komisi baru untuk salah satu akun.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username Akun</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih akun affiliate..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Periode</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih periode..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["M1", "M2", "M3", "M4", "M5"].map(p => (
                           <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="period_start"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Mulai Periode</FormLabel>
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
                name="period_end"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Akhir Periode</FormLabel>
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <FormField
                control={form.control}
                name="gross_commission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Komisi Kotor</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="1000000" {...field} 
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
                name="net_commission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Komisi Bersih</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="800000" {...field} 
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
                name="paid_commission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Komisi Cair</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="750000" {...field} 
                       onChange={(e) => field.onChange(formatCurrency(parseFloat(e.target.value.replace(/[^0-9]/g, "")) || 0))}
                       value={formatCurrency(field.value || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="payment_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Tanggal Cair (Opsional)</FormLabel>
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
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Komisi
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};