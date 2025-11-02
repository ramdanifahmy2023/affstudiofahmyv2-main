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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Tipe data untuk dropdown
interface Group {
  id: string;
  name: string;
}

// Skema validasi Zod untuk form
const transactionFormSchema = z.object({
  type: z.enum(["income", "expense"]),
  transaction_date: z.date({ required_error: "Tanggal wajib diisi." }),
  amount: z.preprocess(
    (a) => parseFloat(String(a).replace(/[^0-9]/g, "")),
    z.number().min(1, { message: "Nominal wajib diisi." })
  ),
  description: z.string().min(3, { message: "Keterangan wajib diisi." }),
  group_id: z.string().uuid().optional().nullable(),
  // Khusus expense
  category: z.enum(["fixed", "variable"]).optional(),
  proof_url: z.string().url({ message: "URL tidak valid." }).optional().or(z.literal('')),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void; // Untuk refresh list
}

export const AddTransactionDialog = ({ open, onOpenChange, onSuccess }: AddTransactionDialogProps) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeTab, setActiveTab] = useState("expense");

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: "expense",
      transaction_date: new Date(),
      amount: 0,
      description: "",
      group_id: null,
      category: undefined,
      proof_url: "",
    },
  });
  
  // Update tipe transaksi saat tab diganti
  useEffect(() => {
    form.setValue("type", activeTab as "income" | "expense");
  }, [activeTab, form]);

  // Helper untuk format mata uang
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
    }).format(value);
  };

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
      // Reset form saat dialog dibuka
      form.reset({
        type: "expense",
        transaction_date: new Date(),
        amount: 0,
        description: "",
        group_id: null,
        category: undefined,
        proof_url: "",
      });
      setActiveTab("expense");
    }
  }, [open, form]);

  const onSubmit = async (values: TransactionFormValues) => {
    // Validasi khusus expense [cite: 383]
    if (values.type === "expense" && !values.category) {
      form.setError("category", { message: "Kategori wajib diisi." });
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("cashflow")
        .insert({
          ...values,
          // Pastikan format tanggal YYYY-MM-DD
          transaction_date: format(values.transaction_date, "yyyy-MM-dd"),
          created_by: profile?.id, // ID dari tabel profiles
        });

      if (error) throw error;

      toast.success(`Transaksi ${values.type === 'expense' ? 'pengeluaran' : 'pemasukan'} berhasil dicatat.`);
      form.reset();
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Transaksi Baru</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="expense">Pengeluaran</TabsTrigger>
                <TabsTrigger value="income">Pemasukan</TabsTrigger>
              </TabsList>
              
              {/* Form Fields Umum */}
              <div className="grid grid-cols-2 gap-4 pt-2">
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
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nominal (IDR)</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="100000"
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keterangan</FormLabel>
                    <FormControl>
                      <Input placeholder={activeTab === 'expense' ? 'Cth: Beli galon' : 'Cth: Komisi cair M1'} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="group_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grup (Opsional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih grup terkait..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
              
              {/* Fields Khusus Pengeluaran [cite: 383] */}
              {activeTab === 'expense' && (
                <div className="space-y-4 pt-2 border-t">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kategori Pengeluaran</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih kategori..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fixed">Fix Cost</SelectItem>
                            <SelectItem value="variable">Variable Cost</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="proof_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link Bukti (Opsional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://link-ke-bukti.com/..." {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </Tabs>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Transaksi
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};