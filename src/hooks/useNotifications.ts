// src/hooks/useNotifications.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  subscribeToNotifications,
} from "@/services/notificationService";
import type { Notification, UseNotificationsResult } from "@/types/notification";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";

const playNotificationSound = () => {
  // Implementasi suara notifikasi opsional
  // console.log("Playing notification sound...");
};

const showBrowserNotification = (notification: Notification) => {
  if (typeof window !== 'undefined' && "Notification" in window && Notification.permission === "granted") {
    new window.Notification(notification.title, {
      body: notification.description || "Anda memiliki notifikasi baru.",
      icon: '/favicon.ico', 
    });
  } else if (typeof window !== 'undefined' && "Notification" in window && Notification.permission !== "denied") {
    // Minta izin jika belum diberikan
    Notification.requestPermission();
  }
};

export const useNotifications = (): UseNotificationsResult => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const profileId = profile?.id; // profiles.id digunakan sebagai user_id di tabel notifications
  
  // Refetch function
  const refetch = useCallback(async () => {
    if (!profileId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const [newNotifications, newCount] = await Promise.all([
        getNotifications(20),
        getUnreadCount(),
      ]);
      setNotifications(newNotifications);
      setUnreadCount(newCount);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch notifications"));
      toast.error("Gagal memuat notifikasi.");
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  // Handle Real-time Insert
  const handleRealtimeInsert = useCallback((newNotification: any) => {
    const notification = newNotification as Notification; 

    // 1. Tambah ke state notifikasi
    setNotifications((prev) => {
      // Pastikan notifikasi baru tidak duplikat (misalnya jika refetch dipicu cepat)
      if (prev.some(n => n.id === notification.id)) return prev; 
      return [notification, ...prev].slice(0, 20); 
    });

    // 2. Tambah jumlah notifikasi belum dibaca
    setUnreadCount((prev) => prev + 1);
    
    // 3. Feedback User
    playNotificationSound();
    showBrowserNotification(notification);
    
    // FIX: Hapus icon property karena menyebabkan syntax error
    toast.info(notification.title, {
      description: notification.description || undefined,
      duration: 5000,
    });
  }, []);

  // --- MAIN EFFECT: Fetch & Subscribe ---
  useEffect(() => {
    let channel: RealtimeChannel | undefined;
    
    if (profileId) {
      refetch(); // Ambil data awal

      // Subscribe ke Realtime changes
      channel = subscribeToNotifications(profileId, handleRealtimeInsert);
    } else {
      // Reset state jika user logout
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
    }

    // Cleanup subscription
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [profileId, refetch, handleRealtimeInsert]);

  // --- CRUD Actions ---

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      // Update local state secara optimis
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId && !n.is_read ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to mark as read"));
      toast.error("Gagal menandai sebagai terbaca.");
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
      // Update local state secara optimis
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to mark all as read"));
      toast.error("Gagal menandai semua sebagai terbaca.");
    }
  }, []);

  const handleDeleteNotification = useCallback(async (notificationId: string) => {
    try {
      const deletedNotification = notifications.find(n => n.id === notificationId);
      
      await deleteNotification(notificationId);
      
      // Update local state secara optimis
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      toast.success("Notifikasi berhasil dihapus.");
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete notification"));
      toast.error("Gagal menghapus notifikasi.");
    }
  }, [notifications]); 

  return useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDeleteNotification,
    refetch,
  }), [
    notifications,
    unreadCount,
    loading,
    error,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDeleteNotification,
    refetch,
  ]);
};