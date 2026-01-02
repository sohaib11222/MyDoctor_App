import api from './api';

/**
 * Chat API Service
 * For managing doctor-patient and admin-doctor conversations
 */

export interface Conversation {
  _id: string;
  doctorId?: {
    _id: string;
    fullName: string;
    email?: string;
    phone?: string;
    profileImage?: string;
  };
  patientId?: {
    _id: string;
    fullName: string;
    email?: string;
    phone?: string;
    profileImage?: string;
  };
  adminId?: {
    _id: string;
    fullName: string;
    email?: string;
    phone?: string;
    profileImage?: string;
  };
  appointmentId?: {
    _id: string;
    appointmentNumber?: string;
  };
  conversationType: 'DOCTOR_PATIENT' | 'ADMIN_DOCTOR';
  lastMessageAt: string;
  unreadCount?: number;
  lastMessage?: {
    message?: string;
    createdAt: string;
  };
}

export interface ChatMessage {
  _id: string;
  conversationId: string;
  senderId: {
    _id: string;
    fullName: string;
    profileImage?: string;
    role: string;
  };
  message?: string;
  attachments?: string[];
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationsResponse {
  success: boolean;
  message: string;
  data: {
    conversations: Conversation[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface MessagesResponse {
  success: boolean;
  message: string;
  data: {
    messages: ChatMessage[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface ConversationResponse {
  success: boolean;
  message: string;
  data: Conversation;
}

export interface UnreadCountResponse {
  success: boolean;
  message: string;
  data: {
    unreadCount: number;
  };
}

/**
 * Get all conversations for the current user (doctor or admin)
 */
export const getConversations = async (params: { page?: number; limit?: number } = {}): Promise<ConversationsResponse> => {
  const response = await api.get('/chat/conversations', { params });
  return response;
};

/**
 * Get unread message count for the current user
 */
export const getUnreadCount = async (): Promise<UnreadCountResponse> => {
  const response = await api.get('/chat/unread-count');
  return response;
};

/**
 * Start or get conversation with patient (for doctors)
 * @param doctorId - Doctor ID
 * @param patientId - Patient ID
 * @param appointmentId - Appointment ID (required)
 */
export const startConversationWithPatient = async (
  doctorId: string,
  patientId: string,
  appointmentId: string
): Promise<ConversationResponse> => {
  const response = await api.post('/chat/conversation', {
    doctorId,
    patientId,
    appointmentId,
  });
  return response;
};

/**
 * Start or get conversation with admin (for doctors)
 * @param doctorId - Doctor ID
 * @param adminId - Admin ID (optional, backend will use token if user is ADMIN)
 */
export const startConversationWithAdmin = async (
  doctorId: string,
  adminId?: string
): Promise<ConversationResponse> => {
  const response = await api.post('/chat/conversation', {
    doctorId,
    ...(adminId && { adminId }),
  });
  return response;
};

/**
 * Send message to patient (for doctors)
 * @param doctorId - Doctor ID
 * @param patientId - Patient ID
 * @param appointmentId - Appointment ID (required)
 * @param message - Message text
 * @param attachments - Optional attachments array
 */
export const sendMessageToPatient = async (
  doctorId: string,
  patientId: string,
  appointmentId: string,
  message: string,
  attachments?: string[]
): Promise<any> => {
  const response = await api.post('/chat/send', {
    doctorId,
    patientId,
    appointmentId,
    message,
    ...(attachments && { attachments }),
  });
  return response;
};

/**
 * Send message to admin (for doctors)
 * @param doctorId - Doctor ID
 * @param adminId - Admin ID
 * @param message - Message text
 * @param attachments - Optional attachments array
 */
export const sendMessageToAdmin = async (
  doctorId: string,
  adminId: string,
  message: string,
  attachments?: string[]
): Promise<any> => {
  const response = await api.post('/chat/send', {
    doctorId,
    adminId,
    message,
    ...(attachments && { attachments }),
  });
  return response;
};

/**
 * Get messages for a conversation
 * @param conversationId - Conversation ID
 * @param params - Query parameters (page, limit)
 */
export const getMessages = async (
  conversationId: string,
  params: { page?: number; limit?: number } = {}
): Promise<MessagesResponse> => {
  const response = await api.get(`/chat/messages/${conversationId}`, { params });
  return response;
};

/**
 * Mark messages as read in a conversation
 * @param conversationId - Conversation ID
 */
export const markMessagesAsRead = async (conversationId: string): Promise<any> => {
  const response = await api.put(`/chat/conversations/${conversationId}/read`);
  return response;
};

/**
 * Start or get conversation with doctor (for patients)
 * @param doctorId - Doctor ID
 * @param appointmentId - Appointment ID (required)
 * @param patientId - Patient ID (optional, will be from token if not provided)
 */
export const startConversationWithDoctor = async (
  doctorId: string,
  appointmentId: string,
  patientId?: string
): Promise<ConversationResponse> => {
  const response = await api.post('/chat/conversation', {
    doctorId,
    appointmentId,
    ...(patientId && { patientId }),
  });
  return response;
};

/**
 * Send message to doctor (for patients)
 * @param doctorId - Doctor ID
 * @param appointmentId - Appointment ID (required)
 * @param message - Message text
 * @param attachments - Optional attachments array
 * @param patientId - Patient ID (optional, will be from token if not provided)
 */
export const sendMessageToDoctor = async (
  doctorId: string,
  appointmentId: string,
  message: string,
  attachments?: string[],
  patientId?: string
): Promise<any> => {
  const response = await api.post('/chat/send', {
    doctorId,
    appointmentId,
    message,
    ...(patientId && { patientId }),
    ...(attachments && { attachments }),
  });
  return response;
};

