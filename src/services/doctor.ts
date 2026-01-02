import api from './api';

/**
 * Doctor API Service
 * For doctor-specific operations
 */

export interface DashboardStats {
  totalPatients: number;
  todayAppointments: {
    count: number;
    appointments: Appointment[];
  };
  weeklyAppointments: {
    count: number;
  };
  upcomingAppointments: {
    count: number;
    appointments: Appointment[];
  };
  earningsFromAppointments: number;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  rating: {
    average: number;
    count: number;
  };
}

export interface Appointment {
  _id: string;
  appointmentNumber?: string;
  patientId: {
    _id: string;
    fullName: string;
    email?: string;
    phone?: string;
    profileImage?: string;
  } | string;
  appointmentDate: string;
  appointmentTime?: string;
  bookingType: 'ONLINE' | 'CLINIC';
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardResponse {
  success: boolean;
  message: string;
  data: DashboardStats;
}

/**
 * Get doctor dashboard statistics
 * @returns {Promise<DashboardResponse>} Dashboard statistics
 */
export const getDoctorDashboard = async (): Promise<DashboardResponse> => {
  const response = await api.get('/doctor/dashboard');
  return response;
};

/**
 * Get doctor profile by ID (public)
 * @param {string} doctorId - Doctor user ID
 * @returns {Promise<any>} Doctor profile
 */
export const getDoctorProfileById = async (doctorId: string): Promise<any> => {
  const response = await api.get(`/doctor/profile/${doctorId}`);
  return response;
};

export interface ListDoctorsParams {
  specializationId?: string;
  city?: string;
  isFeatured?: boolean;
  isAvailableOnline?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DoctorListItem {
  _id: string;
  userId?: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
    profileImage?: string;
  };
  fullName?: string;
  profileImage?: string;
  doctorProfile?: {
    specialization?: {
      _id: string;
      name: string;
    } | string;
    specializations?: Array<{
      _id: string;
      name: string;
    }>;
    clinics?: Array<{
      city?: string;
      state?: string;
      address?: string;
    }>;
    consultationFee?: number;
    consultationFees?: {
      clinic?: number;
      online?: number;
    };
    ratingAvg?: number;
    rating?: {
      average: number;
      count: number;
    };
    services?: Array<{
      name: string;
      price?: number;
    }>;
  };
  specialization?: {
    _id: string;
    name: string;
  } | string;
  subscriptionExpiresAt?: string;
  rating?: {
    average: number;
    count: number;
  };
}

export interface ListDoctorsResponse {
  success: boolean;
  message: string;
  data: {
    doctors: DoctorListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

/**
 * List doctors with filtering (public)
 * @param {ListDoctorsParams} params - Query parameters
 * @returns {Promise<ListDoctorsResponse>} Doctors list with pagination
 */
export const listDoctors = async (params: ListDoctorsParams = {}): Promise<ListDoctorsResponse> => {
  const response = await api.get('/doctor', { params });
  return response;
};

