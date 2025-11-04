// File: ramdanifahmy2023/affstudiofahmyv2-main/affstudiofahmyv2-main-0cf4e2de727adf0e0171efcb1d3ba596c76c8cce/src/pages/Attendance.tsx

import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  CalendarIcon, 
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays, intervalToDuration } from "date-fns"; // Import intervalToDuration
import { cn } from "@/lib/utils";


// --- TIPE DATA BARU UNTUK MANAGEMENT VIEW ---
interface AttendanceRecord {
    id: string;
    attendance_date: string;
    check_in: string | null;
    check_out: string | null;
    status: 'present' | 'absent' | 'leave';
    employee_id: string;
    employee_name: string;
    group_name: string;
}
type Group = { id: string; name: string };
// ------------------------------------------

const Attendance = () => {
    const { profile, employee } = useAuth();
    const isStaff = profile?.role === 'staff';
    const canManage = ['superadmin', 'leader', 'admin', 'viewer'].includes(profile?.role || '');

    // --- STATES FOR STAFF VIEW ---
    const [currentStatus, setCurrentStatus] = useState<'clockedIn' | 'clockedOut' | 'loading'>('loading');

    // --- STATES FOR MANAGEMENT VIEW ---
    const [managementRecords, setManagementRecords] = useState<AttendanceRecord[]>([]);
    const [loadingRecords, setLoadingRecords] = useState(true);
    const [filterDateStart, setFilterDateStart] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
    const [filterDateEnd, setFilterDateEnd] = useState(format(new Date(), "yyyy-MM-dd"));
    const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
    const [filterGroup, setFilterGroup] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    
    // --- HELPER UNTUK FORMAT WAKTU ---
    const formatTime = (isoString: string | null) => {
        if (!isoString) return '-';
        // Hanya tampilkan waktu (HH:MM)
        return format(new Date(isoString), 'HH:mm');
    }
    const formatDateOnly = (dateString: string) => {
        if (!dateString) return '-';
        return format(new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`), 'dd MMM yyyy');
    }
    // --- HELPER BARU: HITUNG DURASI ---
    const calculateDuration = (checkIn: string | null, checkOut: string | null) => {
        if (!checkIn || !checkOut) return '-';
        
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        
        if (start.getTime() > end.getTime()) return '-';
        
        const duration = intervalToDuration({ start, end });
        
        let parts: string[] = [];
        if (duration.hours && duration.hours > 0) {
            parts.push(`${duration.hours} jam`);
        }
        if (duration.minutes && duration.minutes > 0) {
            parts.push(`${duration.minutes} mnt`);
        }
        
        return parts.length > 0 ? parts.join(' ') : 'Kurang dari 1 mnt';
    }
    // ---------------------------------
    
    // --- LOGIC ABSENSI STAFF ---
    const fetchMyAttendanceStatus = useCallback(async () => {
        if (!isStaff || !employee) return;
        setLoadingRecords(true);
        const today = format(new Date(), 'yyyy-MM-dd');
        
        try {
            const { data } = await supabase
                .from('attendance')
                .select('check_in')
                .eq('employee_id', employee.id)
                .eq('attendance_date', today)
                .maybeSingle();

            if (data && data.check_in) {
                 setCurrentStatus('clockedIn');
            } else {
                 setCurrentStatus('clockedOut');
            }
        } catch(e) {
             setCurrentStatus('clockedOut');
        } finally {
             setLoadingRecords(false);
        }
    }, [isStaff, employee]);
    
    
    // --- LOGIC FETCHING DATA KEHADIRAN (Management View) ---
    const fetchAttendanceData = useCallback(async (startDate: string, endDate: string, groupId: string, search: string) => {
        setLoadingRecords(true);
        try {
            let query = supabase
                .from('attendance')
                .select(`
                    id,
                    attendance_date,
                    check_in,
                    check_out,
                    status,
                    employee_id,
                    employees!inner(
                        profiles!inner(full_name, role),
                        groups(name)
                    )
                `)
                .gte('attendance_date', startDate)
                .lte('attendance_date', endDate)
                .order('attendance_date', { ascending: false });

            // 1. Filter Wajib: Tampilkan HANYA Staff
            query = query.eq('employees.profiles.role', 'staff');
            
            // 2. Filter Group (jika Leader/Admin ingin membatasi view)
            if (groupId !== 'all') {
                 // Diasumsikan group_id dapat difilter melalui join employees
                 query = query.eq('employees.group_id', groupId); 
            }
            
            // 3. Filter Search Term (Employee Name)
            if (search.trim() !== '') {
                 query = query.ilike('employees.profiles.full_name', `%${search.trim()}%`);
            }
            
            const { data, error } = await query;
            if (error) throw error;
            
            const mappedRecords: AttendanceRecord[] = (data as any[]).map(record => ({
                id: record.id,
                attendance_date: record.attendance_date,
                check_in: record.check_in,
                check_out: record.check_out,
                status: record.status,
                employee_id: record.employee_id,
                employee_name: record.employees.profiles.full_name,
                group_name: record.employees.groups?.name || '-',
            }));
            
            setManagementRecords(mappedRecords);

        } catch(error) {
            console.error(error);
            toast.error("Gagal memuat rincian kehadiran.");
        } finally {
            setLoadingRecords(false);
        }
    }, []);

    // --- Fetch Groups for Management Filter ---
    useEffect(() => {
        if (canManage) {
            const fetchGroups = async () => {
                const { data } = await supabase.from("groups").select("id, name");
                if (data) setAvailableGroups(data);
            };
            fetchGroups();
        }
    }, [canManage]);
    
    // --- Fetch Data on Filter Change (Management) ---
    useEffect(() => {
        if (canManage) {
            fetchAttendanceData(filterDateStart, filterDateEnd, filterGroup, searchTerm);
        }
    }, [canManage, fetchAttendanceData, filterDateStart, filterDateEnd, filterGroup, searchTerm]);

    // Initial fetch for staff status
    useEffect(() => {
        if (isStaff) fetchMyAttendanceStatus();
    }, [isStaff, fetchMyAttendanceStatus]);


    // --- STAFF ACTIONS (CHECK IN / CHECK OUT) ---
    const handleAction = async (action: 'checkIn' | 'checkOut') => {
        if (!isStaff || !employee) return;
        
        setLoadingRecords(true);
        const today = format(new Date(), 'yyyy-MM-dd');
        const currentTime = new Date().toISOString();
        
        try {
            const { data: existingData, error: checkError } = await supabase
                .from('attendance')
                .select('id, check_in, check_out')
                .eq('employee_id', employee.id)
                .eq('attendance_date', today)
                .maybeSingle();

            if (checkError) throw checkError;


            if (action === 'checkIn') {
                if (existingData?.check_in) {
                     toast.warning("Anda sudah Check-in hari ini.");
                     return;
                }

                // Insert Check-in record
                const { error } = await supabase
                    .from('attendance')
                    .upsert({
                        employee_id: employee.id,
                        attendance_date: today,
                        check_in: currentTime,
                        status: 'present',
                    }, { onConflict: 'employee_id, attendance_date' });
                
                if (error) throw error;
                toast.success("Check-in berhasil!");
                setCurrentStatus('clockedIn');
                
            } else if (action === 'checkOut') {
                 if (existingData && existingData.check_out) {
                    toast.warning("Anda sudah Check-out hari ini.");
                    return;
                 }
                 if (!existingData || !existingData.check_in) {
                    toast.error("Gagal Check-out: Anda belum Check-in hari ini.");
                    return;
                 }
                
                 // Update Check-out record
                 const { error: updateError } = await supabase
                    .from('attendance')
                    .update({
                        check_out: currentTime,
                    })
                    .eq('id', existingData.id); // Update record yang sudah ada
                    
                if (updateError) throw updateError;
                toast.success("Check-out berhasil!");
                setCurrentStatus('clockedOut');
            }
        } catch (e: any) {
            console.error(e);
            toast.error("Gagal melakukan aksi.", { description: e.message });
        } finally {
            setLoadingRecords(false);
        }
    }


    // --- RENDERING COMPONENTS ---

    const renderStaffView = () => (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Absensi Harian Anda</h1>
            <Card className="text-center p-8 shadow-lg">
                <CardTitle className="mb-4">Status Hari Ini</CardTitle>
                <CardDescription>Absen in dan out sangat krusial untuk perhitungan KPI.</CardDescription>
                {loadingRecords ? (
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mt-6" />
                ) : (
                    <>
                        <p className={cn("text-xl font-semibold mb-6 mt-6", 
                             currentStatus === 'clockedIn' ? 'text-success' : 'text-destructive'
                        )}>
                            {currentStatus === 'clockedIn' ? 'ANDA SUDAH CHECK-IN' : 'ANDA BELUM CHECK-IN'}
                        </p>
                        
                        <div className="flex justify-center gap-4">
                            <Button 
                                size="lg" 
                                className="gap-2 px-8 py-6 text-lg"
                                onClick={() => handleAction('checkIn')}
                                disabled={currentStatus === 'clockedIn' || loadingRecords}
                            >
                                <ArrowUpRight className="h-6 w-6" />
                                Check-in
                            </Button>
                            <Button 
                                size="lg" 
                                variant="outline" 
                                className="gap-2 px-8 py-6 text-lg"
                                onClick={() => handleAction('checkOut')}
                                disabled={currentStatus === 'clockedOut' || loadingRecords}
                            >
                                <ArrowDownLeft className="h-6 w-6" />
                                Check-out
                            </Button>
                        </div>
                    </>
                )}
            </Card>
            
            {/* Show My Attendance History (Placeholder/Future Feature) */}
             <Card>
                <CardHeader><CardTitle>Riwayat Absensi Anda</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Riwayat absensi pribadi akan ditampilkan di sini.</p>
                </CardContent>
             </Card>
        </div>
    );
    
    const renderManagementView = () => (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Rincian Kehadiran Staff</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Filter Kehadiran Staff</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                           <Label htmlFor="date-start">Mulai Tgl</Label>
                           <Input type="date" value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                           <Label htmlFor="date-end">Sampai Tgl</Label>
                           <Input type="date" value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="filter-group">Group</Label>
                            <Select value={filterGroup} onValueChange={setFilterGroup}>
                                <SelectTrigger id="filter-group"><SelectValue placeholder="Semua Group" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Group</SelectItem>
                                    {availableGroups.map(group => (
                                      <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="search-name">Cari Staff</Label>
                            <Input placeholder="Cari nama staff..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle>Rekap Absensi Staff ({managementRecords.length} Hari)</CardTitle></CardHeader>
                <CardContent>
                    {loadingRecords ? (
                         <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                         </div>
                    ) : (
                         <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>Nama Staff</TableHead>
                                        <TableHead>Group</TableHead>
                                        <TableHead>Check-in</TableHead>
                                        <TableHead>Check-out</TableHead>
                                        <TableHead>Durasi</TableHead> {/* <-- KOLOM BARU */}
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {managementRecords.length === 0 && (
                                         <TableRow><TableCell colSpan={7} className="text-center h-24">Tidak ada data kehadiran staff ditemukan.</TableCell></TableRow>
                                    )}
                                    {managementRecords.map(record => (
                                        <TableRow key={record.id}>
                                            <TableCell>{formatDateOnly(record.attendance_date)}</TableCell>
                                            <TableCell className="font-medium">{record.employee_name}</TableCell>
                                            <TableCell>{record.group_name}</TableCell>
                                            <TableCell>{formatTime(record.check_in)}</TableCell>
                                            <TableCell>{formatTime(record.check_out)}</TableCell>
                                            <TableCell>{calculateDuration(record.check_in, record.check_out)}</TableCell> {/* <-- DATA BARU */}
                                            <TableCell>
                                                 <Badge variant={record.status === 'present' ? 'default' : 'secondary'} className={cn(record.status === 'present' ? 'bg-success hover:bg-success/90' : '')}>
                                                    {record.status}
                                                 </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );


    return (
        <MainLayout>
            {isStaff ? renderStaffView() : renderManagementView()}
        </MainLayout>
    );
}

export default Attendance;