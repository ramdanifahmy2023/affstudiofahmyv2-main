// src/pages/Groups.tsx

import { useState, useEffect } from "react";
import { Link } from "react-router-dom"; // <-- 1. IMPORT Link
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PlusCircle,
  Users,
  Smartphone,
  KeyRound,
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  Eye, // <-- 2. IMPORT IKON BARU (OPSIONAL)
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { AddGroupDialog } from "@/components/Group/AddGroupDialog";
import { DeleteGroupAlert } from "@/components/Group/DeleteGroupAlert";
import { EditGroupDialog } from "@/components/Group/EditGroupDialog";

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  employee_count: number;
  device_count: number;
  account_count: number;
}

const Groups = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<GroupData[]>([]);

  // State untuk dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      // Memanggil fungsi SQL 'get_group_stats'
      const { data, error } = await supabase.rpc("get_group_stats");
      if (error) {
        // Fallback jika RPC belum dibuat (untuk development)
        if (error.code === '42883') { 
            const { data: simpleData, error: simpleError } = await supabase.from("groups").select("id, name, description");
            if (simpleError) throw simpleError;
            
            const mockedData: GroupData[] = (simpleData as any[]).map(g => ({
                ...g,
                employee_count: 0,
                device_count: 0,
                account_count: 0,
            }));
            setGroups(mockedData);
            toast.warning("Fungsi get_group_stats belum terdeteksi. Menampilkan data dasar.");
            return;
        }
        throw error;
      }
      setGroups(data || []);
    } catch (error: any) {
      toast.error("Gagal mengambil data group.", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const canManage = profile?.role === "superadmin" || profile?.role === "leader";

  const handleOpenDeleteAlert = (group: GroupData) => {
    setSelectedGroup(group);
    setIsAlertOpen(true);
  };

  const handleOpenEditDialog = (group: GroupData) => {
    setSelectedGroup(group);
    setIsEditDialogOpen(true); 
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manage Group</h1>
            <p className="text-muted-foreground">
              Kelola tim, device, dan akun affiliate Anda.
            </p>
          </div>
          {canManage && (
            <Button className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
              <PlusCircle className="h-4 w-4" />
              Tambah Group Baru
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Card key={group.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      {/* --- 3. UBAH CardTitle MENJADI LINK --- */}
                      <CardTitle>
                        <Link 
                          to={`/groups/${group.id}`} 
                          className="hover:underline hover:text-primary transition-colors"
                        >
                          {group.name}
                        </Link>
                      </CardTitle>
                      {/* ------------------------------------- */}
                      <CardDescription>
                        {group.description || "Tidak ada deskripsi."}
                      </CardDescription>
                    </div>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* --- 4. TAMBAHKAN LINK "LIHAT DETAIL" --- */}
                          <DropdownMenuItem asChild>
                            <Link to={`/groups/${group.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Lihat Detail
                            </Link>
                          </DropdownMenuItem>
                          {/* ------------------------------------- */}
                          <DropdownMenuItem
                            onClick={() => handleOpenEditDialog(group)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Group
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleOpenDeleteAlert(group)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus Group
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Karyawan</span>
                    </div>
                    <span className="text-sm font-bold">
                      {group.employee_count}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Device</span>
                    </div>
                    <span className="text-sm font-bold">
                      {group.device_count}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Akun</span>
                    </div>
                    <span className="text-sm font-bold">
                      {group.account_count}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {groups.length === 0 && !loading && (
              <p className="text-muted-foreground col-span-3 text-center">
                Belum ada group. Silakan tambahkan group baru.
              </p>
            )}
          </div>
        )}
      </div>

      {/* --- RENDER SEMUA DIALOG --- */}
      {canManage && (
        <>
          <AddGroupDialog
            isOpen={isAddDialogOpen}
            onClose={() => setIsAddDialogOpen(false)}
            onSuccess={() => {
              setIsAddDialogOpen(false);
              fetchGroups();
            }}
          />

          <DeleteGroupAlert
            isOpen={isAlertOpen}
            onClose={() => setIsAlertOpen(false)}
            group={selectedGroup}
            onSuccess={() => {
              setIsAlertOpen(false);
              fetchGroups();
            }}
          />

          <EditGroupDialog
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            group={selectedGroup}
            onSuccess={() => {
              setIsEditDialogOpen(false);
              fetchGroups(); // Refresh data setelah edit
            }}
          />
        </>
      )}
    </MainLayout>
  );
};

export default Groups;