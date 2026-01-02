import api from './api';

/**
 * Announcement API
 * For managing doctor announcements
 */

export interface Announcement {
  _id: string;
  title: string;
  message: string;
  announcementType: 'BROADCAST' | 'TARGETED';
  priority: 'URGENT' | 'IMPORTANT' | 'NORMAL';
  isPinned: boolean;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AnnouncementsResponse {
  success: boolean;
  message: string;
  data: {
    announcements: Announcement[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface AnnouncementResponse {
  success: boolean;
  message: string;
  data: Announcement;
}

export interface UnreadCountResponse {
  success: boolean;
  message: string;
  data: {
    unreadCount: number;
  };
}

/**
 * Get announcements for doctor
 */
export const getDoctorAnnouncements = async (params?: {
  page?: number;
  limit?: number;
  isRead?: boolean;
}): Promise<AnnouncementsResponse> => {
  const response = await api.get('/announcements/doctor', { params });
  return response;
};

/**
 * Get unread announcement count for doctor
 */
export const getUnreadAnnouncementCount = async (): Promise<UnreadCountResponse> => {
  const response = await api.get('/announcements/unread-count');
  return response;
};

/**
 * Get single announcement by ID
 */
export const getAnnouncementById = async (id: string): Promise<AnnouncementResponse> => {
  const response = await api.get(`/announcements/${id}`);
  return response;
};

/**
 * Mark announcement as read
 */
export const markAnnouncementAsRead = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.post(`/announcements/${id}/read`);
  return response;
};

