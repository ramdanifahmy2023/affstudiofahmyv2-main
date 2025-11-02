// src/pages/Attendance.tsx

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, Check, LogIn, Hourglass } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";

// Tipe data untuk riwayat absensi
interface AttendanceRecord {
  id: string;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
}

const Attendance = () => {
  const { employee } = useAuth();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  // Fungsi untuk mengambil data absensi hari ini & riwayat
  const fetchAttendance = async () => {
    if (!employee) return;
    setLoading(true);

    try {
      // 1. Cek absensi hari ini
      const { data: todayData, error: todayError } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("attendance_date", today)
        .maybeSingle();

      if (todayError) throw todayError;
      setTodayAttendance(todayData);

      // 2. Ambil riwayat absensi (10 terakhir)
      const { data: historyData, error: historyError } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employee.id)
        .order("attendance_date", { ascending: false })
        .limit(10);

      if (historyError) throw historyError;
      setHistory(historyData || []);

    } catch (error: any) {
      toast.error("Gagal mengambil data absensi.", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Ambil data saat halaman dimuat
  useEffect(() => {
    fetchAttendance();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee, today]);

  // Fungsi untuk menangani Absen Masuk
  const handleCheckIn = async () => {
    if (!employee) {
      toast.error("Data karyawan tidak ditemukan. Silakan login ulang.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("attendance")
        .insert({
          employee_id: employee.id,
          attendance_date: today,
          check_in: new Date().toISOString(), // Catat waktu sekarang
          status: "present",
        })
        .select()
        .single();

      if (error) throw error;

      setTodayAttendance(data); // Update status hari ini
      toast.success("Absen masuk berhasil!");
    } catch (error: any) {
      toast.error("Gagal melakukan absen masuk.", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper untuk format tanggal dan jam
  const formatDateTime = (isoString: string | null) => {
    if (!isoString) return "-";
    return format(new Date(isoString), "PPP (HH:mm 'WIB')", { locale: indonesiaLocale });
  };
  
  const formatTime = (isoString: string | null) => {
    if (!isoString) return "-";
    return format(new Date(isoString), "HH:mm 'WIB'");
  };
  
  const formatDate = (dateString: string) => {
    // Tanggal dari DB (yyyy-MM-dd) perlu di-adjust
    const date = new Date(dateString + "T00:00:00"); 
    return format(date, "EEEE, dd MMMM yyyy", { locale: indonesiaLocale });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Absensi Harian</h1>

        {/* Kartu Absen Masuk */}
        <Card>
          <CardHeader>
            <CardTitle>Absen Masuk Hari Ini</CardTitle>
            <CardDescription>
              {formatDate(today)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row items-center gap-6">
            {todayAttendance?.check_in ? (
              // Tampilan jika SUDAH absen masuk
              <div className="flex-1 space-y-2 text-center md:text-left">
                <div className="flex items-center gap-3 text-green-600">
                  <Check className="h-10 w-10" />
                  <div className="text-left">
                    <p className="text-2xl font-bold">Anda Sudah Absen Masuk</p>
                    <p className="text-lg text-muted-foreground">
                      Pada jam: {formatTime(todayAttendance.check_in)}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground pt-4">
                  Absen keluar akan tercatat otomatis saat Anda mengirimkan
                  Jurnal Laporan Harian di akhir shift.
                </p>
              </div>
            ) : (
              // Tampilan jika BELUM absen masuk
              <div className="flex-1 space-y-2 text-center md:text-left">
                <div className="flex items-center gap-3 text-primary">
                  <Clock className="h-10 w-10" />
                  <div className="text-left">
                    <p className="text-2xl font-bold">Anda Belum Absen Masuk</p>
                    <p className="text-lg text-muted-foreground">
                      Silakan tekan tombol di samping.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              size="lg"
              className="w-full md:w-auto gap-2 px-8 py-6"
              onClick={handleCheckIn}
              disabled={loading || !!todayAttendance?.check_in}
            >
              <LogIn className="h-5 w-5" />
              {loading ? "Memproses..." : "Absen Masuk Sekarang"}
            </Button>
          </CardContent>
        </Card>

        {/* Riwayat Absensi */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Absensi Anda</CardTitle>
            <CardDescription>
              Menampilkan 10 data absensi terakhir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && history.length === 0 ? (
              <p>Memuat riwayat...</p>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Jam Masuk</TableHead>
                      <TableHead>Jam Keluar</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {formatDate(record.attendance_date)}
                        </TableCell>
                        <TableCell>
                          {record.check_in ? (
                             <span className="flex items-center gap-2 text-green-600">
                              <LogIn className="h-4 w-4" /> {formatTime(record.check_in)}
                             </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {record.check_out ? (
                            <span className="flex items-center gap-2 text-red-600">
                              <LogIn className="h-4 w-4 transform rotate-180" /> {formatTime(record.check_out)}
                            </span>
                          ) : (
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <Hourglass className="h-4 w-4" /> Belum
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {/* Anda bisa menambahkan logika status (Hadir, Izin, Alpha) di sini */}
                          <span className="capitalize">{record.status}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {history.length === 0 && !loading && (
              <p className="text-center text-muted-foreground py-4">
                Belum ada riwayat absensi.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Attendance;