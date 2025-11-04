// src/types/notification.ts

import type { Tables } from "@/integrations/supabase/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

// === Core Types ===

// The string literal for the ENUM type (sesuai CHECK constraint di SQL)
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

// The Row type, disesuaikan dengan DB Schema yang baru
// Menggunakan Omit untuk menimpa tipe 'type' dan 'is_read'
export interface Notification extends Omit<Tables<"notifications">, 'type' | 'is_read' | 'description'> {
  // user_id adalah FK ke profiles.id
  user_id: string; 
  title: string;
  description: string | null;
  type: NotificationType;
  is_read: boolean;
  link: string | null;
}

// The Insert type
export interface NotificationInsert {
  user_id: string; // The profile ID to send the notification to (required)
  title: string;
  description?: string;
  type?: NotificationType;
  link?: string;
}

// === Hook Types ===
export interface UseNotificationsResult {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    error: Error | null;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (notificationId: string) => Promise<void>;
    refetch: () => Promise<void>;
}