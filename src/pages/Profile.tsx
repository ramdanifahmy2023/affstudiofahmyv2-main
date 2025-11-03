// src/pages/Profile.tsx

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

// Import komponen UI
import { Button, buttonVariants } from "@/components/ui/button"; // Import sudah benar di sini
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Loader2,
  CalendarIcon,
  LogOut,
  Moon,
  Sun,
  Laptop,
  Upload,
} from "lucide-react";
import { Label } from "@/components/ui/label";

// Skema Zod untuk validasi form profil
const profileFormSchema = z.object({
  full_name: z.string().min(1, { message: "Nama lengkap wajib diisi." }),
  email: z.string().email({ message: "Email tidak valid." }),
  phone: z.string().optional().nullable(),
  date_of_birth: z.date().optional().nullable(),
  address: z.string().optional().nullable(),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Skema Zod untuk validasi form ganti password
const passwordFormSchema = z
  .object({
    new_password: z
      .string()
      .min(8, { message: "Password baru minimal 8 karakter." }),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Konfirmasi password tidak cocok.",
    path: ["confirm_password"],
  });
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

const ProfilePage = () => {
  const { user, profile, signOut, refetchProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [isLogoutAlertOpen, setIsLogoutAlertOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Inisialisasi form dengan default value yang aman
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      address: "",
      date_of_birth: null,
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  // Mengisi form dengan data profile dari context
  useEffect(() => {
    if (profile) {
      profileForm.reset({
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        address: profile.address || "",
        date_of_birth: profile.date_of_birth
          ? new Date(profile.date_of_birth) // Pastikan parse tanggal
          : null,
      });
    }
  }, [profile, profileForm]);

  // Handler untuk submit form profil
  const onProfileSubmit = async (values: ProfileFormValues) => {
    if (!profile) return;
    setLoadingProfile(true);

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: values.full_name,
          phone: values.phone,
          address: values.address,
          date_of_birth: values.date_of_birth
            ? format(values.date_of_birth, "yyyy-MM-dd")
            : null,
        })
        .eq("id", profile.id);
      if (profileError) throw profileError;

      // Update email di auth.users (akan memicu kirim konfirmasi)
      if (values.email !== user?.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: values.email,
        });
        if (authError) throw authError;
        toast.info(
          "Data profil disimpan. Link konfirmasi email baru telah dikirim."
        );
      } else {
        toast.success("Profil berhasil diperbarui!");
      }

      // Panggil refetch untuk memperbarui data di context
      refetchProfile();
    } catch (error: any) {
      toast.error("Gagal memperbarui profil.", {
        description: error.message,
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  // Handler untuk submit form ganti password
  const onPasswordSubmit = async (values: PasswordFormValues) => {
    setLoadingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.new_password,
      });
      if (error) throw error;
      toast.success("Password berhasil diperbarui!");
      passwordForm.reset();
    } catch (error: any) {
      toast.error("Gagal memperbarui password.", {
        description: error.message,
      });
    } finally {
      setLoadingPassword(false);
    }
  };

  const getAvatarFallback = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // --- 4. FUNGSI HANDLE UPLOAD (DIPERBAIKI) ---
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !profile) {
      toast.error("Anda harus login untuk mengupload avatar.");
      return;
    }
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    const fileExt = file.name.split(".").pop();
    // Path file sesuai RLS policy: USER_ID/avatar.extension
    const filePath = `${user.id}/avatar.${fileExt}`;

    setUploading(true);
    toast.info("Mengunggah avatar...");

    try {
      // 1. Upload ke Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars") // Nama bucket
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true, // Timpa jika file sudah ada
        });
      if (uploadError) throw uploadError;

      // --- PERBAIKAN DI SINI ---
      // 2. Dapatkan Public URL (URL Bersih)
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath); // DAPATKAN URL BERSIH DULU

      if (!urlData.publicUrl) throw new Error("Gagal mendapatkan URL publik.");
      
      // 3. Tambahkan timestamp (cache-busting) SETELAH URL didapat
      const timestamp = new Date().getTime();
      const newUrl = `${urlData.publicUrl}?t=${timestamp}`;
      // --- AKHIR PERBAIKAN ---

      // 4. Update URL di tabel 'profiles'
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: newUrl }) // Simpan URL dengan timestamp
        .eq("id", profile.id);
      if (updateError) throw updateError;

      // 5. Panggil refetchProfile() dari context
      refetchProfile();
      toast.success("Avatar berhasil diperbarui!");

    } catch (error: any) {
      toast.error("Upload Gagal", {
        description: error.message || "Terjadi kesalahan.",
      });
    } finally {
      setUploading(false);
      event.target.value = ""; // Reset input file
    }
  };
  // ----------------------------------------

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Pengaturan Akun</h1>

        <Card>
          <CardHeader className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar tetap menggunakan data dari context */}
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="text-3xl">
                {getAvatarFallback(profile?.full_name || "??")}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center md:text-left">
              <CardTitle className="text-2xl">{profile?.full_name}</CardTitle>
              <CardDescription>{profile?.email}</CardDescription>

              {/* Ganti Button disabled dengan Label + Input fungsional */}
              <div className="mt-2">
                <Label
                  htmlFor="avatar-upload"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "gap-2",
                    uploading
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer"
                  )}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploading ? "Mengunggah..." : "Upload Foto"}
                </Label>
                <Input
                  id="avatar-upload"
                  type="file"
                  className="hidden"
                  accept="image/png, image/jpeg, image/gif"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Edit Profil</TabsTrigger>
            <TabsTrigger value="password">Ganti Password</TabsTrigger>
            <TabsTrigger value="theme">Tampilan</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                  <CardHeader>
                    <CardTitle>Profil Pribadi</CardTitle>
                    <CardDescription>
                      Perbarui informasi kontak Anda.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={profileForm.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Lengkap</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>No. HP</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="date_of_birth"
                        render={({ field }) => (
                          <FormItem className="flex flex-col pt-2">
                            <FormLabel>Tanggal Lahir</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pilih tanggal</span>
                                    )}
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
                                  captionLayout="dropdown-buttons"
                                  fromYear={1970}
                                  toYear={new Date().getFullYear()}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={profileForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alamat</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Alamat lengkap Anda..."
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={loadingProfile}>
                      {loadingProfile && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Simpan Perubahan Profil
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          </TabsContent>

          <TabsContent value="password">
            <Card>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                  <CardHeader>
                    <CardTitle>Ganti Password</CardTitle>
                    <CardDescription>
                      Pastikan Anda menggunakan password yang kuat.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="new_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password Baru</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirm_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Konfirmasi Password Baru</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={loadingPassword}>
                      {loadingPassword && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Ganti Password
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          </TabsContent>

          <TabsContent value="theme">
            <Card>
              <CardHeader>
                <CardTitle>Tampilan</CardTitle>
                <CardDescription>
                  Sesuaikan tampilan aplikasi di perangkat Anda.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={theme}
                  onValueChange={setTheme}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="light" id="light" />
                    <Label
                      htmlFor="light"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Sun className="h-4 w-4" /> Terang
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dark" id="dark" />
                    <Label
                      htmlFor="dark"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Moon className="h-4 w-4" /> Gelap
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="system" id="system" />
                    <Label
                      htmlFor="system"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Laptop className="h-4 w-4" /> Sistem
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Card Logout */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Logout</CardTitle>
            <CardDescription>
              Keluar dari sesi Anda saat ini.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => setIsLogoutAlertOpen(true)}
            >
              <LogOut className="h-4 w-4" />
              Keluar dari Akun
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Dialog Konfirmasi Logout */}
      <AlertDialog
        open={isLogoutAlertOpen}
        onOpenChange={setIsLogoutAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin ingin keluar?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan dikembalikan ke halaman login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={signOut}>Ya, Keluar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default ProfilePage;