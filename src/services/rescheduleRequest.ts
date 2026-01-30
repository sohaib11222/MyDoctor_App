import api from './api';

/**
 * Reschedule Request API Service
 * For managing appointment reschedule requests
 */

export interface EligibleAppointment {
  _id: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentNumber?: string;
  doctorId: {
    _id: string;
    fullName: string;
    profileImage?: string;
  };
  bookingType: 'VISIT' | 'ONLINE';
  status: string;
}

export interface RescheduleRequest {
  _id: string;
  appointmentId: {
    _id: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentNumber?: string;
    doctorId?: {
      _id: string;
      fullName: string;
    };
    patientId?: {
      _id: string;
      fullName: string;
    };
  };
  reason: string;
  preferredDate?: string;
  preferredTime?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  rescheduleFee?: number;
  rescheduleFeePercentage?: number;
  originalAppointmentFee?: number;
  newAppointmentId?: {
    _id: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentNumber?: string;
    paymentStatus?: string;
  };
  rejectionReason?: string;
  doctorNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRescheduleRequestData {
  appointmentId: string;
  reason: string;
  preferredDate?: string;
  preferredTime?: string;
}

export interface ApproveRescheduleRequestData {
  newAppointmentDate: string;
  newAppointmentTime: string;
  rescheduleFeePercentage?: number;
  rescheduleFee?: number;
  doctorNotes?: string;
}

/**
 * Get appointments eligible for reschedule (patient only)
 */
export const getEligibleAppointments = async (): Promise<EligibleAppointment[]> => {
  const response = await api.get('/reschedule-request/eligible-appointments');
  const data = response?.data || response;
  if (Array.isArray(data)) {
    return data;
  }
  if (data?.data && Array.isArray(data.data)) {
    return data.data;
  }
  return [];
};

/**
 * Create reschedule request (patient only)
 */
export const createRescheduleRequest = async (
  data: CreateRescheduleRequestData
): Promise<RescheduleRequest> => {
  const response = await api.post('/reschedule-request', data);
  return response?.data || response;
};

/**
 * List reschedule requests (filtered by role)
 */
export const listRescheduleRequests = async (params?: {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
}): Promise<RescheduleRequest[]> => {
  const response = await api.get('/reschedule-request', { params });
  const data = response?.data || response;
  if (Array.isArray(data)) {
    return data;
  }
  if (data?.data && Array.isArray(data.data)) {
    return data.data;
  }
  return [];
};

/**
 * Get reschedule request by ID
 */
export const getRescheduleRequest = async (requestId: string): Promise<RescheduleRequest> => {
  const response = await api.get(`/reschedule-request/${requestId}`);
  const data = response?.data || response;
  return data?.data || data;
};

/**
 * Approve reschedule request (doctor only)
 */
export const approveRescheduleRequest = async (
  requestId: string,
  approvalData: ApproveRescheduleRequestData
): Promise<RescheduleRequest> => {
  const response = await api.post(`/reschedule-request/${requestId}/approve`, approvalData);
  return response?.data || response;
};

/**
 * Reject reschedule request (doctor only)
 */
export const rejectRescheduleRequest = async (
  requestId: string,
  rejectionReason: string
): Promise<RescheduleRequest> => {
  const response = await api.post(`/reschedule-request/${requestId}/reject`, {
    rejectionReason,
  });
  return response?.data || response;
};

/**
 * Pay reschedule fee (patient only)
 */
export const payRescheduleFee = async (
  requestId: string,
  paymentMethod: string = 'DUMMY'
): Promise<RescheduleRequest> => {
  const response = await api.post(`/reschedule-request/${requestId}/pay`, {
    paymentMethod,
  });
  return response?.data || response;
};
