// src/components/Commission/EditCommissionDialog.tsx

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, getYear, getMonth, startOfMonth, endOfMonth } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";

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
import { CommissionData } from "@/pages/Commissions";
// --- 1. IMPORT HELPER BARU ---
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/utils";

// Skema Zod
const periods = ["M1", "M2", "M3", "M4", "M5"] as const;

// --- 2. HAPUS HELPER LOKAL ---

// Skema validasi Zod
const commissionFormSchema = z.object({
  account_id: z.string().uuid({ message: "Akun wajib dipilih." }),
  year: z.string().length(4),
  month: z.string(),
  period: z.enum(periods),
  // --- 3. UBAH ZOD KE STRING & TAMBAH VALIDASI ANGKA ---
  gross_commission: z.string()
    .min(1, { message: "Wajib diisi." })
    .refine((val) => parseCurrencyInput(val) >= 0, { message: "Harus berupa angka." }),
  net_commission: z.string()
    .min(1, { message: "Wajib diisi." })
    .refine((val) => parseCurrencyInput(val) >= 0, { message: "Harus berupa angka." }),
  paid_commission: z.string()
    .min(1, { message: "Wajib diisi." })
    .refine((val) => parseCurrencyInput(val) >= 0, { message: "Harus berupa angka." }),
  payment_date: z.date().optional().nullable(),
});

type CommissionFormValues = z.infer<typeof commissionFormSchema>;

type Account = { id: string; username: string };

interface EditCommissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  commission: CommissionData | null;
}

export const EditCommissionDialog = ({ open, onOpenChange, onSuccess, commission }: EditCommissionDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [periodDates, setPeriodDates] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });

  const form = useForm<CommissionFormValues>({
    resolver: zodResolver(commissionFormSchema),
  });

  // Ambil data Akun
  useEffect(() => {
    supabase
      .from("accounts")
      .select("id, username")
      .order("username")
      .then(({ data }) => {
        if (data) setAccounts(data);
      });
  }, []);

  // Logika kalkulasi tanggal (sama dengan AddDialog)
  const calculatePeriodDates = (yearStr: string, monthStr: string, period: string) => {
    const year = parseInt(yearStr);
    const month = parseInt(monthStr); // 0-11
    if (isNaN(year) || isNaN(month)) return { start: null, end: null };

    const startDate = startOfMonth(new Date(year, month));
    const endDate = endOfMonth(startDate);
    let periodStart: Date, periodEnd: Date;

    const getDayOfWeek = (date: Date) => (date.getDay() + 6) % 7; 

    if (period === "M1") {
      periodStart = startDate;
      let firstSunday = new Date(year, month, 1);
      while (getDayOfWeek(firstSunday) !== 6) {
        firstSunday.setDate(firstSunday.getDate() + 1);
      }
      periodEnd = firstSunday;
    } else {
      let m1End = new Date(year, month, 1);
      while (getDayOfWeek(m1End) !== 6) {
        m1End.setDate(m1End.getDate() + 1);
      }
      
      const daysAfterM1 = m1End.getDate();

      if (period === "M2") {
        periodStart = new Date(year, month, daysAfterM1 + 1);
        periodEnd = new Date(year, month, daysAfterM1 + 7);
      } else if (period === "M3") {
         periodStart = new Date(year, month, daysAfterM1 + 8);
         periodEnd = new Date(year, month, daysAfterM1 + 14);
      } else if (period === "M4") {
         periodStart = new Date(year, month, daysAfterM1 + 15);
         periodEnd = new Date(year, month, daysAfterM1 + 21);
      } else { // M5
         periodStart = new Date(year, month, daysAfterM1 + 22);
         periodEnd = endDate;
      }
    }
    
    if (periodEnd.getTime() > endDate.getTime()) {
      periodEnd = endDate;
    }
    
    return { start: periodStart, end: periodEnd };
  };
  
  const watchFields = form.watch(["year", "month", "period"]);
  useEffect(() => {
    const [year, month, period] = watchFields;
    if (year && month && period) {
      const dates = calculatePeriodDates(year, month, period);
      setPeriodDates(dates);
    }
  }, [watchFields, form]);

  // Isi form saat dialog dibuka
  useEffect(() => {
    if (commission && open) {
      // Tambahkan "T00:00:00" untuk menghindari masalah timezone
      const startDate = new Date(commission.period_start + "T00:00:00");
      
      form.reset({
        account_id: commission.accounts.id,
        year: getYear(startDate).toString(),
        month: getMonth(startDate).toString(),
        period: commission.period as any,
        // Konversi number ke string untuk input yang di-format
        gross_commission: commission.gross_commission.toString(),
        net_commission: commission.net_commission.toString(),
        paid_commission: commission.paid_commission.toString(),
        payment_date: commission.payment_date
          ? new Date(commission.payment_date + "T00:00:00")
          : null,
      });
    }
  }, [commission, open, form]);

  const onSubmit = async (values: CommissionFormValues) => {
    if (!periodDates.start || !periodDates.end || !commission) return;
    
    setLoading(true);
    
    // --- 4. GUNAKAN HELPER BARU (string -> number) ---
    const finalGrossCommission = parseCurrencyInput(values.gross_commission);
    const finalNetCommission = parseCurrencyInput(values.net_commission);
    const finalPaidCommission = parseCurrencyInput(values.paid_commission);

    try {
      const { error } = await supabase
        .from("commissions")
        .update({
          account_id: values.account_id,
          period: values.period,
          period_start: format(periodDates.start, "yyyy-MM-dd"),
          period_end: format(periodDates.end, "yyyy-MM-dd"),
          gross_commission: finalGrossCommission, // Kirim number
          net_commission: finalNetCommission, // Kirim number
          paid_commission: finalPaidCommission, // Kirim number
          payment_date: values.payment_date ? format(values.payment_date, "yyyy-MM-dd") : null,
        })
        .eq("id", commission.id);

      if (error) throw error;

      toast.success(`Data komisi berhasil diperbarui.`);
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Data Komisi</DialogTitle>
          <DialogDescription>
            Perbarui detail komisi untuk akun: {commission?.accounts.username}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Field Akun */}
            <FormField
              control={form.control}
              name="account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Akun</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Akun" />
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
            
            {/* Field Tanggal (Tahun, Bulan, Periode) */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tahun</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bulan</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {format(new Date(2000, i), "MMMM", { locale: indonesiaLocale })}
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
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Periode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                       <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                      <SelectContent>
                        {periods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {periodDates.start && periodDates.end && (
              <div className="text-sm text-muted-foreground">
                Rentang Tanggal: <strong>{format(periodDates.start, "dd MMM yyyy")}</strong> - <strong>{format(periodDates.end, "dd MMM yyyy")}</strong>
              </div>
            )}
            
            {/* --- 5. GUNAKAN HELPER BARU DI INPUT --- */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="gross_commission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Komisi Kotor</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="0"
                        value={formatCurrencyInput(field.value)}
                        onChange={e => field.onChange(e.target.value)}
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
                      <Input 
                        placeholder="0"
                        value={formatCurrencyInput(field.value)}
                        onChange={e => field.onChange(e.target.value)}
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
                      <Input 
                        placeholder="0"
                        value={formatCurrencyInput(field.value)}
                        onChange={e => field.onChange(e.target.value)}
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
                    <PopoverContent className="w-auto p-0">
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