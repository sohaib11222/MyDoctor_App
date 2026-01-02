import api from './api';

/**
 * Appointment API Service
 * For managing doctor and patient appointments
 */

export interface AppointmentFilters {
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' | 'REJECTED';
  fromDate?: string; // ISO string
  toDate?: string; // ISO string
  page?: number;
  limit?: number;
}

export interface Appointment {
  _id: string;
  doctorId: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
    profileImage?: string;
  };
  patientId: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
    profileImage?: string;
  };
  appointmentDate: string; // ISO string
  appointmentTime: string; // e.g., "10:30"
  bookingType: 'VISIT' | 'ONLINE';
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' | 'REJECTED';
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
  paymentMethod?: string;
  appointmentNumber: string;
  patientNotes?: string;
  clinicName?: string;
  videoCallLink?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentListResponse {
  success: boolean;
  message: string;
  data: {
    appointments: Appointment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface AppointmentResponse {
  success: boolean;
  message: string;
  data: Appointment;
}

/**
 * List appointments (automatically filtered by user role)
 * - Doctors: automatically filters by their doctorId from token
 * - Patients: automatically filters by their patientId from token
 * - Admin: can see all appointments
 */
export const listAppointments = async (params: AppointmentFilters = {}): Promise<AppointmentListResponse> => {
  const response = await api.get('/appointment', { params });
  return response;
};

/**
 * Get appointment by ID
 */
export const getAppointmentById = async (id: string): Promise<AppointmentResponse> => {
  const response = await api.get(`/appointment/${id}`);
  return response;
};

/**
 * Accept appointment (doctor only)
 */
export const acceptAppointment = async (id: string): Promise<AppointmentResponse> => {
  const response = await api.post(`/appointment/${id}/accept`);
  return response;
};

/**
 * Reject appointment (doctor only)
 */
export const rejectAppointment = async (id: string, reason?: string): Promise<AppointmentResponse> => {
  const response = await api.post(`/appointment/${id}/reject`, reason ? { reason } : {});
  return response;
};

/**
 * Update appointment status
 */
export const updateAppointmentStatus = async (
  id: string,
  data: {
    status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' | 'REJECTED';
    paymentStatus?: 'UNPAID' | 'PAID' | 'REFUNDED';
    paymentMethod?: string;
    notes?: string;
  }
): Promise<AppointmentResponse> => {
  const response = await api.put(`/appointment/${id}/status`, data);
  return response;
};

/**
 * Create appointment (patient only)
 */
export const createAppointment = async (data: {
  doctorId: string;
  patientId: string;
  appointmentDate: string; // ISO string
  appointmentTime: string; // e.g., "10:30"
  bookingType: 'VISIT' | 'ONLINE';
  patientNotes?: string;
  clinicName?: string;
}): Promise<AppointmentResponse> => {
  const response = await api.post('/appointment', data);
  return response;
};

/**
 * Cancel appointment (patient only)
 */
export const cancelAppointment = async (id: string, reason?: string): Promise<AppointmentResponse> => {
  const response = await api.post(`/appointment/${id}/cancel`, reason ? { reason } : {});
  return response;
};

