// src/components/Cashflow/AddTransactionDialog.tsx

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
// --- 1. IMPORT HELPER BARU ---
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/utils";


// Skema Zod (disamakan dengan komisi, validasi string)
const transactionFormSchema = z.object({
  transaction_date: z.date({
    required_error: "Tanggal transaksi wajib diisi.",
  }),
  type: z.enum(["income", "expense"], {
    required_error: "Tipe transaksi wajib dipilih.",
  }),
  category: z.string().min(1, { message: "Kategori wajib diisi." }),
  amount: z.string() // Validasi string saja, kita parse saat submit
    .min(1, { message: "Nominal wajib diisi." })
    .refine((val) => parseCurrencyInput(val) >= 0, { message: "Harus berupa angka." }),
  description: z.string().min(1, { message: "Deskripsi wajib diisi." }),
  group_id: z.string().uuid().optional().nullable(),
  proof_url: z.string().url({ message: "URL tidak valid" }).optional().or(z.literal('')),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

type Group = { id: string; name: string };

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// --- 2. HAPUS HELPER LOKAL ---

export const AddTransactionDialog = ({ open, onOpenChange, onSuccess }: AddTransactionDialogProps) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      transaction_date: new Date(),
      type: undefined,
      category: "",
      amount: "0", 
      description: "",
      group_id: "no-group", // Default "no-group"
      proof_url: "",
    },
  });
  
  // Ambil data group
  useEffect(() => {
    supabase.from("groups").select("id, name").order("name")
      .then(({ data }) => {
        if (data) setGroups(data);
      });
  }, []);

  // Update kategori berdasarkan Tipe
  const transactionType = form.watch("type");
  useEffect(() => {
    if (transactionType === "income") {
      setCategories(["Komisi Cair", "Lain-lain"]);
    } else if (transactionType === "expense") {
      setCategories(["Fix Cost", "Variable Cost", "Lain-lain"]);
    } else {
      setCategories([]);
    }
  }, [transactionType]);

  const onSubmit = async (values: TransactionFormValues) => {
    if (!profile) return;
    
    setLoading(true);
    try {
      // --- 3. GUNAKAN HELPER BARU (string -> number) ---
      const finalAmount = parseCurrencyInput(values.amount);
      if (isNaN(finalAmount)) {
        throw new Error("Nominal tidak valid.");
      }
      
      const finalGroupId = values.group_id === "no-group" ? null : values.group_id;
      
      const { error } = await supabase
        .from("cashflow")
        .insert({
          transaction_date: format(values.transaction_date, "yyyy-MM-dd"),
          type: values.type,
          category: values.category,
          amount: finalAmount, // Kirim sebagai number
          description: values.description,
          proof_url: values.proof_url || null,
          group_id: finalGroupId,
          created_by: profile.id,
        });

      if (error) throw error;

      toast.success(`Transaksi "${values.description}" berhasil ditambahkan.`);
      form.reset();
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Tambah Transaksi Baru</DialogTitle>
          <DialogDescription>
            Masukkan transaksi pemasukan atau pengeluaran.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Tipe Transaksi</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="income" /></FormControl>
                        <FormLabel className="font-normal text-success">Pemasukan</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="expense" /></FormControl>
                        <FormLabel className="font-normal text-destructive">Pengeluaran</FormLabel>
                      </FormItem>
                    </RadioGroup>
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
                          <Button
                            variant={"outline"}
                            className={cn("w-full text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP", { locale: indonesiaLocale }) : <span>Pilih tanggal</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
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
                    <FormLabel>Nominal</FormLabel>
                    <FormControl>
                      {/* --- 4. GUNAKAN HELPER BARU --- */}
                      <Input 
                        placeholder="Rp 0" 
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger disabled={!transactionType}>
                          <SelectValue placeholder="Pilih Tipe dulu..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
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
                    <FormLabel>Group (Opsional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? "no-group"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="no-group">Tidak ada group</SelectItem>
                        {groups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
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
                    <FormLabel>Deskripsi</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Catatan transaksi..." {...field} />
                    </FormControl>
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
                      <Input placeholder="https://..." {...field} value={field.value ?? ""} />
                    </FormControl>
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
                Simpan Transaksi
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};