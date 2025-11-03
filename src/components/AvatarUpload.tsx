// src/components/AvatarUpload.tsx

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

interface AvatarUploadProps {
  onUploadSuccess: (url: string) => void;
}

export const AvatarUpload = ({ onUploadSuccess }: AvatarUploadProps) => {
  const { user, profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Fungsi fallback inisial
  const getAvatarFallback = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Sinkronkan avatarUrl state dengan profile dari context
  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile?.avatar_url]);

  // Fungsi utama untuk handle upload
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast.error("Anda harus login untuk mengupload avatar.");
      return;
    }

    if (!event.target.files || event.target.files.length === 0) {
      return; // Tidak ada file dipilih
    }

    const file = event.target.files[0];
    const fileExt = file.name.split(".").pop();
    
    // Path file sesuai RLS policy: USER_ID/nama_file
    // Kita gunakan nama file 'avatar' agar selalu menimpa
    const filePath = `${user.id}/avatar.${fileExt}`;

    setUploading(true);
    toast.info("Mengunggah avatar...");

    try {
      // 1. Upload ke Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars") // Nama bucket kita
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true, // true = timpa file jika sudah ada (penting)
        });

      if (uploadError) {
        throw new Error(`Gagal upload ke storage: ${uploadError.message}`);
      }

      // 2. Dapatkan Public URL
      // Tambahkan timestamp `t=` untuk 'cache-busting'
      const timestamp = new Date().getTime();
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(`${filePath}?t=${timestamp}`);

      if (!urlData.publicUrl) {
        throw new Error("Gagal mendapatkan URL publik.");
      }

      const newUrl = urlData.publicUrl;

      // 3. Update URL di tabel 'profiles'
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: newUrl })
        .eq("id", profile!.id); // Update profile yang sedang login

      if (updateError) {
        throw new Error(`Gagal update profil: ${updateError.message}`);
      }

      // 4. Sukses
      setAvatarUrl(newUrl); // Update preview di UI
      onUploadSuccess(newUrl); // Kirim URL baru ke parent
      toast.success("Avatar berhasil diperbarui!");
      
    } catch (error: any) {
      toast.error("Upload Gagal", {
        description: error.message || "Terjadi kesalahan yang tidak diketahui.",
      });
    } finally {
      setUploading(false);
      // Reset input file
      event.target.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-20 w-20">
        <AvatarImage src={avatarUrl || ""} />
        <AvatarFallback className="text-3xl">
          {getAvatarFallback(profile?.full_name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="avatar-upload"
          className={`inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors ${
            uploading
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
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
        <p className="text-xs text-muted-foreground">
          PNG, JPG, atau GIF (Maks 2MB).
        </p>
      </div>
    </div>
  );
};