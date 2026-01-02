import api from './api';

/**
 * Specialization API Service
 * For managing medical specializations
 */

export interface Specialization {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SpecializationsResponse {
  success: boolean;
  message: string;
  data: Specialization[];
}

/**
 * Get all specializations
 * @returns {Promise<SpecializationsResponse>} List of specializations
 */
export const getAllSpecializations = async (): Promise<SpecializationsResponse> => {
  const response = await api.get('/specialization');
  return response;
};

