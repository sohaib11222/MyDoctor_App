import api from './api';

/**
 * Pharmacy API Service
 * For managing pharmacies (doctors need a pharmacy to sell products)
 */

export interface Pharmacy {
  _id: string;
  name: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
  location?: {
    lat: number;
    lng: number;
  };
  ownerId: string;
  logo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PharmacyFilters {
  ownerId?: string;
  city?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PharmacyListResponse {
  success: boolean;
  message: string;
  data: {
    pharmacies: Pharmacy[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface PharmacyResponse {
  success: boolean;
  message: string;
  data: Pharmacy;
}

export interface MyPharmacyResponse {
  success: boolean;
  message: string;
  data: Pharmacy | null;
}

export interface CreatePharmacyData {
  name: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
  location?: {
    lat: number;
    lng: number;
  };
}

/**
 * List pharmacies with filtering
 */
export const listPharmacies = async (params: PharmacyFilters = {}): Promise<PharmacyListResponse> => {
  const response: PharmacyListResponse = await api.get('/pharmacy', { params });
  return response;
};

/**
 * Get pharmacy by ID
 */
export const getPharmacyById = async (id: string): Promise<PharmacyResponse> => {
  const response: PharmacyResponse = await api.get(`/pharmacy/${id}`);
  return response;
};

export const getMyPharmacy = async (): Promise<MyPharmacyResponse> => {
  const response: MyPharmacyResponse = await api.get('/pharmacy/me');
  return response;
};

/**
 * Create pharmacy (for doctors)
 */
export const createPharmacy = async (data: CreatePharmacyData): Promise<PharmacyResponse> => {
  const response: PharmacyResponse = await api.post('/pharmacy', data);
  return response;
};

/**
 * Update pharmacy (admin only)
 */
export const updatePharmacy = async (id: string, data: Partial<CreatePharmacyData>): Promise<PharmacyResponse> => {
  const response: PharmacyResponse = await api.put(`/pharmacy/${id}`, data);
  return response;
};

