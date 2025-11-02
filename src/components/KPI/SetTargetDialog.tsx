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

// Tipe data Karyawan (dari relasi)
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
    (a) => parseInt(String(a).replace(/[^0-9]/g, "")),
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
  const [employees, setEmployees] = useState<Employee[]>([]);

  const form = useForm<KpiFormValues>({
    resolver: zodResolver(kpiFormSchema),
    defaultValues: {
      target_month: startOfMonth(new Date()),
      sales_target: 0,
      commission_target: 0,
      attendance_target: 22, // Default
    },
  });

  // Helper format mata uang
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Fetch data karyawan (non-staff)
  useEffect(() => {
    if (open) {
      const fetchEmployees = async () => {
        // Asumsi kita set KPI hanya untuk 'staff'
        const { data, error } = await supabase
          .from("employees")
          .select("id, profiles ( full_name )")
          .eq("profiles.role", "staff"); // Sesuaikan jika role bisa beda
          
        if (error) {
          toast.error("Gagal memuat daftar staff.");
        } else {
          const mappedData = data.map((emp: any) => ({
            id: emp.id,
            full_name: emp.profiles.full_name,
          }));
          setEmployees(mappedData || []);
        }
      };
      fetchEmployees();
      form.reset({
        target_month: startOfMonth(new Date()),
        sales_target: 0,
        commission_target: 0,
        attendance_target: 22,
      });
    }
  }, [open, form]);

  const onSubmit = async (values: KpiFormValues) => {
    setLoading(true);
    try {
      // Kita gunakan 'upsert' untuk create/update berdasarkan (employee_id, target_month)
      const { error } = await supabase
        .from("kpi_targets")
        .upsert({
          employee_id: values.employee_id,
          target_month: format(values.target_month, "yyyy-MM-01"), // Paksa ke awal bulan
          sales_target: values.sales_target,
          commission_target: values.commission_target,
          attendance_target: values.attendance_target,
          // 'actual' values diisi oleh proses lain (misal: trigger DB / update manual)
        }, {
          onConflict: 'employee_id, target_month'
        });

      if (error) throw error;

      toast.success("Target KPI berhasil disimpan.");
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Set Target KPI Karyawan</DialogTitle>
          <DialogDescription>
            Tetapkan target bulanan untuk omset, komisi, dan absensi.
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
                    <FormLabel>Karyawan (Staff)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <Input type="text" placeholder="50000000"
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
                name="commission_target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Komisi (30%)</FormLabel>
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
                name="attendance_target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Hadir (20%)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="31" {...field} />
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
                Simpan Target
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};