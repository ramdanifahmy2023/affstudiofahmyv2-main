// src/components/Group/AddGroupDialog.tsx

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Users, Smartphone, KeyRound } from "lucide-react";

interface AddGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Tipe data untuk item yang bisa dipilih
interface SelectableItem {
  id: string;
  name: string;
}

export const AddGroupDialog = ({
  isOpen,
  onClose,
  onSuccess,
}: AddGroupDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Data untuk multi-select
  const [availableEmployees, setAvailableEmployees] = useState<SelectableItem[]>([]);
  const [availableDevices, setAvailableDevices] = useState<SelectableItem[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<SelectableItem[]>([]);

  // State untuk item yang dipilih
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  // Ambil data (karyawan, device, akun) yang BELUM Punya Group
  useEffect(() => {
    if (!isOpen) return;

    const fetchAvailableData = async () => {
      setLoadingData(true);
      try {
        // 1. Ambil karyawan (employees join profiles) yang group_id IS NULL
        const { data: empData, error: empError } = await supabase
          .from("employees")
          .select("id, profiles ( full_name )")
          .is("group_id", null);
        if (empError) throw empError;
        setAvailableEmployees(empData.map((e: any) => ({
          id: e.id,
          name: e.profiles.full_name,
        })));

        // 2. Ambil devices yang group_id IS NULL
        const { data: devData, error: devError } = await supabase
          .from("devices")
          .select("id, device_id")
          .is("group_id", null); 
        if (devError) throw devError;
        setAvailableDevices(devData.map(d => ({ id: d.id, name: d.device_id })));

        // 3. Ambil accounts yang group_id IS NULL
        const { data: accData, error: accError } = await supabase
          .from("accounts")
          .select("id, username")
          .is("group_id", null); 
        if (accError) throw accError;
        setAvailableAccounts(accData.map(a => ({ id: a.id, name: a.username })));

      } catch (error: any) {
        toast.error("Gagal memuat data", { description: error.message });
      } finally {
        setLoadingData(false);
      }
    };

    fetchAvailableData();
  }, [isOpen]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelectedEmployees([]);
    setSelectedDevices([]);
    setSelectedAccounts([]);
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCheckboxChange = (
    id: string,
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (list.includes(id)) {
      setter(list.filter((itemId) => itemId !== id));
    } else {
      setter([...list, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    toast.info("Sedang membuat group...");

    try {
      // Memanggil fungsi RPC 'create_group_and_assign'
      // Fungsi ini akan membuat group baru lalu mengalokasikan semua ID yang dipilih.
      const { error } = await supabase.rpc("create_group_and_assign", {
        group_name: name,
        group_desc: description,
        employee_ids: selectedEmployees,
        device_ids: selectedDevices,
        account_ids: selectedAccounts,
      });

      if (error) throw error;

      toast.success(`Group "${name}" berhasil dibuat!`);
      onSuccess();
      handleClose();

    } catch (error: any) {
      console.error(error);
      toast.error("Gagal membuat group.", { 
        description: error.message.includes("violates unique constraint") ? "Nama Group sudah digunakan." : error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tambah Group Baru</DialogTitle>
          <DialogDescription>
            Buat group baru dan pilih anggota, device, serta akun yang
            belum ter-assign.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Info Dasar Group */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Group</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (Opsional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Multi-Select */}
          {loadingData ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-muted-foreground ml-2">Memuat data alokasi...</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {/* Karyawan */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" /> Karyawan ({availableEmployees.length})
                </Label>
                <ScrollArea className="h-48 rounded-md border p-2">
                  {availableEmployees.length > 0 ? (
                    availableEmployees.map((emp) => (
                      <div key={emp.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted">
                        <Checkbox
                          id={`emp-${emp.id}`}
                          checked={selectedEmployees.includes(emp.id)}
                          onCheckedChange={() => handleCheckboxChange(emp.id, selectedEmployees, setSelectedEmployees)}
                        />
                        <Label htmlFor={`emp-${emp.id}`} className="font-normal cursor-pointer">{emp.name}</Label>
                      </div>
                    ))
                  ) : <p className="text-xs text-muted-foreground p-2">Semua karyawan sudah punya group.</p>}
                </ScrollArea>
              </div>

              {/* Devices */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" /> Device ({availableDevices.length})
                </Label>
                <ScrollArea className="h-48 rounded-md border p-2">
                  {availableDevices.length > 0 ? (
                    availableDevices.map((dev) => (
                      <div key={dev.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted">
                        <Checkbox
                          id={`dev-${dev.id}`}
                          checked={selectedDevices.includes(dev.id)}
                          onCheckedChange={() => handleCheckboxChange(dev.id, selectedDevices, setSelectedDevices)}
                        />
                        <Label htmlFor={`dev-${dev.id}`} className="font-normal cursor-pointer">{dev.name}</Label>
                      </div>
                    ))
                  ) : <p className="text-xs text-muted-foreground p-2">Semua device sudah punya group.</p>}
                </ScrollArea>
              </div>

              {/* Akun */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" /> Akun ({availableAccounts.length})
                </Label>
                <ScrollArea className="h-48 rounded-md border p-2">
                  {availableAccounts.length > 0 ? (
                    availableAccounts.map((acc) => (
                      <div key={acc.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted">
                        <Checkbox
                          id={`acc-${acc.id}`}
                          checked={selectedAccounts.includes(acc.id)}
                          onCheckedChange={() => handleCheckboxChange(acc.id, selectedAccounts, setSelectedAccounts)}
                        />
                        <Label htmlFor={`acc-${acc.id}`} className="font-normal cursor-pointer">{acc.name}</Label>
                      </div>
                    ))
                  ) : <p className="text-xs text-muted-foreground p-2">Semua akun sudah punya group.</p>}
                </ScrollArea>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
              Batal
            </Button>
            <Button type="submit" disabled={loading || loadingData}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Menyimpan..." : "Simpan Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};