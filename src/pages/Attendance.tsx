import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, AlertCircle, LogIn, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const Attendance = () => {
  const { employee } = useAuth();
  const [loading, setLoading] = useState(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [isCheckinLoading, setIsCheckinLoading] = useState(true);
  const [todayCheckIn, setTodayCheckIn] = useState<string | null>(null);

  // Data dummy untuk history, nanti bisa diganti fetch
  const attendanceHistory = [
     {
      date: "2024-11-01",
      checkIn: "08:30",
      checkOut: "17:45",
      duration: "9h 15m",
      status: "present",
    },
    {
      date: "2024-10-31",
      checkIn: "08:25",
      checkOut: "17:30",
      duration: "9h 5m",
      status: "present",
    },
    // ... data lainnya
  ];
  
  // Fungsi untuk mendapatkan tanggal hari ini dalam format YYYY-MM-DD
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Cek apakah user sudah check-in hari ini saat komponen dimuat
  useEffect(() => {
    if (!employee) {
      if(!isCheckinLoading) { // Hanya tampilkan jika auth selesai loading
         toast.error("Gagal memuat data karyawan untuk absensi.");
      }
      return;
    }

    const checkAttendance = async () => {
      setIsCheckinLoading(true);
      try {
        const { data, error } = await supabase
          .from("attendance")
          .select("check_in")
          .eq("employee_id", employee.id)
          .eq("attendance_date", getTodayDate())
          .maybeSingle(); // .maybeSingle() tidak error jika tidak ada data

        if (error) throw error;

        if (data && data.check_in) {
          setHasCheckedInToday(true);
          setTodayCheckIn(format(new Date(data.check_in), "HH:mm"));
        } else {
          setHasCheckedInToday(false);
        }
      } catch (error: any) {
        console.error("Error checking attendance:", error);
        toast.error("Gagal memeriksa status absensi.");
      } finally {
        setIsCheckinLoading(false);
      }
    };

    checkAttendance();
  }, [employee]); // Jalankan setiap kali data employee berubah

  // Fungsi untuk handle Check-In
  const handleCheckIn = async () => {
    if (!employee) {
      toast.error("Data karyawan tidak ditemukan. Silakan login ulang.");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("attendance")
        .insert({
          employee_id: employee.id,
          attendance_date: getTodayDate(),
          check_in: new Date().toISOString(),
          status: 'present',
        });

      if (error) throw error;

      toast.success("Absen masuk berhasil! Selamat bekerja!");
      setHasCheckedInToday(true);
      setTodayCheckIn(format(new Date(), "HH:mm"));

    } catch (error: any) {
      console.error("Check-in error:", error);
      if (error.code === '23505') { // Kode error duplicate primary key
         toast.error("Anda sudah melakukan absen masuk hari ini.");
         setHasCheckedInToday(true); // Sinkronkan state
      } else {
         toast.error(`Gagal melakukan absen masuk: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return (
          <Badge className="bg-success gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Hadir
          </Badge>
        );
      case "leave":
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Izin
          </Badge>
        );
      case "sick":
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Sakit
          </Badge>
        );
      case "absent":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Alfa
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderCheckInCard = () => {
    if (isCheckinLoading) {
      return (
        <Card className="border-muted bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              <p className="text-muted-foreground">Memeriksa status absensi...</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (hasCheckedInToday) {
      return (
        <Card className="border-success/20 bg-success/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-success/10 p-4">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-success">Anda sudah absen masuk</h3>
                  <p className="text-muted-foreground">
                    Absen masuk tercatat pada jam <strong>{todayCheckIn}</strong>.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Siap untuk mulai bekerja?</h3>
                <p className="text-muted-foreground">
                  Klik tombol untuk absen masuk hari ini.
                </p>
              </div>
            </div>
            <Button size="lg" className="gap-2" onClick={handleCheckIn} disabled={loading}>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogIn className="h-5 w-5" />
              )}
              Absen Masuk
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };


  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Absensi</h1>
            <p className="text-muted-foreground">Catat kehadiran kerja Anda di sini.</p>
          </div>
          <div className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>

        {/* Check-in Card Dinamis */}
        {renderCheckInCard()}

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Hadir Bulan Ini
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">22</div>
              <p className="text-xs text-muted-foreground mt-1">Hari</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tepat Waktu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">20</div>
              <p className="text-xs text-muted-foreground mt-1">Hari</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Izin/Sakit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">2</div>
              <p className="text-xs text-muted-foreground mt-1">Total hari</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tingkat Kehadiran
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">95%</div>
              <p className="text-xs text-muted-foreground mt-1">Bulan ini</p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance History */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Absensi</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Absen Masuk</TableHead>
                  <TableHead>Absen Keluar</TableHead>
                  <TableHead>Durasi</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceHistory.map((record, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{record.date}</TableCell>
                    <TableCell>{record.checkIn}</TableCell>
                    <TableCell>{record.checkOut}</TableCell>
                    <TableCell>{record.duration}</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-muted">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Informasi Sistem Absensi</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Absen masuk dilakukan manual menggunakan tombol di atas.</li>
                  <li>Absen keluar dicatat <strong>otomatis</strong> saat Anda mengirim Jurnal Laporan Harian.</li>
                  <li>Pastikan Anda absen masuk sebelum mulai bekerja.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Attendance;