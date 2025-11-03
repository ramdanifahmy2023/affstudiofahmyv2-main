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
  const [groupId, setGroupId] = useState<string>("no-group"); // Default ke no-group
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
    if (password.length < 8) {
      toast.error("Password minimal harus 8 karakter.");
      return;
    }
    // Validasi tambahan agar 'Pilih Role' tidak lolos
    if (!role) {
      toast.error("Role / Hak Akses wajib diisi.");
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
          email,
          password,
          fullName,
          phone: phone || null, // Pastikan kirim null jika string kosong
          role,
          position,
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
             // Ini menangani Network/Timeout error yang menyebabkan promise resolved dengan error object
             toast.error("Gagal menambah karyawan.", {
                description: error.message || "Terdapat masalah koneksi/server timeout. Silakan coba lagi.",
            });
        }
        
        throw new Error(error.message); // Lemparkan error agar masuk ke catch block
      }
      
      // PENTING: Periksa jika ada error dari body response (error dari Deno Function)
      if (data?.error) {
          toast.error("Gagal menambah karyawan.", {
              description: data.error || "Pastikan email belum terdaftar atau data grup valid.",
          });
          throw new Error(data.error); // Lemparkan error agar masuk ke catch block
      }


      toast.success("Karyawan baru berhasil ditambahkan!");
      onSuccess();
      handleClose();

    } catch (error: any) {
      // Catch block untuk error yang dilempar dari try
      if (!error.message.includes("Gagal menambah karyawan")) { 
          // Hindari double toast jika sudah ditangani di atas
          toast.error("Gagal menambah karyawan.", {
              description: error.message || "Pastikan email belum terdaftar.",
          });
      }
      console.error(error);

    } finally {
      // FINALLY BLOCK AKAN SELALU DIEKSEKUSI
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
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Jabatan</Label>
              <Input
                id="position"
                placeholder="cth: Staff Live"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (untuk login)</Label>
            <Input
              id="email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password (min. 8 karakter)</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">No. HP</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role / Hak Akses</Label>
              <Select value={role} onValueChange={setRole} required>
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