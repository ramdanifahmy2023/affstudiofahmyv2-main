// src/pages/GroupDetails.tsx

import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/Layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// --- 1. IMPORT TAMBAHAN DI SINI ---
import { format, startOfMonth } from "date-fns"; 
// ---------------------------------
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ArrowLeft,
  Users,
  Smartphone,
  UserCircle,
  TrendingUp,
  Shield,
  DollarSign,
  Target,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// --- Tipe Data ---

// Detail Grup
interface GroupDetails {
  id: string;
  name: string;
  description: string | null;
  leader_id: string | null;
  profiles: {
    full_name: string;
  } | null;
}

// Tipe untuk Anggota
interface GroupEmployee {
  id: string;
  position: string | null;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    email: string;
    role: string;
  };
}

// Tipe untuk Device
interface GroupDevice {
  id: string;
  device_id: string;
  imei: string;
  google_account: string | null;
}

// Tipe untuk Akun
interface GroupAccount {
  id: string;
  platform: "shopee" | "tiktok";
  username: string;
  email: string;
  account_status: string | null;
}

// Tipe untuk Performa (Pinjam dari Performance.tsx)
interface EmployeePerformance {
  id: string;
  name: string;
  omset: number;
  commission: number;
  attendance: number;
  kpi: number;
}

// --- Helper Kalkulasi KPI (dari Performance.tsx) ---
const calculateTotalKpi = (sales: number, sTarget: number, comm: number, cTarget: number, attend: number, aTarget: number) => {
  const sales_pct = (sTarget > 0) ? (sales / sTarget) * 100 : 0;
  const commission_pct = (cTarget > 0) ? (comm / cTarget) * 100 : 0;
  const attendance_pct = (aTarget > 0) ? (attend / aTarget) * 100 : 0;
  const total_kpi = (sales_pct * 0.5) + (commission_pct * 0.3) + (attendance_pct * 0.2);
  return Math.min(total_kpi, 100);
};

const getKPIColor = (kpi: number) => {
  if (kpi >= 90) return "text-success";
  if (kpi >= 70) return "text-warning";
  return "text-destructive";
};

const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
};
// ------------------------------------------------

const GroupDetails = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);

  // State untuk data
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [employees, setEmployees] = useState<GroupEmployee[]>([]);
  const [devices, setDevices] = useState<GroupDevice[]>([]);
  const [accounts, setAccounts] = useState<GroupAccount[]>([]);
  const [performance, setPerformance] = useState<EmployeePerformance[]>([]);
  const [summary, setSummary] = useState({ totalOmset: 0, avgKpi: 0 });

  const getAvatarFallback = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
  };
  
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

  const fetchData = useCallback(async () => {
    if (!profile || !groupId) return;
    setLoading(true);

    try {
      // 1. Fetch Detail Grup (termasuk nama Leader)
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select(`
          id, name, description, leader_id,
          profiles ( full_name )
        `)
        .eq("id", groupId)
        .single();
      if (groupError) throw groupError;
      setGroupDetails(groupData);

      // 2. Fetch Anggota Tim (Karyawan)
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select(`
          id, position,
          profiles ( full_name, avatar_url, email, role )
        `)
        .eq("group_id", groupId);
      if (empError) throw empError;
      setEmployees(empData as any);

      // 3. Fetch Devices
      const { data: devData, error: devError } = await supabase
        .from("devices")
        .select(`id, device_id, imei, google_account`)
        .eq("group_id", groupId);
      if (devError) throw devError;
      setDevices(devData);

      // 4. Fetch Akun
      const { data: accData, error: accError } = await supabase
        .from("accounts")
        .select(`id, platform, username, email, account_status`)
        .eq("group_id", groupId);
      if (accError) throw accError;
      setAccounts(accData as any);

      // 5. Fetch Performa (KPI Karyawan di grup ini)
      // Ambil data bulan ini
      const lastMonth = format(startOfMonth(new Date()), "yyyy-MM-dd"); // <-- FUNGSI `format` DAN `startOfMonth` DIGUNAKAN DI SINI
      const { data: kpiData, error: kpiError } = await supabase
        .from("kpi_targets")
        .select(`
          sales_target, commission_target, attendance_target,
          actual_sales, actual_commission, actual_attendance,
          employees!inner (
            id,
            group_id,
            profiles ( full_name )
          )
        `)
        .eq("employees.group_id", groupId) // Filter join
        .eq("target_month", lastMonth); // Filter bulan
        
      if (kpiError) throw kpiError;
      
      const mappedPerformance: EmployeePerformance[] = (kpiData as any[]).map(item => ({
        id: item.employees.id,
        name: item.employees.profiles.full_name,
        omset: item.actual_sales || 0,
        commission: item.actual_commission || 0,
        attendance: item.actual_attendance || 0,
        kpi: calculateTotalKpi(
          item.actual_sales || 0, item.sales_target,
          item.actual_commission || 0, item.commission_target,
          item.actual_attendance || 0, item.attendance_target
        )
      })).sort((a, b) => b.kpi - a.kpi);
      
      setPerformance(mappedPerformance);
      
      // Hitung Summary Performa
      const totalOmset = mappedPerformance.reduce((sum, e) => sum + e.omset, 0);
      const avgKpi = mappedPerformance.length > 0 
        ? mappedPerformance.reduce((sum, e) => sum + e.kpi, 0) / mappedPerformance.length 
        : 0;
      setSummary({ totalOmset, avgKpi });


    } catch (error: any) {
      toast.error("Gagal memuat detail grup", { description: error.message });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [profile, groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-[calc(100vh-200px)]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!groupDetails) {
    return (
      <MainLayout>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Grup Tidak Ditemukan</h1>
          <Button asChild variant="link">
            <Link to="/groups"><ArrowLeft className="h-4 w-4 mr-2" />Kembali ke Daftar Grup</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link to="/groups">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Semua Grup
          </Link>
        </Button>

        {/* Header Grup */}
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{groupDetails.name}</CardTitle>
            <CardDescription>{groupDetails.description || "Tidak ada deskripsi."}</CardDescription>
            <div className="pt-2">
              <Badge variant="secondary" className="gap-2">
                <Users className="h-4 w-4" />
                Leader: {groupDetails.profiles?.full_name || "Belum Ditentukan"}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="performance">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="performance"><TrendingUp className="h-4 w-4 mr-2"/>Performa</TabsTrigger>
            <TabsTrigger value="employees"><Users className="h-4 w-4 mr-2"/>Anggota Tim</TabsTrigger>
            <TabsTrigger value="devices"><Smartphone className="h-4 w-4 mr-2"/>Devices</TabsTrigger>
            <TabsTrigger value="accounts"><UserCircle className="h-4 w-4 mr-2"/>Akun</TabsTrigger>
          </TabsList>

          {/* Tab Performa */}
          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Performa Grup (Bulan Ini)</CardTitle>
                <CardDescription>
                  Agregat performa KPI dari semua anggota di grup ini untuk bulan berjalan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Omset Grup</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(summary.totalOmset)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Rata-rata KPI Grup</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={cn("text-2xl font-bold", getKPIColor(summary.avgKpi))}>
                        {summary.avgKpi.toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <h4 className="font-semibold pt-4">Ranking Anggota (Bulan Ini)</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Omset</TableHead>
                      <TableHead>Komisi</TableHead>
                      <TableHead>KPI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performance.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center h-24">Belum ada data KPI bulan ini.</TableCell></TableRow>
                    )}
                    {performance.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-bold">#{index + 1}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{formatCurrency(item.omset)}</TableCell>
                        <TableCell>{formatCurrency(item.commission)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={item.kpi} className="w-20 h-2" />
                            <span className={cn("font-medium", getKPIColor(item.kpi))}>{item.kpi.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Anggota Tim */}
          <TabsContent value="employees">
            <Card>
              <CardHeader>
                <CardTitle>Anggota Tim ({employees.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Jabatan</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center h-24">Belum ada anggota.</TableCell></TableRow>
                    )}
                    {employees.map(emp => (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={emp.profiles.avatar_url || ""} />
                              <AvatarFallback>{getAvatarFallback(emp.profiles.full_name)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{emp.profiles.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{emp.position || "-"}</TableCell>
                        <TableCell>{emp.profiles.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> {emp.profiles.role}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Devices */}
          <TabsContent value="devices">
            <Card>
              <CardHeader>
                <CardTitle>Devices ({devices.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device ID</TableHead>
                      <TableHead>IMEI</TableHead>
                      <TableHead>Akun Google</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center h-24">Belum ada device.</TableCell></TableRow>
                    )}
                    {devices.map(dev => (
                      <TableRow key={dev.id}>
                        <TableCell className="font-medium">{dev.device_id}</TableCell>
                        <TableCell className="font-mono text-xs">{dev.imei}</TableCell>
                        <TableCell>{dev.google_account || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Akun */}
          <TabsContent value="accounts">
            <Card>
              <CardHeader>
                <CardTitle>Akun Affiliate ({accounts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Platform</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center h-24">Belum ada akun.</TableCell></TableRow>
                    )}
                    {accounts.map(acc => (
                      <TableRow key={acc.id}>
                        <TableCell>
                          <Badge variant={acc.platform === 'shopee' ? 'default' : 'secondary'} className={cn(acc.platform === "shopee" ? "bg-[#FF6600] hover:bg-[#FF6600]/90" : "bg-black hover:bg-black/90 text-white")}>
                            {acc.platform}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{acc.username}</TableCell>
                        <TableCell>{acc.email}</TableCell>
                        <TableCell>{getAccountStatusBadge(acc.account_status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default GroupDetails;