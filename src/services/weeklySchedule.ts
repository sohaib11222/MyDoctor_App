import api from './api';

/**
 * Weekly Schedule API
 * For managing doctor's recurring weekly schedule
 */

export interface TimeSlot {
  _id?: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isAvailable?: boolean;
}

export interface DaySchedule {
  dayOfWeek: string;
  timeSlots: TimeSlot[];
}

export interface WeeklySchedule {
  _id?: string;
  doctorId: string;
  appointmentDuration: number; // in minutes
  days: DaySchedule[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WeeklyScheduleResponse {
  success: boolean;
  message: string;
  data: WeeklySchedule;
}

/**
 * Create or update weekly schedule for a day
 */
export const upsertWeeklySchedule = async (data: {
  dayOfWeek: string;
  timeSlots: TimeSlot[];
}): Promise<WeeklyScheduleResponse> => {
  const response = await api.post('/weekly-schedule', data);
  return response;
};

/**
 * Get weekly schedule
 */
export const getWeeklySchedule = async (): Promise<WeeklyScheduleResponse> => {
  const response = await api.get('/weekly-schedule');
  return response;
};

/**
 * Update appointment duration
 */
export const updateAppointmentDuration = async (duration: number): Promise<WeeklyScheduleResponse> => {
  const response = await api.put('/weekly-schedule/duration', { duration });
  return response;
};

/**
 * Add time slot to a specific day
 */
export const addTimeSlot = async (dayOfWeek: string, timeSlot: TimeSlot): Promise<WeeklyScheduleResponse> => {
  const response = await api.post(`/weekly-schedule/day/${dayOfWeek}/slot`, timeSlot);
  return response;
};

/**
 * Update time slot
 */
export const updateTimeSlot = async (
  dayOfWeek: string,
  slotId: string,
  updates: Partial<TimeSlot>
): Promise<WeeklyScheduleResponse> => {
  const response = await api.put(`/weekly-schedule/day/${dayOfWeek}/slot/${slotId}`, updates);
  return response;
};

/**
 * Delete time slot
 */
export const deleteTimeSlot = async (dayOfWeek: string, slotId: string): Promise<WeeklyScheduleResponse> => {
  const response = await api.delete(`/weekly-schedule/day/${dayOfWeek}/slot/${slotId}`);
  return response;
};

/**
 * Get available slots for a specific date (public)
 */
export const getAvailableSlotsForDate = async (
  doctorId: string,
  date: string
): Promise<{ success: boolean; message: string; data: TimeSlot[] }> => {
  const response = await api.get('/weekly-schedule/slots', {
    params: { doctorId, date },
  });
  return response;
};

