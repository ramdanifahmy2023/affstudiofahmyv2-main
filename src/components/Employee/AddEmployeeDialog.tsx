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
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Skema validasi Zod berdasarkan blueprint
const employeeFormSchema = z.object({
  full_name: z.string().min(3, { message: "Nama lengkap wajib diisi." }),
  email: z.string().email({ message: "Format email tidak valid." }),
  password: z.string().min(8, { message: "Password minimal 8 karakter." }),
  role: z.enum(["superadmin", "leader", "admin", "staff", "viewer"], {
    required_error: "Role wajib dipilih.",
  }),
  phone: z.string().min(10, { message: "No. HP minimal 10 digit." }),
  join_date: z.date({ required_error: "Tanggal mulai kerja wajib diisi." }),
  group_id: z.string().uuid().optional().nullable(), // uuid group
  date_of_birth: z.date().optional().nullable(),
  address: z.string().optional(),
  status: z.enum(["Aktif", "Nonaktif", "Resign"], {
    required_error: "Status wajib dipilih.",
  }),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

interface Group {
  id: string;
  name: string;
}

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void; // Untuk refresh list karyawan
}

export const AddEmployeeDialog = ({ open, onOpenChange, onSuccess }: AddEmployeeDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      phone: "",
      role: undefined,
      status: "Aktif",
      group_id: null,
      address: "",
      date_of_birth: null,
    },
  });

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
    }
  }, [open]);

  const onSubmit = async (values: EmployeeFormValues) => {
    setLoading(true);
    try {
      // Step 1: Buat user di auth.users
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.full_name,
          },
        },
      });

      if (authError) throw new Error(`Auth Error: ${authError.message}`);
      if (!authData.user) throw new Error("Gagal membuat user authentication.");

      const userId = authData.user.id;

      // Step 2: Buat data di public.profiles
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: userId,
          full_name: values.full_name,
          email: values.email,
          role: values.role,
          phone: values.phone,
          address: values.address,
          date_of_birth: values.date_of_birth ? format(values.date_of_birth, "yyyy-MM-dd") : null,
          join_date: format(values.join_date, "yyyy-MM-dd"),
          status: values.status,
        })
        .select("id")
        .single();

      if (profileError) throw new Error(`Profile Error: ${profileError.message}`);
      if (!profileData) throw new Error("Gagal membuat data profile.");

      const profileId = profileData.id;

      // Step 3: Tautkan ke public.employees
      const { error: employeeError } = await supabase
        .from("employees")
        .insert({
          profile_id: profileId,
          group_id: values.group_id,
          position: values.role, // Gunakan role sebagai position
        });

      if (employeeError) throw new Error(`Employee Error: ${employeeError.message}`);

      toast.success("Karyawan baru berhasil ditambahkan!");
      form.reset();
      onSuccess(); // Panggil callback sukses
    } catch (error: any) {
      console.error(error);
      if (error.message.includes("User already registered")) {
        toast.error("Email ini sudah terdaftar.");
      } else {
        toast.error(`Terjadi kesalahan: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Karyawan Baru</DialogTitle>
          <DialogDescription>
            Isi semua data di bawah ini untuk mendaftarkan karyawan baru.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Data Login */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-medium text-lg">Data Login</h4>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (untuk login)</FormLabel>
                      <FormControl>
                        <Input placeholder="karyawan@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Minimal 8 karakter" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Data Perusahaan */}
              <div className="space-y-4 p-4 border rounded-lg">
                 <h4 className="font-medium text-lg">Data Perusahaan</h4>
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jabatan (Role)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih jabatan..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="superadmin">Superadmin</SelectItem>
                          <SelectItem value="leader">Leader</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* ---- PERBAIKAN DI SINI ---- */}
                <FormField
                  control={form.control}
                  name="group_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grup</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value ?? undefined} // Gunakan undefined, bukan ""
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih grup (opsional)..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* <SelectItem value="">Belum ada grup</SelectItem> <-- BARIS INI DIHAPUS */}
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
                {/* ---- BATAS PERBAIKAN ---- */}
                
                 <FormField
                  control={form.control}
                  name="join_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Tanggal Mulai Kerja</FormLabel>
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
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status Karyawan</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih status..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Aktif">Aktif</SelectItem>
                          <SelectItem value="Nonaktif">Nonaktif</SelectItem>
                          <SelectItem value="Resign">Resign</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Data Pribadi */}
              <div className="space-y-4 p-4 border rounded-lg md:col-span-2">
                 <h4 className="font-medium text-lg">Data Pribadi</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Lengkap</FormLabel>
                        <FormControl>
                          <Input placeholder="Nama lengkap..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>No. HP</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="08123..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Tanggal Lahir (Opsional)</FormLabel>
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
                   <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alamat (Opsional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Alamat domisili..."
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                 </div>
              </div>

            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Karyawan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};