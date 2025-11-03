// src/components/Employee/EditEmployeeDialog.tsx

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
import { EmployeeProfile } from "@/pages/Employees"; // Import tipe dari halaman Employees

interface EditEmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeToEdit: EmployeeProfile | null; // Data karyawan yang akan diedit
}

interface Group {
  id: string;
  name: string;
}

export const EditEmployeeDialog = ({
  isOpen,
  onClose,
  onSuccess,
  employeeToEdit,
}: EditEmployeeDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  
  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(""); // Akan di-disable
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [role, setRole] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
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

  // Isi form saat dialog dibuka dan employeeToEdit tersedia
  useEffect(() => {
    if (employeeToEdit && isOpen) {
      setFullName(employeeToEdit.full_name || "");
      setEmail(employeeToEdit.email || "");
      setPhone(employeeToEdit.phone || "");
      setPosition(employeeToEdit.position || "");
      setRole(employeeToEdit.role || "");
      // PERBAIKAN: Gunakan "no-group" jika group_id null
      setGroupId(employeeToEdit.group_id || "no-group"); 
      setStatus(employeeToEdit.status || "active");
    }
  }, [employeeToEdit, isOpen]);

  const handleClose = () => {
    onClose();
    // Reset state saat ditutup
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeToEdit) return; // Safety check

    // Validasi tambahan
    if (!role) {
      toast.error("Role / Hak Akses wajib diisi.");
      return;
    }

    setLoading(true);
    toast.info("Sedang memperbarui data karyawan...");

    try {
      // Tentukan nilai final groupId: null jika "no-group"
      const finalGroupId = (groupId === "no-group" || groupId === "") ? null : groupId;

      // 1. Update tabel 'profiles'
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone || null,
          role: role as any, // Cast ke type Enum
          status: status,
        })
        .eq("id", employeeToEdit.profile_id);

      if (profileError) throw profileError;

      // 2. Update tabel 'employees'
      const { error: employeeError } = await supabase
        .from("employees")
        .update({
          position: position || null,
          group_id: finalGroupId, // Gunakan nilai final
        })
        .eq("id", employeeToEdit.id); // 'id' di EmployeeProfile adalah employee_id

      if (employeeError) throw employeeError;

      toast.success("Data karyawan berhasil diperbarui!");
      onSuccess();
      handleClose();

    } catch (error: any) {
      console.error(error);
      toast.error("Gagal memperbarui data.", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Data Karyawan</DialogTitle>
          <DialogDescription>
            Perbarui detail untuk {employeeToEdit?.full_name || "karyawan"}.
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
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (Login)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled 
              readOnly
              className="cursor-not-allowed"
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
              {loading ? "Menyimpan..." : "Update Karyawan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};