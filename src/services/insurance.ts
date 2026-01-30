import api from './api';

export interface InsuranceCompany {
  _id: string;
  id?: string;
  name: string;
  logo?: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface InsuranceResponse {
  success: boolean;
  message?: string;
  data: InsuranceCompany | InsuranceCompany[];
}

/**
 * Get all active insurance companies (public)
 */
export const getActiveInsuranceCompanies = async (): Promise<InsuranceCompany[]> => {
  const response = await api.get('/insurance');
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
 * Get insurance company by ID (public)
 */
export const getInsuranceCompanyById = async (id: string): Promise<InsuranceCompany> => {
  const response = await api.get(`/insurance/${id}`);
  const data = response?.data || response;
  return data?.data || data;
};
