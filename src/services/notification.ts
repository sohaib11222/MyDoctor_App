import api from './api';

/**
 * Notification API Service
 * For managing user notifications
 */

export interface Notification {
  _id: string;
  userId: string;
  type: 'APPOINTMENT' | 'MESSAGE' | 'PAYMENT' | 'REVIEW' | 'PRESCRIPTION' | 'SYSTEM';
  title: string;
  body: string;
  isRead: boolean;
  metadata?: {
    appointmentId?: string;
    doctorId?: string;
    patientId?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface NotificationFilters {
  type?: Notification['type'];
  isRead?: boolean;
  page?: number;
  limit?: number;
}

export interface NotificationsResponse {
  success: boolean;
  message: string;
  data: {
    notifications: Notification[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface NotificationResponse {
  success: boolean;
  message: string;
  data: Notification;
}

/**
 * Get notifications for current user (from token)
 * @param params - Query parameters (type, isRead, page, limit)
 * @returns Promise<NotificationsResponse>
 */
export const getNotifications = async (params: NotificationFilters = {}): Promise<NotificationsResponse> => {
  const response = await api.get('/notification', { params });
  return response as any;
};

/**
 * Mark notification as read
 * @param notificationId - Notification ID
 * @returns Promise<NotificationResponse>
 */
export const markNotificationAsRead = async (notificationId: string): Promise<NotificationResponse> => {
  const response = await api.put(`/notification/read/${notificationId}`);
  return response as any;
};

/**
 * Mark all notifications as read
 * @returns Promise<{ success: boolean; message: string }>
 */
export const markAllNotificationsAsRead = async (): Promise<{ success: boolean; message: string }> => {
  // Get all unread notifications first
  const notifications = await getNotifications({ isRead: false, limit: 100 });
  const unreadNotifications = notifications.data?.notifications || [];
  
  // Mark each as read
  const promises = unreadNotifications.map(notif => markNotificationAsRead(notif._id));
  await Promise.all(promises);
  
  return { success: true, message: 'All notifications marked as read' };
};

/**
 * Get unread notifications count
 * @returns Promise<number>
 */
export const getUnreadNotificationsCount = async (): Promise<number> => {
  const response = await getNotifications({ isRead: false, limit: 1 });
  return response?.data?.pagination?.total || 0;
};

