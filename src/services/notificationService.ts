// src/services/notificationService.ts

import { supabase } from "@/integrations/supabase/client";
import type { Notification, NotificationInsert } from "@/types/notification";
import type { PostgrestResponse, RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner"; 

const NOTIFICATIONS_TABLE = "notifications";

/**
 * Helper to ensure consistent error handling.
 */
const handleSupabaseResponse = <T>(response: PostgrestResponse<T>, errorMessage: string): T[] => {
    if (response.error) {
        console.error("Supabase API Error:", response.error);
        throw new Error(`${errorMessage}: ${response.error.message}`);
    }
    if (!response.data) {
        // Ini jarang terjadi, tapi untuk PostgrestResponse kita anggap array kosong/null data
        return [] as T[];
    }
    return response.data;
};

/**
 * Fetches notifications for the currently logged-in user (filtered by RLS).
 * @param limit Maximum number of notifications to retrieve.
 */
export async function getNotifications(limit: number = 20): Promise<Notification[]> {
    try {
        // Menggunakan select('*') karena RLS akan memfilter berdasarkan user
        const response = await supabase
            .from(NOTIFICATIONS_TABLE)
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        
        return handleSupabaseResponse(response, "Gagal memuat notifikasi") as Notification[];
    } catch (e) {
        throw new Error(e instanceof Error ? e.message : "Gagal memuat notifikasi");
    }
}

/**
 * Fetches the count of unread notifications for the current user.
 */
export async function getUnreadCount(): Promise<number> {
    try {
        // Menggunakan count exact dan filter is_read = false
        const response = await supabase
            .from(NOTIFICATIONS_TABLE)
            .select('id', { count: 'exact', head: true })
            .eq('is_read', false);

        if (response.error) throw response.error;
        return response.count || 0;
    } catch (e) {
        console.error("Error fetching unread count:", e);
        // Mengembalikan 0 agar aplikasi tidak crash
        return 0; 
    }
}

/**
 * Marks a specific notification as read.
 */
export async function markAsRead(notificationId: string): Promise<void> {
    const response = await supabase
        .from(NOTIFICATIONS_TABLE)
        .update({ is_read: true })
        .eq('id', notificationId);

    handleSupabaseResponse(response, `Gagal menandai notifikasi ${notificationId} sebagai terbaca`);
}

/**
 * Marks all unread notifications for the current user as read.
 */
export async function markAllAsRead(): Promise<void> {
    const response = await supabase
        .from(NOTIFICATIONS_TABLE)
        .update({ is_read: true })
        .eq('is_read', false); // RLS akan memfilter berdasarkan user sebelum update

    handleSupabaseResponse(response, "Gagal menandai semua notifikasi sebagai terbaca");
}

/**
 * Deletes a specific notification.
 */
export async function deleteNotification(notificationId: string): Promise<void> {
    const response = await supabase
        .from(NOTIFICATIONS_TABLE)
        .delete()
        .eq('id', notificationId);
        
    handleSupabaseResponse(response, `Gagal menghapus notifikasi ${notificationId}`);
}

/**
 * Creates a new notification (Biasanya dipanggil oleh backend/Edge Function/Superadmin).
 */
export async function createNotification(notification: NotificationInsert): Promise<Notification> {
    try {
        const response = await supabase
            .from(NOTIFICATIONS_TABLE)
            .insert({
                ...notification,
                type: notification.type || 'info',
                is_read: false,
                // Pastikan user_id yang dikirim adalah profile ID
            })
            .select()
            .single();
        
        return handleSupabaseResponse(response, "Gagal membuat notifikasi")[0] as Notification;
    } catch (e) {
        const error = e instanceof Error ? e.message : "Gagal membuat notifikasi";
        toast.error("Gagal mengirim notifikasi", { description: error });
        throw new Error(error);
    }
}


/**
 * Subscribes to real-time changes (INSERTs) for a specific user's notifications.
 */
export function subscribeToNotifications(userId: string, callback: (payload: any) => void): RealtimeChannel {
    const channel = supabase.channel(`notifications:user_id:${userId}`);

    channel.on(
        'postgres_changes',
        { 
            event: 'INSERT', 
            schema: 'public', 
            table: NOTIFICATIONS_TABLE,
            filter: `user_id=eq.${userId}` // Hanya dengarkan notifikasi untuk user ini
        },
        (payload) => {
            callback(payload.new);
        }
    )
    .subscribe();

    return channel;
}