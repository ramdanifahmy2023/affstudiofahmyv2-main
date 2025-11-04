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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [errorMessage, setErrorMessage] = useState("");

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [role, setRole] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("no-group");
  const [status, setStatus] = useState("active");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  const [address, setAddress] = useState("");

  // Ambil data group untuk dropdown
  useEffect(() => {
    if (isOpen) {
      const fetchGroups = async () => {
        const { data, error } = await supabase.from("groups").select("id, name");
        if (error) {
          console.error("Error fetching groups:", error);
          toast.error("Gagal memuat data group");
          return;
        }
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
    setDateOfBirth(undefined);
    setAddress("");
    setErrorMessage("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    // Validasi sisi klien
    if (
      !fullName.trim() ||
      !position.trim() ||
      !email.trim() ||
      !role ||
      !password
    ) {
      setErrorMessage("Semua field bertanda (*) wajib diisi.");
      toast.error("Semua field bertanda (*) wajib diisi.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password minimal 8 karakter.");
      toast.error("Password minimal 8 karakter.");
      return;
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage("Format email tidak valid.");
      toast.error("Format email tidak valid.");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading("Sedang membuat akun karyawan...");

    try {
      // Tentukan nilai final groupId
      const finalGroupId = groupId === "no-group" || groupId === "" ? null : groupId;

      // Persiapkan payload
      const payload = {
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        role,
        position: position.trim(),
        groupId: finalGroupId,
        status,
        date_of_birth: dateOfBirth ? format(dateOfBirth, "yyyy-MM-dd") : null,
        address: address.trim() || null,
      };

      console.log("Mengirim payload ke Edge Function:", payload);

      // Panggil Supabase Edge Function
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: payload,
      });

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Handle error dari function invoke
      if (error) {
        console.error("Function Error:", error);
        const errorMsg = error.message || "Terjadi kesalahan saat menghubungi server";
        setErrorMessage(errorMsg);
        toast.error("Gagal menambah karyawan", {
          description: errorMsg,
        });
        return;
      }

      // Cek response body
      if (!data) {
        setErrorMessage("Tidak ada response dari server");
        toast.error("Gagal menambah karyawan", {
          description: "Tidak ada response dari server",
        });
        return;
      }

      if (!data.success) {
        const errorMsg = data.error || "Terjadi kesalahan";
        setErrorMessage(errorMsg);
        toast.error("Gagal menambah karyawan", {
          description: errorMsg,
        });
        return;
      }

      // Success!
      console.log("Karyawan berhasil ditambahkan:", data);
      toast.success(data.message || "Karyawan berhasil ditambahkan!");
      onSuccess();
      handleClose();

    } catch (error: any) {
      // Dismiss loading toast jika masih ada
      toast.dismiss(loadingToast);
      
      console.error("Caught Error:", error);
      const errorMsg = error.message || "Terjadi kesalahan yang tidak terduga";
      setErrorMessage(errorMsg);
      toast.error("Gagal menambah karyawan", {
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Karyawan Baru</DialogTitle>
          <DialogDescription>
            Akun login akan otomatis dibuatkan. Field bertanda (*) wajib diisi.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nama & Jabatan */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">
                Nama Lengkap <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                placeholder="Masukkan nama lengkap"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">
                Jabatan <span className="text-destructive">*</span>
              </Label>
              <Input
                id="position"
                placeholder="cth: Staff Live"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email (untuk login) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Password (min. 8 karakter) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Masukkan password minimal 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              minLength={8}
            />
          </div>

          {/* No HP & Tanggal Lahir */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">No. HP</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="08xx xxx xxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Tanggal Lahir</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={loading}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateOfBirth && "text-muted-foreground"
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
                    toYear={new Date().getFullYear() - 10}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Alamat */}
          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Textarea
              id="address"
              placeholder="Masukkan alamat lengkap karyawan..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          {/* Role & Group */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">
                Role / Hak Akses <span className="text-destructive">*</span>
              </Label>
              <Select value={role} onValueChange={setRole} disabled={loading} required>
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
              <Select value={groupId} onValueChange={setGroupId} disabled={loading}>
                <SelectTrigger id="group">
                  <SelectValue placeholder="Pilih Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-group">Tidak ada group</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status Akun</Label>
            <Select value={status} onValueChange={setStatus} disabled={loading}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Pilih Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={loading}
            >
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