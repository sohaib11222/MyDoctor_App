import api from './api';

/**
 * Weekly Schedule API Service
 * For managing doctor's weekly schedule and available slots
 */

export interface TimeSlot {
  _id?: string;
  startTime: string; // HH:MM format
  endTime?: string; // HH:MM format
  isAvailable?: boolean;
}

export interface AvailableSlot {
  startTime: string;
  endTime?: string;
}

export interface AvailableSlotsResponse {
  success: boolean;
  message: string;
  data: AvailableSlot[] | {
    slots: AvailableSlot[];
  };
}

/**
 * Get available slots for a specific date (public)
 * @param {string} doctorId - Doctor user ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<AvailableSlotsResponse>} Available time slots
 */
export const getAvailableSlotsForDate = async (
  doctorId: string,
  date: string
): Promise<AvailableSlotsResponse> => {
  const response = await api.get('/weekly-schedule/slots', {
    params: { doctorId, date },
  });
  return response;
};

