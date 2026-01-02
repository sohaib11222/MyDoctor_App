import api from './api';

/**
 * Medical Records API Service
 * For managing patient's medical records
 */

export type RecordType = 'PRESCRIPTION' | 'LAB_REPORT' | 'TEST_RESULT' | 'IMAGE' | 'PDF' | 'OTHER';

export interface MedicalRecord {
  _id: string;
  patientId: string;
  title: string;
  description?: string;
  recordType: RecordType;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  relatedAppointmentId?: string;
  relatedDoctorId?: string | {
    _id: string;
    fullName: string;
    profileImage?: string;
  };
  uploadedDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicalRecordsListResponse {
  success: boolean;
  message: string;
  data: {
    records: MedicalRecord[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface MedicalRecordResponse {
  success: boolean;
  message: string;
  data: MedicalRecord;
}

export interface MedicalRecordFilters {
  recordType?: RecordType;
  page?: number;
  limit?: number;
}

/**
 * Create medical record
 * @param {Object} data - Medical record data
 * @returns {Promise<MedicalRecordResponse>} Created medical record
 */
export const createMedicalRecord = async (data: {
  title: string;
  description?: string;
  recordType: RecordType;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  relatedAppointmentId?: string;
  relatedDoctorId?: string;
}): Promise<MedicalRecordResponse> => {
  const response = await api.post('/patient/medical-records', data);
  return response;
};

/**
 * Get patient medical records
 * @param {MedicalRecordFilters} params - Query parameters
 * @returns {Promise<MedicalRecordsListResponse>} Medical records list with pagination
 */
export const getMedicalRecords = async (params: MedicalRecordFilters = {}): Promise<MedicalRecordsListResponse> => {
  const response = await api.get('/patient/medical-records', { params });
  return response;
};

/**
 * Delete medical record
 * @param {string} recordId - Medical record ID
 * @returns {Promise<{ success: boolean; message: string }>} Success message
 */
export const deleteMedicalRecord = async (recordId: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/patient/medical-records/${recordId}`);
  return response;
};

