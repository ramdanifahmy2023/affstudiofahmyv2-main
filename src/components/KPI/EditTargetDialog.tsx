// src/components/KPI/EditTargetDialog.tsx

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
import { KpiData } from "@/pages/KPI"; 

// Tipe data Karyawan
interface Employee {
  id: string; // employee_id
  full_name: string;
}

// === HELPER UNTUK FORMAT/PARSE (Konsistensi) ===
const formatCurrencyInput = (value: string | number) => {
   const numberValue = Number(String(value).replace(/[^0-9]/g, ""));
   if (isNaN(numberValue) || numberValue === 0) return "0";
   return new Intl.NumberFormat("id-ID").format(numberValue);
};

const parseCurrencyInput = (value: string) => {
   return parseFloat(String(value).replace(/[^0-9]/g, "")) || 0;
};
// ===============================================

// Skema validasi Zod
const kpiFormSchema = z.object({
  employee_id: z.string().uuid({ message: "Karyawan wajib dipilih." }),
  target_month: z.date({ required_error: "Bulan target wajib diisi." }),
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

interface EditTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  kpiToEdit: KpiData | null; // Data KPI yang akan diedit
}

export const EditTargetDialog = ({ open, onOpenChange, onSuccess, kpiToEdit }: EditTargetDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const form = useForm<KpiFormValues>({
    resolver: zodResolver(kpiFormSchema),
  });

  // Fetch data karyawan (untuk menampilkan nama di dropdown)
  useEffect(() => {
    const fetchEmployees = async () => {
      // PERBAIKAN: Join ke profiles untuk mendapatkan full_name
      const { data } = await supabase
        .from("employees")
        .select("id, profiles ( full_name )");
      
      const mappedData = data?.map((emp: any) => ({
        id: emp.id,
        full_name: emp.profiles.full_name,
      })) || [];
      setEmployees(mappedData);
    };
    fetchEmployees();
  }, []);
  
  // Isi form saat data KPI tersedia
  useEffect(() => {
    if (kpiToEdit && open) {
      form.reset({
        employee_id: kpiToEdit.employee_id, 
        // Tambahkan "T00:00:00" untuk menghindari masalah timezone
        target_month: new Date(kpiToEdit.target_month + "T00:00:00"),
        // Konversi number ke string untuk input yang di-format
        sales_target: kpiToEdit.sales_target.toString(),
        commission_target: kpiToEdit.commission_target.toString(),
        attendance_target: kpiToEdit.attendance_target,
      });
    }
  }, [kpiToEdit, open, form]);

  const onSubmit = async (values: KpiFormValues) => {
    if (!kpiToEdit) return;
    setLoading(true);
    
    // Konversi string input mata uang ke number
    const finalSalesTarget = parseCurrencyInput(values.sales_target);
    const finalCommissionTarget = parseCurrencyInput(values.commission_target);

    try {
      // Kita hanya UPDATE target, bukan employee_id atau target_month
      const { error } = await supabase
        .from("kpi_targets")
        .update({
          sales_target: finalSalesTarget,
          commission_target: finalCommissionTarget,
          attendance_target: values.attendance_target,
        })
        .eq("id", kpiToEdit.id);

      if (error) throw error;

      toast.success("Target KPI berhasil diperbarui.");
      onSuccess(); 
    } catch (error: any) {
      console.error(error);
      toast.error(`Gagal menyimpan target: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployeeName = employees.find(e => e.id === form.watch("employee_id"))?.full_name || "Karyawan";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Target KPI</DialogTitle>
          <DialogDescription>
            Perbarui target bulanan untuk {selectedEmployeeName} di bulan {kpiToEdit ? format(new Date(kpiToEdit.target_month), "MMM yyyy") : '-'}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employee_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Karyawan</FormLabel>
                    {/* Field ini di-disable karena kita tidak bisa mengubah karyawan target */}
                    <Select value={field.value} disabled>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih staff..." />
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
              <FormField
                control={form.control}
                name="target_month"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Bulan Target</FormLabel>
                    <Input 
                      disabled 
                      value={field.value ? format(field.value, "MMM yyyy") : ''} 
                    />
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
                      <Input type="number" min="1" max="31" {...field} 
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
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};