import api from './api';

/**
 * Profile API
 * For managing user and doctor profiles
 */

export interface UserProfile {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  gender?: string;
  dob?: string;
  profileImage?: string;
  bloodGroup?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
    relationship?: string; // Support both field names
  };
  role: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DoctorProfile {
  _id: string;
  userId: string;
  title?: string;
  biography?: string;
  specialization?: string | {
    _id: string;
    name: string;
  };
  experienceYears?: number;
  services?: Array<{
    name: string;
    price: number;
  }>;
  consultationFees?: {
    clinic?: number;
    online?: number;
  };
  clinics?: Array<any>;
  education?: Array<{
    degree: string;
    college: string;
    year: string;
  }>;
  experience?: Array<{
    hospital: string;
    fromYear: string;
    toYear: string;
    designation: string;
  }>;
  awards?: Array<{
    title: string;
    year: string;
  }>;
  memberships?: Array<{
    name: string;
  }>;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  convenzionato?: boolean;
  insuranceCompanies?: Array<string | {
    _id: string;
    id?: string;
    name: string;
    logo?: string;
  }>;
  ratingAvg?: number;
  ratingCount?: number;
  isVerified?: boolean;
  isFeatured?: boolean;
  isAvailableOnline?: boolean;
  canSellProducts?: boolean;
  profileCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfileResponse {
  success: boolean;
  message: string;
  data: UserProfile | DoctorProfile;
}

/**
 * Get current user profile by ID
 */
export const getUserProfile = async (userId: string): Promise<ProfileResponse> => {
  const response = await api.get(`/users/${userId}`);
  return response;
};

/**
 * Update user profile (general user fields)
 */
export const updateUserProfile = async (data: {
  fullName?: string;
  phone?: string;
  gender?: string;
  dob?: string;
  profileImage?: string;
  bloodGroup?: string;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    zip?: string | null;
  };
  emergencyContact?: {
    name?: string | null;
    phone?: string | null;
    relation?: string | null;
    relationship?: string | null;
  };
}): Promise<ProfileResponse> => {
  const response = await api.put('/users/profile', data);
  return response;
};

/**
 * Get doctor profile (uses token)
 */
export const getDoctorProfile = async (): Promise<ProfileResponse> => {
  const response = await api.get('/doctor/profile');
  return response;
};

/**
 * Update doctor profile (doctor-specific fields)
 */
export const updateDoctorProfile = async (data: {
  title?: string;
  biography?: string;
  specializationId?: string;
  experienceYears?: number;
  services?: Array<{
    name: string;
    price: number;
  }>;
  consultationFees?: {
    clinic?: number;
    online?: number;
  };
  clinics?: Array<any>;
  education?: Array<{
    degree: string;
    college: string;
    year: string;
  }>;
  experience?: Array<{
    hospital: string;
    fromYear: string;
    toYear: string;
    designation: string;
  }>;
  awards?: Array<{
    title: string;
    year: string;
  }>;
  memberships?: Array<{
    name: string;
  }>;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  convenzionato?: boolean;
  insuranceCompanies?: string[];
}): Promise<ProfileResponse> => {
  const response = await api.put('/doctor/profile', data);
  return response;
};

