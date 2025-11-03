// src/components/Group/EditGroupDialog.tsx

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

// Tipe data group yang diterima
interface GroupData {
  id: string;
  name: string;
  description: string | null;
}

interface EditGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  group: GroupData | null; // Group yang akan diedit
}

interface SelectableItem {
  id: string;
  name: string;
}

export const EditGroupDialog = ({
  isOpen,
  onClose,
  onSuccess,
  group,
}: EditGroupDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Data untuk multi-select (termasuk yang sudah di-assign)
  const [availableEmployees, setAvailableEmployees] = useState<SelectableItem[]>([]);
  const [availableDevices, setAvailableDevices] = useState<SelectableItem[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<SelectableItem[]>([]);

  // State untuk item yang dipilih (hanya menyimpan ID)
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  // Ambil data (karyawan, device, akun)
  useEffect(() => {
    if (!isOpen || !group) return;

    // Isi form dengan data group yang ada
    setName(group.name);
    setDescription(group.description || "");
    // Reset selections untuk mencegah bug saat beralih group
    setSelectedEmployees([]);
    setSelectedDevices([]);
    setSelectedAccounts([]);


    const fetchAvailableData = async () => {
      setLoadingData(true);
      try {
        const groupId = group.id;

        // KUNCI: Query item yang group_id nya NULL ATAU SAMA DENGAN group.id (OR)
        
        // 1. Ambil karyawan 
        const { data: empData, error: empError } = await supabase
          .from("employees")
          .select("id, profiles ( full_name ), group_id")
          .or(`group_id.is.null,group_id.eq.${groupId}`);
        if (empError) throw empError;
        setAvailableEmployees(
          empData.map((e: any) => ({
            id: e.id,
            name: e.profiles.full_name,
          }))
        );
        // Pre-select item yang sudah ter-assign ke group ini
        setSelectedEmployees(
          empData
            .filter((e: any) => e.group_id === groupId)
            .map((e: any) => e.id)
        );

        // 2. Ambil devices
        const { data: devData, error: devError } = await supabase
          .from("devices")
          .select("id, device_id, group_id")
          .or(`group_id.is.null,group_id.eq.${groupId}`);
        if (devError) throw devError;
        setAvailableDevices(
          devData.map((d) => ({ id: d.id, name: d.device_id }))
        );
        setSelectedDevices(
          devData.filter((d) => d.group_id === groupId).map((d) => d.id)
        );

        // 3. Ambil accounts
        const { data: accData, error: accError } = await supabase
          .from("accounts")
          .select("id, username, group_id")
          .or(`group_id.is.null,group_id.eq.${groupId}`);
        if (accError) throw accError;
        setAvailableAccounts(
          accData.map((a) => ({ id: a.id, name: a.username }))
        );
        setSelectedAccounts(
          accData.filter((a) => a.group_id === groupId).map((a) => a.id)
        );

      } catch (error: any) {
        toast.error("Gagal memuat data untuk diedit.", {
          description: error.message,
        });
      } finally {
        setLoadingData(false);
      }
    };

    fetchAvailableData();
  }, [isOpen, group]);

  const handleClose = () => {
    // Reset state saat ditutup
    setSelectedEmployees([]);
    setSelectedDevices([]);
    setSelectedAccounts([]);
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
    if (!group) return;

    setLoading(true);
    toast.info("Sedang memperbarui group...");

    try {
      // Panggil fungsi RPC 'update_group_and_assign'
      // Fungsi ini akan meng-update detail group, kemudian mengalokasikan
      // item yang dipilih dan melepaskan item yang tidak dipilih.
      const { error } = await supabase.rpc("update_group_and_assign", {
        group_id_to_edit: group.id,
        new_name: name,
        new_desc: description,
        new_employee_ids: selectedEmployees, // Array ID
        new_device_ids: selectedDevices,     // Array ID
        new_account_ids: selectedAccounts,   // Array ID
      });

      if (error) throw error;

      toast.success(`Group "${name}" berhasil diperbarui!`);
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal memperbarui group.", {
        description: error.message.includes("violates unique constraint") ? "Nama Group sudah digunakan." : error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Group: {group?.name}</DialogTitle>
          <DialogDescription>
            Ubah nama, deskripsi, dan keanggotaan group.
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
                  {availableEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-muted"
                    >
                      <Checkbox
                        id={`edit-emp-${emp.id}`}
                        checked={selectedEmployees.includes(emp.id)}
                        onCheckedChange={() =>
                          handleCheckboxChange(
                            emp.id,
                            selectedEmployees,
                            setSelectedEmployees
                          )
                        }
                      />
                      <Label
                        htmlFor={`edit-emp-${emp.id}`}
                        className="font-normal cursor-pointer"
                      >
                        {emp.name}
                      </Label>
                    </div>
                  ))}
                  {availableEmployees.length === 0 && <p className="text-xs text-muted-foreground p-2">Tidak ada karyawan yang tersedia/dialokasikan ke group ini.</p>}
                </ScrollArea>
              </div>

              {/* Devices */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" /> Device ({availableDevices.length})
                </Label>
                <ScrollArea className="h-48 rounded-md border p-2">
                  {availableDevices.map((dev) => (
                    <div
                      key={dev.id}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-muted"
                    >
                      <Checkbox
                        id={`edit-dev-${dev.id}`}
                        checked={selectedDevices.includes(dev.id)}
                        onCheckedChange={() =>
                          handleCheckboxChange(
                            dev.id,
                            selectedDevices,
                            setSelectedDevices
                          )
                        }
                      />
                      <Label
                        htmlFor={`edit-dev-${dev.id}`}
                        className="font-normal cursor-pointer"
                      >
                        {dev.name}
                      </Label>
                    </div>
                  ))}
                  {availableDevices.length === 0 && <p className="text-xs text-muted-foreground p-2">Tidak ada device yang tersedia/dialokasikan ke group ini.</p>}
                </ScrollArea>
              </div>

              {/* Akun */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" /> Akun ({availableAccounts.length})
                </Label>
                <ScrollArea className="h-48 rounded-md border p-2">
                  {availableAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-muted"
                    >
                      <Checkbox
                        id={`edit-acc-${acc.id}`}
                        checked={selectedAccounts.includes(acc.id)}
                        onCheckedChange={() =>
                          handleCheckboxChange(
                            acc.id,
                            selectedAccounts,
                            setSelectedAccounts
                          )
                        }
                      />
                      <Label
                        htmlFor={`edit-acc-${acc.id}`}
                        className="font-normal cursor-pointer"
                      >
                        {acc.name}
                      </Label>
                    </div>
                  ))}
                  {availableAccounts.length === 0 && <p className="text-xs text-muted-foreground p-2">Tidak ada akun yang tersedia/dialokasikan ke group ini.</p>}
                </ScrollArea>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={loading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading || loadingData}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};