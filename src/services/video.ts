import api from './api';

/**
 * Video Call API Service
 * For managing video call sessions using Stream.io
 */

export interface VideoSessionResponse {
  success: boolean;
  data: {
    streamToken: string;
    streamCallId: string;
    sessionId?: string;
  };
}

export interface VideoSession {
  _id: string;
  appointmentId: string;
  streamCallId: string;
  sessionId: string;
  status: 'ACTIVE' | 'ENDED';
  createdAt: string;
  endedAt?: string;
}

/**
 * Start video session for an appointment
 * @param appointmentId - Appointment ID
 * @returns Session data with Stream token and call ID
 */
export const startVideoSession = async (appointmentId: string): Promise<VideoSessionResponse> => {
  console.log('📡 [API] Starting video session for appointment:', appointmentId);
  try {
    const response = await api.post('/video/start', { appointmentId });
    console.log('✅ [API] Video session started:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ [API] Error starting video session:', error);
    console.error('❌ [API] Error response:', error.response?.data);
    throw error;
  }
};

/**
 * End video session
 * @param sessionId - Session ID
 * @returns Updated session
 */
export const endVideoSession = async (sessionId: string): Promise<any> => {
  const response = await api.post('/video/end', { sessionId });
  return response.data;
};

/**
 * Get video session by appointment ID
 * @param appointmentId - Appointment ID
 * @returns Session data with Stream token and call ID
 */
export const getVideoSessionByAppointment = async (appointmentId: string): Promise<VideoSessionResponse> => {
  const response = await api.get(`/video/by-appointment/${appointmentId}`);
  return response.data;
};
