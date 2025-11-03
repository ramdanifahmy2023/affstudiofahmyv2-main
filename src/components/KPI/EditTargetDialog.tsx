// src/components/KPI/EditTargetDialog.tsx

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
import { KpiData } from "@/pages/KPI"; // Import tipe data KpiData

// Tipe data Karyawan
interface Employee {
  id: string; // employee_id
  full_name: string;
}

// Skema validasi Zod
const kpiFormSchema = z.object({
  employee_id: z.string().uuid({ message: "Karyawan wajib dipilih." }),
  target_month: z.date({ required_error: "Bulan target wajib diisi." }),
  sales_target: z.preprocess(
    (a) => parseFloat(String(a).replace(/[^0-9]/g, "")),
    z.number().min(0, { message: "Target Omset wajib diisi." })
  ),
  commission_target: z.preprocess(
    (a) => parseFloat(String(a).replace(/[^0-9]/g, "")),
    z.number().min(0, { message: "Target Komisi wajib diisi." })
  ),
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

  // Helper format mata uang
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
    }).format(value);
  };
  
  // Helper untuk membersihkan nilai yang akan dimasukkan ke form (diperlukan karena formatCurrency)
  const parseNumber = (value: string | number | null): number => {
    if (value === null) return 0;
    return parseFloat(String(value).replace(/[^0-9]/g, "")) || 0;
  };

  const form = useForm<KpiFormValues>({
    resolver: zodResolver(kpiFormSchema),
    defaultValues: {
      target_month: new Date(),
      sales_target: 0,
      commission_target: 0,
      attendance_target: 22,
      employee_id: undefined
    },
  });

  // Fetch data karyawan (hanya untuk menampilkan nama di dropdown)
  useEffect(() => {
    const fetchEmployees = async () => {
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
        // Kita tidak bisa langsung mendapatkan employee_id dari kpiToEdit
        // Kita butuh kpiToEdit yang sudah join dengan employees.id
        // Asumsi kpiToEdit di KPI.tsx sudah membawa employee_id (lihat tipe KpiData)
        employee_id: (kpiToEdit as any).employee_id, 
        target_month: new Date(kpiToEdit.target_month),
        sales_target: parseNumber(kpiToEdit.sales_target),
        commission_target: parseNumber(kpiToEdit.commission_target),
        attendance_target: parseNumber(kpiToEdit.attendance_target),
      });
      // Disable field karyawan dan bulan saat edit, karena itu adalah UNIQUE KEY
      form.setValue("employee_id", (kpiToEdit as any).employee_id);
      form.setValue("target_month", new Date(kpiToEdit.target_month));
    }
  }, [kpiToEdit, open, form]);

  const onSubmit = async (values: KpiFormValues) => {
    if (!kpiToEdit) return;
    setLoading(true);
    try {
      // Karena kita menggunakan UPSERT di SetTargetDialog, kita bisa menggunakan UPDATE di sini.
      const { error } = await supabase
        .from("kpi_targets")
        .update({
          sales_target: values.sales_target,
          commission_target: values.commission_target,
          attendance_target: values.attendance_target,
        })
        .eq("id", kpiToEdit.id);

      if (error) throw error;

      toast.success("Target KPI berhasil diperbarui.");
      onSuccess(); // Refresh list & tutup dialog
    } catch (error: any) {
      console.error(error);
      toast.error(`Terjadi kesalahan: ${error.message}`);
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
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="target_month"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Bulan Target</FormLabel>
                    <Input disabled value={field.value ? format(field.value, "MMM yyyy") : ''} />
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
                      <Input type="text" placeholder="50000000"
                       onChange={(e) => field.onChange(parseNumber(e.target.value))}
                       value={formatCurrency(field.value || 0)}
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
                      <Input type="text" placeholder="5000000"
                       onChange={(e) => field.onChange(parseNumber(e.target.value))}
                       value={formatCurrency(field.value || 0)}
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