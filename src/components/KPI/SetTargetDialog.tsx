// src/components/KPI/SetTargetDialog.tsx

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth } from "date-fns";

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

// Tipe data Role yang valid (sesuai Enum user_role di DB)
const VALID_TARGET_ROLES = ["staff", "leader", "admin", "viewer", "superadmin"] as const;

// === HELPER UNTUK FORMAT/PARSE (Konsistensi dengan form lain) ===
const formatCurrencyInput = (value: string | number) => {
   const numberValue = Number(String(value).replace(/[^0-9]/g, ""));
   if (isNaN(numberValue) || numberValue === 0) return "0";
   return new Intl.NumberFormat("id-ID").format(numberValue);
};

const parseCurrencyInput = (value: string) => {
   return parseFloat(String(value).replace(/[^0-9]/g, "")) || 0;
};
// ===============================================================

// Skema validasi Zod (Menggunakan string input dan parse di onSubmit)
const kpiFormSchema = z.object({
  target_role: z.enum(VALID_TARGET_ROLES, { message: "Role target wajib dipilih." }),
  target_month: z.date({ required_error: "Bulan target wajib diisi." }),
  // Gunakan string untuk input yang di-format mata uang
  sales_target: z.string()
    .min(1, { message: "Target Omset wajib diisi." })
    .refine((val) => parseCurrencyInput(val) >= 0, { message: "Nilai harus non-negatif." }),
  commission_target: z.string()
    .min(1, { message: "Target Komisi wajib diisi." })
    .refine((val) => parseCurrencyInput(val) >= 0, { message: "Nilai harus non-negatif." }),
  attendance_target: z.preprocess(
    (a) => parseInt(String(a).replace(/[^0-9]/g, ""), 10),
    z.number().min(1).max(31, { message: "Target hadir (1-31 hari)." })
  ),
});

type KpiFormValues = z.infer<typeof kpiFormSchema>;

interface SetTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void; // Untuk refresh list
}

export const SetTargetDialog = ({ open, onOpenChange, onSuccess }: SetTargetDialogProps) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<KpiFormValues>({
    resolver: zodResolver(kpiFormSchema),
    defaultValues: {
      target_role: "staff", 
      target_month: startOfMonth(new Date()),
      sales_target: "0", // Menggunakan string
      commission_target: "0", // Menggunakan string
      attendance_target: 22,
    },
  });
  
  // Reset form saat dibuka
  useEffect(() => {
    if (open) {
      form.reset({
        target_role: "staff",
        target_month: startOfMonth(new Date()),
        sales_target: "0",
        commission_target: "0",
        attendance_target: 22,
      });
    }
  }, [open, form]);

  const onSubmit = async (values: KpiFormValues) => {
    setLoading(true);
    toast.info(`Mencari karyawan dengan role '${values.target_role}'...`);
    
    // Parse values from string to number saat submit
    const finalSalesTarget = parseCurrencyInput(values.sales_target);
    const finalCommissionTarget = parseCurrencyInput(values.commission_target);

    try {
      // 1. Ambil SEMUA Employee ID yang memiliki role yang ditargetkan
      const { data: employeeData, error: employeeError } = await supabase
          .from("employees")
          // Join untuk mendapatkan role dari profiles
          .select("id, profiles!employees_profile_id_fkey(role)") 
          .eq("profiles.role", values.target_role);

      if (employeeError) throw employeeError;
      
      // Filter data agar hanya mengambil yang memiliki roles
      const employeeIds = employeeData.map((e: any) => e.id);

      if (employeeIds.length === 0) {
        toast.warning(`Tidak ada karyawan dengan role '${values.target_role}' ditemukan.`);
        setLoading(false);
        return;
      }
      
      // 2. Siapkan payload untuk BATCH UPSERT
      const targetMonthFormatted = format(values.target_month, "yyyy-MM-01");

      const kpiPayload = employeeIds.map(empId => ({
        employee_id: empId,
        target_month: targetMonthFormatted,
        sales_target: finalSalesTarget,
        commission_target: finalCommissionTarget,
        attendance_target: values.attendance_target,
      }));

      // 3. Lakukan Batch Upsert (Insert/Update)
      const { error: upsertError } = await supabase
        .from("kpi_targets")
        .upsert(kpiPayload, {
          onConflict: 'employee_id, target_month'
        });

      if (upsertError) throw upsertError;

      toast.success(`${employeeIds.length} Target KPI berhasil disimpan untuk role ${values.target_role}.`);
      onSuccess(); 
    } catch (error: any) {
      console.error(error);
      toast.error(`Gagal menyimpan target: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Set Target KPI Berdasarkan Role</DialogTitle>
          <DialogDescription>
            Tetapkan target bulanan yang sama untuk semua karyawan dengan role yang dipilih.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="target_role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Role Target..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {VALID_TARGET_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
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
                name="target_month"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Bulan Target</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "MMM yyyy") : <span>Pilih bulan</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          captionLayout="dropdown-buttons"
                          fromYear={2020} 
                          toYear={new Date().getFullYear() + 1}
                        />
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
                name="sales_target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Omset (50%)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="50.000.000"
                       onChange={(e) => field.onChange(e.target.value)}
                       value={formatCurrencyInput(field.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="commission_target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Komisi (30%)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="5.000.000"
                       onChange={(e) => field.onChange(e.target.value)}
                       value={formatCurrencyInput(field.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="attendance_target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Hadir (20%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        max="31" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                        value={field.value === undefined ? '' : field.value}
                      />
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
                {loading ? "Menyimpan Target..." : "Simpan Target"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};