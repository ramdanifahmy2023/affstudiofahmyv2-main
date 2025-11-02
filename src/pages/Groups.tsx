import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  Plus,
  Users,
  Smartphone,
  UserCircle,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// IMPORT BARU:
import { AddGroupDialog } from "@/components/Group/AddGroupDialog";

// Tipe data yang akan kita fetch
type GroupData = {
  id: string;
  name: string;
  description: string | null;
  profiles: { // Data Leader dari relasi 'leader_id'
    full_name: string;
  } | null;
  employees: { count: number }[]; // Supabase mengembalikan count sebagai array
  devices: { count: number }[];
  accounts: { count: number }[];
};

const Groups = () => {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false); // State untuk dialog

  // Cek hak akses untuk CRUD
  const canManageGroups =
    profile?.role === "superadmin" || profile?.role === "leader";

  // Fungsi untuk mengambil data grup beserta relasinya
  const fetchGroups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("groups")
        .select(
          `
          id,
          name,
          description,
          profiles ( full_name ),
          employees ( count ),
          devices ( count ),
          accounts ( count )
        `
        );

      if (error) throw error;
      setGroups(data as any); 
    } catch (error: any) {
      toast.error("Gagal memuat data grup.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Panggil fetchGroups saat komponen dimuat
  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = () => {
    setIsModalOpen(true); // <-- FUNGSI INI SEKARANG BERISI
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manage Groups</h1>
            <p className="text-muted-foreground">
              Kelola grup tim dan alokasi aset.
            </p>
          </div>
          {canManageGroups && (
            <Button className="gap-2" onClick={handleCreateGroup}>
              <Plus className="h-4 w-4" />
              Buat Grup Baru
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => {
              const employeeCount = group.employees[0]?.count ?? 0;
              const deviceCount = group.devices[0]?.count ?? 0;
              const accountCount = group.accounts[0]?.count ?? 0;
              const leaderName = group.profiles?.full_name || "Belum diatur";

              return (
                <Card
                  key={group.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <Package className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {group.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Leader: {leaderName}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">Aktif</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Karyawan
                        </span>
                        <span className="font-medium">{employeeCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          Devices
                        </span>
                        <span className="font-medium">{deviceCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <UserCircle className="h-4 w-4" />
                          Akun
                        </span>
                        <span className="font-medium">{accountCount}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Total Omset
                        </span>
                        <span className="text-lg font-bold text-primary">
                          Rp 0
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Lihat Detail
                      </Button>
                      {canManageGroups && (
                        <Button size="sm" className="flex-1">
                          Kelola
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {!loading && groups.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center">
                Belum ada grup yang dibuat.
              </p>
            )}
          </div>
        )}

        {/* Render Dialog Tambah Grup */}
        {canManageGroups && (
          <AddGroupDialog
            open={isModalOpen}
            onOpenChange={setIsModalOpen}
            onSuccess={() => {
              setIsModalOpen(false); // Tutup dialog
              fetchGroups(); // Refresh data grup
            }}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default Groups;