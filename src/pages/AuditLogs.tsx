// src/pages/AuditLogs.tsx

import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  User,
  Search,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";

// Tipe data Audit Log 
interface AuditLog {
    id: string;
    timestamp: string;
    user_name: string;
    action: string;
    table_name: string;
    record_id: string;
    old_data: any; // Disimpan null untuk menghindari error database
    new_data: any; // Disimpan null untuk menghindari error database
}

const actionTypes = ["INSERT", "UPDATE", "DELETE", "LOGIN", "LOGOUT"];

const AuditLogs = () => {
    const { profile } = useAuth();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [filterDateStart, setFilterDateStart] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
    const [filterDateEnd, setFilterDateEnd] = useState(format(new Date(), "yyyy-MM-dd"));
    const [filterAction, setFilterAction] = useState('all');
    const [searchTerm, setSearchTerm] = useState(''); // Search by user or table name

    const canRead = ['superadmin', 'leader', 'admin'].includes(profile?.role || '');

    const fetchAuditLogs = useCallback(async (startDate: string, endDate: string, action: string, search: string) => {
        setLoading(true);
        if (!canRead) {
            setLoading(false);
            return;
        }

        try {
            // --- PERBAIKAN QUERY: Hapus old_data dan new_data ---
            let query = supabase
                .from('audit_logs') 
                .select(`
                    id,
                    created_at,
                    action,
                    table_name,
                    record_id,
                    user_id,
                    profiles!inner(full_name)
                `)
                .gte('created_at', startDate)
                .lte('created_at', endDate)
                .order('created_at', { ascending: false });

            if (action !== 'all') {
                query = query.eq('action', action);
            }
            if (search.trim() !== '') {
                // Filter berdasarkan user name atau table name
                query = query.or(`profiles.full_name.ilike.%${search.trim()}%,table_name.ilike.%${search.trim()}%`);
            }
            
            const { data, error } = await query;
            if (error) throw error;

            const mappedLogs: AuditLog[] = (data as any[]).map(log => ({
                id: log.id,
                timestamp: log.created_at,
                user_name: log.profiles?.full_name || 'System/Unknown',
                action: log.action,
                table_name: log.table_name,
                record_id: log.record_id,
                old_data: null, // Diset NULL untuk menghindari error database
                new_data: null, // Diset NULL untuk menghindari error database
            }));

            setLogs(mappedLogs);

        } catch (e: any) {
            console.error("Error fetching audit logs:", e);
            toast.error("Gagal memuat log audit: " + e.message);
        } finally {
            setLoading(false);
        }
    }, [canRead]);

    useEffect(() => {
        fetchAuditLogs(filterDateStart, filterDateEnd, filterAction, searchTerm);
    }, [fetchAuditLogs, filterDateStart, filterDateEnd, filterAction, searchTerm]);

    const formatTimestamp = (isoString: string) => {
        return format(new Date(isoString), 'dd MMM yyyy HH:mm');
    }
    
    // Helper untuk menampilkan perubahan data (dimodifikasi untuk menangani NULL dengan pesan)
    const renderChangeDetails = (oldData: any, newData: any) => {
        // Karena old_data dan new_data diset NULL di mapping, kita tampilkan pesan ini
        if (oldData === null && newData === null) {
            return <span className="text-muted-foreground italic">Detail perubahan data tidak tersedia.</span>;
        }

        // --- Logic Lama untuk perbandingan perubahan (ditinggalkan untuk future use) ---
        
        return <span className="text-muted-foreground italic">Detail tersedia (Jika database mendukung old_data/new_data).</span>;
    }

    if (!canRead) {
        return (
            <MainLayout>
                <div className="flex flex-col justify-center items-center h-[calc(100vh-100px)]">
                    <h1 className="text-2xl font-bold">Akses Ditolak</h1>
                    <p className="text-muted-foreground">Anda tidak memiliki izin untuk melihat halaman ini.</p>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Audit Logs</h1>
                        <p className="text-muted-foreground">Pencatatan semua aktivitas dan perubahan data (Superadmin/Admin).</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Filter Log Aktivitas</CardTitle>
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
                                <Label htmlFor="action-type">Tipe Aksi</Label>
                                <Select value={filterAction} onValueChange={setFilterAction}>
                                    <SelectTrigger id="action-type"><SelectValue placeholder="Semua Aksi" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Aksi</SelectItem>
                                        {actionTypes.map(action => (
                                          <SelectItem key={action} value={action}>{action}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="search">Cari</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="User/Tabel..." 
                                        className="pl-10"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)} 
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Waktu</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Aksi</TableHead>
                                            <TableHead>Tabel & ID</TableHead>
                                            <TableHead className="w-1/3">Detail Perubahan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.length === 0 && (
                                            <TableRow><TableCell colSpan={5} className="text-center h-24">Tidak ada log audit ditemukan untuk filter ini.</TableCell></TableRow>
                                        )}
                                        {logs.map(log => (
                                            <TableRow key={log.id}>
                                                <TableCell className="text-xs whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <Clock className="h-3 w-3" />
                                                        {formatTimestamp(log.timestamp)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium text-sm whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="h-3 w-3" />
                                                        {log.user_name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn(
                                                        log.action === 'INSERT' && 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                                                        log.action === 'UPDATE' && 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                                                        log.action === 'DELETE' && 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
                                                    )}>
                                                        {log.action}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-semibold">{log.table_name}</span>
                                                    <br/>
                                                    <span className="text-xs text-muted-foreground break-all">{log.record_id?.substring(0, 8)}...</span>
                                                </TableCell>
                                                <TableCell>
                                                    {renderChangeDetails(log.old_data, log.new_data)}
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
        </MainLayout>
    );
}

export default AuditLogs;