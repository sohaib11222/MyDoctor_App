import api from './api';

/**
 * Patient API Service
 * For managing patient-specific operations
 */

export interface PatientDashboard {
  patient?: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
    profileImage?: string;
  };
  upcomingAppointments?: {
    appointments: any[];
    total: number;
  };
  completedAppointments?: {
    appointments: any[];
    total: number;
  };
  cancelledAppointments?: {
    appointments: any[];
    total: number;
  };
  totalAppointments?: number;
  totalSpent?: number;
  recentTransactions?: any[];
}

export interface PatientDashboardResponse {
  success: boolean;
  message: string;
  data: PatientDashboard;
}

/**
 * Get patient dashboard statistics
 * @returns {Promise<PatientDashboardResponse>} Dashboard statistics including appointments, reviews, notifications, etc.
 */
export const getPatientDashboard = async (): Promise<PatientDashboardResponse> => {
  const response = await api.get('/patient/dashboard');
  return response;
};

