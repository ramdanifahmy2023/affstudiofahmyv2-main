// src/pages/Accounts.tsx

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Download,
  UserCircle,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Upload,
  Printer, // <-- 1. IMPORT IKON BARU
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AddAccountDialog } from "@/Account/AddAccountDialog";
import { EditAccountDialog } from "@/Account/EditAccountDialog"; 
import { DeleteAccountAlert } from "@/Account/DeleteAccountAlert"; 
import { BulkImportDialog } from "@/Account/BulkImportDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useExport } from "@/hooks/useExport"; // <-- IMPORT USE EXPORT

// Tipe data dari Supabase (diperbarui untuk menangani null dari DB)
type AccountData = {
  id: string;
  platform: "shopee" | "tiktok";
  username: string;
  email: string;
  phone: string | null;
  account_status: "active" | "banned_temporary" | "banned_permanent" | null;
  data_status: "empty" | "in_progress" | "rejected" | "verified" | null;
  groups: {
    name: string;
  } | null;
};

// Tipe untuk dialog
type DialogState = {
  add: boolean;
  edit: AccountData | null;
  delete: AccountData | null;
  import: boolean; 
};

const Accounts = () => {
  const { profile } = useAuth();
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<AccountData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  
  // --- 2. TAMBAHKAN 'printData' DARI HOOK ---
  const { exportToPDF, exportToCSV, isExporting, printData } = useExport();
  
  const [dialogs, setDialogs] = useState<DialogState>({
    add: false,
    edit: null,
    delete: null,
    import: false, 
  });

  const canManageAccounts =
    profile?.role === "superadmin" || profile?.role === "leader";
  const canDelete = profile?.role === "superadmin";

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("accounts")
        .select(`
          id,
          platform,
          username,
          email,
          phone,
          account_status,
          data_status,
          groups ( name )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAccounts(data as any);
    } catch (error: any) {
      toast.error("Gagal memuat data akun.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    const results = accounts
      .filter((acc) => {
        if (platformFilter === "all") return true;
        return acc.platform === platformFilter;
      })
      .filter((acc) => {
        return (
          acc.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          acc.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    setFilteredAccounts(results);
  }, [searchTerm, platformFilter, accounts]);
  
  const handleEditClick = (account: AccountData) => {
    setDialogs({ ...dialogs, edit: account });
  };
  
  const handleDeleteClick = (account: AccountData) => {
    setDialogs({ ...dialogs, delete: account });
  };
  
  const handleSuccess = () => {
     setDialogs({ add: false, edit: null, delete: null, import: false });
     fetchAccounts(); 
  }

  // Helper Badge
  const getAccountStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success">Aktif</Badge>;
      case "banned_temporary":
        return <Badge variant="secondary">Banned Sementara</Badge>;
      case "banned_permanent":
        return <Badge variant="destructive">Banned Permanen</Badge>;
      default:
        return <Badge variant="outline">{status || "N/A"}</Badge>;
    }
  };
  
  const getAccountStatusText = (status: string | null) => {
    switch (status) {
      case "active": return "Aktif";
      case "banned_temporary": return "Banned Sementara";
      case "banned_permanent": return "Banned Permanen";
      default: return status || "N/A";
    }
  };

  const getDataStatusBadge = (status: string | null) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-success">Verifikasi Berhasil</Badge>;
      case "in_progress":
        return <Badge variant="secondary">Proses Pengajuan</Badge>;
      case "rejected":
        return <Badge variant="destructive">Ditolak</Badge>;
      case "empty":
        return <Badge variant="outline">Kosong</Badge>;
      default:
        return <Badge variant="outline">{status || "N/A"}</Badge>;
    }
  };
  
  const getDataStatusText = (status: string | null) => {
     switch (status) {
      case "verified": return "Verifikasi Berhasil";
      case "in_progress": return "Proses Pengajuan";
      case "rejected": return "Ditolak";
      case "empty": return "Kosong";
      default: return status || "N/A";
    }
  };

  // --- 3. MODIFIKASI FUNGSI HANDLE EXPORT ---
  const handleExport = (type: 'pdf' | 'csv' | 'print') => {
    const columns = [
      { header: 'Platform', dataKey: 'platform' },
      { header: 'Username', dataKey: 'username' },
      { header: 'Email', dataKey: 'email' },
      { header: 'No. HP', dataKey: 'phone' },
      { header: 'Grup', dataKey: 'group_name' },
      { header: 'Status Akun', dataKey: 'account_status_text' },
      { header: 'Status Data', dataKey: 'data_status_text' },
    ];
    
    const exportData = filteredAccounts.map(acc => ({
        ...acc,
        phone: acc.phone || '-',
        group_name: acc.groups?.name || '-',
        account_status_text: getAccountStatusText(acc.account_status),
        data_status_text: getDataStatusText(acc.data_status),
    }));

    const options = {
        filename: 'Daftar_Akun_Affiliate',
        title: 'Laporan Daftar Akun Affiliate',
        data: exportData,
        columns,
    };
    
    if (type === 'pdf') {
        exportToPDF(options);
    } else if (type === 'csv') {
        exportToCSV(options);
    } else {
        printData(options);
    }
  };


  // Summary Cards Data
  const shopeeCount = accounts.filter(a => a.platform === 'shopee').length;
  const tiktokCount = accounts.filter(a => a.platform === 'tiktok').length;
  const activeCount = accounts.filter(a => a.account_status === 'active').length;


  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Daftar Akun Affiliate</h1>
            <p className="text-muted-foreground">
              Kelola akun Shopee dan TikTok affiliate.
            </p>
          </div>
          {canManageAccounts && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="gap-2" 
                onClick={() => setDialogs({ ...dialogs, import: true })}
              >
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
              <Button className="gap-2" onClick={() => setDialogs({ ...dialogs, add: true })}>
                <Plus className="h-4 w-4" />
                Tambah Akun
              </Button>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : accounts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">All platforms</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{loading ? "..." : activeCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Active rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Shopee Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : shopeeCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Primary platform</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                TikTok Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : tiktokCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Secondary platform</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <Tabs value={platformFilter} onValueChange={setPlatformFilter}>
                <TabsList>
                  <TabsTrigger value="all">Semua</TabsTrigger>
                  <TabsTrigger value="shopee">Shopee</TabsTrigger>
                  <TabsTrigger value="tiktok">TikTok</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex-1 relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari username atau email..."
                  className="pl-10 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {/* --- 4. TAMBAHKAN OPSI CETAK DI SINI --- */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2" disabled={isExporting || filteredAccounts.length === 0}>
                        <Download className="h-4 w-4" />
                        {isExporting ? 'Mengekspor...' : 'Export'}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={isExporting}>
                        Export PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('csv')} disabled={isExporting}>
                        Export CSV
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleExport('print')} disabled={isExporting}>
                        <Printer className="mr-2 h-4 w-4" />
                        Cetak Halaman
                    </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* ------------------------------------------- */}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Grup</TableHead>
                    <TableHead>Status Akun</TableHead>
                    <TableHead>Status Data</TableHead>
                    {canManageAccounts && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={canManageAccounts ? 7 : 6} className="text-center h-24">
                         {searchTerm ? "Akun tidak ditemukan." : "Belum ada data akun."}
                       </TableCell>
                     </TableRow>
                  )}
                  {filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>
                        <Badge
                          variant={
                            account.platform === "shopee" ? "default" : "secondary"
                          }
                          className={cn(account.platform === "shopee" ? "bg-[#FF6600] hover:bg-[#FF6600]/90" : "bg-black hover:bg-black/90 text-white")}
                        >
                          {account.platform}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium flex items-center gap-2">
                        <UserCircle className="h-4 w-4 text-muted-foreground" />
                        {account.username}
                      </TableCell>
                      <TableCell className="text-sm">{account.email}</TableCell>
                      <TableCell>
                        {account.groups ? (
                          <Badge variant="outline">{account.groups.name}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>{getAccountStatusBadge(account.account_status)}</TableCell>
                      <TableCell>{getDataStatusBadge(account.data_status)}</TableCell>
                      {canManageAccounts && (
                        <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditClick(account)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit Akun
                                </DropdownMenuItem>
                                {canDelete && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => handleDeleteClick(account)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Hapus Akun
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      
       {canManageAccounts && (
         <AddAccountDialog
           open={dialogs.add}
           onOpenChange={(open) => setDialogs({ ...dialogs, add: open })}
           onSuccess={handleSuccess}
         />
       )}

       {canManageAccounts && dialogs.edit && (
          <EditAccountDialog
            open={!!dialogs.edit}
            onOpenChange={(open) => setDialogs({ ...dialogs, edit: open ? dialogs.edit : null })}
            onSuccess={handleSuccess}
            account={dialogs.edit}
          />
       )}
       
       {canDelete && dialogs.delete && (
          <DeleteAccountAlert
            open={!!dialogs.delete}
            onOpenChange={(open) => setDialogs({ ...dialogs, delete: open ? dialogs.delete : null })}
            onSuccess={handleSuccess}
            account={dialogs.delete}
          />
       )}

      {canManageAccounts && (
        <BulkImportDialog
          open={dialogs.import}
          onOpenChange={(open) => setDialogs({ ...dialogs, import: open })}
          onSuccess={handleSuccess}
        />
      )}

    </MainLayout>
  );
};

export default Accounts;