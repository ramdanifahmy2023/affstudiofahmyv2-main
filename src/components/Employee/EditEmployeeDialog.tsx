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
import { Loader2, CalendarIcon } from "lucide-react"; 
import { EmployeeProfile } from "@/pages/Employees"; 
import { cn } from "@/lib/utils"; 
import { format } from "date-fns"; 
// --- IMPORT TAMBAHAN ---
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea"; 
// -------------------------


interface EditEmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeToEdit: EmployeeProfile | null; 
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
  const [email, setEmail] = useState(""); 
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [role, setRole] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
  const [status, setStatus] = useState("active");
  // --- STATE BARU ---
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  const [address, setAddress] = useState("");
  // --------------------

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
      setGroupId(employeeToEdit.group_id || "no-group"); 
      setStatus(employeeToEdit.status || "active");
      
      // --- ISI STATE BARU DARI employeeToEdit YANG LENGKAP ---
      setDateOfBirth(employeeToEdit.date_of_birth ? new Date(employeeToEdit.date_of_birth + "T00:00:00") : undefined);
      setAddress(employeeToEdit.address || "");
      // -----------------------------------------------------
    }
  }, [employeeToEdit, isOpen]); // Dependensi hanya pada props

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeToEdit) return;

    if (!role) {
      toast.error("Role / Hak Akses wajib diisi.");
      return;
    }

    setLoading(true);
    toast.info("Sedang memperbarui data karyawan...");

    try {
      const finalGroupId = (groupId === "no-group" || groupId === "") ? null : groupId;

      // 1. Update tabel 'profiles'
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone || null,
          role: role as any,
          status: status,
          // --- UPDATE FIELD BARU ---
          address: address || null,
          date_of_birth: dateOfBirth 
            ? format(dateOfBirth, "yyyy-MM-dd") 
            : null,
          // ------------------------
        })
        .eq("id", employeeToEdit.profile_id);

      if (profileError) throw profileError;

      // 2. Update tabel 'employees'
      const { error: employeeError } = await supabase
        .from("employees")
        .update({
          position: position || null,
          group_id: finalGroupId,
        })
        .eq("id", employeeToEdit.id);

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
      <DialogContent className="max-w-xl"> 
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
              className="bg-muted/50 cursor-not-allowed"
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
            {/* --- FIELD BARU: TANGGAL LAHIR --- */}
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Tanggal Lahir</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateOfBirth && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateOfBirth ? (
                      format(dateOfBirth, "PPP")
                    ) : (
                      <span>Pilih tanggal</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateOfBirth}
                    onSelect={setDateOfBirth}
                    captionLayout="dropdown-buttons"
                    fromYear={1970}
                    toYear={new Date().getFullYear()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            {/* ------------------------------------- */}
          </div>
          
          {/* --- FIELD BARU: ALAMAT --- */}
          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Textarea
              id="address"
              placeholder="Masukkan alamat lengkap karyawan..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          {/* --------------------------- */}
          
          <div className="grid grid-cols-2 gap-4">
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