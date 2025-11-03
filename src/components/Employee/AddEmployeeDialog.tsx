// src/components/Employee/AddEmployeeDialog.tsx

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AddEmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Group {
  id: string;
  name: string;
}

export const AddEmployeeDialog = ({
  isOpen,
  onClose,
  onSuccess,
}: AddEmployeeDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  
  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [role, setRole] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("no-group");
  const [status, setStatus] = useState("active");

  // Ambil data group untuk dropdown
  useEffect(() => {
    if (isOpen) {
      const fetchGroups = async () => {
        const { data, error } = await supabase.from("groups").select("id, name");
        if (data) setGroups(data);
      };
      fetchGroups();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setPosition("");
    setRole("");
    setGroupId("no-group");
    setStatus("active");
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ VALIDASI SISI KLIEN UNTUK FIELD WAJIB
    if (!fullName.trim() || !position.trim() || !email.trim() || !role || !password) {
      toast.error("Semua field bertanda (*) wajib diisi.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password minimal 8 karakter.");
      return;
    }

    setLoading(true);
    toast.info("Sedang membuat akun karyawan...");

    try {
      // Tentukan nilai final groupId: null jika "no-group"
      const finalGroupId = (groupId === "no-group" || groupId === "") ? null : groupId;

      // Memanggil Supabase Edge Function 'create-user'
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          phone: phone.trim() || null, // Mengirim null jika kosong
          role,
          position: position.trim(),
          groupId: finalGroupId,
          status,
        },
      });

      // PENTING: Periksa jika error Supabase Function terjadi (misal timeout atau CORS error)
      if (error) {
        if (error.status === 500) {
          toast.error("Gagal menambah karyawan. (Internal Server Error)", {
            description: "Silakan cek log Deno Function Anda di Supabase.",
          });
        } else {
          // Menangani Network/Timeout error
          toast.error("Gagal menambah karyawan.", {
            description: error.message || "Terdapat masalah koneksi/server timeout. Silakan coba lagi.",
          });
        }
        throw new Error(error.message); 
      }
      
      // PENTING: Periksa jika ada error dari body response (error dari Deno Function)
      if (data?.error) {
        toast.error("Gagal menambah karyawan.", {
          description: data.error || "Pastikan email belum terdaftar atau data grup valid.",
        });
        throw new Error(data.error); 
      }

      toast.success("Karyawan baru berhasil ditambahkan!");
      onSuccess();
      handleClose();

    } catch (error: any) {
      console.error("Error detail:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Karyawan Baru</DialogTitle>
          <DialogDescription>
            Akun login akan otomatis dibuatkan.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nama Lengkap *</Label>
              <Input
                id="fullName"
                placeholder="Masukkan nama lengkap"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Jabatan *</Label>
              <Input
                id="position"
                placeholder="cth: Staff Live"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (untuk login) *</Label>
            <Input
              id="email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password (min. 8 karakter) *</Label>
            <Input
              id="password"
              type="password"
              placeholder="Masukkan password minimal 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">No. HP</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="08xx xxx xxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role / Hak Akses *</Label>
              <Select value={role} onValueChange={setRole} >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Pilih Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="leader">Leader</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="group">Group</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger id="group">
                  <SelectValue placeholder="Pilih Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-group">Tidak ada group</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status Akun</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Menyimpan..." : "Simpan Karyawan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};